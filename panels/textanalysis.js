import { LISTENER_TYPES } from "./field.js";

const TEMPLATE_DIV = document.querySelector("#templates .text-tally");
TEMPLATE_DIV.remove();
const WORD_TEMPLATE = TEMPLATE_DIV.querySelector(".text-button");
WORD_TEMPLATE.remove();
const HOVER_TEMPLATE = TEMPLATE_DIV.querySelector(".title-detail");
HOVER_TEMPLATE.remove();

const LIMIT = 5;

export class TextAnalysis {
	
  constructor(container, datasource, entry) {
    this.parentContainer = container;
    this.module = this.parentContainer.parentNode;
    this.div = TEMPLATE_DIV.cloneNode(true);
    const titleEle = this.div.querySelector(".field-name");
    titleEle.textContent = entry.label;
    if (entry.label_detail) {
      const hoverDiv = HOVER_TEMPLATE.cloneNode(true);
      hoverDiv.querySelector(".titles").textContent = entry.label_detail;
      this.div.querySelector(".text-tally-header").appendChild(hoverDiv);
    }
    this.countEle = this.div.querySelector(".count-readout");
    this.wordContainer = this.div.querySelector(".words");
    this.datasource = datasource;
    this.entry = entry;
    datasource.addListener(LISTENER_TYPES.text, tally=>this.applyTally(tally));
    datasource.addListener(LISTENER_TYPES.filterStatus, (filterValue, hoveredValue)=>this.updateStyles(filterValue, hoveredValue));
    this.palette = datasource.palette;
    this.parentContainer.appendChild(this.div);
    const color = this.palette.getConf().Text.Static;
    titleEle.style.color = color;
    this.countEle.style.color = color;
    this.currentCounts = {};
    this.currentButtons = {};
    this.buttonRepo = {};
  }

  applyTally(tally) {
    const palette = this.palette.getConf();
    this.wordContainer.innerHTML = '';
    this.currentCounts = {};
    Object.keys(this.currentButtons).length = 0;
    tally.slice(0, LIMIT).forEach(([word, count, diff, windowPct, totalPct])=>{
      let ele = this.buttonRepo[word];
      if (!ele) {
        ele = WORD_TEMPLATE.cloneNode(true);
        ele.style.color = palette.Text.Static;
        ele.textContent = word;
        this.buttonRepo[word] = ele;
        ele.addEventListener("click", ()=>this.datasource.toggleValue(word));
        ele.addEventListener("pointerenter", ()=>{
          const countLabel = count.toLocaleString();
          // const pct = Math.round(windowPct*100);
          this.countEle.textContent = `${countLabel} match${count === 1 ? '' : 'es'}` ;
        });
        ele.addEventListener("pointerleave", ()=>this.countEle.textContent = '');
      }
      this.wordContainer.appendChild(ele);
      this.currentCounts[word] = count;
      this.currentButtons[word] = ele;
    });
  }

  updateStyles(filterValue, hoveredValue) {
    const palette = this.palette.getConf();
    if (filterValue === null) {
      this.div.style.backgroundColor = '';
      Object.values(this.currentButtons).forEach(btn=>{
        btn.style.color = palette.Text.Static;
        btn.style.backgroundColor = '';
      });
    } else {
      Object.entries(this.currentButtons).forEach(([word, btn])=>{
        btn.style.backgroundColor = word === filterValue ? palette.Filter.Fill.On : '';
        btn.style.color = word === filterValue ? palette.Filter.Text.On : palette.Text.Static;
      });
    }
  }
}