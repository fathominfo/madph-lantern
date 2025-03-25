import { ceil, fetchJSON, floor } from './octet/util.js';

import { getCookie, setCookie } from './util.js';

import { Timeline } from './panels/timeline.js';
import { Home } from './views/home.js';
import { Single } from './views/single.js';
import { Unknown } from './views/unknown.js';
import { MiniMap } from './panels/minimap.js';
import { SiteMap } from './panels/sitemap.js';



// mostly this is here so we can swap for testing;
// will not want to modify code for this setting in prod
// const LOCATION = 'ginkgo';
let location = null;
let config = null;

// get absolute url for data files in the location subfolder
export function getLocationUrl(uri) {
  let baseUrl = document.location.href;
  baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
  return `${baseUrl}/${location}/${uri}`;
}

export let site;

export let records;
export let days;
export let cases;
export let pathogens;
export let geography;

let timeline = null;
let minimap = null;
let sitemap = null;

let singlePathogen = null;
let hoverPathogen = null;
let hoverGeo = null;
let selectedGeo = null;
let selectedSite = null;

let currentView = null;
let homeView = null;
let unknownView = null;
let pathogenViews = { };

let geomap = null;


function setView(what) {
  if (currentView != null) {
    currentView.setVisible(false);
  }
  currentView = what;
  currentView.setVisible(true);
  if (currentView.redraw) {
    requestAnimationFrame(()=>currentView.redraw());
  }
}


export function viewHome() {
  timeline.setPositiveRecords();
  setView(homeView);
}


export function viewPathogen(pathogen) {
  // create each pathogen view panel when first asked for it
  if (!pathogens[pathogen]) {return;}
  if (!pathogenViews.hasOwnProperty(pathogen)) {
    if (pathogen !== 'unknown') {
      const layout = structuredClone(site.single.layout[pathogen] || site.single.layout.default);
      pathogenViews[pathogen] = new Single(pathogen, layout);
    } else {
      pathogenViews[pathogen] = unknownView;
    }
  }
  timeline.setPositiveRecords(pathogen);
  setView(pathogenViews[pathogen]);
}

export function getSelectedPathogen() {
  if (currentView.pathogen) {
    return currentView.pathogen;
  } else {
    return hoverPathogen;
  }
}

export function getSinglePathogen() {
  return singlePathogen;
}

export function setSinglePathogen(pathogen) {
  singlePathogen = pathogen;
  updateSelection();
}

export function getHoverPathogen() {
  return hoverPathogen;
}


export function setHoverPathogen(pathogen) {
  hoverPathogen = pathogen;
  updateSelection();  // maybe?
}


export function getHoverGeo() {
  return hoverGeo;
}


export function setHoverGeo(geo) {
  hoverGeo = geo;
  // console.log(geo);
  updateSelection();
  if (!selectedGeo) {
    currentView.updateGeo(geo);
  }
}

export function getSelectedGeo() {
  return selectedGeo;
}

export function setSelectedGeo(geo) {
  selectedGeo = selectedGeo !== geo ? geo : null;
  updateSelection();
  currentView.updateGeo(geo);
  minimap?.highlightGeo(selectedGeo);
}

export function getSelectedSite() {
  return selectedSite;
}

export function setSelectedSite(site) {
  selectedSite = selectedSite !== site ? site : null;
  updateSelection();
  sitemap.highlightSite(selectedSite);
}


// currently selected range; for now it's days, but need to keep open
// that it might be weeks (for coarser data), or perhaps even hours
export let selectionIndex;
export let selectionCount;


export function getSelection() {
  return [ selectionIndex, selectionIndex + selectionCount ];
}


// selection has changed, send update event to timeline and panels
function updateSelection() {
  timeline.updateSelection(selectionIndex, selectionCount);
  // homeView.updateSelection(selectionIndex, selectionCount);  // or just the current panel?
  currentView.updateSelection(selectionIndex, selectionCount);
}


export function setSelectionIndex(index) {
  // console.log(`setSelectionIndex(${index})`);
  selectionIndex = index;
  updateSelection();
}


export function setSelectionCount(count) {
  selectionCount = count;
}


