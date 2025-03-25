// Returns % change between two values as a positive or negative number,
// with 100 (not 1.0) representing 100%.
export function compareChange(oldValue, newValue) {
  return (newValue > oldValue) ?
  Math.round(-100 * (newValue - oldValue) / oldValue) :
  Math.round(100 * (oldValue - newValue) / oldValue);
}


export function compareReadout(oldValue, newValue) {
  if (oldValue != newValue && oldValue != 0 && newValue != 0) {
    let pct = compareChange(oldValue, newValue);
    if (Math.abs(pct) <= 500) {
      return (pct < 0 ? '\u25B2' : '\u25BC') + ' ' + Math.abs(pct) + '%';
    } else {
      // way up or way down; seems silly to show percentage here
      // return pct < 0 ? '\u25B2\u25B2' : '\u25BC\u25BC';
      return pct < 0 ? '\u25B2' : '\u25BC';
    }
  }
  return null;
}

export function abs(val) {
  return val >= 0 ? val : -val;
}


// Yuck! don't do this at home (via https://stackoverflow.com/a/1484514)
export function randomColor() {
  let letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function hexToRGB(hex) {
  hex = hex.replace('#', '');

  // If the hex is shorthand (e.g., #bbb), expand it
  if (hex.length === 3) {
    hex = hex.split('').map(x => x + x).join('');
  }

  // Parse the red, green, and blue components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgb(${r}, ${g}, ${b})`;
}

export function hexToRGBA(hex, alpha) {
  hex = hex.replace('#', '');

  // If the hex is shorthand (e.g., #bbb), expand it
  if (hex.length === 3) {
    hex = hex.split('').map(x => x + x).join('');
  }

  // Parse the red, green, and blue components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


// Allocate a two-dimensional array. If 'innerCount' is specified,
// will pre-allocate the inner arrays with that many entries.
// If 'filling' is also specified, that value will be used to fill
// each entry in the inner arrays. If 'innerCount' set, but 'filling'
// not passed, inner values will be set to 0.
export function arrayOfArrays(outerCount, innerCount=0, filling=0) {
  let outgoing = new Array(outerCount);
  for (let i = 0; i < outerCount; i++) {
    if (innerCount > 0) {
      outgoing[i] = new Array(innerCount).fill(filling);
    } else {
      outgoing[i] = [ ];
    }
  }
  return outgoing;
}



let unspecifiedCanvasId = 0;
// Create a canvas with the specified id, and attach it as the only
// child to a parent element (removing any other elements from the parent).
// parentId - id of the <div> or other element to be attached to
// canvasId - the id for the canvas that will be created
// returns - the canvasId
// TODO probably need to just make this the default behavior for Octet
export function makeCanvas(parentId, canvasId) {
  const parent = document.getElementById(parentId);
  if (parent != null) {
    if (canvasId === undefined) {
      canvasId = `canvas-${unspecifiedCanvasId++}`;
    }
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    // otherwise canvas will do a default size like 300x150
    // (was getting 320, but maybe that's from the flexbox?)
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    // parent.appendChild(canvas);
    parent.replaceChildren(canvas);
    // https://stackoverflow.com/a/8739704
    parent.style.backgroundColor = 'transparent';
    // return canvas;
    return canvasId;
  }
  return null;
}

/**
* nicenum: find a "nice" number approximately equal to x.
* Round the number if round is true, take ceiling if round is false
*/
function niceNum(x, round) {
  let expv = Math.floor(log10(x));  // exponent of x
  // f is the fractional part of x
  let f = x / Math.pow(10, expv);    // between 1 and 10
  let nf;        /* nice, rounded fraction */
  if (round) {
    if (f < 1.5) nf = 1;
    else if (f < 3) nf = 2;
    else if (f < 7) nf = 5;
    else nf = 10;
  } else {
    if (f <= 1) nf = 1;
    else if (f <= 2) nf = 2;
    else if (f <= 5) nf = 5;
    else nf = 10;
  }
  return nf * Math.pow(10, expv);
}

function log10(num) {
  return Math.log(num) / Math.log(10);
}

/*
* Nice Numbers for Graph Labels
* by Paul Heckbert
* from "Graphics Gems", Academic Press, 1990
* label.c: demonstrate nice graph labeling
* Paul Heckbert  2 Dec 88
*/
export function Labels(_min, _max, _ticks, _fractional=true) {
  // we expect min != max

  let range = niceNum(_max - _min, false);
  let d = niceNum(range / (_ticks - 1), true);  // tick mark spacing

  this.min = Math.floor(_min / d) * d;
  this.max = Math.ceil(_max / d) * d;

  // # of fractional digits to show
  let nfrac = Math.floor(Math.max(-Math.floor(log10(d)), 0));

  // this.value = [ ];
  // this.label = [ ];
  this.entries = [ ];
  for (let x = this.min; x < this.max + 0.5*d; x += d) {
    // this.value.push(x);
    // this.label.push(x.toFixed(nfrac));
    if (_fractional) {
      this.entries.push({
        'value': x,
        'label': x.toFixed(nfrac)
      });
    } else {  // don't show non-fractional ticks
      let rx = Math.round(x);
      if (x == rx) {
        this.entries.push({
          'value': x,
          'label': String(rx)
        });
      }
    }
  }
  // this.count = this.label.length;
}

export function LogLabels(_min, _max, _ticks) {
  // we expect min != max

  let adjustment = Math.max(0, 1 - _min);
  let logMin = log10(_min + adjustment);
  let logMax = log10(_max + adjustment);

  let range = niceNum(logMax - logMin, false);
  let d = niceNum(range / (_ticks - 1), true);  // tick mark spacing

  let scaleMin = Math.floor(logMin / d) * d;
  let scaleMax = Math.ceil(logMax / d) * d;
  this.min = niceNum(Math.pow(10, scaleMin) - adjustment);
  this.max = niceNum(Math.pow(10, scaleMax) - adjustment);


  // # of fractional digits to show
  let nfrac = Math.floor(Math.max(-Math.floor(log10(d)), 0));

  this.entries = [ ];

  for (let x = scaleMin; x < scaleMax + 0.5*d; x += d) {
    let v = Math.pow(10, x);
    let rv = Math.round(v);

    this.entries.push({
      'value': v,
      'label': v.toFixed(nfrac)
    });

  }
  // this.count = this.label.length;
}




// . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


export function setCookie(name, value, days) {
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
  } else {
    setCookie(name, value, 10*365);  // make it ten years
  }
}


export function getCookie(name, otherwise) {
  const nameEquals = name + "=";
  let ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEquals) == 0) {
      let value = c.substring(nameEquals.length, c.length)
      // console.log(`returning ${name} cookie as ${value}`);
      return value;
    }
  }
  // console.log(`returning ${name} cookie as ${otherwise || null}`);
  return otherwise || null;
}


