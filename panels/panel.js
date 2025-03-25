import * as Lookout from '../lookout.js';
import { abs, arrayOfArrays, hexToRGBA, makeCanvas, Labels } from '../util.js';

import { CENTER, LEFT, RIGHT, Sketch } from '../octet/sketch.js';
import { max, remap } from '../octet/util.js';
import { colors } from '../palette.js';
import { relativeSize } from './common.js';



const UI_COLORS = colors.Chart.Featured;


const TITLE_TEXT_COLOR = colors.Module.Title.Text;
const BG_COLOR = colors.Module.Fill;
const TITLE_TEXT_HOVER_COLOR = UI_COLORS.Label.Text.On;

const NO_DATA_TEXT_COLOR = colors.Module.Readout.Text.Static;

const TIME_TEXT_COLOR = UI_COLORS.Label.Text.Static;
const TIME_TICK_COLOR = UI_COLORS.Tick.Stroke.Static;

const noop = ()=>{};

export class Panel extends Sketch {
  abbrev;
  layout;
  config;
  title;
  chartType;
  bgcolor = 'white';

  viewMax;  // also need fullMax for the full dataset
  vertAxis;  // vertical axis labels

  chartX1;
  chartX2;
  chartY1;
  chartY2;

  count = 0;

  hoverIndex = -1;  // -1 for no selection

  dataInterval;

  // just storing a single stamp now
  // but should be doing a range
  // and a label for how it should apppear (i.e. 'week of nn/nn')
  // ...which will also need to be localized
  intervalStamps;

  timeTickInterval;
  timeTicks = [ ];
  idealTickCount = {
    "large": 5,
    "square": 5,
    "medium": 3,
    "small": 2
  }


  constructor(parentId, canvasId, layout, hoverCallback, link=false) {
    super(makeCanvas(parentId, canvasId));

    this.layout = layout;
    this.abbrev = layout.abbrev;
    this.config = Lookout.site.diseases[this.abbrev];
    this.hoverCallback = hoverCallback || noop;
    this.groupOrder = this.config ? [...this.config.tests, 'suspected', 'negative'] : [ 'suspected' ];
    if (layout.size === 'square') {
      this.canvasRatio(320, 320);

    } else if (layout.size === 'large') {
      this.canvasRatio(320, 160);

    } else if (layout.size === 'medium') {
      this.canvasRatio(320, 120);

    } else if (layout.size === 'small') {
      this.canvasRatio(320, 75);
      
    } else if (layout.size === 'tall') {
      this.canvasRatio(320, 600);
    }

    let aspect = this.rwidth / this.rheight;
    // setting the height does not appear to be necessary? [mark 250205]
    // this.canvas.style.height = (this.canvas.parentNode.offsetWidth * (1 / aspect)) + 'px';
    this.canvas.parentNode.style.aspectRatio = aspect;

    this.setDomTitle(layout.options?.name || this.config?.name, link);
    const container = document.getElementById(parentId);
    container.insertBefore(this.titleEle, this.canvas);
  }

