import * as Lookout from '../lookout.js' ;

import { Panel } from './panel.js';

import { CENTER, CORNERS, LEFT, TOP } from '../octet/sketch.js';
import { floor, max, nfc, remap } from '../octet/util.js';
import { arrayOfArrays, compareReadout, Labels, hexToRGBA, tickDates } from '../util.js';
import { getTestColorConfig } from '../paletteutil.js';
import { colors } from '../palette.js';
import { relativeSize } from './common.js';



const COLORS = colors.Cases.Positivity;
const UI_COLORS = colors.Chart.Featured;


const AXIS_COLOR = UI_COLORS.Axis.Stroke.Static;

const HOVER_COLOR_ON = UI_COLORS.Selection.Fill.On;
const HOVER_COLOR_OFF = UI_COLORS.Selection.Fill.Off;
const LABEL_COLOR_ON = UI_COLORS.Label.Text.On;
const LABEL_COLOR_OFF = UI_COLORS.Label.Text.Off;
const TREND_COLOR = UI_COLORS.Trend.Text;


/*
a time series that has a different data source
in order to always reflect positives / negatives
*/
export class Positivityseries extends Panel {

  titleRoot = '';
  titleText = '';
  testsConfig;

  constructor(parentId, canvasId, config, hoverCallback) {
    const configTS = structuredClone(config);
    // configTS.size = 'small';
    super(parentId, canvasId, configTS, hoverCallback);

    this.groupOrder = this.config.tests;

    this.dataInterval = config.dataInterval;
    this.timeTickInterval = config.timeTickInterval;

    this.bgcolor = colors.Module.Fill;

    this.chartX1 = 25;
    this.chartX2 = 2 / 3 * this.rwidth + this.chartX1;

    this.chartY1 = 30;
    this.chartY2 = this.rheight - 18;

    this.titleRoot = config.options?.name || '';
    this.titleText = this.titleRoot;
    this.testsConfig = Lookout.site.tests;
  }


  setup() {
  }

  getRecords() {
    const pathos = Lookout.pathogens[this.abbrev];
    return Lookout.selectionRecords(pathos, this.dataInterval);
  }

