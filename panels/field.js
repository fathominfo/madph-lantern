import * as Lookout from '../lookout.js';
import { fetchJSON } from '../octet/util.js';
import { getHistogramPalette, getPaletteSet, getTextPalette } from '../paletteutil.js';
import { Labels } from '../util.js';
import { getTotalPropertyCounts, UNSET } from './common.js';

export const TYPES = {
  CATEGORICAL : 2,
  CONTINUOUS : 3
};


export const LISTENER_TYPES = {
  tally: 'tally', // provides a tally of results
  histogram : 'histogram', // bins results into histogram
  index : 'index', // provides a list of indices corresponding to Lookout.records
  text : 'text', 
  filterStatus : 'filter' // sends updates on hovered and filtering values
}

export const DEFAULT_TARGET_BIN_COUNT = 15;

export const MIN_WORD_COUNT = 2;

class Field {

  constructor(pathogen, entry, filterCallback) {
    this.pathogen = pathogen;
    this.filterCallback = filterCallback;
    this.prop = entry.abbrev;
    this.label = entry.label || entry.abbrev;
    const set = Lookout.site.sets[entry.set];
    this.includeEmpties = entry.include_empties;
    this.set = set || {};
    this.listeners = {};
    this.filterValue = null;
    this.hasTallies = false;
    this.hasHisto = false;
    this.hasIndex = false;
    this.hasText = false;
    this.test = ()=>true;
    if (entry.append_set) {
      this.metadict = Lookout.site.sets[entry.append_set];
      if (entry.append_glyphs) {
        this.metadictGlyphs = Lookout.site.sets[entry.append_glyphs];
      }
    }
  }

  addListener(listenerType, callback) {
    let list = this.listeners[listenerType];
    if (list === undefined) {
      list = [];
      this.listeners[listenerType] = list;
      if (listenerType === LISTENER_TYPES.tally) {
        this.initTallies();
      } else if (listenerType === LISTENER_TYPES.histogram) {
        this.initHistogram();
      } else if (listenerType === LISTENER_TYPES.index) {
        this.initIndexes();
      } else if (listenerType === LISTENER_TYPES.text) {
        this.initText();
      }
    }
    if (!list.includes(callback)) {
      list.push(callback);
    }
  }


  initTallies() {
    this.baseValues = getTotalPropertyCounts(this.prop);
    const counts = {}
    this.baseValues.forEach(([key])=>counts[key] = 0); 
    this.currentTally = counts;
    this.palette = getPaletteSet(this.prop);
    this.test = this.testTally;
    this.hasTallies = true;
  }

  initHistogram() {
    let minVal = NaN;
    let maxVal = NaN;
    /*
    use _all_ records, not just the records for this pathogen,
    so that the histogram is consistent across pathogens
    */
    Lookout.records.forEach(record=>{
      const value = record[this.prop];
      if (!Number.isNaN(value)) {
        if (Number.isNaN(minVal)) {
          minVal = value;
          maxVal = value;
        } else {
          if (minVal > value) minVal = value;
          if (maxVal < value) maxVal = value;
        }
      }
    });
    this.histogramData = new HistogramData(minVal, maxVal);
    this.palette = getHistogramPalette(this.prop);
    this.test = this.testHistogram;
    this.histoFiltering = false;
    this.hasHisto = true;
  }

  initIndexes() {
    this.inplace = [];
    this.hasIndex = true;
  }

  initText() {
    this.palette = getTextPalette();
    this.textInitted = false;
    this.textWorker = new Worker(new URL("/panels/textfieldworker.js", import.meta.url), {type: 'module'});
    this.textWorker.addEventListener('message', event=>{
      const payload = event.data;
      switch(payload.kind) {
        case 'init': {
          this.textInitted = true;
          this.baseValues = payload.baseValues;
          const indices = this.textIndicesCache;
          this.textIndicesCache = null;
          this.requestTextUpdate(indices);
          break;
        }
        case 'update': {
          if (payload.requestNum === this.requestNum) {
            this.listeners[LISTENER_TYPES.text].forEach(callback=>{
              callback(payload.wordCounts);
            });
          }
          break;
        }
        case 'filter' : 
          this.passingTextRecords = payload.passers;
          console.log(payload.passers)
          this.invokeFilter();
          break;
        default : 
        console.log(payload)
      }
    });
    this.requestNum = 0;
    this.passingTextRecords = Lookout.records.map(()=>true);
    const inputs = Lookout.records.map(record=>record[this.prop]);
    this.textWorker.postMessage({kind: 'init', records: inputs, property: this.prop});
    this.hasText = true;
    this.test = this.testText;
  }


  getSortedValues() {
    return this.baseValues?.map(([a])=>a);
  }


  tallyRecord(rec, dict){
    const value = rec[this.prop];
    if (value !== undefined) {
      if (dict[value] === undefined) {
        dict[value] = 1;
      } else {
        dict[value]++;
      }
    }
  }

  getMetadata(value) {
    if (!this.metadict) return null;
    const md = this.metadict[value] || '';
    const glyph = this.metadictGlyphs?.[md];
    return {value: md, glyph: glyph};
  }

