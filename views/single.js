import * as Lookout from '../lookout.js' ;

import { Bars } from '../panels/bars.js';
import { Donut } from '../panels/donut.js';
import { FlatDonut } from '../panels/flatdonut.js';
import { Positivityseries } from '../panels/positivityseries.js';
import { GeoBars } from '../panels/geobars.js';
import { View } from './view.js'
import { FilterList } from '../panels/filterlist.js';
import { ValueToggle } from '../panels/valuetoggle.js';
import { TestToggle } from '../panels/testtoggle.js';
import { Histogram } from '../panels/histogram.js';
import { Treemap } from '../panels/treemap.js';
import { colors } from '../palette.js';
import { Leaderboard } from '../panels/leaderboard.js';
import { getField } from '../panels/field.js';
import { FieldDiv } from '../panels/fielddiv.js';
import { GeoMap } from '../panels/geomap.js';
import { CoordinateMap } from '../panels/coordinatemap.js';
import { MultiBars } from '../panels/multibars.js';
import { UPGMATreePanel } from '../panels/upgmatreepanel.js';
import { NewickTreePanel } from '../panels/newicktreepanel.js';
import { TextAnalysis } from '../panels/textanalysis.js';
import { ToggleBlock } from '../panels/toggleblock.js';




const template = document.querySelector('.single-container');
template.remove();

// const prefix = 'single-';

// const MAP_WIDTH_PCT = '25%';
// const FIXED_WIDTH_ENTRIES = ['map', 'newicktree'];
// const GRID_GAP = '25px'

/*
must match definitions for
.block-large
.block-medium
.block-small
in index.css
*/
const BLOCK_ASPECTS = {
  large : 700 / 360,
  medium : 350 / 160,
  square: 350 / 350,
  small : 320 / 80 //92
};


const modulesDrivenDirectlyByLookout = [
  'disease', 'unknown', 'positivityseries', 
  'map', 'filters', 'test-toggle', 
  'multibars'
];

export class Single extends View {
  pathogen = null; // the name of the pathogen of interest
  timePanels = [ ]; // the container for all time based charts
  geoPanels = [ ]; // the container for all geo based charts (can overlap with timePanels)
  tallyPanels = []; // charts where data is based on tallying records independent of time
  // the filters object used throughout the view to filter accessible records
  filters = [];
  // ¡Special! filters, but with an exception to always include negative cases
  filtersWithNegativeTests = [];
  filterList;
  map;
  entry;
  // positivity charts require special handling
  // in that they always need to include the records
  // with negative tests
  panelsWithNegatives = [];
  testToggler = null;

  dataSources = {};


  constructor(pathogen, layout) {
    super();
    this.pathogen = pathogen;
    this.entry = layout;
    this.indexes = Lookout.pathogens[pathogen].flat();
    this.container = template.cloneNode(true);
    this.container.querySelector(".nav-disease").textContent = Lookout.site.diseases[pathogen].name;
    this.siteSpan = this.container.querySelector(".nav-site");
    this.siteSpan.textContent = Lookout.site.site;
    this.dateRangeSpan = this.container.querySelector(".nav-daterange");
    this.refilterFnc = (filter, activeValues, prop, set, label)=> {
      this.updateSelection(Lookout.selectionIndex, Lookout.selectionCount);
      if (prop !== 'tests') {
        // tests have a display independent of the
        // rest of the filters
        this.filterList.update(filter, activeValues, prop, set, label);
      } else {
        this.panelsWithNegatives.forEach(panel=>{
          try {
            panel.updatePositiveTypes(activeValues);
          } catch {}
        });
      }
    };


    this.buildLayout(layout);
    this.populateLayout(layout);
  }


