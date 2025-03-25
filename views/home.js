import * as Lookout from '../lookout.js' ;

import { View } from './view.js';

import { Overview } from '../panels/overview.js';
import { Bars } from '../panels/bars.js';
import { Geography } from '../panels/geography.js';
import { GeoBars } from '../panels/geobars.js';
import { Unknowns } from '../panels/unknowns.js';
import { ValueToggle } from '../panels/valuetoggle.js';
import { OverviewToggle } from '../panels/overviewtoggle.js';
import { colors } from '../palette.js';
import { GeoMap } from '../panels/geomap.js';


export class Home extends View {
  overview = null;
  timePanels = [ ];
  geoPanels = [ ];
  tallyPanels = [ ];
  panelsWithNegatives = [ ];

  filters = [ ];
  filtersWithNegativeTests = [ ];

  constructor(layout) {
    super();
    this.container = document.getElementById('home-container');
    this.container.style.backgroundColor = colors.Page.Overview.Fill;
    this.container.querySelector(".nav-site").textContent = Lookout.site.site;
    this.caseCountSpan = this.container.querySelector(".nav-case-count");
    this.siteSpan = this.container.querySelector(".nav-site");
    this.dateRangeSpan = this.container.querySelector(".nav-daterange");
    // fill in the various pathogens, maps, etc
    this.buildLayout(layout);
    // do after layout to bind properly
    this.populateLayout(layout);
  }

  buildLayout(columns) {
    const chartContainer = this.container.querySelector('.flex.main');
    chartContainer.innerHTML = '';
    this.container.style.display = 'flex';
    const lower = document.getElementById('flex-lower');
    lower.appendChild(this.container);


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
    columns.forEach((column, i) => {
      const col = document.createElement('div');
      const w = widths[i];
      col.className = 'block column';
      col.style.width = `${Math.round(w / total * 100)}%`;
      col.style.flexGrow = w;
      chartContainer.appendChild(col);
      column.forEach(entry => {
        const html = this.entryToHtml(entry);
        col.innerHTML += html;
        if (entry.kind === 'map') {col.style.gap = '0px'; col.style.padding = '0px';}
      });
      // column.forEach(entry => {
        //     // console.log(entry.kind);
      //     console.log(entry);
      //     if (entry.kind === 'disease' || entry.kind == 'unknown') {
      //         col.innerHTML +=
      //             `<div class="panel panel-${entry.size}" id="panel-${entry.abbrev}">
      //                 <h2>${entry.name}</h2>
      //             </div>`;
      //     } else if (entry.kind === 'map') {
      //         col.style.gap = '0px';
      //         col.innerHTML +=
      //             `<div class="panel panel-${entry.size}" id="map-${entry.abbrev}">
      //                 <!-- <object id="map" type="image/svg+xml" data="${location}/${entry.uri}"> </object> -->
      //             </div>`;
      //     } else if (entry.kind === 'map-readout') {
      //         col.innerHTML +=
      //         `<div class="panel panel-${entry.size}" id="map-readout-${entry.abbrev}">
      //         </div>`;
      //     } else if (entry.kind === 'overview') {
      //         // add a div with the sizing class, and a canvas inside that we'll populate
      //         col.innerHTML +=
      //             `<div class="panel panel-${entry.size}">
      //                 <canvas id="overview"> </canvas>
      //             </div>`;
      //     }
      // });
    });
  }

