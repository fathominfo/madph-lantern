import * as Lookout from '../lookout.js' ;
import { compareChange } from '../util.js';

import { Sketch, CENTER, CLOSE, CORNERS, LEFT, RIGHT } from '../octet/sketch.js';
import { abs, constrain, floor, max, nfc, remap, round, sum } from '../octet/util.js';
import { relativeSize } from './common.js';

const WIDE = 320;
const HIGH = 135;

const BACKGROUND_COLOR = 'white';

const CASES_BG_COLOR = 'white';
const POSITIVE_COLOR = '#5f7c96';
const SUSPECTED_COLOR = '#9fbdda';
const TIME_TEXT_COLOR = '#aaa';

const TIME_TICK_COLOR = '#ddd';

const CHART_X1 = 20;
const CHART_X2 = WIDE - CHART_X1;
const CHART_Y1 = 50;
const CHART_Y2 = 100;

const TIME_TICK_Y1 = CHART_Y2 + 1;
const TIME_TICK_Y2 = CHART_Y2 + 6;
const TIME_LABEL_Y = TIME_TICK_Y2 + 8;

const COMPARE_OUTLINE_COLOR = '#c5e0fa';
const COMPARE_TEXT_COLOR = '#999';
// const SELECTION_BG_COLOR = '#dee1e4';
// const SELECTION_POSITIVE_COLOR = '#91afcc';
// const SELECTION_SUSPECTED_COLOR = '#c5e0fa';
const COMPARE_Y1 = 20
const COMPARE_Y2 = 35;
// let countFont;  // if we want y-axis labels
// let timeFont;


export class Overview extends Sketch {
  count = 0;
  positiveMax;
  suspectedMax;
  totalMax;

  // 1 or 7 for day or week, depending on what's working
  // (we may even want to show day in bg and smoothed week on top)
  dataInterval;

  // just storing a single stamp now
  // but should be doing a range
  // and a label for how it should apppear (i.e. 'week of nn/nn')
  // ...which will also need to be localized
  intervalStamps;

  // location of comparison window, coords are in interval space
  compareGlobal = null;
  compareIndex;
  compareCount;

  compareLeft = { };
  compareRight = { }
  compareChange = { };

  timeTickInterval;
  timeTicks = [ ];


  constructor(canvasId, config) {
    super(canvasId)
    this.canvasRatio(WIDE, HIGH);

    this.dataInterval = config.dataInterval;
    this.compareCount = config.compareCount;
    this.timeTickInterval = config.timeTickInterval;

    /*
    // set the current selection to the end of the range
    this.selectionIndex = this.count - selectionCount;
    if (dataInterval == 'day') {
    Lookout.setDayIndex(this.selectionIndex);
    } else if (dataInterval == 'week') {
    Lookout.setDayIndex(this.selectionIndex * 7);
    } else {
    throw new Error(`data interval not supported: ${dataInterval}`);
    }
    */
  }


  updateSelection(/*selectionIndex, selectionCount*/) {
    this.positiveRecords = Lookout.selectionRecords(Lookout.cases.positive, this.dataInterval);
    this.suspectedRecords = Lookout.selectionRecords(Lookout.cases.suspected, this.dataInterval);
    this.intervalStamps = Lookout.selectionStamps(this.dataInterval);
    // console.log(this.intervalStamps);

    this.positiveCount = this.positiveRecords.map(array => array.length);
    this.suspectedCount = this.suspectedRecords.map(array => array.length);
    this.suspectedSum = this.positiveCount.map((value, index) => {
      return value + this.suspectedCount[index];
    });

    // console.log('gonna get max', max);
    // console.log(data.positiveCount);
    this.positiveMax = max(this.positiveCount);
    this.suspectedMax = max(this.suspectedCount);
    // incorrect because the max days may not be identical
    // this.totalMax = this.positiveMax + this.suspectedMax;
    this.totalMax = max(this.suspectedSum);
    // console.log(this.positiveMax, this.suspectedMax, this.totalMax);

    // this.data = data;
    // this.loaded = true;
    this.count = this.positiveRecords.length;

    this.updateComparison();

    this.timeTicks = Lookout.getTimeTicks(this.intervalStamps, 'month');
    // console.log(JSON.stringify(this.timeTicks));

    this.redraw();
  }


  updateComparison() {
    // console.log('compareIndex starting at', this.compareIndex);
    let compareMax = this.count - this.compareCount*2;
    // console.log(compareMax, this.count, this.compareCount);
    if (this.compareGlobal === null) {
      this.compareIndex = compareMax;
      this.compareGlobal = Lookout.selectionIndex + compareMax * this.dataInterval;
      // console.log(compareMax, this.compareGlobal, Lookout.days.length);
    } else {
      // make sure the old selection fits inside the range
      // (and move it left/right to keep it on-screen)
      const [ selStart, selStop ] = Lookout.getSelection();
      const globalMax = selStop - this.compareCount*2 * this.dataInterval;
      this.compareGlobal = constrain(this.compareGlobal, selStart, globalMax);
      this.compareIndex = floor((this.compareGlobal - selStart) / this.dataInterval);
    }
    // console.log('compareIndex changed?', this.compareIndex);

    // count for positive, suspected

    this.compareLeft.positive =
    sum(this.positiveCount, this.compareIndex, this.compareCount);
    this.compareLeft.suspected =
    sum(this.suspectedCount, this.compareIndex, this.compareCount);
    // console.log(this.compareLeft);

    this.compareRight.positive =
    sum(this.positiveCount, this.compareIndex + this.compareCount, this.compareCount);
    this.compareRight.suspected =
    sum(this.suspectedCount, this.compareIndex + this.compareCount, this.compareCount);

    this.compareChange.positive =
    compareChange(this.compareLeft.positive, this.compareRight.positive);
    this.compareChange.suspected =
    compareChange(this.compareLeft.suspected, this.compareRight.suspected);
  }


