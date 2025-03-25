import * as Lookout from '../lookout.js' ;
import { colors } from '../palette.js';
import { timelineDates } from '../util.js';

import { Sketch, CENTER, CLOSE, CORNERS, LEFT } from '../octet/sketch.js';
import { constrain, floor, max, remap } from '../octet/util.js';
import { relativeSize } from './common.js';

const WIDE = 1280;
const HIGH = 80;

const BACKGROUND_COLOR = colors.Header.Fill;
const CHART_BG_COLOR = colors.Header.Fill;
const POSITIVE_COLOR = colors.Header.Timeline.Cases['2'].Fill;
const SUSPECTED_COLOR = colors.Header.Timeline.Cases['1'].Fill;
const TIME_COLOR = colors.Header.Timeline.Label.Text;
const AXIS_COLOR = colors.Header.Timeline.Axis.Stroke;

const TIME_TICK_COLOR = colors.Header.Timeline.Tick.Stroke;
const SELECTION_TEXT_COLOR = colors.Header.Selection.Static.Label.Text;
const SELECTION_BG_COLOR = colors.Header.Selection.Static.Fill;
const SELECTION_POSITIVE_COLOR = colors.Header.Selection.Timeline.Cases['2'].Fill;
const SELECTION_SUSPECTED_COLOR = colors.Header.Selection.Timeline.Cases['1'].Fill;


const CHART_X1 = 320;
const CHART_X2 = WIDE - CHART_X1;
const CHART_Y1 = 16;
const CHART_Y2 = HIGH - 20;

const TIME_TICK_Y1 = CHART_Y2;
const TIME_TICK_Y2 = CHART_Y2 + 5;
const TIME_LABEL_Y = TIME_TICK_Y2 + 10;


// let countFont;  // if we want y-axis labels
let timeFont;


function insideChart(x, y) {
  return (
    x > CHART_X1 && x < CHART_X2 &&
    y > CHART_Y1 && y < CHART_Y2
  );
}


/*
function mergeWeek(entries) {
  let weekCount = Math.ceil(entries.length / 7);

  // oh good, the [ ] here is a single array,
  // so the array gets filled with the same empty array
  // let outgoing = new Array(weekCount).fill([ ]);

  // allocate the dumb for loop way
  let outgoing = new Array(weekCount);
  for (let i = 0; i < weekCount; i++) {
    outgoing[i] = [ ];
  }
  // well, was worth a shot
  // let outgoing = new Array(weekCount).map(() => { return [ ] });

  // console.log(outgoing);
  entries.forEach((array, index) => {
    let week = Math.floor(index / 7);
    // outgoing[week] = outgoing[index].concat(array);
    outgoing[week].push(...array);
  });
  // console.log(outgoing);
  return outgoing;
}
*/


export class Timeline extends Sketch {
  // lookout;  // parent object

  // data = null;
  // loaded = false;
  count = 0;
  positiveMax;
  totalMax;

  dataInterval;

  // Index and width of the current selection, in dataInterval units.
  // i.e. selectionCount=4 and dataInterval=7 means selection is 28 days wide
  selectionIndex;
  selectionCount;

  // just storing a single stamp now
  // but should be doing a range
  // and a label for how it should apppear (i.e. 'week of nn/nn')
  // ...which will also need to be localized
  intervalStamps;

  timeTickInterval;
  timeTicks = [ ];

  positiveRecords;
  totalRecords;


