import * as Lookout from './lookout.js' ;
import { lerpColor } from './octet/util.js';
import { colors } from './palette.js';


const BAR_COLORS = colors.Cases;
const MAP_COLOR_RANGE = colors.Map.Unit;

const PALETTE_SETS = ['A', 'B', 'C', 'D', 'E'];
const PALETTE_SET_OPTIONS = ['00', '01', '02', '03', '04', '05', '06', '07'];
// const OPTIONLESS_PALETTE_SETS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
const OPTIONLESS_PALETTE_SETS = ['Eta', 'Theta', 'Iota', 'Kappa', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
const PALETTE_SET_INCREMENT = Math.floor(PALETTE_SET_OPTIONS.length / 2) + 1;

const DEFAULT_PALETTES = [ 'sex', 'occupation_code', 'exposure', 'race', 'lineage' ];


/* not sure if this can be added to palette.js without getting erased */
const TEXT_FIELD_PALETTE = structuredClone(colors.Chart.Set.Location); 


export const getTestColorConfig = name=>{
    let config = BAR_COLORS.Default.Positive.Test2;
    if (name === 'negative') {
      config = BAR_COLORS.Negative;
    } else if (name === 'suspected') {
      config = BAR_COLORS.Default.Suspected;
    } else {
      try {
        const reliability = Lookout.site.tests[name].reliability;
        switch (reliability) {
            case 1: 
            config = BAR_COLORS.Default.Positive.Test1;
            break;
            case 2: 
            config = BAR_COLORS.Default.Positive.Test2;
            break;
            default: 
              console.warn(`reliability not configured in site.tests for "${name}" (value needs to be 1 or 2)`)
        }  
      } catch (err) {
        console.warn(`reliability not configured in site.tests for "${name}" (value needs to be 1 or 2)`)
        console.warn(err);
      }
    }
    return config;
}

export const getAlertColorConfig = (name, alertLevel) => {
  let config = BAR_COLORS.Default.Positive.Test2;
  const level = `0${+(alertLevel > 0)}`;
    if (name === 'negative') {
      config = BAR_COLORS.Negative;
    } else if (name === 'suspected') {
      config = BAR_COLORS.Alert[level].Suspected;
    } else {
      try {
        const reliability = Lookout.site.tests[name].reliability;
        switch (reliability) {
            case 1:
            config = BAR_COLORS.Alert[level].Positive.Test1;
            break;
            case 2:
            config = BAR_COLORS.Alert[level].Positive.Test2;
            break;
            default:
              console.warn(`reliability not configured in site.tests for "${name}" (value needs to be 1 or 2)`)
        }
      } catch (err) {
        console.warn(`reliability not configured in site.tests for "${name}" (value needs to be 1 or 2)`)
        console.warn(err);
      }
    }
    return config;
};


export const getMapDataColor = value=>{
  /* 
  what ranges are we lerping between?
  there are 7 colors defined
  */
  const scaled = value * 7;
  const index = Math.floor(scaled);
  const lerpAmount = scaled - index;
  const key = `0${index}`;
  const config = structuredClone(MAP_COLOR_RANGE[key])
  if (lerpAmount > 0) {
    const key2 = `0${index + 1}`;
    const config2 = structuredClone(MAP_COLOR_RANGE[key2]);
    const props = Object.keys(config);
    props.forEach(property=>{
      const lowColor = config[property];
      const hiColor = config2[property];
      const color = lerpColor(lowColor, hiColor, lerpAmount);
      if (color.length < 6) {
        console.warn(`please  try again`);
        const color = lerpColor(lowColor, hiColor, lerpAmount);
      }
      config[property] = color;
    });
  }
  return config;
}


/* 
we don't want the same attribute getting 
different colors on different pages, 
so store them here
*/

const CONFIGURED_PALETTE_SETS = {}
let paletteSetIndex = 0;
let paletteStartIndex = 0;
let optionlessSetIndex = 0;

export const getPaletteSet = (code)=>{
  let set = CONFIGURED_PALETTE_SETS[code];
  if (!set) {
    set = new PaletteSet(PALETTE_SETS[paletteSetIndex], PALETTE_SET_OPTIONS[paletteStartIndex], code);
    CONFIGURED_PALETTE_SETS[code] = set;
    paletteSetIndex++;
    if (paletteSetIndex == PALETTE_SETS.length) {
      paletteSetIndex = 0;
      paletteStartIndex += PALETTE_SET_INCREMENT;
      paletteStartIndex %= PALETTE_SET_OPTIONS.length;
    }
  }
  return set;
}

export const getHistogramPalette = (code) => {
  let set = CONFIGURED_PALETTE_SETS[code];
  if (!set) {
    const key = OPTIONLESS_PALETTE_SETS[optionlessSetIndex];
    set = new HistogramPaletteSet(key, code);
    optionlessSetIndex++;
    optionlessSetIndex %= OPTIONLESS_PALETTE_SETS.length;
    CONFIGURED_PALETTE_SETS[code] = set;
  }
  return set;
}



export const getTextPalette = ()=> {
  const key = 'text';
  let set = CONFIGURED_PALETTE_SETS[key];
  if (!set) {
    set = new TextPaletteSet();
    CONFIGURED_PALETTE_SETS[key] = set;
  }
  return set;
}



class PaletteSet {

  constructor(set, option, code) {
    this.code = code; // not used, just for reporting and debugging
    this.initConfig(set, option);
  }

  initConfig(set, option) {
    const src = colors.Chart.Set[set];
    this.other = src.XX;
    this.ordered = [];
    let index = PALETTE_SET_OPTIONS.indexOf(option);
    for (let i = 0; i < PALETTE_SET_OPTIONS.length; i++) {
      const key = PALETTE_SET_OPTIONS[index];
      this.ordered.push(structuredClone(src[key]));
      index++;
      if (index === PALETTE_SET_OPTIONS.length) {
        index = 0;
      }
    }
    this.valueColors = {};
    this.index = 0;
  }

  getConf(value) {
    let conf = this.valueColors[value];
    if (!conf) {
      if (value === 'other') {
        conf = structuredClone(this.other);
      } else {
        const index = this.index % this.ordered.length;
        conf = structuredClone(this.ordered[index]);
        this.index++;
      }
      this.valueColors[value] = conf;
    }
    return conf;
  }

  getFill(value) {
    const conf = this.getConf(value);
    return conf.Fill.Static;
  }

  getFilterConf(value) {
    const conf = this.getConf(value);
    return conf.Filter;
  }

  getTextColor(value) {
    const conf = this.getConf(value);
    return conf.Text.Static;
  }
}


class HistogramPaletteSet extends PaletteSet {

    constructor(set, code) {
      super(set, null, code);
    }

    initConfig(set) {
      this.conf = structuredClone(colors.Chart.Set[set]);
    }
  
    getConf() {
      return structuredClone(this.conf);
    }



}

// function getSrc(location) {
//   const remaining = location.slice();
//   let src = colors;
//   while (remaining.length > 0) {
//     const current = remaining.shift();
//     src = src[current];
//   }
//   return src;
// }

class TextPaletteSet extends PaletteSet {

  constructor() {
    super('text', null, null);
  }

  initConfig() {
    this.conf = structuredClone(TEXT_FIELD_PALETTE);
    this.valueColors = {};
  }

  getConf() {
    return structuredClone(this.conf);
  }

}


DEFAULT_PALETTES.forEach(prop=>getPaletteSet(prop));