  load() {
    this.timeFont = this.loadFont('fonts/Inter-Bold.otf');
    this.compareFont = this.loadFont('fonts/Inter-Medium.otf');
    this.compareBoldFont = this.loadFont('fonts/Inter-Bold.otf');
  }


  setup() {
    // console.log('setting up');
  }


  draw() {
    // console.log('overview drawing', this.width, this.height);
    this.clear(BACKGROUND_COLOR);

    // currently the same color as bg
    this.fill(CASES_BG_COLOR);
    this.rect(0, 0, this.rwidth, this.rheight);

    // if (this.data != null) {
    // if (this.loaded) {
    if (this.count > 0) {
      this.drawChart();
      this.drawComparison();

      // console.log(this.data);
      if (this.insideChart()) {
        this.cursor('pointer');
      } else {
        this.cursor('inherit');
      }
    }
  }


  /*
  insideChart(x, y) {
    return (x > CHART_X1 && x < CHART_X2 &&
    y > CHART_Y1 && y < CHART_Y2);
  }
  */
  insideChart() {
    return (
      this.rmouseX > CHART_X1 && this.rmouseX < CHART_X2 &&
      this.rmouseY > CHART_Y1 && this.rmouseY < CHART_Y2
    );
  }


  chartX(index) {
    return remap(index, 0, this.count - 1, CHART_X1, CHART_X2);
  }


  unchartX(x) {
    return remap(x, CHART_X1, CHART_X2, 0, this.count - 1);
  }


  drawChart() {
    // draw suspected cases in back (the sum of cases + expected)
    this.drawChartShape(this.suspectedSum, SUSPECTED_COLOR);

    // draw the actual cases in front
    this.drawChartShape(this.positiveCount, POSITIVE_COLOR);

    // draw the year ticks
    this.drawChartTicks();
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


  drawChartTicks() {
    this.textFont(this.timeFont, relativeSize(this, 9));
    this.textAlign(LEFT);
    this.fill(TIME_TEXT_COLOR);
    this.stroke(TIME_TICK_COLOR);
    // the +1 is a cheat for now...
    // this.line(CHART_X1 + 1, TIME_TICK_Y1, CHART_X2, TIME_TICK_Y1);
    // console.log(this.count);
    this.timeTicks.forEach(tick => {
      if (tick.index !== 0) {  // skip the weird offset
        // console.log(tick);
        // let x = remap(tick.index + 0.5, 0, this.count, CHART_X1, CHART_X2);
        // let x = remap(tick.index, 0, this.count - 1, CHART_X1, CHART_X2);
        let x = this.chartX(tick.index);
        // console.log(x, this.count);
        this.text(tick.label, x - 1, TIME_LABEL_Y);
        this.line(x, TIME_TICK_Y1, x, TIME_TICK_Y2);
      }
    });
    this.noStroke();
  }


  drawComparisonLabel(x) {
    this.textAlign(RIGHT);
    this.text('Positive', x, COMPARE_Y1);
    this.text('Suspected', x, COMPARE_Y2);
  }


  drawComparisonText(x, entry) {
    this.textAlign(CENTER);
    this.text(nfc(entry.positive), x, COMPARE_Y1);
    this.text(nfc(entry.suspected), x, COMPARE_Y2);
  }


  drawComparisonArrows(x, entry) {
    this.textAlign(LEFT);

    let positiveText =
    (entry.positive < 0 ? '\u25B2' : '\u25BC') + ' ' +
    abs(entry.positive) + '%';
    let suspectText =
    (entry.suspected < 0 ? '\u25B2' : '\u25BC') + ' ' +
    abs(entry.suspected) + '%';

    if (isFinite(entry.positive)) {
      this.text(positiveText, x, COMPARE_Y1);
    }
    if (isFinite(entry.suspected)) {
      this.text(suspectText, x, COMPARE_Y2);
    }
  }


  drawComparison() {
    let compareX1 = this.chartX(this.compareIndex - 0.5);
    let compareX2 = this.chartX(this.compareIndex + this.compareCount - 0.5);
    let compareX3 = this.chartX(this.compareIndex + this.compareCount*2 - 0.5);
    // console.log(this.compareIndex, this.compareIndex + this.compareCount);
    this.noFill();
    this.stroke(COMPARE_OUTLINE_COLOR);
    this.rect(compareX1, CHART_Y1, compareX2, CHART_Y2, CORNERS);
    this.rect(compareX2, CHART_Y1, compareX3, CHART_Y2, CORNERS);
    this.noStroke();

    this.fill(COMPARE_TEXT_COLOR);
    this.textFont(this.compareFont, relativeSize(this, 10));
    this.drawComparisonLabel(compareX1 - 5);
    this.drawComparisonArrows(compareX3 + 5, this.compareChange);
    this.textFont(this.compareBoldFont, relativeSize(this, 10));
    this.drawComparisonText((compareX1 + compareX2) / 2, this.compareLeft);
    this.drawComparisonText((compareX2 + compareX3) / 2, this.compareRight);
  }


  // mouseMoved() {
  // console.log(this.mouseX, this.mouseY);
  // }


  mouseDragged() {
    this.handleInput(true);
  }


  mousePressed() {
    this.handleInput(false);
  }


  handleInput(drag) {
    if (drag || this.insideChart()) {
      let index = floor(this.unchartX(this.rmouseX) - this.compareCount/2);
      if (index >= 0 && index <= this.count - this.compareCount*2) {
        this.compareIndex = index;
        this.compareGlobal = Lookout.selectionIndex + index * this.dataInterval;
        this.updateComparison();
        this.redraw();
      }
    }
  }
}