  buildLayout(columns) {
    const chartContainer = this.container.querySelector('.main');
    chartContainer.innerHTML = '';
    this.container.style.display = 'flex';
    const lower = document.getElementById('flex-lower');
    lower.appendChild(this.container);
    /*
    // most columns are the same width
    // -- unless --
    // they include a map or a tree
    // in which case they get a fixed width of MAP_WIDTH_PCT

    nvm, we're sticking with fixed width
    const hasMappish = col=>{
      let hasWiderSomething = false;
    col.forEach(entry=>{
      if (FIXED_WIDTH_ENTRIES.includes(entry.kind)) {
    hasWiderSomething = true;
    } else if (entry.kind === 'block') {
    hasWiderSomething = hasWiderSomething || hasMappish(entry.contents);
    }
    });
    return hasWiderSomething;
    };
    const widths = columns.map(col=>hasMappish(col) ? MAP_WIDTH_PCT : '1fr');
    const colCount = columns.length;
    */
    let total = 0;
    const widths = columns.map(col=>{
      let fr = 1;
      let firstEntry = col[0];
      if (firstEntry.kind === 'config') {
        fr = parseInt(firstEntry.columns) || fr;
      }
      total += fr;
      return fr;
    });


    const prettyPathName = Lookout.site.diseases[this.pathogen].name;
    columns.forEach((column, i) => {
      const col = document.createElement('div');
      const w = widths[i];
      col.className = 'block column';

      col.style.width = `${Math.round(w / total * 100)}%`;
      col.style.flexGrow = w;
      chartContainer.appendChild(col);
      column.forEach(entry => {
        const html = this.entryToHtml(entry, prettyPathName);
        col.innerHTML += html;
        if (entry.kind === 'map') {col.style.gap = '0px'; col.style.padding = '0px';}
      });
    });
    this.container.querySelectorAll(".pathogen").forEach(span => {
      span.textContent = this.pathogen;
    });

    const homeButton = this.container.querySelector(".home-button");
    homeButton.addEventListener("click", () => Lookout.viewHome());
  }


  entryToHtml(entry, prettyPathName, opts) {
    let html = '';
    if (entry.label !== undefined) {
      entry.label = entry.label.replace('{pathogen}', prettyPathName);
    }
    if (entry.abbrev !== undefined) {
      entry.abbrev = entry.abbrev.replace('{pathogen}', this.pathogen);
      if (!modulesDrivenDirectlyByLookout.includes(entry.kind) || entry.datasource) {
        const dsKey = entry.datasource || entry.abbrev;
        let datasource = this.dataSources[dsKey];
        if (!datasource) {
          datasource = getField(this.pathogen, entry, this.refilterFnc);
          this.dataSources[dsKey] = datasource;
          this.filters.push(rec=>datasource.test(rec));
          this.filtersWithNegativeTests.push(rec=>datasource.test(rec));
        }
      }
    }
    const panelId = this.entryToId(entry);
    let style = opts?.style || ''; //Number.isFinite( parseInt(entry.columns)) ? `grid-column: span ${entry.columns};` : '';
    switch(entry.kind) {
      case 'disease' :
      case 'unknown' :
        html = `<div class="panel panel-${entry.size}" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'positivityseries':
        html = `<div class="panel panel-${entry.size}" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'map':
        html = `<div class="panel panel-${entry.size}" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'coordinate-map':
        html = `<div class="panel panel-${entry.size}" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'map-readout':
        html = `<div class="panel panel-${entry.size}" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'donut':
        html = `<div class="panel panel-${entry.size} donut" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'flatdonut':
        html = `<div class="panel panel-${entry.size} flatdonut" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'leaderboard':
        html = `<div class="panel panel-${entry.size} leaderboard" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'value-toggle':
        html = `<div class="panel panel-${entry.size} value-toggle" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'test-toggle':
        html = `<div class="panel panel-${entry.size} test-toggle" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'filters':
        html = `<div class="panel panel-${entry.size} filters" id="${panelId}"></div>`;
        break;
      case 'histogram':
        html = `<div class="panel panel-${entry.size} histogram" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'category':
        html = `<div class="panel panel-${entry.size} category" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'tree': // the default tree type is newick 
      case 'newicktree':
            html = `<div class="panel panel-${entry.size} tree" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'upgmatree':
        html = `<div class="panel panel-${entry.size} tree" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'treemap':
        html = `<div class="panel panel-${entry.size} treemap" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'textanalysis':
        html = `<div class="panel panel-${entry.size} textanalysis" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'header': {
        const inline = entry.inline ? 'inline' : '';
        if (entry.size === 'oneliner') style += 'height: 17px;'
        html = `<div class="panel panel-${entry.size} header ${inline}" style="${style}" ><h3>${entry.label}</h3></div>`;
        break;
      }
      case 'text': {
        const inline = entry.inline ? 'inline' : '';
        html = `<div class="panel panel-${entry.size} text ${inline}"  id="panel-${panelId}" style="${style}" ><p></p></div>`;
        break;
      }
      case 'block': {
        const classname = entry.orientation;
        if (entry.background) {
          style += `background-color: ${colors.Module.Fill}; `;
        }
        if (entry.style) {
          Object.entries(entry.style).forEach(([key, value])=>style += `${key}: ${value}; `);
        };
        const header = entry.label ? `<h3>${entry.label}</h3>` : '';
        const blockClass = entry.size !== undefined ? `block-${entry.size}` : '';
        const blockId = entry.abbrev !== undefined ? `id="${panelId}"` : '';
        if (classname === 'grid') {
          style += `display: grid; grid-template-columns: repeat(${entry.columns}, 1fr);`;
          html = `<div ${blockId} class="${blockClass} block ${classname}" style="${style}">${header}`;
          entry.contents.forEach(ent=>{
            html += this.entryToHtml(ent, prettyPathName);
          });
        } else if (classname === 'row') {
          html = `<div ${blockId} class="${blockClass} block ${classname}" style="${style}">${header}`;
          if (entry.layout === "fit-content") {
            entry.contents.forEach(ent=>{
              html += this.entryToHtml(ent, prettyPathName);
            });
          } else {
            const hasSquare = entry.contents.reduce((any, ent)=>any || ent.size === 'square', false);
            if (hasSquare) {
              if (entry.contents.length > 2) {
                console.warn(`custom layout for blocks with square members has not been implemented for rows with more than two members`);
              }
              entry.contents.forEach(ent=>{
                html += this.entryToHtml(ent, prettyPathName);
              });
            } else {
              const widths = entry.contents.map(ent=>ent.columns || 1);
              const tot = widths.reduce((tot, w)=>tot + w, 0);
              entry.contents.forEach((ent, i)=>{
                const wpct = Math.round(widths[i] / tot * 100);
                html += this.entryToHtml(ent, prettyPathName, {style: `width: ${wpct}%; `});
              });
            }
          }
        } else if (classname === 'column') {
          const columns = entry.columns || 1;
          const yspacing = entry.yspacing ? `column-gap-${entry.yspacing}` : '';
          style += `flex-grow: ${columns}; `;
          html = `<div ${blockId} class="${blockClass} block ${classname} ${yspacing}" style="${style}">${header}`;
          entry.contents.forEach(ent=>{
            html += this.entryToHtml(ent, prettyPathName);
          });
        }
        html += `</div>`;
        break;
      }
      case 'multibars': {
        html = `<div class="panel panel-${entry.size} block multibars" id="${panelId}" style="${style}" ><p></p></div>`;
        break;
      }
      case 'toggleblock': {
        if (entry.background) {
          style += `background-color: ${colors.Module.Fill}; `;
        }
        if (entry.style) {
          Object.entries(entry.style).forEach(([key, value])=>style += `${key}: ${value}; `);
        };
        const blockClass = entry.size !== undefined ? `block-${entry.size}` : '';
        html = `<div id="${panelId}" class="${blockClass} block" style="${style}">`;
        entry.contents.forEach(ent=>{
          ent.size = entry.size;
          html += this.entryToHtml(ent, prettyPathName);
        });
        html += `</div>`;
        break;
      }
      case 'config' :
        // this has already been read to set the style for this row
        // we can ignore it
    }
    return html;
  }