  // constructor(canvasId, dataInterval, selectionCount, timeTickInterval) {
  constructor(canvasId, config) {
    super(canvasId)

    // pull from the site.json config
    this.dataInterval = config.dataInterval;
    this.selectionCount = config.selectionCount;
    this.timeTickInterval = config.timeTickInterval;

    this.canvasRatio(WIDE, HIGH);
    this.noLoop();

    const days = Lookout.days;
    const dailyIndices = days.map(()=>new Array());
    Lookout.records.forEach(({date_index}, i)=>dailyIndices[date_index].push(i));
    if (this.dataInterval === 1) {
      this.totalRecords = dailyIndices;
      this.intervalStamps = Lookout.days;
    } else if (this.dataInterval > 1) {
      this.totalRecords = Lookout.mergeRecords(dailyIndices, this.dataInterval);

      // get a stamp for each week/month/etc
      let count = this.totalRecords.length;
      // console.log(count);
      this.intervalStamps = new Array(count);
      for (let i = 0; i < count; i++) {
        this.intervalStamps[i] = Lookout.days[i * this.dataInterval];
      }

    } else {
      throw new Error(`data interval not supported: ${dataInterval}`);
    }
    this.count = this.intervalStamps.length;

    this.totalCount = this.totalRecords.map(array=>array.length);
    // with the intervals sorted out above, we can tally positives, etc
    this.totalMax = max(this.totalCount);
    this.setPositiveRecords();

    // set the current selection to the end of the range
    this.selectionIndex = this.count - this.selectionCount;
    // with the interval sorted out, we can get the ticks
    this.timeTicks = Lookout.getTimeTicks(this.intervalStamps, this.timeTickInterval);
  }

  setPositiveRecords(patho) {
    let src = Lookout.cases.positive;
    const REPINDEX = 325;
    if (patho) {
      src = Lookout.pathogens[patho].map((arr, i)=>{
        const positives = arr.filter(index=>{
          const rec = Lookout.records[index];
          const tests = rec[patho] || {};
          let pos = false;
          Object.entries(tests).forEach(([test,result])=>{
            if (result === '+' && test !== 'suspected') {
              pos = true;
            }
          });
          return pos;
        });
        // console.log(i, arr.length, positives.length)
        return positives;
      });
    }
    if (this.dataInterval === 1) {
      this.positiveRecords = src;
    } else if (this.dataInterval > 1) {
      this.positiveRecords = Lookout.mergeRecords(src, this.dataInterval);
    }
    this.positiveCount = this.positiveRecords.map(array => array.length);
    this.positiveMax = max(this.positiveCount);
    // src.forEach((arr,i)=>{
      //   if (arr.length > Lookout.cases.positive[i].length) {
    //     console.log(i, arr, Lookout.cases.positive[i])
    //   }
    // })
    // console.log(this.positiveMax, REPINDEX, src[REPINDEX].length, (Lookout.pathogens[patho] || Lookout.cases.positive)[REPINDEX].length)
    // console.log(Lookout.records[530])
    this.redraw();
  }


  load() {
    timeFont = this.loadFont('fonts/Inter-Bold.otf');
  }


  setup() {
    // console.log('setting up');
  }


  draw() {
    // console.trace();
    // console.log('drawing', this.width, this.height);
    this.clear(BACKGROUND_COLOR);

    // currently the same color as bg
    this.fill(CHART_BG_COLOR);
    this.rect(0, 0, this.rwidth, this.rheight);

    // if (this.data != null) {
    // if (this.loaded) {
    if (this.count > 0) {
      this.drawChart();
      this.drawSelection();
      this.drawTicks();

      // console.log(this.data);
      if (insideChart(this.rmouseX, this.rmouseY)) {
        this.cursor('pointer');
      } else {
        this.cursor('inherit');
      }
    }
  }


  chartX(index) {
    return remap(index, 0, this.count - 1, CHART_X1, CHART_X2);
  }


  drawChart() {
    // draw suspected cases in back (the sum of cases + expected)
    this.drawChartShape(this.totalCount, SUSPECTED_COLOR);

    // draw the actual cases in front
    this.drawChartShape(this.positiveCount, POSITIVE_COLOR);
  }


