import * as Lookout from '../lookout.js' ;
// import { arrayOfArrays, Labels } from '../util.js';
import { Bars } from './bars.js';

const HOVER_TEXT_COLOR = '#696969';

export class Unknowns extends Bars {

  constructor(parentId, canvasId, layout, hoverCallback, link) {
    if (!layout.options) {
      layout.options = {'name' : 'Unknown'};
    } else if (!layout.options.name) {
      layout.options.name = 'Unknown';
    }
    super(parentId, canvasId, layout, hoverCallback, link);
    this.compareSeriesName = 'suspectedCount';
    // need these because pretending to be a pathogen, but it's
    // silly to put the dummy information in the site.json file
    this.abbrev = 'unknown';
    this.config = {
      'tests': [ ]
    }
  }


  buildTests() {
    // get all records for this fake pathogen
    let pathos = Lookout.pathogens[this.abbrev];
    // records that are inside the current viewing area
    this.pathogenRecords = Lookout.selectionRecords(pathos, this.dataInterval);
    this.count = this.pathogenRecords.length;

    this.groups = { };
    this.groupOrder.forEach(testName => {
      this.groups[testName] = new Array(this.count);
      for (let i = 0; i < this.count; i++) {
        this.groups[testName][i] = [ ];
      }
    })

    // Fill with dummy data to avoid problems if superclass methods are
    // called that depend on this being filled with something.
    this.positiveCount = new Array(this.count).fill(0);
    this.suspectedCount = new Array(this.count).fill(0);
    // recordList is the set of indices for a particular timeIndex,
    // (i.e. all records for the day or week that match this pathogen)
    this.pathogenRecords.forEach((recordList, timeIndex) => {
      recordList.forEach(recordIndex => {
        this.groups['suspected'][timeIndex].push(recordIndex);
        this.suspectedCount[timeIndex]++;
      });
    });

    this.countTests();
  }

}