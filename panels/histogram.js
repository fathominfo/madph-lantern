import { getHistogramPalette } from '../paletteutil.js';
import { numericSort } from '../util.js';
import { UNSET } from './common.js';
import { LISTENER_TYPES } from './field.js';

const TEMPLATE = document.querySelector(".histogram");
TEMPLATE.remove();
const BAR_TEMPLATE = TEMPLATE.querySelector('.column-wrap');
BAR_TEMPLATE.remove();

// const UI_COLORS = colors.Chart.Featured;
// const BACKGROUND_COLOR = 'white';
// const AXIS_COLOR = UI_COLORS.Axis.Stroke.Static;
// const AXIS_COLOR_NO_DATA = UI_COLORS.Axis.Stroke.Off;
// const TICK_COLOR = UI_COLORS.Tick.Stroke.Static;
// const READOUT_COLOR_OFF = colors.Module.Readout.Text.Off;


export class Histogram {

  constructor(container, datasource) {
    this.div = TEMPLATE.cloneNode(true);
    container.appendChild(this.div);
    this.datasource = datasource;
    datasource.addListener(LISTENER_TYPES.histogram, (histo)=>this.update(histo));
    datasource.addListener(LISTENER_TYPES.filterStatus, (filterValue)=>this.updateStyles(filterValue));
    this.histo = datasource.histogramData;
    this.pathogen = datasource.pathogen;
    this.prop = datasource.prop;
    this.set = datasource.set;
    this.palette = datasource.palette.getConf();
    this.barLookup = [];
    this.selectStartIndex = UNSET;
    this.addBars();
  }

  load() {
    this.dataFont = this.loadFont('fonts/Inter-Regular.otf');
    this.labelFont = this.loadFont('fonts/Inter-Bold.otf');
  }

  addBars() {
    this.barLookup.length = 0;
    const fillColor = this.palette.Fill.Static;
    const textColor = this.palette.Text.Static;
    this.histo.bins.forEach((bin, i)=>{
      const column = BAR_TEMPLATE.cloneNode(true);
      const label = this.histo.labels[i];
      column.setAttribute('data-value', bin);
      column.querySelector(".bar").style.backgroundColor = fillColor;
      column.querySelector(".bar-readout").style.color = textColor;
      column.querySelector(".bar-readout .value").textContent = label;
      this.div.appendChild(column);
      this.barLookup.push(column);
      column.addEventListener("pointerenter", ()=>this.handleEnter(i));
      column.addEventListener("pointerleave", ()=>this.handleExit(i));
      column.addEventListener("pointerdown", ()=>this.startSelect(i));
      column.addEventListener("pointerup", ()=>this.endSelect(i));
    });
  }

  handleEnter(bindex) {
    const fillColor = this.palette.Fill.Off.Static;
    const textColor = this.palette.Text.Static;
    const inSelection = this.selectStartIndex === UNSET ? (i) => i === bindex :
    this.selectStartIndex < bindex ?
    (i) => i >= this.selectStartIndex && i <= bindex :
    (i) => i >= bindex && i <= this.selectStartIndex;

    this.barLookup.forEach((column, i)=>{
      if (inSelection(i)) {
        column.querySelector(".bar").style.backgroundColor = this.palette.Fill.On;
        column.querySelector(".bar-readout").style.color = this.palette.Text.On;      
      } else {
        column.querySelector(".bar").style.backgroundColor = fillColor;
        column.querySelector(".bar-readout").style.color = textColor;      
      }
    });

  }

  handleExit() {
    const fillColor = this.palette.Fill.Static;
    const textColor = this.palette.Text.Static;
    this.barLookup.forEach(column=>{
      column.querySelector(".bar").style.backgroundColor = fillColor;
      column.querySelector(".bar-readout").style.color = textColor;      
    });
  }

  startSelect(bindex) {
    this.selectStartIndex = bindex;
  }

  endSelect(bindex) {
    const indices = [this.selectStartIndex, bindex];
    this.selectStartIndex = UNSET;
    indices.sort(numericSort);
    const [start, end] = indices;
    this.datasource.setHistogramRange(start, end);
  }



  update() {
    this.draw();
  }

  draw() {
    const maxCount = this.histo.maxCount;
    if (maxCount === 0) {
      // this.div.classList.add("no-data");
      this.barLookup.forEach(column=>{
        column.querySelector('.bar').style.height = `0px`;
        column.querySelector('.count').textContent = '0';
      });
    } else {
      this.histo.counts.forEach((count, i)=>{
        const h = Math.round(count / maxCount * 100);
        const column = this.barLookup[i];
        const bar = column.querySelector('.bar');
        bar.style.height = `${h}%`;
        column.querySelector('.count').textContent = count.toLocaleString();
      });
      this.div.classList.remove("no-data")
    }
  }

  // drawAxis() {
  //   this.stroke(this.maxCount === 0 ? AXIS_COLOR_NO_DATA : AXIS_COLOR);
  //   this.strokeWeight(0.5);
  //   this.line(MARGIN.LEFT, CANVAS_H - MARGIN.BOTTOM, CANVAS_W - MARGIN.RIGHT, CANVAS_H - MARGIN.BOTTOM);
  // }

  // drawChartTicks() {
  //   let x = MARGIN.LEFT;
  //   const bottom = CANVAS_H - MARGIN.BOTTOM;
  //   this.histo.labels.forEach((label, i) => {
  //     // tick line
  //     this.stroke(TICK_COLOR);
  //     this.line(x, bottom + 1, x, bottom + 5); // matching bars.js

  //     // text
  //     this.fill(DEFAULT_PALETTE.Fill.Static);
  //     this.textAlign(LEFT, BOTTOM);
  //     this.text(label, x, bottom + 13); // matching bars.js

  //     x += this.binWidth;
  //   });
  // }

  // mouseMoved() {
  //   let index = Math.floor((this.rmouseX - MARGIN.LEFT) / this.binWidth);
  //   if (index < 0 || index >= this.histo.bins.length - 1) index = -1;
  //   if (index !== this.hoveredIndex) {
  //     this.hoveredIndex = index;
  //     const members = this.histo.members[index];
  //     // this.hoverCallback(members);
  //   }
  // }

  // mouseLeave() {
  //   this.hoveredIndex = -1;

  //   // this.hoverCallback([]);
  // }

  // mousePressed() {
  // }

  updateStyles(filterValue) {
    
  }

}

