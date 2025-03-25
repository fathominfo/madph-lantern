import { LISTENER_TYPES } from "./field.js";

export const TEMPLATE_DIV = document.querySelector("#templates .toggle-readout");
TEMPLATE_DIV.remove();


export class ValueToggle {

  constructor(container, datasource) {
    this.parentContainer = container;
    this.module = this.parentContainer.parentNode;
    this.div = TEMPLATE_DIV.cloneNode(true);
    this.div.classList.remove('value-toggle');
    this.rowTemplate = this.div.querySelector('label');
    this.rowTemplate.remove();
    container.appendChild(this.div);
    this.datasource = datasource;
    datasource.addListener(LISTENER_TYPES.tally, tally=>this.applyTally(tally));
    datasource.addListener(LISTENER_TYPES.filterStatus, (filterValue, hoveredValue)=>this.updateStyles(filterValue, hoveredValue));
    this.pathogen = datasource.pathogen;
    this.prop = datasource.prop;
    this.set = datasource.set;
    this.palette = datasource.palette;
    this.values = datasource.getSortedValues();
    this.rowLookup = {};
    this.values.forEach((value)=>{
      const {row} = this.addToggle(value);
      this.div.appendChild(row);
      this.rowLookup[value] = row;
    });
    this.bindEvents();
  }

  addToggle(value) {
    const row = this.rowTemplate.cloneNode(true);
    const input = row.querySelector('input');
    input.value = value;
    const label = this.set[value] || value;
    const addl = this.datasource.getMetadata(value);
    row.querySelector('.value').textContent = label;
    row.querySelector('.value').title = label;
    row.querySelector('.num').textContent = '';
    if (addl) {
      const glyph = addl.glyph;
      const addlValue = addl.value;
      if (glyph) {
        const addlSpan = document.createElement('span');
        addlSpan.classList.add('value-addl')
          addlSpan.textContent = glyph;
        const hoverSpan = document.createElement('span');
        hoverSpan.classList.add('value-addl-readout');
        hoverSpan.textContent = addlValue;
        addlSpan.appendChild(hoverSpan);
        row.querySelector('.value').appendChild(addlSpan);
      }
      row.querySelector('.value').title = label + ' ' + addlValue;
    }
    this.setDefaultColors(row, value);
    return {row, input};
  }

  bindEvents() {
    this.bindClicks();
    this.bindHover();
  }

  bindClicks() {
    Object.entries(this.rowLookup).forEach(([value, row])=>{
      const input = row.querySelector('input');
      value = this.datasource.getRecordValue(value);
      input.addEventListener('change', ()=> {
        this.datasource.toggleValue(`${value}`);
      });
    });
  }

  bindHover() {
    Object.entries(this.rowLookup).forEach(([value, row])=>{
      const input = row.querySelector('input');
      value = this.datasource.getRecordValue(value);
      row.addEventListener('mouseenter', ()=> {
        this.datasource.highlight(value);
      });
      row.addEventListener('mouseleave', ()=> {
        this.datasource.highlight(null);
      });
    });
  }

  removeActiveFilter(value) {
    const row = this.rowLookup[value];
    const input = row.querySelector('input');
    input.checked = false;
    Object.entries(this.rowLookup).forEach(([value, row])=>this.setDefaultColors(row, value));
    this.setModuleFiltering();
  }

  setDefaultColors(row, value) {
    const palette = this.palette.getConf(value);
    row.style.backgroundColor = '';
    row.style.color = palette.Text.Static;
    row.style.borderColor = 'transparent';
    row.classList.remove('unselected');
  }

  setHoverColors(row, value) {
    const palette = this.palette.getConf(value);
    row.style.color = palette.Text.On;
    row.style.borderColor = 'transparent';
  }

  setSelectedColors(row, value) {
    const palette = this.palette.getConf(value);
    const filterPalette = palette.Filter;
    row.style.backgroundColor = filterPalette.Fill.On;
    row.style.borderColor = filterPalette.Stroke.On;
    row.style.color = filterPalette.Text.On;
    row.classList.remove('unselected');
  }

  setUnselectedColors(row, color) {
    row.style.backgroundColor = '';
    row.style.color = color;
    row.style.borderColor = 'transparent';
    row.classList.add('unselected');
  }

  applyTally(counts) {
    Object.entries(this.rowLookup).forEach(([value, row], i)=>{
      const count = counts[value] || 0;
      row.querySelector('.num').textContent = count.toLocaleString();
      row.classList.toggle("zero", count === 0);
    });
  }

  updateStyles(filterValue, hoveredValue) {
    if (filterValue === null) {
      Object.entries(this.rowLookup).forEach(([value, row])=>{
        if (value === `${hoveredValue}`) {
          this.setHoverColors(row, value);
        } else {
          this.setDefaultColors(row, value);
        }
      });
    } else {
      const palette = this.palette.getFilterConf(filterValue);
      const otherColor = palette.OtherEntry.Text.Static;
      Object.entries(this.rowLookup).forEach(([value, row])=>{
        if (value === `${filterValue}`) {
          this.setSelectedColors(row, value);
        } else {
          this.setUnselectedColors(row, otherColor);
        }
      });
    }
  }

}