  setDomTitle(label, link) {
    this.titleEle = document.createElement('h3');
    // this.titleEle.textContent = label;
    if (link) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => Lookout.viewPathogen(this.abbrev));
      this.titleEle.appendChild(button);
    } else {
      this.titleEle.textContent = label;
    }
  }


  load() {
    this.tickFont = this.loadFont('fonts/Inter-Bold.otf');
    this.titleFont = this.loadFont('fonts/Inter-Medium.otf');
    this.dataFont = this.loadFont('fonts/Inter-Medium.otf');
    this.dataBoldFont = this.loadFont('fonts/Inter-Bold.otf');
  }


  updateSelection(_, __, activeTests) {
    this.intervalStamps = Lookout.selectionStamps();
    this.timeTicks = Lookout.getTimeTicks(this.intervalStamps, 'month');
    this.buildTests(activeTests);
    // this.hoverIndex = this.count - 1;  // highlight the last entry
    this.hoverIndex = -1;
    this.redraw();
  }


  isSuspect(record) {
    if ('suspected' in record[this.abbrev] && Object.keys(record[this.abbrev]).length === 1) {
      return true;
    }
    return false;
  }

  // Returns a positive test (if one exists) with preference according to reliability
  // Returns a negative test (if one exists and there are no positive tests) with preference according to reliability
  anyPositiveTest(record, testTypes) {
    for (let i = 0; i < testTypes.length; i++) {
      let subrecord = record[this.abbrev];
      if (testTypes[i] in subrecord) {
        if (subrecord[testTypes[i]] === '+') {
          return [ testTypes[i], '+' ]
        }
      }
    }
    return [ null ];
  }

  isNegative(record) {
    const subrecord = record[this.abbrev];
    let positive = false;
    let anyTests = false;
    this.config.tests.forEach(test=>{
      if (subrecord[test] !== undefined) {
        anyTests = true;
        if (subrecord[test] === '+') {
          positive = true;
        } 
      }
    });
    return !positive && anyTests;
  }

  mostReliableTest(record) {
    let testTypes = this.config.tests;
    for (let i = 0; i < testTypes.length; i++) {
      let subrecord = record[this.abbrev];
      if (testTypes[i] in subrecord) {
        return [ testTypes[i], subrecord[testTypes[i]] ]
      }
    }
    return [ null ];  // no tests found
  }

  getAllRecords() {
    return Lookout.selectionRecords(Lookout.pathogens[this.abbrev], this.dataInterval);
  }

  getPositiveRecords(records, activeTests) {
    const positiveRecords = records.map(recordList =>
      recordList.filter(recordIndex => {
        const record = Lookout.records[recordIndex];
        const [ _, testResult ] = this.anyPositiveTest(record, activeTests);
        return testResult !== '-';
      })
    );
    return positiveRecords;
  }

  /*
  this is not actually called any more. by virtue of 
  an expedient hack, this gets replaced with a closure in 
  the parent view that returns indices that have been filtered
  by whatever filters the page is applying. [mark 250304]
  */
  getRecords(activeTests) {
    const records = this.getAllRecords();
    return this.getPositiveRecords(records, activeTests);
  }

  buildTests(activeTests=[]) {
    if (!Lookout.pathogens.hasOwnProperty(this.abbrev)) {
      this.count = 0;
      return;
    }
    let testTypes;
    let trackingSuspected = activeTests.indexOf('suspected') >= 0;
    let trackingNegative = activeTests.indexOf('negative') >= 0;
    if (activeTests.length === 0) {
      testTypes = this.config.tests.slice(0);
      trackingSuspected = true;
    } else {
      // sort the tests according this.config.tests
      testTypes = this.config.tests.filter(t=>activeTests.indexOf(t) >= 0);
    }
    

    // records that are inside the current viewing area
    this.pathogenRecords = this.getRecords();
    this.count = this.pathogenRecords.length;

    // Build groups of tests: go with the most reliable test
    // (i.e. a PCR result overrides an RDT result)
    // Throw it in the 'suspected' category as last resort
    // (i.e. if no tests done, or tests came back negative)

    this.groups = { };

    this.groupOrder.forEach(testName => {
      this.groups[testName] = new Array(this.count);
      for (let i = 0; i < this.count; i++) {
        this.groups[testName][i] = [ ];
      }
    })

    this.positiveCount = new Array(this.count).fill(0);
    this.negativeCount = new Array(this.count).fill(0);
    // recordList is the set of indices for a particular timeIndex,
    // (i.e. all records for the day or week that match this pathogen)
    this.pathogenRecords.forEach((recordList, timeIndex) => {
      recordList.forEach(recordIndex => {
        let record = Lookout.records[recordIndex];
        const [ testName ] = this.anyPositiveTest(record, testTypes);
        if (testName !== null) {
          this.groups[testName][timeIndex].push(recordIndex);
          this.positiveCount[timeIndex]++;
        } else if (trackingNegative && this.isNegative(record)) {
          this.groups['negative'][timeIndex].push(recordIndex);
          this.negativeCount[timeIndex]++;
        } else if (trackingSuspected && this.isSuspect(record)) {
          this.groups['suspected'][timeIndex].push(recordIndex);
        }
      });
    });

    this.countTests();
  }


  countTests() {
    // make counts for each array
    this.groupCounts = { };
    Object.keys(this.groups).forEach(name => {
      this.groupCounts[name] = this.groups[name].map(array => array.length);
    })

    let orderCount = this.groupOrder.length;
    this.groupSums = arrayOfArrays(orderCount, this.count, 0);

    this.groupSums[0] = this.groupCounts[this.groupOrder[0]];

    for (let i = 1; i < orderCount; i++) {
      for (let j = 0; j < this.count; j++) {
        this.groupSums[i][j] = (this.groupCounts[this.groupOrder[i]][j] + this.groupSums[i-1][j]);
      }
    }

    // highest value will be the final summing category
    // unfortunately, this should be calculated for the entire section
    this.viewMax = max(this.groupSums[orderCount - 1]);

    this.vertAxis = this.viewMax === 0 ? null :
    new Labels(0, this.viewMax, this.idealTickCount[this.layout.size], false);
  }

  handleWeekHover(weekIndex, startIndex, count) {
    this.hoverIndex = weekIndex;
    this.redraw();
  }

  draw() {
    if (this.bgcolor == null) {
      this.bgcolor = BG_COLOR;  // yuck!
    }
    this.clear(this.bgcolor);
    this.fill(TITLE_TEXT_COLOR);
    this.text(this.config.name + ' ' + this.rwidth + ' ' + this.rheight, 10, 25);
  }


  drawNoData() {
    this.fill(NO_DATA_TEXT_COLOR);
    this.textFont(this.titleFont, relativeSize(this, 12));
    this.textAlign(CENTER, CENTER);
    this.text('No Data Available', (this.chartX1 + this.chartX2)/2, (this.chartY1 + this.chartY2)/2);
  }


  insideTitle() {
    this.textFont(this.titleFont, relativeSize(this, 16));
    return (this.rmouseY > 0 &&
      this.rmouseY < this.chartY1 &&
      this.rmouseX >= 0 &&
      this.rmouseX <= this.chartX1 + this.textWidth(this.config.name)
    );
  }


  drawChartTicks(y1, y2, ty) {
    this.textFont(this.tickFont, relativeSize(this, 10));
    this.textAlign(LEFT);
    this.fill(TIME_TEXT_COLOR);
    this.stroke(TIME_TICK_COLOR);
    // the +1 is a cheat for now...
    // this.line(CHART_X1 + 1, TIME_TICK_Y1, CHART_X2, TIME_TICK_Y1);
    // console.log(this.count);
    this.timeTicks.forEach(tick => {
      if (tick.index !== 0) {  // skip the weird offset
        let x = this.chartX(tick.index);
        if (abs(tick.index - this.hoverIndex) > 2) {
          this.text(tick.label.substring(0, 3), x - 1, ty);
          this.line(x, y1, x, y2);
        }
      }
    });
    this.noStroke();
  }


  drawVertAxis(x, y1, y2) {
    if (this.vertAxis != null) {
      this.textFont(this.tickFont, relativeSize(this, 9));
      this.textAlign(RIGHT, CENTER);
      this.fill(TIME_TEXT_COLOR);
      this.stroke(hexToRGBA(TIME_TICK_COLOR, 0.5));
      this.strokeWeight(0.5);
      this.vertAxis.entries.forEach(tick => {
        // console.log(tick);
        let y = remap(tick.value, this.vertAxis.min, this.vertAxis.max, y2, y1);
        this.text(tick.label, x - 2, y);
        // this.line(x, y1, x, y2);

        this.line(x, y, this.chartX2, y);
      });
      this.noStroke();
      this.textAlign(LEFT);
    }
  }


  insideChart() {
    return (
      this.rmouseX > this.chartX1 && this.rmouseX < this.chartX2 &&
      this.rmouseY > this.chartY1 && this.rmouseY < this.chartY2
    );
  }


  updateCursor() {
    // this.cursor(this.insideChart() ? 'pointer' : 'inherit');
  }


  mouseEnter() {
    // Lookout.setHoverPathogen(this.abbrev);
  }


  mouseLeave() {
    // Lookout.setHoverPathogen(null);
  }
}
