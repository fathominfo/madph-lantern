import * as Lookout from '../lookout.js';


export const UNSET = -1;

const totalPropertyCountCache = {};


export const getTotalPropertyCounts = prop=>{
  let sortedCounts = totalPropertyCountCache[prop];
  if (sortedCounts === undefined) {
    const totalCounts = {};
    let isNumeric = true;
    Lookout.records.forEach(rec=>{
      const value = rec[prop];
      if (value !== undefined) {
        isNumeric = isNumeric && typeof value === 'number';
        if (value instanceof Array) {
          value.forEach(v=>tally(v, totalCounts));
        } else {
          tally(value, totalCounts);
        }
      }
    });
    sortedCounts = Object.entries(totalCounts);
    sortedCounts.sort((a,b)=>b[1] - a[1]);
    if (isNumeric) {
      sortedCounts = sortedCounts.map(([a,b])=>[parseFloat(a), b]);
      const ints = sortedCounts.filter(([a])=>Math.round(a) === a);
      if (ints.length === sortedCounts.length) {
        sortedCounts = sortedCounts.map(([a,b])=>[parseInt(a), b]);
      }
    }
    totalPropertyCountCache[prop] = sortedCounts;
  }
  return sortedCounts.slice(0);
};

const tally = (value, dict)=>{
  if (dict[value] === undefined) {
    dict[value] = 1;
  } else {
    dict[value]++;
  }
}

/**
 * As canvas sketches scale to the container size, the
 * font sizes used for text drawn on the canvas can get
 * too big for comfortable reading. See issue:
 * https://github.com/fathominfo/sentinel-lookout3/issues/92
 *
 * This function takes a sketch and a desired font size,
 * and applies a scale, based on the sketch width and
 * display width, to allow a 16 font size to appear consistent
 * anywhere, regardless of container size.
 *
 * If the container is particularly stretched in either
 * direction, it will apply a certain scale to grow or shrink
 * the font size, clamped at a minimum or maximum ratio.
 *
 * @param {object} sketch The sketch, containing `rwidth`
 * and `width` properties
 * @param {number} fontSize Desired font size
 * @returns An optically scaled font size
 */
export function relativeSize(sketch, fontSize) {
  const sketchWidth = sketch.rwidth;
  const displayWidth = sketch.width;
  if (sketchWidth === undefined || displayWidth === undefined) {
    return fontSize;
  }

  const upperThresh = 1.5;
  const lowerThresh = 0.75;

  const stretchRatio = displayWidth / sketchWidth;
  // keep the font size looking the same, regardless of container size
  let drawScale = 1 / stretchRatio;
  // unless it's particularly stretched in either direction
  if (stretchRatio > upperThresh) {
    // get a little bigger, but not too big
    drawScale = 1 / upperThresh;
  } else if (stretchRatio < lowerThresh) {
    // get a little smaller, but not too small
    drawScale = 1 / lowerThresh;
  }

  const drawSize = fontSize * drawScale;
  return drawSize;
}