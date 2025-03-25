import * as Lookout from '../lookout.js';
import { getTestColorConfig } from '../paletteutil.js';
import { TEMPLATE_DIV } from './valuetoggle.js';
import { getPaletteSet } from '../paletteutil.js';


export class TestToggle {

  constructor(container, pathogen, entry, triggerFilteringCallback) {
    this.parentContainer = container;
    this.module = this.parentContainer.parentNode;
    this.div = TEMPLATE_DIV.cloneNode(true);
    this.div.classList.remove('value-toggle');
    this.rowTemplate = this.div.querySelector('label');
    this.rowTemplate.remove();
    container.appendChild(this.div);
    this.pathogen = pathogen;
    this.triggerFilteringCallback = triggerFilteringCallback;
    this.prop = entry.abbrev;
    this.label = entry.label || entry.abbrev;
    const set = Lookout.site.sets[entry.set];
    this.set = set || {};
    this.paletteSet = getPaletteSet(this.prop);
    this.values = this.getSortedValues();
    this.rowLookup = {};
    this.activeValues = [];
    this.test = this.testSomePositives;
    this.testWithNegatives = this.testUnfiltered;
    this.values.forEach((value)=>{
      const {row, input} = this.addToggle(value);
      this.div.appendChild(row);
      this.rowLookup[value] = row;
    });
    this.bindClicks();
    if (entry.label) {
      const labele = document.createElement('h3');
      labele.textContent = entry.label;
      // this.div.insertBefore(labele, this.div.childNodes[0]);
      container.insertBefore(labele, this.div);
    }
    this.div.classList.remove('value-toggle');
    // this.div.classList.add('test-toggle');
    this.values.forEach((value)=>{
      if (value !== 'negative') {
        this.activeValues.push(value);
      }
    });
  }

  bindClicks() {
    Object.entries(this.rowLookup).forEach(([value, row])=>{
      const input = row.querySelector('input');
      if (this.set && !Number.isNaN(parseInt(value))) {
        // the rec value is an number
        value = parseInt(value)
      }
      input.addEventListener('change', ()=> {
        this.handleClick(row, input, value);
      });
    });
  }

  handleClick(row, input, value) {
    const index = this.activeValues.indexOf(value);
    if (input.checked) {
      if (index < 0) {
        this.activeValues.push(value);
      }
    } else if (index >= 0) {
      this.activeValues.splice(index, 1);
    }
    this.activeValues.sort((a, b)=>this.values.indexOf(a) - this.values.indexOf(b));
    row.classList.toggle("active", input.checked);
    if (this.values.length === this.activeValues.length) {
      this.test = this.testUnfiltered;
      this.testWithNegatives = this.testUnfiltered;
    } else if (this.activeValues.length === 1 && this.activeValues[0] === 'negative') {
      this.test = this.testNegative;
      this.testWithNegatives = this.testNegative;
    } else if (this.activeValues.indexOf('negative') < 0) {
      this.test = this.testSomePositives;
      this.testWithNegatives = this.testSomePositivesAndNegative;
    } else {
      this.test = this.testSomePositivesAndNegative;
      this.testWithNegatives = this.testSomePositivesAndNegative;
    }
    this.triggerFilteringCallback(this, this.activeValues, this.prop, this.set);
  }




  // handleClick(row, input, value) {
  //   const index = this.activeValues.indexOf(value);
  //   if (input.checked) {
  //     if (index < 0) {
  //       this.activeValues.push(value);
  //     }
  //   } else if (index >= 0) {
  //     this.activeValues.splice(index, 1);
  //   }
  //   row.classList.toggle("active", input.checked);
  //   this.triggerFilteringCallback(this, this.activeValues, this.prop, this.set);
  // }

  addToggle(value) {
    const row = this.rowTemplate.cloneNode(true);
    const input = row.querySelector('input');
    input.value = value;
    

    const colorConfig = getTestColorConfig(value);
    const color = colorConfig.Toggle.Fill.Static;
    const textColor = colorConfig.Toggle.Text.Static;
    const borderColor = colorConfig.Toggle.Stroke.Static;
    const labels = Lookout.getTests();

    const label = labels[value].label;
    row.querySelector('.value').style.color = textColor;
    row.querySelector('.value').textContent = label;
    row.querySelector('.value').title = label;
    input.style.setProperty("--bg", color);
    input.style.setProperty("--border", borderColor);
    input.checked = value !== 'negative';

    if (this.values.length === 1) {
      input.disabled = true;
    }

    return {row, input};
  }

  getSortedValues() {
    /* start the list of values with the known tests for this pathogen */
    const values = Lookout.site.diseases[this.pathogen].tests.slice(0);
    /* append reselts that are not tests (like 'suspected') */
    Object.keys(Lookout.cases).filter(status=>status !== 'positive')
      .forEach(status=>values.push(status));
    /* we also want to track negative values */
    if (!values.includes('negative')) {
      values.push('negative');
    }
    return values;
  }

  // tallyRecord(rec, counts) {
  //   const status = this.getTestStatus(rec, this.pathogen);
  //   if (!status) {
  //     console.log('faulty logic');
  //     this.getTestStatus(rec, this.pathogen);
  //   }
  //   counts[status]++;
  // }

  testUnfiltered() {
    return true;
  }

  testNegative(rec, patho) {
    let pos = false;
    let anyTests = false;
    const tests = rec[patho];
    if (tests) {
      Object.entries(tests).forEach(([test, result])=>{
        if (test !== 'suspected') {
          anyTests = true;
          if (result === '+') {
            pos = true;
          }
        }
      });
    }
    return anyTests && !pos;
  }

  testSomePositives(rec, patho) {
    let pos = false;
    const tests = rec[patho];
    if (tests) {
      this.activeValues.forEach((test)=>{
        if (tests[test] === '+') {
          pos = true;
        }
      });
    }
    return pos;
  }

  testSomePositivesAndNegative(rec, patho) {
    // we have a mix of negative and certain test types
    let pos = false;
    let anyTests = false;
    let hasCorrectPos = false;
    const tests = rec[patho];
    if (tests) {
      Object.entries(tests).forEach(([test, result])=>{
        // did this record test positive 
        // for one of the tests we are after?
        if (result === '+' && this.activeValues.indexOf(test) >= 0) {
          // if yes, we don't need anything else
          hasCorrectPos = true;
        } else if (test !== 'suspected') {
          // look at the test to see if it's negative for all tests          
          anyTests = true;
          if (result === '+') {
            pos = true;
          }
        } 
      });
    }
    return hasCorrectPos || (anyTests && !pos);
  }



  // getTestStatus(rec) {
  //   let status;
  //   const tests = rec[this.pathogen];
  //   // leave off the negative entry
  //   const limit = this.values.length - 1;
  //   let anyNegatives = false;
  //   for (let i = 0; i < limit ; i++) {
  //     const result = tests[this.values[i]];
  //     if (result === '+') {
  //       status = this.values[i];
  //       break;
  //     }
  //     if (result === '-' && this.values[i] !== 'suspected') {
  //       anyNegatives = true;
  //     }
  //   }
  //   if (!status || status === 'suspected' && anyNegatives) {
  //     status = 'negative';
  //   }
  //   return status;
  // }

  updateTally() {
    // shouldn't need to do anything within test toggle
  }

}
