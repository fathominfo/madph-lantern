import * as Lookout from '../lookout.js' ;
import { makeCanvas } from '../util.js';
import { CENTER, LEFT, Sketch, TOP } from '../octet/sketch.js';
import { getHistogramPalette, getPaletteSet } from '../paletteutil.js';
import { colors } from '../palette.js';
import { relativeSize } from './common.js';
import { LISTENER_TYPES } from './field.js';

const BACKGROUND_COLOR = 'white';
// const BRANCH_COLOR = '#999';
// const DEFAULT_TIP_COLOR = {
//   Fill : {
//     Static : '#999',
//     On : '#000'
//   }
// };
export const DEFAULT_CONF = {
  Node: {
    Static: colors.Tree.Node.Fill.Static,
    On: colors.Tree.Node.Fill.On,
    Off: {
      Filtered: colors.Tree.Node.Fill.Off,
      Static: colors.Tree.Node.Fill.Off
    }
  },
  // Branch: colors.Tree.Branch,
  Branch: {
    Static: colors.Tree.Branch.Stroke.Static,
    On: colors.Tree.Branch.Stroke.On,
    Off: {
      Filtered: colors.Tree.Branch.Stroke.Off,
      Static: colors.Tree.Branch.Stroke.Off
    }
  },
  Text: {
    Static: colors.Tree.Label.Text.Static,
    On: colors.Tree.Label.Text.Static
  }
};
export const MARGIN = {
  TOP: 40,
  BOTTOM: 20,
  LEFT: 50,
  RIGHT: 50
}

const TIP_DIAMETER = 4;
const TIP_RADIUS = TIP_DIAMETER / 2;

export const UNKNOWN_VALUE = "Unknown";


export class TreePanel extends Sketch {


  constructor(parentId, canvasId, indexes, config, datasource) {
    super(makeCanvas(parentId, canvasId));


    if (config.size === 'square') {
      this.canvasRatio(320, 320);

    } else if (config.size === 'large') {
      this.canvasRatio(320, 160);

    } else if (config.size === 'medium') {
      this.canvasRatio(320, 120);

    } else if (config.size === 'small') {
      this.canvasRatio(320, 75);
      
    } else if (config.size === 'tall') {
      this.canvasRatio(320, 600);
    }
    this.config = config;
    this.datasource = datasource;
    datasource.addListener(LISTENER_TYPES.index, indices=>this.applyIndices(indices));
    // datasource.addListener(LISTENER_TYPES.filterStatus, (filterValue, hoveredValue)=>this.updateStyles(filterValue, hoveredValue));
    this.tips = null;
    this.mrca = null;
    let aspect = this.rwidth / this.rheight;
    this.canvas.style.height = (this.canvas.parentNode.offsetWidth * (1 / aspect)) + 'px';
    this.canvas.parentNode.style.aspectRatio = aspect;
    this.ellipseMode(CENTER);
    this.textAlign(LEFT, TOP);
    const { abbrev, color_by } = config;
    if (color_by) {
      this.palette = getPaletteSet(color_by.abbrev);
      this.colorProp = color_by.abbrev;
      this.colorPropLabel = color_by.label ?? color_by.abbrev;
      if (color_by.set) {
        this.colorSet = Lookout.site.sets[color_by.set];
      }
    } else {
      this.palette = getHistogramPalette(config.abbrev);
    }
    const lookup = {};
    this.highlighted = [];
    this.inWindow = [];
    this.outWindow = [];
    indexes.forEach(index=>{
      const record = Lookout.records[index];
      // console.log(index, record)
      const key = record[abbrev];
      if (key !== undefined) {
        lookup[key] = {record, index};
      }
    });
    this.config = config;
    this.recordLookup = lookup;
    this.fetchData(config.uri);
    if (config.label) {
      const titleEle = document.createElement('h3');
      titleEle.textContent = config.label;
      document.getElementById(parentId).appendChild(titleEle);
    }

  }

  load() {
    this.dataFont = this.loadFont('fonts/Inter-Regular.otf');
    this.labelFont = this.loadFont('fonts/Inter-Bold.otf');
  }

  createNode(data, parent, index) {
    return new TreeNode(data, parent, index);
  }

