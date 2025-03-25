import * as Lookout from '../lookout.js' ;

import { Panel } from './panel.js';
import { compareReadout, hexToRGBA, tickDates } from '../util.js';

import { CENTER, CORNERS, LEFT, TOP } from '../octet/sketch.js';
import { floor, remap } from '../octet/util.js';
import { colors } from '../palette.js';
import { getAlertColorConfig, getTestColorConfig } from '../paletteutil.js';
import { relativeSize, UNSET } from './common.js';

const BAR_COLORS = colors.Cases;
const UI_COLORS = colors.Chart.Featured;
const AXIS_COLOR = UI_COLORS.Axis.Stroke.Static;
const AXIS_COLOR_NO_DATA = UI_COLORS.Axis.Stroke.Off;

const TITLE_TEXT_COLOR_FADED = colors.Module.Title.Text.Off;
const TITLE_TEXT_COLOR = colors.Module.Title.Text.Static;

const READOUT_COLOR_OFF = colors.Module.Readout.Text.Off;

const HOVER_COLOR_ON = UI_COLORS.Selection.Fill.On;
const HOVER_COLOR_OFF = UI_COLORS.Selection.Fill.Off;
const LABEL_COLOR_ON = UI_COLORS.Label.Text.On;
const LABEL_COLOR_OFF = UI_COLORS.Label.Text.Off;
const TREND_COLOR = UI_COLORS.Trend.Text;

const TEST_READOUT_HT = 21;
const TEST_READOUT_GAP = 18;

const COMPARE_SERIES_NAME = 'positiveCount';

export class Bars extends Panel {
  blocks = false;
  groupReportCounts = [];
  activeCases = false;
  compareSeriesName = COMPARE_SERIES_NAME;
  numCases = 0;


  constructor(parentId, canvasId, layout, hoverCallback, link=false) {
    super(parentId, canvasId, layout, hoverCallback, link);

    this.dataInterval = layout.dataInterval;
    this.timeTickInterval = layout.timeTickInterval;

    this.bgcolor = 'white';

    this.chartX1 = 25;
    this.chartX2 = 2 / 3 * this.rwidth + this.chartX1;

    this.chartY1 = 36;
    this.chartY2 = this.rheight - 25;

    this.alertWindow = this.config?.alert?.window_bars || UNSET;
    this.alertCaseCounts = this.config?.alert?.case_count_levels || [];
    this.barAlertLevels = [];

    if (layout.size === 'small') {
      // don't show the horizontal axis labels on the tiny charts
      this.chartY1 = 36;
      this.chartY2 = this.rheight - 20;
    }

    const alertLevels = [0, 1, 2];
    this.groupColorConfig = {};
    this.groupColorConfig['Default'] = {};
    alertLevels.forEach(level => {
      this.groupColorConfig[level] = {};
    });
    this.groupOrder.forEach(name=>{
      const defaultConfig = getTestColorConfig(name);
      this.groupColorConfig['Default'][name] = defaultConfig;
      alertLevels.forEach(alertLevel => {
        this.groupColorConfig[alertLevel][name] = getAlertColorConfig(name, alertLevel);
      });
    })
    Lookout.records.forEach(record => {
      if (this.abbrev in record) {
        this.numCases += Object.values(record[this.abbrev]).filter(v => v === "+").length;;
      }
    });
    const titleButton = this.titleEle?.querySelector('button');
    if (titleButton) {
      titleButton.style.color = this.numCases > 0 ? TITLE_TEXT_COLOR : TITLE_TEXT_COLOR_FADED;
    }
  }

  setup() {
    // console.log('setting up');
  }

  /* this might be an awful hack, I can't tell [mark 250123] */
  getDateIndexForBar(barIndex) {
    const first = Lookout.selectionIndex;
    const dateIndex = first + barIndex * Lookout.getDefaultInterval();
    return dateIndex;
  }

  handleWeekHover(weekIndex, startIndex, count) {
    super.handleWeekHover(weekIndex, startIndex, count);
    this.tallyTestCounts();
  }

