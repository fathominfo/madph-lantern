import { TestToggle } from './testtoggle.js';
import * as Lookout from '../lookout.js';

export class OverviewToggle extends TestToggle {
  constructor(container, entry, triggerFilteringCallback) {
    super(container, null, entry, triggerFilteringCallback);
    /*
    the pathogen might not be specified in the home page map,
    which shows counts for _all_ pathogens
    */
    this.allPathogens = Object.keys(Lookout.site.diseases);
  }

  getSortedValues() {
    const values = Object.keys(Lookout.site.tests);
    return values;
  }

  testNegative(rec, patho) {
    if (patho !== undefined) {
      return super.testNegative(rec, patho);
    } 
    /* return if rec is negative for all pathogens */
    const isNeg = this.allPathogens.reduce((pos, path)=>pos || super.testNegative(rec, path), true);
    return isNeg;
  }

  testSomePositives(rec, patho) {
    if (patho !== undefined) {
      return super.testSomePositives(rec, patho);
    } 
    const isPos = this.allPathogens.reduce((pos, path)=>pos || super.testSomePositives(rec, path), false);
    return isPos;  
  }

  testSomePositivesAndNegative(rec, patho) {
    if (patho !== undefined) {
      return super.testSomePositivesAndNegative(rec, patho);
    }
    return this.testSomePositives(rec) || this.testNegative(rec);

  }

}


