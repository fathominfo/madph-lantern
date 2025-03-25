import * as Lookout from '../lookout.js' ;


export class Geography {
  config;
  svg = null;

  found;
  foundCodes = null;
  geoDom = {};

  // array mapping record indices to their geo
  // recordGeo;

  // all records by day, merged together from each geography
  // combined;

  viewMax;
  viewAmount = { };

  sortedCodes = [];
  geoCount = {};


  constructor(parentId, config) {
    this.config = config;
    this.prop = config.abbrev;
    this.parentId = parentId;
    this.geoSet = Lookout.site.sets[config.set];
    this.found = Lookout.geography.found;
    this.foundCodes = Object.keys(this.found);
    this.missingCodes = Lookout.geography.missing;
    this.unfiltered = new Array(Lookout.days.length);
    for (let i = 0; i < this.unfiltered.length; i++) {
      this.unfiltered[i] = [];
    }
    Lookout.records.forEach(({date_index}, i)=>this.unfiltered[date_index].push(i));
  }

  updateSelection(_, __, activeTests) {
    this.updateTallies(Lookout.selectionIndex, Lookout.selectionCount, activeTests);
  }


  getAllRecords() {
    const pathogen = Lookout.getSelectedPathogen();
    const cases = pathogen === null ? this.unfiltered : Lookout.pathogens[pathogen];
    const start = Lookout.selectionIndex; 
    const end = start + Lookout.selectionCount;
    return cases.slice(start, end);
  }


  updateTallies(selectionIndex, selectionCount, activeTests) {
    // for all records currently in view (all time intervals)
    // sum things up, either for everything, or for a single pathogen
    let geoCount = { }
    this.foundCodes.forEach(code => {
      geoCount[code] = 0;
    });

    const buckets = this.getRecords();
    buckets.forEach(subcases=>subcases.forEach(recordIndex=>{
      const record = Lookout.records[recordIndex];
      geoCount[record[this.prop]]++;
    }));


    this.viewMax = 0;
    this.foundCodes.forEach(code => {
      let count = geoCount[code];
      if (count > this.viewMax) {
        this.viewMax = count;
      }
    });
    this.foundCodes.forEach(code => {
      let value = (this.viewMax == 0) ? 0 : geoCount[code] / this.viewMax;
      if (value !== 0) {
        value = Math.pow(value, 0.5);  // take sqrt to get some color
      }
      this.viewAmount[code] = value;
    });

    // animate the map colors (one SoftFloat per code)
    this.sortedCodes = this.foundCodes.sort((a, b) => geoCount[b] - geoCount[a]);
    this.geoCount = geoCount;
  }


  handleWeekHover(weekIndex, startIndex, count) {
    this.updateTallies(startIndex, count);
  }

  highlightGeo(geo) {
    requestAnimationFrame(()=>{
      Object.entries(this.geoDom).forEach(([code, {svg}])=>{
        svg.classList.remove('highlight');
        svg.classList.toggle('back', geo!==code && Lookout.getSelectedGeo());
      });
      const dommy = this.geoDom[geo];
      if (dommy) {
        const mapItem = dommy.svg;
        if (mapItem) {
          mapItem.classList.add('highlight');
          const parent = mapItem.parentNode;
          parent.appendChild(mapItem);
        }
      }
    });
  }

}