  updateSelection(_, __, activeTests) {
    super.updateSelection(_, __, activeTests);
    this.lastHover = -1;
    this.barRadius = floor((this.chartX2 - this.chartX1) / this.count) / 2 - 0.75;
    if (this.alertWindow === UNSET) {
      this.barAlertLevels = new Array(this.count).fill(0);
    } else {
      const interval = this.dataInterval = Lookout.getDefaultInterval();
      const src = Lookout.pathogens[this.abbrev];
      const window = this.alertWindow * interval;
      const halfWindow = Math.round((window - interval) / 2);
      const firstIndex = Lookout.selectionIndex - halfWindow;
      const lastIndex = Lookout.selectionIndex + Lookout.selectionCount + halfWindow;
      const rekkids = src.slice(Math.max(0, firstIndex), Math.min(src.length, lastIndex));
      const dailyPosCounts = rekkids.map(arr=>{
        let pos = 0;
        let tests;
        arr.forEach(index=>{
          tests = Lookout.records[index][this.abbrev] || {};
          let anyPos = false;
          Object.entries(tests).forEach(([test, result])=>{
            if (result==='+' && test !== 'suspected') anyPos = true;
          });
          if (anyPos) pos++;
        });
        return pos;
      });
      const windowedPos = new Array(this.count).fill(0);
      if (window === 1) {
        for (let w = 0;w < this.count;w++) {
          let start = w * interval;
          let end = start + interval;
          for (let i = start;i < end;i++) {
            windowedPos[w] += dailyPosCounts[i];
          }
        }
      } else {
        for (let w = 0;w < this.count;w++) {
          let windowStart = w * interval;
          let actualIntervalStart = windowStart + halfWindow;
          let windowEnd = actualIntervalStart + interval + halfWindow;
          windowStart = Math.max(0, windowStart);
          windowEnd = Math.min(windowEnd, dailyPosCounts.length);
          for (let i = windowStart;i < windowEnd;i++) {
            windowedPos[w] += dailyPosCounts[i];
          }
        }
      }
      this.halfWindow = halfWindow;
      this.windowedPos = windowedPos;
      this.barAlertLevels = windowedPos.map(count=>{
        let level = 0;
        this.alertCaseCounts.forEach((threshold, l)=>{
          if (count > threshold) level = l + 1;
        });
        return level;
      });
    }
    this.tallyTestCounts();
  }

  tallyTestCounts() {
    this.activeCases = false;
    this.groupReportCounts.length = 0;
    const reportable = this.groupOrder.filter(group=>group!=='negative');
    let y = this.chartY2 - TEST_READOUT_HT;
    if (this.count === 0) {
      reportable.forEach((name) => {
        this.groupReportCounts.unshift({
          textColor : READOUT_COLOR_OFF,
          count : '0',
          name: Lookout.site.tests[name]?.label || name,
          y : y
        });
        y -= TEST_READOUT_GAP + TEST_READOUT_HT;
      });

    } else {
      reportable.forEach((name) => {
        const src = this.groupCounts[name];
        const num = this.hoverIndex >= 0 ? src[this.hoverIndex] : src.reduce((tot, n)=>tot+n, 0);
        let color = READOUT_COLOR_OFF;
        if (num > 0) {
          this.activeCases = true;
          const alertLevel = this.hoverIndex >= 0 ? this.barAlertLevels[this.hoverIndex] : Math.max(...this.barAlertLevels);
          color = alertLevel === 0 ? this.groupColorConfig['Default'][name].Text.Static
            : this.groupColorConfig[alertLevel][name].Text.Static;
        }
        if (num > 0 || (this.layout.size === 'square')) { // this.layout.size === 'large' ||  A remnant of a condition that was leading to readout overflow on panel right-side
          this.groupReportCounts.unshift({
            textColor : color,
            count : num.toLocaleString(),
            name: Lookout.site.tests[name]?.label || name,
            y : y
          });
          if (this.layout.size === 'small') {
            y -= TEST_READOUT_GAP / 3 + TEST_READOUT_HT
          } else if (this.layout.size === 'medium') {
            y -= TEST_READOUT_GAP / 2 + TEST_READOUT_HT
          } else {
            y -= TEST_READOUT_GAP + TEST_READOUT_HT
          }
        }
      });
    }
  }