  generateLayout() {
    // start at root, work down to tips depth first to build the vertical order
    // and the largest horizontal distance.
    const {recordLookup, config} = this;
    this.maxDistance = 0;
    this.highlightableLookup = {};
    this.branchLookup = {};
    let queued = {},
    branches = [],
    tips = [],
    q = [],
    y = MARGIN.TOP,
    // build a queue of branches so that we can process them in order
    // and know that their subs will have their positions set.
    addToQueue = n=>{
      q.push(n);
      queued[n.name] = n;
    },
    traverse = (item, parent)=>{
      let node = this.createNode(item, parent, branches.length);
      if (node.isBranch) {
        branches.push(node);
        // const supportIndex = parseInt(node.name.replace('NODE_', ''));
        // const support = treeSupport[supportIndex];
        // if (support > 0) {
        //   node.setPosteriorSupport(support)
        // } else {
        //   console.debug(`no support for ${node.name} ${supportIndex}`)
        // }
        item.branchset.forEach(s=>{
          let n = traverse(s, node);
          node.add(n);
        });
        addToQueue(node);
        this.branchLookup[node.name] = node;
      } else {
        let n = node;
        while (n) {
          n.tipCount++;
          n = n.parent;
        }
        this.maxDistance = Math.max(this.maxDistance, node.totalLength);
      }
      return node;
    },
    // sortSubs = (a,b)=>b.tipCount===a.tipCount?a.name.localeCompare(b.name):a.tipCount-b.tipCount,
    sortSubs = (a,b)=>{
      let diff = a.tipCount-b.tipCount; 
      if (diff === 0) {
        try {
          diff = a.name.localeCompare(b.name);
        } catch (err) {
          console.log(err, a, b)
        }
        
      }
      return diff;
    },
    // traverse the tree to sort by most children
    sort = node=>{
      if (!node) return; // just a precaution, but should never happen
      if (node.isBranch) {
        node.subs.forEach(sort);
        node.subs.sort(sortSubs);
      }
    },
    buildSortedTipList = node=>{
      if (!node) return; // just a precaution, but should never happen
      if (!node.isBranch) {
        tips.push(node);
      } else {
        node.subs.forEach(buildSortedTipList);
      }
    }
    // root = traverse(tree, null);
    if (this.treeData) {
      const root = traverse(this.treeData, null);
      if (root.isBranch > 0) {
        sort(root);
        buildSortedTipList(root);  
        this.root = root;
      } else {
        /* we only have one tip in the tree, and no branches */
        buildSortedTipList(root);
        root.drawToParent = root.drawTip;
        this.branches = [];
        this.root = root;
        this.maxDistance = 1;
      }
    } else {
      this.root = null;
    }
    this.tips = tips;
    this.branches = branches;
    // then assign vertical positions for all tips
    let rightSpace = MARGIN.RIGHT;
    let bottomSpace = MARGIN.BOTTOM; 
    if (config.readout_position === "bottom") {
      bottomSpace += config.readout_pixels || 0;
    } else {
      rightSpace += config.readout_pixels || 0;
    }
    this.bottom = this.rheight - (MARGIN.BOTTOM + bottomSpace);
    const tipCount = tips.length;
    const yrange = this.bottom - MARGIN.TOP;
    const xrange = this.rwidth - rightSpace - MARGIN.LEFT;
    const yIncr = yrange / tipCount;
    const xIncr = xrange / (this.maxDistance || 1);
    tips.forEach(t=>{
      t.y = y;
      t.x = MARGIN.LEFT + t.totalLength * xIncr;
      const item = recordLookup[t.id];
      let index = -1;
      let value;
      let color = DEFAULT_CONF;
      if (item) {
        index = item.index;
        value = this.colorProp ? item.record[this.colorProp] : t.id;
        if (this.palette) {
          if (this.colorSet) {
            value = this.colorSet[value];
          }
          color = this.palette.getConf(value);
        }
      }
      t.setData(index, value, color);
      y += yIncr;
    });
    // then work up from tips
    q.forEach(b=>{
      b.x = MARGIN.LEFT + b.totalLength * xIncr;
      let y1 = yrange,
      y2 = 0;
      b.subs.forEach(s=>{
        y1 = Math.min(s.y, y1);
        y2 = Math.max(s.y, y2);
      });
      b.y = (y1 + y2) * 0.5;
      b.y1 = y1;
      b.y2 = y2;
      // set color of branches where possible
      if (this.colorProp) {
        if (subsSharePropValue(b.subs)) {
          const propValue = b.subs[0]?.propValue;
          if (propValue) {
            b.setPropValue(propValue);
          }
          const conf = b.subs[0]?.colorConf;
          if (conf) {
            b.setColorConf(conf);
          }
        }
      } else {
        const conf = b.subs[0]?.colorConf;
        b.setColorConf(conf);
      }
    });

    if (this.selectedIndicesCache) {
      this.applyIndices(this.selectedIndicesCache);
    }
    this.redraw();
  }

  applyIndices(inplace) {
    if (this.tips) {
      this.inWindow.length = 0;
      this.outWindow.length = 0;
      this.tips.forEach(tip=>{
        const inWindow = inplace[tip.index];
        const target = inWindow ? this.inWindow : this.outWindow;
        target.push(tip);
        tip.setInWindow(inWindow);
      });
      delete this.selectedIndicesCache;
      this.redraw();
    } else {
      this.selectedIndicesCache = inplace;
    }
  }