// unlike the time intervals, these can/should be semantic names
// like day/week/year, instead of numbers like 7 or 30 or 365
export function getTimeTicks(intervalStamps, timeTickInterval) {
  let timeTicks = [ ];

  if (timeTickInterval == 'year') {
    let prev = null;
    intervalStamps.forEach((stamp, index) => {
      let year = parseInt(stamp.substring(0, 4));
      if (year !== prev) {
        timeTicks.push({
          "label": year,
          "index": index
        });
        prev = year;
      }
    });
    // console.log(this.intervalStamps);

  } else if (timeTickInterval == 'month') {
    const monthNames = [ '',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let prev = null;
    intervalStamps.forEach((stamp, index) => {
      let month = parseInt(stamp.substring(5, 7));
      if (month !== prev) {
        timeTicks.push({
          "label": monthNames[month],
          "index": index
        });
        prev = month;
      }
    });
    // console.log(this.timeTicks);

  } else {
    throw new Error(`time tick interval not supported: ${timeTickInterval}`);
  }
  return timeTicks;
}


/*
export function getPathogens() {
  site.layout

  columns.forEach(column => {
    column.forEach(entry => {
      if (entry.kind === 'disease') {
    // Just using bars everywhere, because it falls back to the
    // blocks dynamically, depending on the visible data.
    this.panels.push(new Bars('panel-' + entry.abbrev, entry));

}
*/


export function mergeRecords(entries, interval) {
  let intervalCount = ceil(entries.length / interval);

  // oh good, the [ ] here is optimized to be a single array ref,
  // so the outer array gets filled with the same empty array,
  // then updating [0] is the same as changing [1]
  // let outgoing = new Array(weekCount).fill([ ]);

  // allocate the dumb for-loop way
  let outgoing = new Array(intervalCount);
  for (let i = 0; i < intervalCount; i++) {
    outgoing[i] = [ ];
  }
  // well, was worth a shot
  // let outgoing = new Array(weekCount).map(() => { return [ ] });

  // console.log(outgoing);
  entries.forEach((array, index) => {
    let target = floor(index / interval);
    outgoing[target].push(...array);  // efficiency?
  });
  // console.log(outgoing);
  return outgoing;
}


export function selectionRecords(array, interval) {
    // all records within the selected area
    let subset = array.slice(selectionIndex, selectionIndex + selectionCount);
    const geoOfInterest = selectedGeo;
    if (geoOfInterest) {
        subset.forEach((recordList, timeIndex) => {
            subset[timeIndex] = recordList.filter(recordIndex => records[recordIndex].geo === geoOfInterest)
        });
    }
    const siteOfInterest = selectedSite;
    if (siteOfInterest) {
      subset.forEach((recordList, timeIndex) => {
        subset[timeIndex] = recordList.filter(recordIndex => records[recordIndex].site_region_code === siteOfInterest);
      })
    }

    // unless explicitly overridden, use the interval from the overview
    interval = interval || getDefaultInterval();

  if (interval === 1) {
    // this.positiveRecords = Lookout.cases.positive;
    // this.suspectedRecords = Lookout.cases.suspected;
    // return array.slice(selectionIndex, selectionIndex + selectionCount);
    return subset;

  } else if (interval > 0) {
    // this.positiveRecords = Lookout.mergeRecords(Lookout.cases.positive, 7);
    // this.suspectedRecords = Lookout.mergeRecords(Lookout.cases.suspected, 7);
    // return mergeRecords(array, interval, selectionIndex, selectionCount);
    return mergeRecords(subset, interval);

  } else {
    throw new Error(`data interval not supported: ${interval}`);
  }
}


export function selectionStamps(interval) {
  // unless explicitly overridden, use the interval from the overview
  interval = interval || getDefaultInterval();

  // get a stamp for each week
  // let count = this.positiveRecords.length;
  // this.intervalStamps = new Array(count);
  let count = floor(selectionCount / interval);
  // console.log(count, selectionCount, interval);
  let outgoing = new Array(count).fill(null);
  for (let i = 0; i < count; i++) {
    let which = selectionIndex + i*interval;
    // if (which >= 0 && which < days.length) {  // let's not hide errors yet
    outgoing[i] = days[which];
  }
  // console.log(outgoing);
  return outgoing;
}


export function getDefaultInterval() {
  if (homeView.overview != null) {  // probably remove this... [fry 241217]
    return overview.dataInterval
  }
  return site.timeline.dataInterval;
}


// return a dictionary with the keys as disease abbreviations,
// and the value an object containing the full name and list of tests
export function getDiseases() {
  return site.diseases;
}

// return a dictionary with keys as test abbreviations, 
// and the return value a dict with the display name of the test
export function getTests() {
  return site.tests;
}

// return a dictionary of color config information for maps and tests
// for tests
//  initial: colors for resting state. Keys are `fill` and `text`,
//     each of which is a dictionary with test codes as keys
//     and colors as values
//  hover: formatted just like initial
export function getColors() {
  return site.colors;
}



// . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


function updateLayout() {
  let elem = document.getElementById('outer');
  let targetAspect = 16 / 10;
  let winAspect = window.innerWidth / window.innerHeight;

  // clear anything from before
  elem.style.height = null;
  elem.style.width = null;

  let high = window.innerHeight;

  if (winAspect <= targetAspect) {  // letterbox
    high = window.innerWidth / targetAspect;
    elem.style.width = window.innerWidth + 'px';
    elem.style.height = high + 'px';
    elem.style.left = 0;
    elem.style.top = ((window.innerHeight - high) / 2) + 'px';
  } else {   // pillarbox
    let wide = window.innerHeight * targetAspect;
    elem.style.height = high + 'px';
    elem.style.width = wide + 'px';
    elem.style.left = ((window.innerWidth - wide) / 2) + 'px';
    elem.style.top = 0;
  }

  // set a target size for the font on the div, so that scaling
  // by percent elsewhere yields scaled results
  // elem.style.fontSize = `${Math.round(high * 0.02) }px`;
  const html = document.querySelector('html');
  html.style.fontSize = `${Math.round(high * 0.02) }px`;
}


function initResize() {
  window.addEventListener('resize', updateLayout);
  updateLayout();  // call once to handle initial layout
}


// For now, this is just determining the (default) location to show
function initConfig() {
  fetchJSON('config.json', data => {
    config = data;
    // https://developer.mozilla.org/en-US/docs/Web/API/Location/hash
    let hash = window.location.hash;
    if (hash.length > 0) {
      // A has in the URL will set the location and also set
      // a cookie so the hash won't always be required.
      location = hash.substring(1);
      setCookie('location', location);
    } else {
      // Check if a cookie has been set, and if so, use that.
      // Otherwise, fall back to the location seen in config.json.
      location = getCookie('location', config.defaultLocation);
    }
    initSite();
  });
}


function initSite() {
  Promise.all([
    fetchJSON(`${location}/site.json`, data => { site = data }),
    // kick this one off early before we hit our download thread max
    fetchJSON(`${location}/data/records.json`, data => { records = data }),
    fetchJSON(`${location}/data/days.json`, data => { days = data }),
    fetchJSON(`${location}/data/cases.json`, data => { cases = data }),
    fetchJSON(`${location}/data/pathogens.json`, data => { pathogens = data }),
    fetchJSON(`${location}/data/geography.json`, data => { geography = data }),

  ]).then(() => {
    const tm = site.timeline;
    // append records with their index for future convenience
    records.forEach((record, index) => record.index = index);
    selectionCount = tm.dataInterval * tm.selectionCount;
    // figure out the number of full data intervals available
    let intervalCount = floor(days.length / tm.dataInterval);
    // console.log('intervalCount', intervalCount);
    // days length is 37, dataInterval is 7
    // intervalCount will be floor(~5.286)
    // last full interval will start at 4
    selectionIndex = (intervalCount - tm.selectionCount) * tm.dataInterval;
    // console.log('selectionIndex =', selectionIndex);

    // create the global control for the top
    // bundle into weeks, selection is 12 weeks long, show ticks at year markers
    timeline = new Timeline('timeline', tm);

        // assume one map will be in use throughout
        // fetch it here so we can put a timeline in the minimap
        if (site.minimap) {
          minimap = new MiniMap(site.minimap, 'minimap');
        } else {
          document.getElementById('minimap').remove();
        }
        if (site.sitemap) {
          sitemap = new SiteMap(site.sitemap, 'sitemap', document.querySelector("#header-geo"));
        } else {
          document.getElementById('sitemap').remove();
        }

    homeView = new Home(site.layout);
    // TODO this should be checking whether 'unknown' is even a panel
    if ('symptoms' in site.sets) {
      unknownView = new Unknown(site.diseases, site.sets.symptoms, site.unknown);
    }
    currentView = homeView;
    let startView = homeView;
    if (site.startView) {
      switch (site.startView.view) {
        case 'unknown': {
          startView = unknownView || homeView; 
          break;
        }
        case 'single': {
          const pathogen = site.startView.pathogen;
          const layout = structuredClone(site.single.layout[pathogen] || site.single.layout.default);
          pathogenViews[pathogen] = new Single(pathogen, layout);
          startView = pathogenViews[pathogen];
        }
        break;
      }
      if (!site.startView.overview) {
        document.querySelectorAll('.column-container .home-button')
          .forEach(button=>button.remove());
      }
    }
    setView(startView);
    // setSelectionIndex(756);  // for manual debugging on a particular day
    updateSelection();
    // tallyTestOverlap('malaria'); // debugging 
  });
}

const tallyTestOverlap = (patho) => {
  const combos = {};
  const tests = site.diseases[patho].tests;
  const posies = pathogens[patho].flat();
  posies.forEach(index=>{
    const recTests = records[index][patho];
    const positiveResults = [];
    tests.forEach(t=>{
      if (recTests[t] === '+') positiveResults.push(t);
    });
    if(positiveResults.length > 0) {
      const key = positiveResults.join(',');
      if (combos[key] === undefined) combos[key] = 1;
      else combos[key]++;
    }
  });
  console.log(`test overlap for ${patho}:`, combos);
}



/*
// May bring this back if we want to cache loaded fonts globally.
// Right now we're re-loading for each Panel, which is a bit much,
// but seems to run very quickly, so maybe not a problem. [fry 241217]
function initFonts() {
  lightFont = loadFont('fonts/Roboto-Light.ttf');
  medFont = loadFont('fonts/Roboto-Medium.ttf');
}
*/


// . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


// initFonts();
initConfig();
initResize();