  buildTests() {
    if (!Lookout.pathogens.hasOwnProperty(this.abbrev)) {
      this.count = 0;
      return;
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
        const [ testName, testResult ] = this.mostReliableTest(record);
        if (testName !== null) {
          if (testResult === '+') {
            this.groups[testName][timeIndex].push(recordIndex);
            this.positiveCount[timeIndex]++;
          } else if (testResult === '-') {
            this.negativeCount[timeIndex]++;
          }
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

    // groupSums holds the positivity percentages
    this.groupSums = [...Array(this.count)].map((_, j) => {
      const bucketPositives = this.positiveCount[j]
      const bucketTotal = bucketPositives + this.negativeCount[j];
      return bucketTotal > 0 ? 100 * bucketPositives / bucketTotal : 0;
    });

    // highest value will be the final summing category
    this.viewMax = max(this.groupSums);

    this.vertAxis = this.viewMax === 0 ? null :
    new Labels(0, this.viewMax, this.idealTickCount[this.layout.size], false);
    this.vertAxis?.entries.forEach(tick => {
      tick.label += "%";
    });
  }


  updatePositiveTypes(types) {
    // console.log(types);
    let poses = types.filter(t=>t !== 'suspected' && t !== 'negative');
    this.titleText = '';
    if (poses.length == 0) {
      this.titleText += 'no test types selected';
    } else {
      poses = poses.map(code=>this.testsConfig[code].label);
      if (poses.length === 1) {
        this.titleText += ` ${poses[0]}`;
      } else {
        const last = poses.length - 1;
        this.titleText += poses.slice(0, last).join(', ');
        this.titleText += ` and ${poses[last]}`;
      }
      this.titleText += ' positives vs. negatives';
    }
    this.titleText = `${this.titleRoot} <span class="label-detail">${this.titleText}</span>`;
    this.titleEle.innerHTML = this.titleText;
  }



  draw() {
    this.clear(this.bgcolor);

    if (this.count > 0) {
      this.drawHoverBar();
      this.drawChart();
      const bottom = this.chartY2;
      this.strokeWeight(0.5);
      this.stroke(AXIS_COLOR);

      this.line(this.chartX1, bottom, this.chartX2, bottom);
      this.noStroke();

      // draw the month ticks
      this.drawChartTicks(bottom + 1, bottom + 5, bottom + 13);
      this.drawVertAxis(this.chartX1, this.chartY1, this.chartY2);

      this.drawHoverDetail();
      this.drawReadout();
      this.updateCursor();

    } else {
      this.drawNoData();
    }
    this.noLoop();
  }


  chartX(index) {
    return remap(index, 0, this.count, this.chartX1, this.chartX2);
  }


  unchartX(x) {
    return remap(x, this.chartX1, this.chartX2, 0, this.count);
  }


  drawChart() {
    const BAR_RADIUS = floor((this.chartX2 - this.chartX1) / this.count) / 2 - 0.75;
    this.barRadius = BAR_RADIUS;

    const initial = COLORS.Fill.Static;
    const hover = COLORS.Fill.On;

    const data = this.groupSums;
    this.drawChartLines(data, initial, hover, BAR_RADIUS);
  }


  drawChartLines(data, initial, hover, barRadius) {
    // Draw Overall Curve
    this.beginPath();
    this.vertex(this.chartX1, this.chartY2);
    data.forEach((value, index) => {
      if (this.vertAxis) {
        let y = remap(value, 0, this.vertAxis.max, this.chartY2, this.chartY1);
        let xm = this.chartX(index + 0.5);
        this.fill(initial);
        this.stroke(initial)
        this.vertex(xm, y);
      }
    });
    this.vertex(this.chartX2, this.chartY2);
    this.endPath();

    // Draw Hover State
    data.forEach((value, index) => {
      if (this.vertAxis) {
        if (index === this.hoverIndex && value > 0) {
          this.fill(hover);
          this.stroke(hover);
          const xm = this.chartX(index+0.5);
          const r = barRadius / (this.chartX(index+0.5) - this.chartX(index)) * 0.5;
          const xl = this.chartX(index+0.5-r);
          const xr = this.chartX(index+0.5+r);
          const ym = remap(value, 0, this.vertAxis.max, 0, this.chartY1 - this.chartY2);
          const yl = index === 0 ? -(1-r)/r*ym : remap(data[index-1], 0, this.vertAxis.max, 0, this.chartY1 - this.chartY2);
          const yr = index === data.length-1 ? -(1-r)/r*ym : remap(data[index+1], 0, this.vertAxis.max, 0, this.chartY1 - this.chartY2);
          this.beginPath();
          this.vertex(xl, this.chartY2);
          this.vertex(xl, this.chartY2 + (r)*yl+(1-r)*ym);
          this.vertex(xm, this.chartY2 + ym);
          this.vertex(xr, this.chartY2 + (r)*yr+(1-r)*ym);
          this.vertex(xr, this.chartY2);
          this.endPath();
        }
      }
    });
  }

  drawReadout() {
    const largeSize = relativeSize(this, 16);
    const smallSize = relativeSize(this, 9);
    const centerY = this.rheight / 2;
    const gap = 1;

    let positivity = Math.round(100 * this.positiveCount[this.hoverIndex] / (this.positiveCount[this.hoverIndex] + this.negativeCount[this.hoverIndex]), 1);
    if (positivity > 0) {
      const cx = this.rwidth - 35;
      this.textAlign(CENTER, CENTER);
      this.fill(COLORS.Text.Static);
      this.textFont(this.dataBoldFont, largeSize);
      this.text(`${positivity}%`, cx, centerY - gap - largeSize / 2);
      this.textFont(this.dataBoldFont, smallSize);
      this.text("Positivity", cx, centerY + gap + smallSize / 2);
    } else {
      const totalPositive = this.positiveCount.reduce((sum, positive) => sum + positive, 0);
      const totalNegative = this.negativeCount.reduce((sum, negative) => sum + negative, 0);
      positivity = Math.round(100 * totalPositive / (totalPositive + totalNegative));
      if (positivity) {
        const cx = this.rwidth - 35;
        this.textAlign(CENTER, CENTER);
        this.fill(COLORS.Text.Static);
        this.textFont(this.dataBoldFont, largeSize);
        this.text(`${positivity}%`, cx, centerY - gap - largeSize / 2);
        this.textFont(this.dataBoldFont, smallSize);
        this.text("Average", cx, centerY + gap + smallSize / 2);
        this.text("Positivity", cx, centerY + gap * 2 + smallSize * 1.5);
      } else {
        this.textFont(this.dataBoldFont, smallSize);
        this.textAlign(CENTER, CENTER);
        this.fill(colors.Module.Readout.Text.Off);
        this.text("No active", this.rwidth - 40, centerY - smallSize / 2);
        this.text("cases", this.rwidth - 40, centerY + smallSize / 2);
      }
    }
  }


  drawChartHover() {
    if (this.hoverIndex != -1) {
      this.textFont(this.dataBoldFont, relativeSize(this, 7));
      this.fill(COLORS.Text.On);
      let ty = 40;
      this.groupOrder.forEach((name, i) => {
        let num = this.groupCounts[name][this.hoverIndex];
        if (num > 0) {
          let msg = nfc(num) + ' ' + name.toUpperCase();
          this.textAlign(LEFT);
          this.text(msg, this.chartX(this.hoverIndex) + 3, ty);
          ty += 10;
        }
      });
    }
  }


  drawHoverDetail() {
    let positivity = 100 * this.positiveCount[this.hoverIndex] / (this.positiveCount[this.hoverIndex] + this.negativeCount[this.hoverIndex]);

    this.textFont(this.dataBoldFont, relativeSize(this, 9));
    this.textAlign(CENTER, CENTER);

    let msg = ''
    if (this.hoverIndex > 0) {
      let readout = compareReadout(100 * this.positiveCount[this.hoverIndex - 1] / (this.positiveCount[this.hoverIndex - 1] + this.negativeCount[this.hoverIndex - 1]), positivity);
      if (readout != null) {
        msg += readout + '  ';
      }
    }
    let xm = this.chartX(this.hoverIndex + 0.5);
    this.fill(TREND_COLOR);
    this.text(msg, xm, this.chartY1 - 10);

    // Draw date range
    if (this.hoverIndex !== -1) {
      const d = this.intervalStamps[this.hoverIndex];
      let m = d.substring(5, 7);
      let s = parseInt(d.substring(8, 10));
      let e = s + 7;

      let month = '';
      let iTick = -1;
      this.timeTicks.forEach((timeTick, i) => {
        if (this.hoverIndex - timeTick.index >= 0 && this.hoverIndex - timeTick.index < 5) {
          iTick = i;
          month = timeTick.label.substring(0, 3);
        }
      })
      const dateTicks = tickDates(d, Lookout.site.timeline.dataInterval);
      const dateStr = `${dateTicks[0]}-${dateTicks[1]}`;
      const wt = this.textWidth(dateStr);
      const ytop = this.chartY2+5;
      if (positivity > 0) {
        this.fill(HOVER_COLOR_ON);
      } else {
        this.fill(HOVER_COLOR_OFF)
      }
      this.rect(xm-wt/2-3, ytop, wt+6, 14);
      this.triangle(xm-3, ytop, xm, ytop-3, xm+3, ytop);

      if (positivity > 0) {
        this.fill(LABEL_COLOR_ON);
      } else {
        this.fill(LABEL_COLOR_OFF)
      }
      this.text(dateStr, xm, ytop + 7);
    }
  }

  drawHoverBar() {
    if (this.hoverIndex !== -1) {
      const positivity = 100 * this.positiveCount[this.hoverIndex] / (this.positiveCount[this.hoverIndex] + this.negativeCount[this.hoverIndex]);
      let xm = this.chartX(this.hoverIndex + 0.5);
      if (positivity > 0) {
        this.fill(hexToRGBA(HOVER_COLOR_ON, 0.5));
      } else {
        this.fill(HOVER_COLOR_OFF);
      }
      this.rect(xm - this.barRadius, this.chartY2, xm + this.barRadius, this.chartY1, CORNERS);
    }
  }

  getDateIndexForBar(barIndex) {
    const first = Lookout.selectionIndex;
    const dateIndex = first + barIndex * Lookout.getDefaultInterval();
    return dateIndex;
  }

  mouseMoved() {
    let index = -1;
    if (this.insideChart()) {
      index = floor(this.unchartX(this.rmouseX));
      if (index < 0 || index >= this.count) {
        index = -1;
      }
    }
    if (index !== this.lastHover) {
      this.lastHover = index;
      let startIndex = Lookout.selectionIndex;
      let count = Lookout.selectionCount;
      if (index >= 0) {
        startIndex = this.getDateIndexForBar(index);
        count = Lookout.getDefaultInterval();
      }
      this.hoverCallback(index, startIndex, count);
    }
  }

}