  draw() {
    this.clear(this.bgcolor);

    // currently the same color as bg
    // this.fill(CASES_BG_COLOR);
    // this.rect(0, 0, this.rwidth, this.rheight);

    if (this.count > 0) {
      const bottom = this.chartY2;
      this.drawHoverBar();
      if (this.vertAxis != null) {
        this.drawChart();
      }
      this.strokeWeight(0.5);
      if (this.activeCases) {
        this.stroke(AXIS_COLOR);
      } else {
        this.stroke(AXIS_COLOR_NO_DATA);
      }

      this.line(this.chartX1, bottom, this.chartX2, bottom);
      this.noStroke();

      // draw the month ticks
      this.drawChartTicks(bottom + 1, bottom + 5, bottom + 13);

      if (!this.blocks) {
        this.drawVertAxis(this.chartX1, this.chartY1, this.chartY2);
      }

      this.drawHoverDetail();
      this.drawTestCounts();
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
    const BAR_RADIUS = this.barRadius;
    const BLOCK = BAR_RADIUS*2;
    const BLOCK_EACH = BLOCK + 2;// 2px gap between
    this.blocks = BLOCK_EACH * this.vertAxis.max <= this.chartY2 - this.chartY1;
    let orderCount = this.groupOrder.length;
    if (this.blocks) {  // draw as blocks
      for (let index = 0;index < this.count;index++) {
        let bottom = this.chartY2;
        for (let i = 0;i < orderCount;i++) {
          const name = this.groupOrder[i];
          const value = this.groupCounts[name][index];
          const status = this.hoverIndex === -1 ? 'Static'
            : index === this.hoverIndex ? 'On' : 'Off';
          let fill;
          if (name === 'negative') {
            fill = this.groupColorConfig['Default'][name].Fill[status];
          } else {
            const alertLevel = this.barAlertLevels[index];
            fill = alertLevel === 0 ? this.groupColorConfig['Default'][name].Fill[status]
              : this.groupColorConfig[alertLevel][name].Fill[status];
          }
          // this.fill(
          //   index === this.hoverIndex ?
          //   this.groupColorConfig[name].Fill.On :
          //   this.groupColorConfig[name].Fill.Static
          // );
          this.fill(fill);
          for (let i = 0;i < value;i++) {
            let xm = this.chartX(index + 0.5);
            this.rect(xm - BAR_RADIUS, bottom - BLOCK, xm + BAR_RADIUS, bottom, CORNERS);
            bottom -= BLOCK_EACH;
          }
        }
      }
    } else {  // draw stacked bars
      // draw back to front, with the tallest sum in the back
      for (let i = orderCount-1;i >= 0;--i) {
        const name = this.groupOrder[i];
        this.drawChartBars(this.groupSums[i], name, BAR_RADIUS);
      }
    }
  }


  drawChartBars(data, name, barRadius) {
    this.noStroke();
    data.forEach((value, index) => {
      let y = remap(value, 0, this.vertAxis.max, this.chartY2, this.chartY1);
      let xm = this.chartX(index + 0.5);
      const alertLevel = this.barAlertLevels[index];
      const status = this.hoverIndex === -1 ? 'Static'
        : index === this.hoverIndex ? 'On' : 'Off';
      const fill = alertLevel === 0 ? this.groupColorConfig['Default'][name].Fill[status]
        : this.groupColorConfig[alertLevel][name].Fill[status];
      // this.fill(index == this.hoverIndex ? hover : initial);
      this.fill(fill);
      this.rect(xm - barRadius, y, xm + barRadius, this.chartY2, CORNERS);
    });
  }



  drawTestCounts() {
    const largeSize = relativeSize(this, 16);
    const smallSize = relativeSize(this, 9);
    const centerY = this.rheight / 2;
    const gap = 1;

    if (this.activeCases) {
      const cx = this.rwidth - 40;
      this.textAlign(CENTER, TOP);
      this.groupReportCounts.forEach( item=>{
        const {count, name, textColor, y} = item;
        this.fill(textColor);
        this.textFont(this.dataBoldFont, largeSize);
        this.text(count, cx, y);
        this.textFont(this.dataBoldFont, smallSize);
        this.text(name, cx, y + gap + largeSize);
      });
    } else if (this.numCases > 0) {
      this.textFont(this.dataBoldFont, smallSize);
      this.textAlign(CENTER, CENTER);
      this.fill(READOUT_COLOR_OFF);
      this.text("No active", this.rwidth - 40, centerY - smallSize / 2);
      this.text("cases", this.rwidth - 40, centerY + smallSize / 2);
    } else {
      this.textFont(this.dataBoldFont, smallSize);
      this.textAlign(CENTER, CENTER);
      this.fill(READOUT_COLOR_OFF);
      this.text("No cases", this.rwidth - 40, centerY);
    }
  }



  drawHoverDetail() {
    const countSeries = this[this.compareSeriesName];
    let caseCount = countSeries[this.hoverIndex];

    // Draw percent change
    this.textFont(this.dataBoldFont, relativeSize(this, 9));
    this.textAlign(CENTER, CENTER);

    let msg = '';
    let xm = this.chartX(this.hoverIndex + 0.5);
    if (this.hoverIndex > 0) {  // need a bar to compare, so do nothing with index = 0
      let readout = compareReadout(countSeries[this.hoverIndex-1], caseCount);
      if (readout != null) {
        msg += readout;
      }
      // const posWcount = this.windowedPos?.[this.hoverIndex];
      // if (posWcount) msg += ` ${posWcount};`
      
      this.fill(TREND_COLOR);
      this.text(msg, xm, this.chartY1 - 10);
      
    }

    
    // Draw date range
    if (this.hoverIndex !== -1) {
      const d = this.intervalStamps[this.hoverIndex];

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
      if (this.activeCases) {
        this.fill(HOVER_COLOR_ON);
      } else {
        this.fill(HOVER_COLOR_OFF)
      }
      this.rect(xm-wt/2-3, ytop, wt+6, 14);
      this.triangle(xm-3, ytop, xm, ytop-3, xm+3, ytop);

      if (this.activeCases) {
        this.fill(LABEL_COLOR_ON);
      } else {
        this.fill(LABEL_COLOR_OFF)
      }
      this.text(dateStr, xm, ytop + 7);
    }


  }

  drawHoverBar() {
    if (this.hoverIndex !== -1) {
      let xm = this.chartX(this.hoverIndex + 0.5);
      if (this.activeCases) {
        this.fill(hexToRGBA(HOVER_COLOR_ON, 0.5));
      } else {
        this.fill(HOVER_COLOR_OFF);
      }
      this.rect(xm - this.barRadius, this.chartY2, xm + this.barRadius, this.chartY1, CORNERS);
    }
  }


  mouseMoved() {
    // this.hoverIndex = -1;
    let index = -1;
    // if (this.insideChart(this.rmouseX, this.rmouseY)) {
    if (this.insideChart()) {
      index = floor(this.unchartX(this.rmouseX));
      if (index < 0 || index >= this.count) {
        index = -1;
      }
    }
    // console.log(index, this.count)
    if (index !== this.lastHover) {
      this.lastHover = index;
      let startIndex = Lookout.selectionIndex;
      let count = Lookout.selectionCount;
      if (index >= 0) {
        startIndex = this.getDateIndexForBar(index);
        count = Lookout.getDefaultInterval();
      }
      this.hoverCallback(index, startIndex, count);
      // call a redraw() if actually changed
    }
  }


  /*
  mouseDragged() {
    this.handleInput(this.rmouseX, this.rmouseY, true);
  }


  mousePressed() {
    this.handleInput(this.rmouseX, this.rmouseY, false);
  }


  handleInput(x, y, drag) {
    if (drag || this.insideChart(x, y)) {
      let index = floor(this.unchartX(x));
      if (index >= 0 && index < this.count) {
        console.log('\n***', index);
        this.groupOrder.forEach((name, i) => {
          console.log(name, this.groupCounts[name][index]);//, this.groupSums[i][index]);
        });
      }
    }
  }
  */
}