  populateLayout(columns) {
    this.timePanels.length = 0;
    this.tallyPanels.length = 0;
    const records = this.indexes.map(index=>Lookout.records[index]);
    columns.forEach(column => {
      column.forEach(entry => this.populatePanel(entry, records, this.refilterFnc));
    });
    if (this.testToggler) {
      const activeValues = this.testToggler.activeValues;
      this.panelsWithNegatives.forEach(panel=>{
        try {
          panel.updatePositiveTypes(activeValues);
        } catch (err) {
          console.log(`panel needs to implement "updatePositiveTypes(activeValues)"`,panel)
        }
      });
    }
  }

  populatePanel(entry, records, refilterFnc) {
    const hoverCallback = (weekIndex, dateIndex, count)=>this.handleBarHover(weekIndex, dateIndex, count);
    const panelId = this.entryToId(entry);
    if (entry.kind === 'disease') {
      this.timePanels.push(new Bars(`panel-${panelId}`, panelId, entry, hoverCallback));
    } else if (entry.kind === 'positivityseries') {
      const panel = new Positivityseries(`panel-${panelId}`, panelId, entry, hoverCallback);
      this.timePanels.push(panel);
      this.panelsWithNegatives.push(panel);
    } else if (entry.kind === 'multibars') {
      let datasource = entry.datasource ? this.dataSources[entry.datasource] : null
      const div = this.container.querySelector(`#${panelId}`);
      const pathogen = entry.pathogen || this.pathogen;
      this.timePanels.push(new MultiBars(div, panelId, entry, datasource, pathogen, hoverCallback));
    }else if (entry.kind === 'map') {
      const panel = new GeoMap(panelId, entry);
      this.geoPanels.push(panel);
      this.timePanels.push(panel);
    } else if (entry.kind === 'coordinate-map') {
      const panel = new CoordinateMap(panelId, entry);
      this.geoPanels.push(panel);
      this.timePanels.push(panel);
    } else if (entry.kind === 'map-readout') {
      const panel = new GeoBars(`panel-${panelId}`, entry);
      this.geoPanels.push(panel);
      this.timePanels.push(panel);
    } else if (entry.kind === 'donut') {
      const div = this.container.querySelector(`#${panelId}`);
      const dsource = this.dataSources[entry.abbrev];
      const donut = new Donut(div, dsource, entry);
    } else if (entry.kind === 'flatdonut') {
      const div = this.container.querySelector(`#${panelId}`);
      const dsource = this.dataSources[entry.abbrev];
      const donut = new FlatDonut(div, dsource, entry);
    } else if (entry.kind === 'treemap') {
      const div = this.container.querySelector(`#${panelId}`);
      const dsource = this.dataSources[entry.abbrev];
      const treemap = new Treemap(div, dsource, entry);
    } else if (entry.kind === 'textanalysis') {
      const div = this.container.querySelector(`#${panelId}`);
      const dsource = this.dataSources[entry.abbrev];
      const texter = new TextAnalysis(div, dsource, entry);
    } else if (entry.kind === 'leaderboard') {
      const div = this.container.querySelector(`#${panelId}`);
      const dsource = this.dataSources[entry.abbrev];
      const leaderboard = new Leaderboard(div, dsource, entry);
    } else if (entry.kind === 'filters') {
      const div = this.container.querySelector(`#${panelId}`);
      const redraw = ()=>this.updateSelection(Lookout.selectionIndex, Lookout.selectionCount);
      const filterList = new FilterList(div, this.pathogen, panelId, redraw);
      this.filterList = filterList;
    } else if (entry.kind === 'value-toggle') {
      const div = this.container.querySelector(`#${panelId}`);
      const dsource = this.dataSources[entry.abbrev];
      const toggler = new ValueToggle(div, dsource);
    } else if (entry.kind === 'test-toggle') {
      const div = this.container.querySelector(`#${panelId}`);
      const toggler = new TestToggle(div, this.pathogen, entry, refilterFnc);
      // this.tallyPanels.push(toggler);
      this.filters.push(rec=>toggler.test(rec, this.pathogen));
      this.filtersWithNegativeTests.push(rec=>toggler.testWithNegatives(rec, this.pathogen));
      this.testToggler = toggler;
    } else if (entry.kind === 'histogram') {
      const div = this.container.querySelector(`#${panelId}`);
      const dsource = this.dataSources[entry.abbrev];
      const histo = new Histogram(div, dsource);
    } else if (entry.kind === 'newicktree' || entry.kind === 'tree') {
      const dsource = this.dataSources[entry.abbrev];
      const tree = new NewickTreePanel(`panel-${panelId}`, panelId, this.indexes, entry, dsource);
      this.tallyPanels.push(tree);
    } else if (entry.kind === 'upgmatree') {
      const dsource = this.dataSources[entry.abbrev];
      const tree = new UPGMATreePanel(`panel-${panelId}`, panelId, this.indexes, entry, dsource);
      this.tallyPanels.push(tree);
    } else if (entry.kind === 'block') {
      if (entry.abbrev !== undefined && panelId !== '') {
        const div = this.container.querySelector(`#${panelId}`);
        const dsource = this.dataSources[entry.abbrev];
        new FieldDiv(div, dsource, entry);
      }
      entry.contents.forEach(ent=>{
        this.populatePanel(ent, records, refilterFnc)
      });
    } else if (entry.kind === 'toggleblock') {
      const div = this.container.querySelector(`#${panelId}`);
      const childIds = entry.contents.map(ent=>this.entryToId(ent));
      const block = new ToggleBlock(div, entry, childIds);
      entry.contents.forEach(ent=>{
        this.populatePanel(ent, records, refilterFnc)
      });
    }  
  }


