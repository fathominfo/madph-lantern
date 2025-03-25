import * as Lookout from '../lookout.js' ;

import { View } from './view.js';
import { UnknownsTable, VISIBLE_DISEASE_COUNT } from '../panels/unknownstable.js';

const MIN_CASES_PER_PATH = 50;
const REPORTED_SYMPTOM_COUNT_BASELINE = 5;

export class Unknown extends View {

  constructor(pathogens, symptoms, config) {
    super();
    this.pathogens = structuredClone(pathogens);
    this.symptoms = structuredClone(symptoms);
    this.symptomGroups = structuredClone(config.symptom_groups);
    this.container = document.querySelector('#unknowns-container');
    this.caseCountSpan = this.container.querySelector(".nav-case-count");
    this.siteSpan = this.container.querySelector(".nav-site");
    this.dateRangeSpan = this.container.querySelector(".nav-daterange");
    this.container.style.display = "none";
    this.allRecords = Lookout.pathogens['unknown'];
    this.records = [];
    this.symptomFilters = [];
    this.chart = new UnknownsTable(
      'unknowns-table-container',
      'unknowns-table',
      config.case_properties,
      symptomConfig=>this.handleSymptomToggle(symptomConfig),
      pathogens
    );
    this.chart.setSymptoms(this.symptomGroups, symptoms);
    this.pathogenSymptomCounts = {};
    this.pathogenSymptomFrequencies = {};
    this.setPathogenSymptomFreq(Object.keys(symptoms), Object.keys(pathogens));

    const homeButton = this.container.querySelector(".home-button");
    homeButton.addEventListener("click", () => Lookout.viewHome());
  }

  /* for all time */
  setPathogenSymptomFreq(symptoms, pathogens) {
    const symptomTally = {total: 0};
    /* track the unique pathogens for this symptom */
    const symptomPathogens = {};
    symptoms.forEach(s=>{
      symptomTally[s] = 0;
      symptomPathogens[s] = {};
    });
    const pathSymptomFreq = {};
    pathogens.forEach(path=>pathSymptomFreq[path] = structuredClone(symptomTally));
    Lookout.records.forEach(rec=>{
      const symptoms = rec.symptoms || [];
      pathogens.forEach(path=>{
        const tests = rec[path];
        if (tests) {
          const positives = Object.entries(tests).filter(([test, result])=>test!=='suspected' && result === '+');
          if (positives.length > 0) {
            pathSymptomFreq[path].total++;
            symptoms.forEach(s=>{
              pathSymptomFreq[path][s]++;
              symptomPathogens[s][path] = true;
            });
          }
        }
      });
    });
    this.pathogenSymptomCounts = pathSymptomFreq;
    /*
    a score for how many pathogens a symptom appears in
    fewer pathogens = > higher number
    more pathogens => lower number
    */
    const symptomUniqueness = {};
    const pathCount = pathogens.length;
    Object.entries(symptomPathogens)
    .forEach(([s, uqs])=>symptomUniqueness[s] = Math.log(pathCount / Object.keys(uqs).length));
    this.pathogenSymptomFrequencies = {};
    Object.entries(pathSymptomFreq).forEach(([path, tally])=>{
      const total = tally.total || 1;
      const weighted = {total};
      const maxCount = Math.max(...Object.values(tally)) || 1;
      Object.entries(tally)
      .filter(([s])=>s !== 'total')
      .forEach(([s, count])=>{
        weighted[s] = (count / maxCount) * symptomUniqueness[s];
      });
      this.pathogenSymptomFrequencies[path] = weighted;
    });
    // console.log(this.pathogenSymptomFrequencies);
  }


  updateSelection(selectionIndex, selectionCount) {
    this.updateSelectionDisplay(this.dateRangeSpan, selectionIndex, selectionCount);
    // this.updateCaseCountDisplay(this.caseCountSpan, selectionIndex, selectionCount);
    const buckets = Lookout.selectionRecords(this.allRecords, this.dataInterval);
    this.records.length = 0;
    buckets.forEach(arr=>{
      arr.forEach(index=>{
        const rec = Lookout.records[index];
        this.records.push(rec);
      });
    });
    this.sortCases();
    this.chart.update(this.records);
  }

