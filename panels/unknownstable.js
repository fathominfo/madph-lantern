import { makeCanvas } from '../util.js';
import { BASELINE, CENTER, Sketch } from '../octet/sketch.js';
import * as Lookout from '../lookout.js' ;
import { relativeSize } from './common.js';


export const VISIBLE_DISEASE_COUNT = 3;



const SYMPTOM_DOT_COLOR = '#666';
const SYMPTOM_TEXT_COLOR = '#555';
const SYMPTOM_HOVER_DOT_COLOR = '#000';
const SYMPTOM_HOVER_TEXT_COLOR = '#000';
const SYMPTOM_UNHOVER_DOT_COLOR = '#999';
const SYMPTOM_UNHOVER_TEXT_COLOR = '#888';
const SYMPTOM_LOCK_DOT_COLOR = '#c73';
const SYMPTOM_LOCK_TEXT_COLOR = '#c60';
const SYMPTOM_LOCK_HOVER_DOT_COLOR = '#c33';
const SYMPTOM_LOCK_HOVER_TEXT_COLOR = '#c00';
const CASE_LABEL_COLOR = '#666';
const CASE_TEXT_COLOR = '#000';
const BG_COLOR = 'white';

// on a 16x10 screen, allow room for a header and a footer
const CANVAS_W = 1600;
const CANVAS_H = 800;
const COL_W = 18;
const ROW_H = 18;

const MARGIN = {
  LEFT: 50,
  RIGHT: 50,
  TOP: 100,
  BOTTOM: 0
}
const SYMPTOM_COL_W = 240;
const SYMPTOM_INDENT = 80;
const DISEASE_X = CANVAS_W - MARGIN.RIGHT - VISIBLE_DISEASE_COUNT * COL_W;
const CASE_X = MARGIN.LEFT + SYMPTOM_COL_W;
const AVAIL_SPACE = DISEASE_X - CASE_X - COL_W; // one column margin between cases and diseases
const AVAIL_COLS = Math.floor(AVAIL_SPACE / COL_W);
const CASE_SPACE = AVAIL_COLS * COL_W;
const SCROLLBAR_HT = 8;
const RADIUS = 12;
const FONT_SIZE = 13;

/*
draws a table where each column is a case
and each row is a symptom

*/

export class UnknownsTable extends Sketch {

  layout;

  hoverCase = -1;
  hoverDisease = -1;

  symptomGroups;
  symptoms;
  symptomY;
  cases;
  diseases;

  caseCount;
  scrollIndex;
  scrollY;

  dragStartX;
  dragStartIndex;

  scrollableCols;
  visiblePct;
  thumbSize;
  scrollableSpace;

  formatConfig;
  pathScoreInfo;




  constructor(parentId, canvasId, caseProperties, symptomSelectCallback, pathogens) {
    super(makeCanvas(parentId, canvasId));
    this.canvasRatio(CANVAS_W, CANVAS_H);
    this.ellipseMode(CENTER);
    this.symptomSelectCallback = symptomSelectCallback;
    let aspect = this.rwidth / this.rheight;
    this.canvas.style.height = (this.canvas.parentNode.offsetWidth * (1 / aspect)) + 'px';
    this.canvas.parentNode.style.aspectRatio = aspect;
    this.cases = [];
    this.diseases = [];
    this.scrollIndex = 0;
    this.symptomGroups = {};
    this.symptoms = {};
    this.symptomY = [];
    this.caseCount = 0;
    this.scrollableCols = 0;
    this.visiblePct = 1;
    this.thumbSize = 0;
    this.scrollableSpace = 0;
    this.selectedSymptoms = [];
    this.formatConfig = [];
    this.pathScoreInfo = [];
    this.configFormatter(caseProperties, pathogens);
  }

  configFormatter(caseProperties, pathogens) {
    const sets = Lookout.site.sets;
    caseProperties.forEach(({prop, type, label, key})=>{
      let fnc = rec=>rec[prop];
      if (type === "number") {
        fnc = rec => {
          const val = rec[prop];
          return val.toLocaleString();
        };
      } else if (type === "lookout") {
        fnc = rec => {
          const val = rec[prop];
          return Lookout[key][val] || '';
        };
      } else if (type === "lookout:array") {
        fnc = rec => {
          const val = rec[prop]|| [];
          return val.map(v=>Lookout[key][v]).filter(s=>!!s).join(', ');
        };
      } else if (type === "set") {
        fnc = rec => {
          const val = rec[prop];
          return sets[key][val] || '';
        };
      } else if (type === "set:array") {
        fnc = rec => {
          let val = rec[prop] || [];
          return val.map(v=>sets[key][v]).filter(s=>!!s).join(', ');
        };
      }
      this.formatConfig.push({label, fnc});
    });
    /* always include tests */
    const testFnc = rec=>{
      let tests = '';
      Object.entries(pathogens).forEach(([path, conf])=>{
        if (rec[path]) {
          const pathTests = Object.keys(rec[path]).filter(test=>test!=='suspected');
          if (pathTests.length > 0) {
            if (tests.length > 0) {
              tests += '   ';
            }
            tests += `${conf.name}: ` + pathTests.join(', ');
          }
        }
      });
      return tests;
    };
    this.formatConfig.push({label: 'tests', fnc: testFnc});
  }