  updateSelection(selectionIndex, selectionCount) {
    this.updateSelectionDisplay(this.dateRangeSpan, selectionIndex, selectionCount);
    const {filteredIndices, flatRecords, withNegatives} = this.getFilteredRecords();
    const activeTests = this.testToggler ? this.testToggler.activeValues : [];
    this.indexes = filteredIndices;
    this.timePanels.forEach(panel => {
      /*
      rather than repeat the execution of the filtering logic,
      just give over what we already have
      */
      if (this.panelsWithNegatives.includes(panel)) {
        panel.getRecords = ()=>withNegatives;
      } else {
        panel.getRecords = ()=>filteredIndices;
      }
      panel.updateSelection(selectionIndex, selectionCount, activeTests);
    });
    const cleaned = filteredIndices.flat().filter(index=>index !== undefined);
    Object.values(this.dataSources).forEach(ds=>ds.update(flatRecords, cleaned));
  }

  getFilteredRecords() {
    const flatRecords = [];
    const ogRecords = Lookout.selectionRecords(Lookout.pathogens[this.pathogen], this.dataInterval);
    const filteredIndices = ogRecords.map(bucket=>{
      return bucket.filter(index=>{
        const rec = Lookout.records[index];
        const passes = this.filters.reduce((passing, fnc)=>passing && fnc(rec), true);
        if (passes) flatRecords.push(rec);
        return passes;
      });
    });
    let withNegatives = [];
    if (this.panelsWithNegatives.length > 0) {
      withNegatives = ogRecords.map(bucket=>{
        return bucket.filter(index=>{
          const rec = Lookout.records[index];
          const passes = this.filtersWithNegativeTests.reduce((passing, fnc)=>passing && fnc(rec), true);
          return passes;
        })
      });
    }
    return {filteredIndices, flatRecords, withNegatives};
  }

