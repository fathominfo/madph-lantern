import * as Lookout from '../lookout.js' ;
import { Bars } from "./bars.js";



export class CustomBars extends Bars {
	
  /*  
  dataSource is an array of arrays
  organized like the entries of Lookout.pathogens
  index 1 corresponds to date_index
  the entries in that array are the records that have cases on that day
  */
  constructor(parentId, canvasId, layout, hoverCallback, dataSource) {
    super(parentId, canvasId, layout, hoverCallback);
    this.dataSource = dataSource;
    this.id = layout.source;
    this.cases = dataSource.flat();
    this.tests = layout.tests;
    this.div = document.getElementById(parentId);
  }



  buildTests(activeTests) {

    this.filtered = this.getRecords();
    this.pathogenRecords = this.filtered.map(daily=>{
      return daily.filter(index=>this.cases.includes(index));
    });
    this.count = this.pathogenRecords.length;

    // Build groups of tests: go with the most reliable test
    // (i.e. a PCR result overrides an RDT result)
    // Throw it in the 'suspected' category as last resort
    // (i.e. if no tests done, or tests came back negative)
    let testTypes;
    let trackingSuspected = activeTests.indexOf('suspected') >= 0;
    let trackingNegative = false;
    if (activeTests.length === 0) {
      testTypes = this.tests.slice(0);
      trackingSuspected = true;
    } else {
      // sort the tests according this.config.tests
      testTypes = this.tests.filter(t=>activeTests.indexOf(t) >= 0);
    }


    this.groups = { };

    this.groupOrder.forEach(testName => {
      this.groups[testName] = new Array(this.count);
      for (let i = 0; i < this.count; i++) {
        this.groups[testName][i] = [ ];
      }
    })

    this.positiveCount = new Array(this.count).fill(0);
    this.negativeCount = new Array(this.count).fill(0);
    // recordList is the set of indices for a particular timeIndex,
    // (i.e. all records for the day or week that match this pathogen)
    this.pathogenRecords.forEach((recordList, timeIndex) => {
      recordList.forEach(recordIndex => {
        let record = Lookout.records[recordIndex];
        const [ testName ] = this.anyPositiveTest(record, testTypes);
        if (testName !== null) {
          this.groups[testName][timeIndex].push(recordIndex);
          this.positiveCount[timeIndex]++;
        } else if (trackingNegative && this.isNegative(record)) {
          this.groups['negative'][timeIndex].push(recordIndex);
          this.negativeCount[timeIndex]++;
        } else if (trackingSuspected && this.isSuspect(record)) {
          this.groups['suspected'][timeIndex].push(recordIndex);
        }
      });
    });

    this.countTests();
  }


  hide() {
    this.div.style.display = 'none';
  }

  show() {
    this.div.style.display = 'block';
  }

}