  /*
  symptomConfig is of type SymptomConfig, defined in unknownstable.js
  */
  handleSymptomToggle(symptomConfig) {
    const {code, isGroup, members} = symptomConfig;
    if (isGroup) {
      // are all members in the list?
      const indices = members.map(item=>this.symptomFilters.indexOf(item.code));
      const included = indices.filter(index=>index >= 0)
      if (included.length === members.length) {
        /*
        yes, all members are in the list, so remove them all.
        sort them in descending order to remove them without
        affecting the position
        */
        included.sort((i1, i2)=>i2-i1);
        included.forEach(index=>this.symptomFilters.splice(index, 1));
      } else {
        /* only add the members not included */
        members.forEach((m, i)=>{
          if (indices[i] < 0) {
            this.symptomFilters.push(m.code);
          }
        });
      }
    } else {
      const index = this.symptomFilters.indexOf(code);
      if (index < 0) {
        this.symptomFilters.push(code);
      } else {
        this.symptomFilters.splice(index, 1);
      }
    }
    this.sortCases();
    this.chart.setSelectedSymptoms(this.symptomFilters);
    const asWeights = {};
    this.symptomFilters.forEach(s=>asWeights[s] = 1);
    const { scores } = this.sortPathogensBySymptoms(asWeights);
    this.updateChartPathogens(scores);
  }

  sortCases() {
    const {symptomFilters, records} = this;
    if (symptomFilters.length === 0) {
      records.sort((a,b)=>a.date_index - b.date_index);
    } else {
      /*
      weight the symptoms according to frequency: more
      frequent symptoms are less distinguishing
      */
      const symptomWeight = {};
      records.forEach(rec=>(rec.symptoms || []).forEach(s=>{
        if (symptomWeight[s] === undefined) symptomWeight[s] = 1;
        else symptomWeight[s]++;
      }));
      for (let s in symptomWeight) {
        symptomWeight[s] = 1 / Math.sqrt(symptomWeight[s]);
      }

      /* append the number of symptom matches to each case */
      records.forEach(rec=>{
        let score = 0;
        (rec.symptoms || []).forEach(s=>{
          if (symptomFilters.includes(s)) score += symptomWeight[s];
        });
        rec._symptomMatchScore = score;
      });
      /*
      sort by the number of symptom matches or,
      if those are equal, by the date
      */
      records.sort((a,b)=>b._symptomMatchScore - a._symptomMatchScore || a.date_index - b.date_index);
    }
  }

  sortPathogensBySymptoms(symptomFreqs) {
    /*
    sort each pathogen by how well it matches the pattern
    of incoming symptom frequencies.

    incoming reported symptoms more heavily.
    */
    const symptomCount = this.symptomFilters.length;
    const pathogenSymptomFrequencies = this.pathogenSymptomFrequencies;
    if (symptomCount === 0) {
      const scores = [];
      return {scores, pathogenSymptomFrequencies};
    }
    let presentSymptomWeight = REPORTED_SYMPTOM_COUNT_BASELINE / symptomCount;
    presentSymptomWeight = Math.max(presentSymptomWeight, 1);
    const scores = Object.entries(pathogenSymptomFrequencies)
    .filter(([path, pathSymptomFreq])=>pathSymptomFreq.total >= MIN_CASES_PER_PATH)
    .map(([path, pathSymptomFreq])=>{
      // console.log(`               ${path}`);
      let score = Object.entries(pathSymptomFreq).reduce((total, [s, pathWeight])=>{
        if (s === 'total') return total;
        let oWeight = symptomFreqs[s];
        let scoreWeight = 5;
        if (oWeight === undefined) {
          oWeight = 0;
          scoreWeight = 1;
        }
        const delta = (oWeight - pathWeight) * scoreWeight;
        // console.log(`                   ${s}    ${pathWeight}  ${Math.abs(delta)}   ${total + delta * delta}`)
        return total + delta * delta;
      }, 0);
      score = Math.sqrt(score);
      // console.log(`                   ${path} ${score}`);
      return [path, score];
    });
    scores.sort((a, b)=>a[1] - b[1]);
    // scores.slice(0,3).forEach(([p,score])=>console.log(p, score, symptomFreqs, this.pathogenSymptomFrequencies[p]));
    return {scores, pathogenSymptomFrequencies};
  }


  updateChartPathogens(scores) {
    const pathScoreInfo = scores.slice(0, VISIBLE_DISEASE_COUNT)
    .map(([path, score])=>{
      const counts = this.pathogenSymptomCounts[path];
      const weights = this.pathogenSymptomFrequencies[path];
      return {path, score, counts, weights};
    });
    this.chart.setMatchingPathogens(pathScoreInfo);
  }



}