  highlight(indices) {
    this.highlighted.length = 0;
    this.highlighting = indices.length > 0;
    if (this.tips) {
      this.tips.forEach(tip=>{
        const highlit = indices.includes(tip.index);
        tip.setHighlight(highlit);
        if (highlit) {
          this.highlighted.push(tip);
        }
      });
    }

    this.mrca?.setMrca(false);
    this.mrca = getMrca(this.highlighted);
    if (this.mrca) {
      this.mrca.setMrca(true);
    }

    this.redraw();
  }


  draw() {
    this.clear(BACKGROUND_COLOR);
    this.noFill();

    // draw branches and tips
    this.beginPath();
    if (this.branches) {
      this.branches.forEach(branch=>{
        branch.drawToParent(this);
        branch.drawCrossbar(this);
      });
    }
    if (this.tips) {
      this.tips.forEach(tip=>{
        tip.drawToParent(this);
      });
    }
    this.endPath();
    this.noStroke();

    // draw out window
    // this.ctx.globalAlpha = UNHIGHLIGHT_ALPHA;
    this.outWindow.forEach(tip=>{
      tip.drawTip(this);
    });

    // draw in window
    // this.ctx.globalAlpha = 1;
    this.inWindow.forEach(tip=>{
      tip.drawTip(this);
    });

    // draw highlight rings
    this.strokeWeight(1);
    this.highlighted.forEach(tip=>tip.drawHighlight(this));

    // draw propValue labels
    this.textFont(this.labelFont, relativeSize(this, 10));
    this.textAlign(LEFT, CENTER);
    this.drawPropValueLabels(this.highlighted);

    this.noLoop();
  }

  drawPropValueLabels(nodes) {
    // max distance between nodes in one propValue group
    const MAX_DIST = 20;
    const ordered = nodes.toSorted((a, b) => a.y - b.y);
    const propValueLabels = [];
    for (let i = 0; i < ordered.length; i++) {
      const { propValue, x, y } = ordered[i];
      let lastPropValue = propValueLabels[propValueLabels.length - 1];
      const startNew = (
        lastPropValue === undefined ||
        lastPropValue.propValue !== propValue ||
        (y - lastPropValue.ys[lastPropValue.ys.length - 1]) > MAX_DIST
      );
      if (startNew) {
        // push a new propValue
        propValueLabels.push({
          propValue: propValue,
          xs: [],
          ys: []
        });
      }
      lastPropValue = propValueLabels[propValueLabels.length - 1];

      // add to the last one
      lastPropValue.xs.push(x);
      lastPropValue.ys.push(y);
    }

    // assign positions and colors to each propValue label
    propValueLabels.forEach(propValue => {
      propValue.x = Math.max(...propValue.xs) + 10;
      propValue.y = propValue.ys.reduce((acc, curr) => acc + curr, 0) / propValue.ys.length;
      if (propValue.propValue === UNKNOWN_VALUE) {
        propValue.color = DEFAULT_CONF.Node.Static;
      } else {
        const conf = this.palette.getConf(propValue.propValue);
        propValue.color = conf ? conf.Fill.Static : DEFAULT_CONF.Text.Static;
      }

      this.fill(propValue.color);
      this.text(propValue.propValue, propValue.x, propValue.y);
    });
  }

  mouseMoved() {
    let minD2 = 50 * 50;
    let closest = null;

    const inWindow = [
      ...(this.tips ? this.tips.filter(n => n.inWindow) : []),
      ...(this.branches ? this.branches.filter(n => n.inWindow) : [])
    ];
    inWindow.forEach(tip=>{
      const d2 = Math.pow(this.rmouseX - tip.x, 2) + Math.pow(this.rmouseY - tip.y, 2);
      if (d2 < minD2) {
        closest = tip;
        minD2 = d2;
      }
    });
    if (closest !== this.closest) {
      this.closest = closest;
      let indices = [];
      if (closest) {
        indices = closest.getWindowIndices();
      }
      this.highlight(indices);
    }

  }

  mouseLeave() {
    this.highlight([])
  }

  mousePressed() {
  }


}

class TreeNode {


  /*  
  @param data: {branchset: [Node, Node], length, id}
  */
  constructor(data, parent, index) {
    this.parent = parent;
    this.id = data.id;
    this.length = data.length || 0;
    this.totalLength  = this.length + (parent ? parent.totalLength : 0);
    this.isBranch = data.branchset !== undefined && data.branchset.length > 0;
    this.tipCount = 0;
    this.highlighted = false;
    this.name = `${data.name}`;
    this.drawToParent = ()=>{};
    if (this.isBranch) {
      this.subs = [];
      this.add = node=>this.subs.push(node);
      this.nodeIndex = index;
      if (parent) this.drawToParent = this.drawBranchToParent;
    } else {
      this.drawToParent = this.drawTipToParent;
    }
  }