  load() {
    this.tickFont = this.loadFont('fonts/Inter-Bold.otf');
    this.titleFont = this.loadFont('fonts/Inter-Regular.otf');
    this.dataFont = this.loadFont('fonts/Inter-Medium.otf');
    this.dataBoldFont = this.loadFont('fonts/Inter-Bold.otf');
  }

  setSymptoms(symptomGroups, labels) {
    let y = MARGIN.TOP;
    this.symptomY = [];
    this.symptomGroups = {};
    this.symptoms = {};
    Object.entries(symptomGroups).forEach(([name, list])=>{
      const group = new SymptomConfig(name, name, MARGIN.LEFT, y, SYMPTOM_TEXT_COLOR, SYMPTOM_DOT_COLOR);
      this.symptomY.push(group);
      this.symptomGroups[name] = group;
      list.forEach(symp=>{
        const item = new SymptomConfig(symp, labels[symp], MARGIN.LEFT + SYMPTOM_INDENT, y, SYMPTOM_TEXT_COLOR, SYMPTOM_DOT_COLOR, group);
        group.addMember(item);
        this.symptomY.push(item);
        this.symptoms[symp] = item;
        y += ROW_H;
      });
    });
    this.scrollY = y;
  }


  update(cases) {
    this.scrollIndex = 0;
    this.thumbLeft = CASE_X;
    this.hoverIndex =  -1;
    this.cases = cases;
    this.caseCount = cases.length;
    this.scrollableCols = this.caseCount - AVAIL_COLS;
    this.visiblePct = AVAIL_COLS / this.scrollableCols;
    this.thumbSize = this.visiblePct * CASE_SPACE;
    this.scrollableSpace = CASE_SPACE - this.thumbSize;
    this.redraw();
  }


  setSelectedSymptoms(symptomCodes) {
    this.selectedSymptoms = symptomCodes;
    this.setSymptomColors(false);
    this.redraw();
  }

  setMatchingPathogens(pathScoreInfo) {
    this.pathScoreInfo = pathScoreInfo;
    this.redraw();
  }



  draw() {
    this.clear(BG_COLOR);
    this.drawSymptoms();
    this.drawCases();
    this.drawPathogens();
    this.drawHoverCase();
    this.fill('#000');
    if (this.selectedSymptoms.length > 0 ) {
      this.text('Clear selections', MARGIN.LEFT, MARGIN.TOP - ROW_H * 2);
    }
    this.noLoop();
  }

  drawSymptoms() {
    this.textFont(this.dataFont, relativeSize(this, FONT_SIZE));
    this.fill(SYMPTOM_TEXT_COLOR);
    this.symptomY.forEach(({code, x, y, text})=>{
      this.fill(text);
      this.text(code, x, y);
    });
  }

  drawCases() {
    const hoverCase = this.hoverCase;
    let x = CASE_X;
    const L = Math.min(this.scrollIndex + AVAIL_COLS, this.caseCount);
    if (hoverCase >= 0) {
      this.ctx.globalAlpha = 0.5;
    }
    this.fill(SYMPTOM_DOT_COLOR);
    for (let i = this.scrollIndex; i < L; i++) {
      if (i === hoverCase) this.ctx.globalAlpha = 1;
      this.drawCaseColumn(this.cases[i], x);
      if (i === hoverCase) this.ctx.globalAlpha = 0.5;
      x += COL_W;
    }
    this.ctx.globalAlpha = 1;
    this.drawScrollbar();
  }

  drawCaseColumn(caseRec, x) {
    const symptoms = caseRec.symptoms || [];
    symptoms.forEach(s=>{
      const item = this.symptoms[s];
      this.fill(item.dot);
      this.ellipse(x, item.y, RADIUS, RADIUS);
    });
  }