export function removeCookie(name) {
  setCookie(name, "", -1);
}



export function getTally(data) {
  const tally = { };
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (tally[value] === undefined) {
      tally[value] = 0;
    }
    tally[value]++;
  }

  const ordered = Object.entries(tally).map(([key, value]) => {
    return {
      key: key,
      count: value
    };
  });
  ordered.sort((a, b) => b.count - a.count);

  return ordered;
}

/* assumes %Y-%m-%d (2025-01-22) */
export function prettyDate(indate) {
  try {
    const tokens = indate.split('-');
    const [y,m,d] = tokens.map(s=>parseInt(s));
    const date = new Date(y, m-1, d,0,0,0,0);
    const formatted = date.toLocaleString(undefined, {year: 'numeric', month: monthFormat, day: 'numeric'});
    return formatted;
  } catch (err) {
    console.warn(`prettyDate(${indate})`, err);
  }
  return '';
}

export function timelineDates(indate, interval, monthOnly=false) {
  try {
    const [y,m,d] = datestringToTokens(indate);
    const endDate = new Date(y, m-1, d+interval,0,0,0,0);
    const endFormatted = endDate.toLocaleString(undefined, monthOnly ? {month: 'short'} : {month: 'short', day: 'numeric', year: 'numeric'});
    const startDate = new Date(y, m-1, d,0,0,0,0);
    const startFormatted = monthOnly ?
    startDate.toLocaleString(undefined, {month: 'short'}) :
    endDate.getFullYear() === startDate.getFullYear() ?
    startDate.toLocaleString(undefined, {month: 'short', day: 'numeric'}) :
    startDate.toLocaleString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});

    return [startFormatted, endFormatted];
  } catch (err) {
    console.warn(`tickDate(${indate})`, err);
  }
  return ['',''];
}

function datestringToTokens(d) {
  return (d.split('-')).map(s=>parseInt(s))
}

export function tickDates(indate, interval) {
  try {
    const tokens = indate.split('-');
    const [y,m,d] = tokens.map(s=>parseInt(s));
    const startDate = new Date(y, m-1, d,0,0,0,0);
    const startFormatted = startDate.toLocaleString(undefined, {month: 'short', day: 'numeric'});
    const endDate = new Date(y, m-1, d+interval,0,0,0,0);
    const endFormatted = startDate.getMonth() === endDate.getMonth() ?
    endDate.toLocaleString(undefined, {day: 'numeric'}) :
    endDate.toLocaleString(undefined, {month: 'short', day: 'numeric'});

    return [startFormatted, endFormatted];
  } catch (err) {
    console.warn(`tickDate(${indate})`, err);
  }
  return ['',''];
}

export const numericSort = (a,b)=>a-b;