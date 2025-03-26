import { legitWord, depluralize } from '../texttools.js';

const MIN_WORD_COUNT = 2;

let prop;
let inputs;
let baseValues;

let wordTotals = {};
let recordsWithTextCount = 0;

addEventListener('message', event=>{
  const payload = event.data;
  switch (payload.kind) {
    case 'init': 
      initRecords(payload.property, payload.records);
      break;
    case 'update': 
      update(payload.requestNum, payload.indices);
      break;
    case 'filter': 
      findFilteredRecords(payload.value);
  }
})



const initRecords = (property, records)=>{
  prop = property;
  inputs = records.map(value=>{
    let words = [];
    if (value) {
      const tokens = value.toLowerCase().split(/[\(\)\"<>\\\/.,&@:;-\s“”]+/);
      depluralize(tokens);
      // each word in the record should count only once, i.e.
      // if someone repeats themselves, it should not affect the total
      const valids = {};
      let word = tokens[0]
      let isLegit = legitWord(word);
      let before;
      let beforeIsLegit;
      if (isLegit) valids[word] = 1;
      for (let i = 1; i < tokens.length; i++) {
        before = word;
        beforeIsLegit = isLegit;
        word = tokens[i];
        isLegit = legitWord(word);
        if (isLegit) {
          valids[word] = 1;
          if (beforeIsLegit) {
            valids[`${before} ${word}`] = 1;
          }
        }
      }
      words = Object.keys(valids);
      if (words.length > 0) {
        words.sort();
        words.forEach(w=>incrementDict(w, wordTotals));
      }
    }
    return words;
  });
  baseValues = Object.entries(wordTotals);
  baseValues.forEach(([word, count])=>{
    if (count < MIN_WORD_COUNT) {
      // console.debug(`excluding ${word} with count ${count} < ${MIN_WORD_COUNT}`);
      delete wordTotals[word];
    } 
  });
  baseValues = Object.entries(wordTotals);
  for (let i = 0; i < inputs.length; i++) {
    inputs[i] = inputs[i].filter(w=>wordTotals[w] >= MIN_WORD_COUNT);
    if (inputs[i].length > 0) {
      recordsWithTextCount++;
    }
  }
  postMessage({kind: 'init', baseValues: baseValues})
}



const update = (requestNum, indices)=>{
  const singles = {};
  indices.forEach(index=>{
    inputs[index].forEach(w=>incrementDict(w, singles));
  });
  let sortedSingles = Object.entries(singles);
  sortedSingles.forEach(item=>appendBaselineDiff(item, wordTotals, sortedSingles.length));
  sortedSingles.sort(sortByBaselineDiff);
  sortedSingles = sortedSingles.slice(0, 15);
  const tokes = [];
  sortedSingles.filter(([w])=>w.indexOf(' ') >0).forEach((entry)=>{
    const pair = entry[0];
    const [t1, t2] = pair.split(' ');
    tokes[t1] = true;
    tokes[t2] = true;
  });
  sortedSingles = sortedSingles.filter(([w])=>w.indexOf(' ') >0 || tokes[w] === undefined);
  postMessage({kind : 'update', wordCounts: sortedSingles, requestNum: requestNum});
}




const findFilteredRecords = (value)=>{
  let containing; 
  if (value) {
    containing = [];
    inputs.forEach((words, index)=>{
      if (words.indexOf(value)>=0) {
        containing[index] = true;
      }
    });
  } else {
    containing = inputs.map(()=>true);
  }
  postMessage({kind: 'filter', passers: containing});
};





const incrementDict = (word, dict)=>{
  if (dict[word] === undefined) dict[word] = 1;
  else dict[word]++;
}



/* 
expects a and b to be arrays, with a numeric field in the secord position

sorts descending
*/
// const sortByCount = (a, b)=>{
//   let diff = b[1] - a[1];
//   if (diff === 0) {
//     diff = `${a[0] || ''}`.localeCompare(`${b[0] || ''}`);
//   }
//   return diff;
// }

const appendBaselineDiff = (item, baseLine, recCount)=>{
  const [word, count]= item;
  const baseCount = baseLine[word];
  item.push(count/baseCount);
  item.push(count/recCount);
  item.push(baseCount/recordsWithTextCount);
};

const sortByBaselineDiff = (a, b)=>{
  let diff = b[2] - a[2];
  if (diff === 0) {
    diff = `${a[0] || ''}`.localeCompare(`${b[0] || ''}`);
  }
  return diff;
} 