  drawHoverCase() {
    const rec = this.cases[this.hoverCase];
    if (rec) {
      const TOP = ROW_H;
      const BOTTOM = MARGIN.TOP - 12;
      let x = CASE_X;
      let y = TOP;
      this.fill('black');
      Object.values(this.formatConfig).forEach(({label, fnc})=>{
        try {
          this.fill(CASE_LABEL_COLOR);
          this.text(label, x, y);
          this.fill(CASE_TEXT_COLOR);
          this.text(fnc(rec), x + 90, y);
        } catch (err) {
          console.warn(err);
        }
        y += ROW_H;
        if (y > BOTTOM) {
          y = TOP;
          x += 200;
        }
      });
    }
  }

  drawPathogens() {
    let x = DISEASE_X;
    this.pathScoreInfo.forEach((item, i)=>{
      const { score, counts } = item;
      this.drawPathogenColumn(x, counts, score);
      if (i === this.hoverDisease) {
        this.fill('#000');
        this.textAlign(CENTER, BASELINE);
        this.text(item.path, x, MARGIN.TOP - ROW_H);
      }
      x += COL_W;
    })
  }

  drawPathogenColumn(x, symptomCounts, score) {
    const total = symptomCounts.total;
    Object.entries(symptomCounts).forEach(([s, count])=>{
      const item = this.symptoms[s];
      if (item) {
        this.ctx.globalAlpha = count / total;
        this.fill(item.dot);
        this.ellipse(x, item.y, RADIUS, RADIUS);
      }
    });
    this.ctx.globalAlpha = 1;
  }



  drawScrollbar() {
    if (this.scrollableCols > 0) {
      this.fill('#aaa');
      this.rect(CASE_X + this.scrollIndex / this.scrollableCols * this.scrollableSpace, this.scrollY, this.thumbSize, SCROLLBAR_HT);
      this.noFill();
      this.stroke('#aaa');
      this.rect(CASE_X, this.scrollY, CASE_SPACE, SCROLLBAR_HT);
      this.noStroke();
    }
  }


  insideScrollbar() {
    return (
      AVAIL_COLS < this.caseCount
      && this.rmouseX >= CASE_X && this.rmouseX <= CANVAS_W - MARGIN.RIGHT
      && this.rmouseY >= this.scrollY && this.rmouseY <= this.scrollY + SCROLLBAR_HT
    );
  }

  // assumes insideScrollbar check has been passed
  insideThumb() {
    return this.rmouseX >= this.thumbLeft && this.rmouseX <= this.thumbLeft + this.thumbSize;
  }

  getSymptom() {
    let symp = null;
    if (this.rmouseX < CASE_X) {
      const lookingAtGroups = this.rmouseX < MARGIN.LEFT + SYMPTOM_INDENT;
      for (let i = 0; i < this.symptomY.length; i++) {
        const item = this.symptomY[i];
        if (
          lookingAtGroups === item.isGroup
          && this.rmouseY > item.y - ROW_H && this.rmouseY <= item.y
        ) {
          symp = item;
        }
      }
    }
    return symp;
  }

  getSymptomReset() {
    return this.rmouseX < CASE_X && this.rmouseY < MARGIN.TOP;
  }

  getCaseIndex() {
    let caseIndex = -1;
    if (this.rmouseX >= CASE_X && this.rmouseX < DISEASE_X - RADIUS * 2) {
      const index = this.scrollIndex + Math.floor((this.rmouseX - CASE_X) / COL_W);
      if (index >= 0 && index < this.cases.length) {
        caseIndex = index;
      }
    }
    return caseIndex;
  }

  getDiseaseIndex() {
    let diseaseIndex = -1;
    if (this.rmouseX >= DISEASE_X && this.rmouseX < DISEASE_X + RADIUS * 2 * VISIBLE_DISEASE_COUNT) {
      const index = Math.floor((this.rmouseX - DISEASE_X) / COL_W);
      if (index >= 0 && index < VISIBLE_DISEASE_COUNT) {
        diseaseIndex = index;
      }
    }
    return diseaseIndex;
  }


