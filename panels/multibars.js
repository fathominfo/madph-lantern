import * as Lookout from '../lookout.js' ;
import { CustomBars } from "./custombars.js";
import { LISTENER_TYPES } from './field.js';

export class MultiBars {

  constructor(div, panelId, entry, datasource, pathogen, hoverCallback) {
    this.div = div;
    this.parentId = panelId;
    this.datasource = datasource;
    this.panelSize = entry.template_size;
    this.displayCount = entry.display;
    this.pathogen = pathogen;
    this.tests = Lookout.site.diseases[this.pathogen].tests;
    this.subPanels = {};
    this.activeSubpanels = [];
    this.hoverCallback = hoverCallback;
    this.sourceData = {};
    this.activeTestsCache = [];
    const url = entry.url;
    this.pinnedSubId = null;
    datasource.addListener(LISTENER_TYPES.tally, tally=>this.handleTally(tally));
    datasource.addListener(LISTENER_TYPES.filterStatus, (filterValue, hoveredValue)=>this.updateStyles(filterValue, hoveredValue));
    fetch(Lookout.getLocationUrl(url)).then(resp=>resp.json())
        .then(data=>{
          this.sourceData = data;
          // console.log(Lookout.records.filter(r=>!!r.animal_product_exposures))
          Object.entries(data).forEach(([subId, dailies])=>this.createPanel(subId, dailies));
          this.updateSelection(null, null, this.activeTestsCache);
        });
    // this.distribution  = {};
  }

  createPanel(subId, dailies) {
    const id = `${this.parentId}-${subId}`;
    const panelId = `${id}-panel}`;
    const layout = {
      size: this.panelSize,
      kind: "disease",
      abbrev: this.pathogen,
      source: subId,
      tests : this.tests,
      options : {"name" : subId}
    };
    const div = document.createElement('div');
    div.id = id;
    div.classList.add('panel');
    div.classList.add(`panel-${this.panelSize}`);
    this.div.appendChild(div);
    const panel = new CustomBars(id, panelId, layout, this.hoverCallback, dailies);
    this.subPanels[subId] = panel;
    div.addEventListener('click', ()=> {
      this.datasource.toggleValue(`${subId}`);
    });
  }

  // currently a noop
  handleTally(tally) {
    // console.log('handle tally')
    // const sorted = Object.entries(tally);
    // sorted.sort((a, b)=>b[1] - a[1]);
  }


  updateStyles(filterValue, hoveredValue) {
    this.pinnedSubId = filterValue;
    Object.entries(this.subPanels).forEach(([subId, panel])=>{
      panel.div.classList.toggle('pinned', subId === filterValue);
    });
  }

  updateSelection(_, __, activeTests) {
    const inWindowCount = Object.entries(this.sourceData).map(([subId, dailies])=>{
      const count = dailies.slice(Lookout.selectionIndex, Lookout.selectionIndex + Lookout.selectionCount).flat().length;
      return [subId, count];
    });
    inWindowCount.sort((a,b)=>{
      let diff = b[1] - a[1];
      if (a[0] === this.pinnedSubId) diff = -1;
      else if (b[0] === this.pinnedSubId) diff = 1;
      else if (diff === 0) diff = a[0].localeCompare(b[0]);
      return diff;
    });
    const currentOrder = this.activeSubpanels.map(panel=>panel.source);
    this.activeSubpanels.length = 0;
    let non0 = 0;
    inWindowCount.forEach(([subId, count], i)=>{
      if (count > 0) non0++;
      const panel = this.subPanels[subId]
      if (i < this.displayCount) {
        panel.show();
        this.activeSubpanels.push(panel);
        if (i !== currentOrder.indexOf(subId)) {
          this.div.insertBefore(panel.div, this.div.childNodes[i]);
        }
      } else {
        panel.hide();
      }
    });
    this.activeSubpanels.forEach(panel=>{
      panel.getRecords = this.getRecords;
      panel.updateSelection(_, __, activeTests);
    });
    this.activeTestsCache = activeTests;
    // this.distribution[Lookout.selectionIndex] = non0;
    // const distally = [];
    // Object.values(this.distribution).forEach(n=>{
    //   if (!distally[n]) distally[n] = 1;
    //   else distally[n]++;
    // })
    // console.debug(distally)
  }

  handleWeekHover(weekIndex, startIndex, count) {
    this.activeSubpanels.forEach(panel=>panel.handleWeekHover(weekIndex, startIndex, count));
  }


}