  entryToId(entry) {
    let divId = '';
    const abbrev = entry.abbrev || '';
    switch(entry.kind) {
      case 'disease' :
      case 'unknown' :
        divId = `${this.pathogen}-${abbrev}`;
        break;
      case 'positivityseries' :
        divId = `${this.pathogen}-positivityseries-${abbrev}`;
        break;
      case 'map':
        divId = `${this.pathogen}-map-${abbrev}`;
        break;
      case 'coordinate-map':
        divId = `${this.pathogen}-coordinate-map-${abbrev}`;
        break;
      case 'map-readout':
        divId = `${this.pathogen}-map-readout-${abbrev}`;
        break;
      case 'donut':
        divId = `${this.pathogen}-donut-${abbrev}`;
        break;
      case 'flatdonut':
        divId = `${this.pathogen}-flatdonut-${abbrev}`;
        break;
      case 'leaderboard':
        divId = `${this.pathogen}-leaderboard-${abbrev}`;
        break;
      case 'filters':
        divId = `${this.pathogen}-${abbrev}`
        break;
      case 'value-toggle':
        divId = `${this.pathogen}-value-toggle-${abbrev}`;
        break;
      case 'test-toggle':
        divId = `${this.pathogen}-test-toggle-${abbrev}`;
        break;
      case 'histogram':
        divId = `${this.pathogen}-histogram-${abbrev}`;
        break;
      case 'category':
        divId = `${this.pathogen}-category-${abbrev}`;
        break;
      case 'tree': // the default tree type is newick
      case 'newicktree':
        divId = `${this.pathogen}-newicktree-${abbrev}`;
        break;
      case 'upgmatree':
        divId = `${this.pathogen}-upgmatree-${abbrev}`;
        break;          
      case 'treemap':
        divId = `${this.pathogen}-treemap-${abbrev}`;
        break;
      case 'textanalysis':
        divId = `${this.pathogen}-textanalysis-${abbrev}`;
        break;       
      case 'text':
        divId = `${this.pathogen}-text-${abbrev}`;
        break;
      case 'block': 
        divId = `${this.pathogen}-block-${abbrev}`;
        break;
      case 'multibars':
        divId = `${this.pathogen}-multibars-${abbrev}-${entry.source}`;
        break;
      case 'toggleblock':
        divId = `${this.pathogen}-toggleblock-${entry.id}`;
        break;
      }
    return divId;
  }

  updateGeo(geo) {
    let geoName = geo;
    this.geoPanels.forEach(panel=>{
      panel.highlightGeo(geo);
      geoName = panel.geoSet ? panel.geoSet[geo] : geoName;
    });
    this.updateGeoDisplay(this.siteSpan, geo, geoName);
  }

  redraw() {
    this.updateSelection(Lookout.selectionIndex, Lookout.selectionCount);
  }

  handleBarHover(weekIndex, startIndex, count) {
    this.timePanels.forEach(panel => {
      if (panel.handleWeekHover) {
        panel.handleWeekHover(weekIndex, startIndex, count);
      }
    });
    // const dailies = Lookout.pathogens[this.pathogen];
    // const endIndex = startIndex + count;
    // let indices = [];
    // for (let i = startIndex; i < endIndex; i++) {
    //   indices = indices.concat(dailies[i]);
    // }
    // this.tallyPanels.forEach(panel=>{if (panel.highlight) panel.highlight(indices); });
  }
}