  mouseMoved() {
    let cursor = 'default';
    this.hoverCase = -1;
    if (this.insideScrollbar()) {
      cursor = 'pointer';
      this.setSymptomColors(false);
    } else {
      const symp = this.getSymptom();
      if (symp !== null) {
        cursor = 'pointer';
        this.setSymptomColors(true);
        if (symp.isGroup) {
          symp.text = SYMPTOM_HOVER_TEXT_COLOR;
          symp.dot = SYMPTOM_HOVER_DOT_COLOR;
          symp.members.forEach(member=>{
            if (this.selectedSymptoms.includes(member.code)) {
              member.text = SYMPTOM_LOCK_HOVER_TEXT_COLOR;
              member.dot = SYMPTOM_LOCK_HOVER_DOT_COLOR;
            } else {
              member.text = SYMPTOM_HOVER_TEXT_COLOR;
              member.dot = SYMPTOM_HOVER_DOT_COLOR;
            }
          });
        } else {
          if (this.selectedSymptoms.includes(symp.code)) {
            symp.text = SYMPTOM_LOCK_HOVER_TEXT_COLOR;
            symp.dot = SYMPTOM_LOCK_HOVER_DOT_COLOR;
          } else {
            symp.text = SYMPTOM_HOVER_TEXT_COLOR;
            symp.dot = SYMPTOM_HOVER_DOT_COLOR;
          }
          symp.group.text = SYMPTOM_HOVER_TEXT_COLOR;
          symp.group.dot = SYMPTOM_HOVER_DOT_COLOR;
        }
      } else {
        const caseIndex = this.getCaseIndex();
        if (caseIndex >= 0) {
          // cursor = 'pointer';
          this.hoverCase = caseIndex;
        } else {
          const diseaseIndex = this.getDiseaseIndex();
          this.hoverDisease = diseaseIndex;
        }
        this.setSymptomColors(false);
      }
    }
    this.canvas.style.cursor = cursor;
    this.redraw();
  }

  setSymptomColors(anyHovered) {
    this.symptomY.forEach(item=>{
      if (this.selectedSymptoms.includes(item.code)) {
        item.text = SYMPTOM_LOCK_TEXT_COLOR;
        item.dot = SYMPTOM_LOCK_DOT_COLOR;
      } else if (anyHovered) {
        item.text = SYMPTOM_UNHOVER_TEXT_COLOR;
        item.dot = SYMPTOM_UNHOVER_DOT_COLOR;
      } else {
        item.text = SYMPTOM_TEXT_COLOR;
        item.dot = SYMPTOM_DOT_COLOR;
      }
    });
  }


  mousePressed() {
    if (this.insideScrollbar()) {
      if (this.insideThumb()) {
        this.dragStartX = this.rmouseX;
        this.dragStartIndex = this.scrollIndex;
      } else {
        if (this.rmouseX < this.thumbLeft) {
          this.scrollIndex = Math.max(0, this.scrollIndex - AVAIL_COLS);
        } else {
          this.scrollIndex = Math.min(this.scrollableCols, this.scrollIndex + AVAIL_COLS);
        }
        this.thumbLeft = CASE_X + this.scrollIndex / this.scrollableCols * this.scrollableSpace;
        this.redraw();
      }
    } else {
      const symp = this.getSymptom();
      if (symp) {
        this.symptomSelectCallback(symp);
      } else if (this.getSymptomReset()) {
        const toClear = this.selectedSymptoms.slice();
        toClear.forEach(s=>{
          const symp = this.symptoms[s];
          this.symptomSelectCallback(symp);
        });
      } else {
        const caseIndex = this.getCaseIndex();
        if (caseIndex >= 0) {
          const caseRec = this.cases[caseIndex];
          caseRec.symptoms?.forEach(s=>{
            const symp = this.symptoms[s];
            this.symptomSelectCallback(symp);
          });
        }
      }
    }
  }

  mouseReleased() {
    this.dragStartIndex = -1;
  }

  mouseDragged() {
    if (this.dragStartIndex >= 0) {
      const dx = this.rmouseX - this.dragStartX;
      const pctMoved = dx / this.scrollableSpace;
      const newIndex = this.dragStartIndex + Math.round(pctMoved * this.scrollableCols);
      this.scrollIndex = Math.max(0, Math.min(this.cases.length - AVAIL_COLS - 1, newIndex));
      this.thumbLeft = CASE_X + this.scrollIndex / this.scrollableCols * this.scrollableSpace;
      this.redraw();
    }
  }
}


export class SymptomConfig {
  code;
  label;
  isGroup;
  x;
  y;
  textColor;
  dotColor;
  group;
  members;

  /*
  @param group: the parent group of the symptom
  will be null if this is a group of symptoms instead of a single
  symptom
  */
  constructor(code, label, x, y, textColor, dotColor, group) {
    this.code = code;
    this.label = label;
    this.isGroup = !group;
    this.x = x;
    this.y = y;
    this.textColor = textColor;
    this.dotColor = dotColor;
    if (group) {
      this.group = group;
    } else {
      this.members = [];
      this.addMember = m=>this.members.push(m);
    }
  }

}