  update(records, indices) {
    const counts = {};
    if (this.hasTallies) {
      this.baseValues.forEach(([key])=>counts[key] = 0); 
      records.forEach(rec=>this.tallyRecord(rec, counts));
      if (!this.includeEmpties && counts[''] !== undefined) {
        delete counts[''];
      }
      this.currentTally = counts;
      this.listeners[LISTENER_TYPES.tally].forEach(callback=>{
        callback(counts);
      });
    }
    if (this.hasHisto) {
      this.histogramData.clear();
      records.forEach(rec=>this.histogramData.assign(rec[this.prop]));
      this.histogramData.setMax();
      this.listeners[LISTENER_TYPES.histogram].forEach(callback=>{
        callback();
      });
    }
    if (this.hasIndex) {
      this.inplace.length = 0
      indices.forEach(index=>this.inplace[index] = true);
      this.listeners[LISTENER_TYPES.index].forEach(callback=>{
        callback(this.inplace);
      });
    }
    if (this.hasText) {
      if (!this.textInitted) {
        this.textIndicesCache = indices;
      } else {
        this.requestTextUpdate(indices);
      }
    }
  }

  requestTextUpdate(indices) {
    this.requestNum++;
    this.textWorker.postMessage({kind: 'update', indices: indices, requestNum: this.requestNum});
  }

  getCurrentCount(value) {
    return this.currentTally[value] || 0;
  }

  /* 
  for HTML inputs, the value is stored 
  as a string. When checking against records,
  they may need to be converted

  This feels like a hack: what if we get genuinely
  numeric values that don't require a set? 

  */
  getRecordValue(asString) {
    if (this.set) {
      const numeric = parseInt(asString);
      if (Number.isFinite(numeric) && this.set[asString]) {
        return numeric;
      }
    }
    return asString;
  }

  toggleValue(value) {
    value = this.getRecordValue(value);
    if (value === this.filterValue) {
      this.filterValue = null;
    } else if (this.baseValues.map(([key])=>key).includes(value)) {
      this.filterValue = value;
    }
    if (this.hasText) {
      this.textWorker.postMessage({kind: 'filter', value: this.filterValue});
    } else {
      this.invokeFilter();
    }
  }

  invokeFilter() {
    const valueLabel = this.set[this.filterValue] || this.filterValue;
    this.filterCallback(this, this.filterValue, this.prop, valueLabel, this.label);
    this.listeners[LISTENER_TYPES.filterStatus]?.forEach(callback=>callback(this.filterValue));  
  }


  setHistogramRange(startIndex, endIndex) {
    this.histoFiltering = startIndex !== UNSET;
    if (this.histoFiltering) {
      this.rangeStart = this.histogramData.bins[startIndex];
      this.rangeEnd = this.histogramData.bins[endIndex + 1];
      this.filterValue = this.rangeStart;
    }
    /* HACK ALERT: the rangeEnd here is assumed to be an integer [mark 250228] */
    const valueLabel = `${this.rangeStart} up to ${this.rangeEnd}`;
    this.filterCallback(this, this.filterValue, this.prop, valueLabel, this.label);
    this.listeners[LISTENER_TYPES.filterStatus]?.forEach(callback=>callback(this.filterValue));
  }


  removeFilter() {
    if (this.hasText) {
      this.textWorker.postMessage({kind: 'filter', value: null});
      this.filterValue = null;
    } else {
      this.filterValue = null;
      if (this.histoFiltering) {
        this.histoFiltering = false;
      }
      this.listeners[LISTENER_TYPES.filterStatus]?.forEach(callback=>callback(this.filterValue));  
    }
  }


  highlight(value) {
    this.listeners[LISTENER_TYPES.filterStatus]?.forEach(callback=>callback(this.filterValue, value));
  }

  testTally(rec) {
    return this.filterValue === null || this.filterValue === rec[this.prop];
  }

  testHistogram(rec) {
    let passes = !this.histoFiltering;
    if (!passes) {
      const value = rec[this.prop];
      passes = value >= this.rangeStart && value < this.rangeEnd;
    }
    return passes; 
  }

  testText(rec) {
    return this.passingTextRecords[rec.index];
  }

}


class MultiValueField extends Field{

  tallyRecord(rec, dict){
    const list = rec[this.prop];
    if (list !== undefined) {
      list.forEach(value=>{
        if (dict[value] === undefined) {
          dict[value] = 1;
        } else {
          dict[value]++;
        }  
      });
    }
  }


  testTally(rec) {
    return this.filterValue === null || rec[this.prop]?.includes(this.filterValue);
  }

}



class HistogramData {

  constructor(minVal, maxVal) {
    this.minVal = minVal;
    this.maxVal = maxVal;
    const histo = new Labels(this.minVal, this.maxVal, DEFAULT_TARGET_BIN_COUNT);
    this.bins = histo.entries.map(entry=>entry.value);
    this.labels = histo.entries.map(entry=>entry.label);
    this.members = histo.entries.map(()=>[]);
    this.counts = histo.entries.map(()=>0);
    this.binCount = this.bins.length - 1;
    /* what bin is a record in now? */
    this.binMap = [];
    this.maxCount = 0;
  }

  clear() {
    this.members.forEach(arr=>arr.length = 0);
    this.maxCount = 0;
  }

  /* predicated on entry.value being the lower end of the range */
  getBindex(value) {
    let index = -1;
    for (let i = 0; i < this.bins.length; i++) {
      if (value < this.bins[i]) {
        break;
      }
      index++;
    }
    return index;
  };

  assign(value, index) {
    const bindex = this.getBindex(value);
    try {
      this.members[bindex].push(index);
      this.binMap[index] = bindex;
    } catch(err) {
      console.warn(`could not assign "${value}" to histogram at index "${bindex}"`);
    }
  }

  setMax() {
    this.counts = this.members.map(arr=>arr.length);
    this.maxCount = Math.max(...this.counts);
  }
  
  
}


export const getField = (pathogen, entry, filterCallback)=>{
  if (entry.is_array) {
    return new MultiValueField(pathogen, entry, filterCallback);
  }
  return new Field(pathogen, entry, filterCallback);
};