  setInWindow(inWindow) {
    this.inWindow = inWindow;
    if (this.parent) {
      this.parent.cascadeWindow();
    }
  }

  cascadeWindow() {
    const inWindow = this.subs.some(s => s.inWindow);
    this.setInWindow(inWindow);
  }

  drawBranchToParent(sketch) {
    this.setStroke(sketch);
    this.setStrokeWeight(sketch);
    sketch.line(this.x, this.y, this.parent.x, this.y);
  }

  drawTipToParent(sketch) {
    this.setStroke(sketch);
    this.setStrokeWeight(sketch);
    sketch.line(this.x - TIP_RADIUS, this.y, this.parent.x, this.y);
  }


  drawCrossbar(sketch) {
    this.setStroke(sketch);
    this.setStrokeWeight(sketch);
    sketch.line(this.x, this.y1, this.x, this.y2);
  }

  drawTip(sketch) {
    this.setFill(sketch);
    sketch.ellipse(this.x, this.y, TIP_DIAMETER, TIP_DIAMETER);
  }

  drawHighlight(sketch) {
    this.setStroke(sketch);
    sketch.noFill();
    sketch.ellipse(this.x, this.y, TIP_DIAMETER + 3, TIP_DIAMETER + 3);
    sketch.noStroke();
  }

  setPosteriorSupport(s) {
    this.posteriorSupport = s;
  }

  setData(index, value, color) {
    this.index = index;
    this.propValue = value ?? UNKNOWN_VALUE;
    this.colorConf = color;
    if (index < 0) {
      console.debug(`no value found for tip "${this.name}"`);
    }
  }

  setPropValue(value) {
    this.propValue = value;
  }

  setColorConf(conf) {
    this.colorConf = conf;
  }

  setHighlight(onoff){
    this.highlighted  = onoff;
    if (this.parent) {
      this.parent.cascadeHighlight();
    }
  }

  cascadeHighlight() {
    const highlighted = this.subs.some(s => s.highlighted);
    this.setHighlight(highlighted);
  }

  setMrca(bool) {
    this.mrca = bool;
  }

  setStroke(sketch) {
    const conf = this.colorConf ? this.colorConf : DEFAULT_CONF;
    const branch = conf.Branch ?? conf.Fill;
    // const state = (this.inWindow || this.highlighted) ? branch.On : branch.Static;
    const state = (this.inWindow || this.highlighted) ? branch.On : branch.Off.Static;
    sketch.stroke(state);
  }

  setStrokeWeight(sketch) {
    // const strokeWeight = (this.inWindow || this.highlighted) ? 1 : 0.5;
    const strokeWeight = (
      this.mrca ? 2 :
      (this.inWindow || this.highlighted) ? 1 :
      0.5
    );
    sketch.strokeWeight(strokeWeight);
  }

  setFill(sketch) {
    const conf = this.colorConf ? this.colorConf : DEFAULT_CONF;
    const node = conf.Node ?? conf.Fill;
    // const state = this.inWindow ? node.On : node.Static;
    const state = this.inWindow ? node.On : node.Off.Static;
    sketch.fill(state);
  }

  // getIndices() {
  getWindowIndices() {
    if (this.isBranch) {
      const indices = [...this.subs.map(s => s.getWindowIndices().flat())].flat();
      return indices;
    }

    // return [this.index];
    // limit to nodes in the current window?
    if (this.inWindow) {
      return [this.index];
    }
    return [];
  }
}

function subsSharePropValue(subs) {
  if (subs.length <= 1) {
    return true;
  }

  let value = null;
  for (let i = 0; i < subs.length; i++) {
    const slin = subs[i].propValue;
    if (slin) {
      if (value === null) {
        value = slin;
      } else {
        if (slin !== value) {
          return false;
        }
      }
    } else {
      // no value
      return false;
    }
  }
  return true;
}

function getMrca(nodes) {
  if (nodes.length === 0) {
    return null;
  }
  if (nodes.length === 1) {
    return nodes[0];
  }

  const sorted = nodes.toSorted((n1, n2) => n1.y - n2.y);
  // compare the two nodes farthest apart
  let n1 = sorted[0];
  let n2 = sorted[sorted.length - 1];
  let mrca = null;
  const parents = [];
  while (mrca === null) {
    if (n1.parent) {
      parents.push(n1.parent);
      n1 = n1.parent;
    }
    if (n2.parent) {
      if (parents.includes(n2.parent)) {
        mrca = n2.parent;
        return mrca;
      } else {
        n2 = n2.parent;
      }
    } else {
      return null;
    }
  }
}