  entryToHtml(entry, opts) {
    let html = '';
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
        html = `<div class="panel panel-${entry.size}" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'map-readout':
        html = `<div class="pane panel-${entry.size}" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'donut':
        html = `<div class="panel panel-${entry.size} donut" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'leaderboard':
        html = `<div class="panel panel-${entry.size}" id="${panelId}" style="${style}" ></div>`;
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
        html = `<div class="panel panel-${entry.size} histogram" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'category':
        html = `<div class="panel panel-${entry.size} category" id="${panelId}" style="${style}" ></div>`;
        break;
      case 'tree':
        html = `<div class="panel panel-${entry.size} tree" id="panel-${panelId}" style="${style}" ></div>`;
        break;
      case 'treemap':
        html = `<div class="panel panel-${entry.size} treemap" id="${panelId}" style="${style}" ></div>`;
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
        const header = entry.label ? `<h3>${entry.label}</h3>` : '';
        const blockClass = entry.size !== undefined ? `block-${entry.size}` : '';
        if (classname === 'grid') {
          style += `display: grid; grid-template-columns: repeat(${entry.columns}, 1fr);`;
          html = `<div class="${blockClass} block ${classname}" style="${style}">${header}`;
          entry.contents.forEach(ent=>{
            html += this.entryToHtml(ent);
          });
        } else if (classname === 'row') {
          html = `<div class="${blockClass} block ${classname}" style="${style}">${header}`;
          if (entry.layout === "fit-content") {
            entry.contents.forEach(ent=>{
              html += this.entryToHtml(ent);
            });
          } else {
            const hasSquare = entry.contents.reduce((any, ent)=>any || ent.size === 'square', false);
            if (hasSquare) {
              entry.contents.forEach(ent=>{
                html += this.entryToHtml(ent);
              });
            } else {
              if (hasSquare) {
                console.warn(`custom layout for blocks with square members has not been implemented for rows with more than two members`);
              }
              const widths = entry.contents.map(ent=>ent.columns || 1);
              const tot = widths.reduce((tot, w)=>tot + w, 0);
              entry.contents.forEach((ent, i)=>{
                const wpct = Math.round(widths[i] / tot * 100);
                html += this.entryToHtml(ent, {style: `width: ${wpct}%; `});
              });
            }
          }
        } else if (classname === 'column') {
          const columns = entry.columns || 1;
          style += `flex-grow: ${columns}; `;
          html = `<div class="${blockClass} block ${classname}" style="${style}">${header}`;
          entry.contents.forEach(ent=>{
            html += this.entryToHtml(ent);
          });
        }
        html += `</div>`;
        break;
      }
      case 'config' :
        // this has already been read to set the style for this row
        // we can ignore it
    }
    return html;
  }

  entryToId(entry) {
    let divId = '';
    const abbrev = entry.abbrev || '';
    switch(entry.kind) {
      case 'disease' :
      case 'unknown' :
        divId = `panel-${abbrev}`;
        break;
      case 'positivityseries' :
        divId = `positivityseries-${abbrev}`;
        break;
      case 'map':
        divId = `map-${abbrev}`;
        break;
      case 'map-readout':
        divId = `map-readout-${abbrev}`;
        break;
      case 'donut':
        divId = `donut-${abbrev}`;
        break;
      case 'leaderboard':
        divId = `leaderboard-${abbrev}`;
        break;
      case 'filters':
        divId = `${abbrev}`
        break;
      case 'value-toggle':
        divId = `value-toggle-${abbrev}`;
        break;
      case 'test-toggle':
        divId = `test-toggle-${abbrev}`;
        break;
      case 'histogram':
        divId = `histogram-${abbrev}`;
        break;
      case 'category':
        divId = `category-${abbrev}`;
        break;
      case 'tree':
        divId = `tree-${abbrev}`;
        break;
      case 'treemap':
        divId = `treemap-${abbrev}`;
        break;
      case 'text':
        divId = `text-${abbrev}`;
        break;
    }
    return divId;
  }

  // buildLayout(columns) {
  //     const chartContainer = this.container.querySelector('.flex.main');
  //     let colCount = columns.length;
  //     let conGapPct = 0.5;
  //     let conGap = Math.floor((conGapPct / 100) * chartContainer.offsetWidth);
  //     chartContainer.style.gap = conGap + 'px';
  //     chartContainer.style.padding = '0' + ' ' + conGap + 'px';
  //     const widthPercent = ((100 - (conGapPct * (colCount + 1))) / colCount) + '%';
  //     columns.forEach(column => {
    //         let col = document.createElement('div');
  //         col.className = 'flex-column';
  //         col.style.minWidth = widthPercent;
  //         col.style.padding = conGap + 'px' + ' ' + '0';
  //         col.style.gap = conGap + 'px';
  //         chartContainer.appendChild(col);

  //         // using random colors just to have obvious shapes while debugging layout
  //         column.forEach(entry => {
    //             // console.log(entry.kind);
  //             if (entry.kind === 'disease' || entry.kind == 'unknown') {
  //                 col.innerHTML +=
  //                     `<div class="panel panel-${entry.size}" id="panel-${entry.abbrev}">
  //                         <h2>${entry.name}</h2>
  //                     </div>`;
  //             } else if (entry.kind === 'map') {
  //                 col.style.gap = '0px';
  //                 col.innerHTML +=
  //                     `<div class="panel panel-${entry.size}" id="map-${entry.abbrev}">
  //                         <!-- <object id="map" type="image/svg+xml" data="${location}/${entry.uri}"> </object> -->
  //                     </div>`;
  //             } else if (entry.kind === 'map-readout') {
  //                 col.innerHTML +=
  //                 `<div class="panel panel-${entry.size}" id="map-readout-${entry.abbrev}">
  //                 </div>`;
  //             } else if (entry.kind === 'overview') {
  //                 // add a div with the sizing class, and a canvas inside that we'll populate
  //                 col.innerHTML +=
  //                     `<div class="panel panel-${entry.size}">
  //                         <canvas id="overview"> </canvas>
  //                     </div>`;
  //             }
  //         });
  //     });
  // }


  populateLayout(columns) {
    this.timePanels.length = 0;
    this.tallyPanels.length = 0;
    const refilterFnc = (filter, activeValues, prop, set, label)=> {
      this.updateSelection(Lookout.selectionIndex, Lookout.selectionCount);
      if (prop === 'tests') {
        this.panelsWithNegatives.forEach(panel=>{
          try {
            panel.updatePositiveTypes(activeValues);
          } catch {}
        });
      }
    };
    const records = Lookout.records;
    columns.forEach(column => {
      column.forEach(entry => this.populatePanel(entry, records, refilterFnc));
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
    // const hoverCallback = (weekIndex, dateIndex, count)=>this.handleBarHover(weekIndex, dateIndex, count);
    // columns.forEach(column => {
      //     column.forEach(entry => {
        //         if (entry.kind === 'disease') {
    //             // Just using bars everywhere, because it falls back to the
    //             // blocks dynamically, depending on the visible data.
    //             this.panels.push(new Bars('panel-' + entry.abbrev, entry.abbrev, entry, hoverCallback));

    //         } else if (entry.kind === 'unknown') {
    //             this.panels.push(new Unknowns('panel-' + entry.abbrev, entry.abbrev, entry, hoverCallback));

    //         } else if (entry.kind === 'map') {
    //             const panel = new Geography('panel-map-' + entry.abbrev, entry);
    //             this.panels.push(panel);
    //             this.geoPanels.push(panel);

    //         } else if (entry.kind === 'map-readout') {
    //             const panel = new GeoBars('panel-map-readout-' + entry.abbrev, entry);
    //             this.panels.push(panel);
    //             this.geoPanels.push(panel);

    //         } else if (entry.kind === 'overview') {
    //             this.panels.push(overview = new Overview('overview', entry));
    //         }
    //     });
    // });
  }

  populatePanel(entry, records, refilterFnc) {
    const hoverCallback = (weekIndex, dateIndex, count)=>this.handleBarHover(weekIndex, dateIndex, count);
    const panelId = this.entryToId(entry);
    if (entry.kind === 'disease') {
      this.timePanels.push(new Bars(`panel-${panelId}`, panelId, entry, hoverCallback, true));
    } else if (entry.kind === 'unknown') {
      this.timePanels.push(new Unknowns(`panel-${panelId}`, panelId, entry, true));
    } else if (entry.kind === 'positivityseries') {
      const panel = new Positivityseries(`panel-${panelId}`, panelId, entry, hoverCallback);
      this.timePanels.push(panel);
      this.panelsWithNegatives.push(panel);
    } else if (entry.kind === 'map') {
      const panel = new GeoMap(`panel-${panelId}`, entry);
      this.geoPanels.push(panel);
      this.timePanels.push(panel);
    } else if (entry.kind === 'map-readout') {
      const panel = new GeoBars(`panel-${panelId}`, entry);
      this.geoPanels.push(panel);
      this.timePanels.push(panel);
    } else if (entry.kind === 'value-toggle') {
      const div = this.container.querySelector(`#${panelId}`);
      // prime the colors
      getPaletteSet(entry.abbrev);
      const toggler = new ValueToggle(div, this.pathogen, records, entry, refilterFnc);
      this.tallyPanels.push(toggler);
      this.filters.push(rec=>toggler.test(rec));
      this.filtersWithNegativeTests.push(rec=>toggler.test(rec));
      this.negag
    } else if (entry.kind === 'test-toggle') {
      const div = this.container.querySelector(`#${panelId}`);
      const toggler = new OverviewToggle(div, entry, refilterFnc);
      this.tallyPanels.push(toggler);
      this.filters.push((rec, pathogen)=>toggler.test(rec, pathogen));
      this.filtersWithNegativeTests.push((rec, pathogen)=>toggler.testWithNegatives(rec, pathogen));
      this.testToggler = toggler;
    } else if (entry.kind === 'histogram') {
      const palette = getPaletteSet(entry.abbrev);
      const hoverCallback = indices=>this.handleHistoHover(indices);
      this.tallyPanels.push(new Histogram(`panel-${panelId}`, panelId, this.indexes, entry, hoverCallback));
    } else if (entry.kind === 'category') {
      // const palette = getPaletteSet(entry.abbrev);
    } else if (entry.kind === 'tree') {
      const hoverCallback = index=>this.handleTreeHover(index)
      this.tallyPanels.push(new TreePanel(`panel-${panelId}`, panelId, this.indexes, entry, hoverCallback));
    } else if (entry.kind === 'block') {
      entry.contents.forEach(ent=>{
        this.populatePanel(ent, records, refilterFnc)
      });
    }
  }


  updateSelection(selectionIndex, selectionCount) {
    this.updateSelectionDisplay(this.dateRangeSpan, selectionIndex, selectionCount);
    this.updateCaseCountDisplay(this.caseCountSpan, selectionIndex, selectionCount);
    const activeTests = this.testToggler ? this.testToggler.activeValues : [];
    this.timePanels.forEach(panel => {
      // if (this.panelsWithNegatives.includes(panel)) {
      //   panel.getRecords = ()=>withNegatives;
      // } else {
      //   panel.getRecords = ()=>filteredIndices;
      // }
      panel.getRecords = () => {
        const recordIndices = panel.getAllRecords();
        const filteredIndices = recordIndices.map(bucket=>{
          return bucket.filter(index=>{
            const rec = Lookout.records[index];
            const passes = this.filters.reduce((passing, fnc)=>passing && fnc(rec, panel.abbrev), true);
            return passes;
          });
        })
        return filteredIndices;
      }
      panel.updateSelection(selectionIndex, selectionCount, activeTests);
    });
  }

  updateGeo(geo) {
    let geoName = geo;
    this.geoPanels.forEach(panel=>{
      panel.highlightGeo(geo);
      geoName = panel.geoSet ? panel.geoSet[geo] : geoName;
    });
    this.updateGeoDisplay(this.siteSpan, geo, geoName);
  }

  handleTreeHover(indices) {
    this.tallyPanels.forEach(panel=>{if (panel.highlight) panel.highlight(indices); });
  }

  handleBarHover(weekIndex, startIndex, count) {
    // console.log(weekIndex, startIndex, count, Lookout.days[startIndex])
    this.timePanels.forEach(panel => {
      panel.handleWeekHover(weekIndex, startIndex, count);
    });
  }

  redraw() {
    this.updateSelection(Lookout.selectionIndex, Lookout.selectionCount);
  }

}