  drawTicks() {
    // draw the tick marks for the horizontal axis (probably year)
    this.textFont(timeFont, relativeSize(this, 10));
    this.textAlign(LEFT);
    this.fill(TIME_COLOR);
    this.stroke(AXIS_COLOR);
    // the +1 is a (temporary?) visual cheat
    this.line(CHART_X1 + 1, CHART_Y2, CHART_X2, CHART_Y2);
    const xs1 = this.chartX(this.selectionIndex);
    const xs2 = this.chartX(this.selectionIndex + this.selectionCount);

    this.timeTicks.forEach((tick, i) => {
      // console.log(tick);
      // let x = remap(tick.index + 0.5, 0, this.count, CHART_X1, CHART_X2);
      // let x = remap(tick.index, 0, this.count - 1, CHART_X1, CHART_X2);
      const x = this.chartX(tick.index) + 1;
      const w = this.textWidth(tick.label);
      const overlapping = xs2 > x && xs1 < x+w-2;
      const xNext = this.chartX(this.timeTicks[i+1]?.index);
      if ((xNext - x > 50 || !Number.isFinite(xNext)) && !overlapping) {
        this.text(tick.label, x - 1, TIME_LABEL_Y);
        this.line(x, TIME_TICK_Y1, x, TIME_TICK_Y2);
      }
    });
    this.noStroke();
  }


  drawChartShape(data, color) {
    this.fill(color);
    this.beginPath();
    this.vertex(CHART_X1, CHART_Y2);
    data.forEach((value, index) => {
      // let x = remap(index + 0.5, 0, this.count, CHART_X1, CHART_X2);
      // let x = remap(index, 0, this.count - 1, CHART_X1, CHART_X2);
      let y = remap(value, 0, this.totalMax, CHART_Y2, CHART_Y1);
      // this.vertex(x, y);
      this.vertex(this.chartX(index), y);
    });
    this.vertex(CHART_X2, CHART_Y2);
    this.endPath(CLOSE);
  }


  drawSelection() {
    // let selectionX1 = remap(this.selectionIndex, 0, this.count, CHART_X1, CHART_X2);
    // let selectionX2 = remap(this.selectionIndex + this.selectionCount, 0, this.count, CHART_X1, CHART_X2);
    let selectionX1 = this.chartX(this.selectionIndex);
    let selectionX2 = this.chartX(this.selectionIndex + this.selectionCount);
    this.fill(SELECTION_BG_COLOR);
    this.rect(selectionX1, CHART_Y1, selectionX2, this.rheight, CORNERS);

    this.ctx.save();
    this.clipRect(selectionX1, CHART_Y1, selectionX2, this.rheight, CORNERS);
    this.drawChartShape(this.totalCount, SELECTION_SUSPECTED_COLOR);
    this.drawChartShape(this.positiveCount, SELECTION_POSITIVE_COLOR);
    this.ctx.restore();

    const dates = timelineDates(Lookout.days[Lookout.selectionIndex], Lookout.selectionCount, true);
    this.fill(SELECTION_TEXT_COLOR);
    this.textAlign(CENTER);
    this.textFont(timeFont, relativeSize(this, 10));
    this.text(`${dates[0]}-${dates[1]}`, (selectionX1 + selectionX2)/2, TIME_LABEL_Y);
  }


  // mouseMoved() {
  // console.log(this.mouseX, this.mouseY);
  // }


  mouseDragged() {
    this.handleInput(this.rmouseX, this.rmouseY, true);
  }


  mousePressed() {
    this.handleInput(this.rmouseX, this.rmouseY, false);
  }


  handleInput(x, y, drag) {
    // console.log(x, y, drag);
    if (drag || insideChart(x, y)) {
      let index = floor(remap(x, CHART_X1, CHART_X2, 0, this.count) - this.selectionCount/2);
      // need to use constrain so that it continues to update
      // during a left/right drag that falls outside the range,
      // otherwise it will 'stick' to values near the bounds
      index = constrain(index, 0, this.count - this.selectionCount - 1);
      // console.log(index);
      if (index != this.selectionIndex) {
        Lookout.setSelectionIndex(index * this.dataInterval);
      }
    }
  }


  updateSelection() {
    this.selectionIndex = floor(Lookout.selectionIndex / this.dataInterval);
    this.redraw();
  }
}