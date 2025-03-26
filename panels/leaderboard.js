import { LISTENER_TYPES } from './field.js';
import { ValueToggle } from './valuetoggle.js';

const MAX_BARS = 4;

const TEMPLATE = document.querySelector(".leaderboard-bar-wrap");
TEMPLATE.remove();

export class Leaderboard extends ValueToggle {
  count = 0;
  tally = [];

  constructor(container, datasource, entry) {
    super(container, datasource);
    this.datasource = datasource;
    datasource.addListener(LISTENER_TYPES.tally, tally=>this.applyTally(tally));
    datasource.addListener(LISTENER_TYPES.filterStatus, (filterValue, hoveredValue)=>this.updateStyles(filterValue, hoveredValue));
    this.pathogen = datasource.pathogen;
    this.prop = datasource.prop;
    this.set = datasource.set;
    this.palette = datasource.palette;
    this.values = datasource.getSortedValues();
    this.maxBars = entry.max_bars || MAX_BARS;
    this.height = this.div.offsetHeight;
    this.div.style.gridTemplateColumns = `${this.height}px 4ch 1fr`;
  }

  setDefaultColors(row, value) {
    super.setDefaultColors(row, value);
    const palette = this.palette.getConf(this.set[value] || value);
    const bar = row.querySelector(".bar");
    row.style.marginLeft = null;
    if (bar) bar.style.backgroundColor = palette.Fill.Static;
  }

  setSelectedColors(row, value) {
    super.setSelectedColors(row, value);
  }

  setUnselectedColors(row, color) {
    super.setUnselectedColors(row, color);
    row.style.marginLeft = null;
  }


  addToggle(value) {
    const {row, input} = super.addToggle(value);
    const barWrap = TEMPLATE.cloneNode(true);
    const bar = barWrap.querySelector(".bar");
    barWrap.style.width = `${this.height}px`;
    this.setDefaultColors(bar, value);
    row.insertBefore(barWrap, row.firstChild);
    if (!this.barLookup) {
      this.barLookup = {};
      this.rowLookup = {};
    }
    this.barLookup[value] = bar;
    this.rowLookup[value] = row;
    this.setDefaultColors(row, value);
    return {row, input};
  }

  
  applyTally(counts) {
    super.applyTally(counts);
    const tally = [];
    this.values.forEach(key=>{
      const count = counts[key] || 0;
      tally.push([key, count]);
    });
    this.tally = tally;
    this.draw();
  }

  updateStyles(filterValue, hoveredValue) {
    super.updateStyles(filterValue, hoveredValue);
    Object.entries(this.barLookup).forEach(([value, bar])=>{
      const conf = this.palette.getConf(value);
      let fill = conf.Fill.Static;
      if (`${filterValue}` === value) {
        fill = conf.Filter.Fill.On;
      } else if (`${hoveredValue}` === value) {
        fill = conf.Fill.On;
      } 
      bar.style.backgroundColor = fill;
    });
  }

  draw() {
    const counts = this.tally;
    const max = Math.max(...counts.map(entry => entry[1]));
    counts.sort((a, b)=>b[1] - a[1]);
    this.div.innerHTML = '';
    counts.forEach(([label, count]) => {
      const fraction = max > 0 && count > 0 ? count / max : 0;
      const barDiv = this.barLookup[label];
      barDiv.style.width = `${fraction * 100}%`;
      barDiv.style.borderWidth = count === 0 ? 0 : '1px';
      this.div.appendChild(this.rowLookup[label]);
    });
  }

}