import * as Lookout from '../lookout.js' ;
import { LEFT, TOP } from '../octet/sketch.js';
import { DEFAULT_CONF, MARGIN, TreePanel, UNKNOWN_VALUE } from "./treepanel.js";



/*
Rather than load in a precalculated tree from a Newick file, 
this one calculates a new tree based on filtered values
using the 'unweighted pair group method with arithmetic mean' 
algorithm

ref https://en.wikipedia.org/wiki/UPGMA

*/
export class UPGMATreePanel extends TreePanel {


  fetchData(uri) {
    fetch(Lookout.getLocationUrl(uri)).then(resp=>resp.json())
      .then(data=>{
        const { accessions, distances } = data;
        this.accessions = accessions;
        this.distances = distances;
        this.applyIndices(this.inplaceCache);
      });
  }

  // @param data: {branchset: [Node, Node], length, id}
  createNode(data, parent, index) {
    const node = super.createNode(data, parent, index);
    node.inWindow = true;
    return node;
  }

  applyIndices(inplace) {
    if (this.accessions) {
      const recs = inplace.map((_, i)=>Lookout.records[i]).flat();
      const indices = recs.map(({accession_num})=>this.accessions.indexOf(accession_num)).filter(index=>index>=0);
      this.treeData = this.buildTree(indices);
      this.generateLayout();
    } else {
      this.inplaceCache = inplace;
    }
  }


  buildTree(indices) {
    const allDistances = this.distances;
    const count = indices.length;
    const distMat = new Array(count);
    for (let i = 0; i < count; i++) {
      distMat[i] = new Array(count);
    }
    const nodes = [];
    for (let i = 0; i < indices.length; i++) {
      const ii = indices[i];
      const id = this.accessions[ii]; 
      nodes.push(new Tip(id));
      for (let j = i; j < indices.length; j++) {
        const jj = indices[j];
        const dist = allDistances[ii][jj];
        distMat[i][j] = dist;
        distMat[j][i] = dist;
      }  
    }
    let branchCount = 0;
    while (nodes.length > 1) {
      const [distance, pair] = this.findClosest(distMat);
      pair.sort(numericSort)
      const [index1, index2] = pair;
      const [weight1, weight2] = pair.map(i=>nodes[i].tipCount);
      const tot = weight1 + weight2;
      /* 
      take the average distance of the pair to be the branch length
      for this new node
      */
      const branchLength = distance / 2;  
      const node = new InnerNode(nodes[index1], nodes[index2], branchLength, `branch-${branchCount++}`);
      /* 
      calculate distances for the new node 
      wouldn't it be nice if Float32Array supported splice? 
      */
      const newDists = new Array(nodes.length);
      for (let i = 0; i < distMat.length; i++) {
        let dist = 0;
        if (i != index1 && i != index2) {
          dist += distMat[i][index1] * weight1;
          dist += distMat[i][index2] * weight2;
          dist /= tot;
        }
        newDists[i] = dist;
      }
      /* swap in the the node */
      nodes[index1] = node;
      distMat[index1] = newDists;
      /* remove the other node */
      nodes.splice(index2, 1);
      distMat.splice(index2, 1);
      distMat.forEach((arr, i)=>{
        distMat[i][index1] = newDists[i];
        arr.splice(index2, 1);
      });
    }
    // console.log(nodes[0])
    return nodes[0];
  }

  findClosest(distMat) {
    let closestPair = [-1, -1];
    let closestDist = Number.MAX_SAFE_INTEGER;
    let d; 
    for (let i = 0; i < distMat.length; i++) {
      for (let j = i + 1; j < distMat.length; j++) {
        d = distMat[i][j]; 
        if (d > 0 && d < closestDist) {
          closestDist = d;
          closestPair[0] = i;
          closestPair[1] = j;
        }
      }
    }
    return [closestDist, closestPair];
  }



   drawPropValueLabels(nodes) {
      // we have an array, 
      const x = MARGIN.LEFT;
      let y = this.bottom + 12;
      if (nodes.length === 1) {
        const index = nodes[0].index;
        const rec = Lookout.records[index];
        const id = rec[this.datasource.prop];
        const date = Lookout.days[rec.date_index];
        const colorProp = rec[this.colorProp];
        const propLabel = this.datasource.prop.replace('_', ' ');
        let color = DEFAULT_CONF.Node.Static;
        if (colorProp && colorProp !== UNKNOWN_VALUE) {
          const conf = this.palette.getConf(colorProp);
          if (conf) {
            color = conf.Text.Static;
          }
        }
        this.fill(color);
        this.textAlign(LEFT, TOP);
        this.text(`${propLabel}: ${id}`, x, y);
        y += 15;
        this.text(`${this.colorPropLabel}: ${colorProp}`, x, y);
        y += 15;
        this.text(`${ date }`, x, y);
      } else if (nodes.length > 0) {
        this.fill(DEFAULT_CONF.Node.On);
        this.text(`${nodes.length} sequences`, x, y);
      }

    
    }
  


}


class Node {
  setParent(node, branchLength) {
    this.parent = node;
    this.length = branchLength;
    this.totalLength = branchLength;
  }
}



class Tip extends Node {

  constructor(id) {
    super();
    this.id = id;
    this.name = id;
    this.tipCount = 1;
  }

}


class InnerNode extends Node {
  
  constructor(child1, child2, branchLength, name) {
    super();
    this.name = name;
    this.branchset = [child1, child2];
    this.tipCount = child1.tipCount + child2.tipCount;
    child1.setParent(this, branchLength);
    child2.setParent(this, branchLength);
  }

  setParent(node, branchLength) {
    super.setParent(node, branchLength);
    this.totalLength = branchLength;
    this.length -= this.branchset[0].totalLength;
  }
}



const numericSort = (a,b)=>a-b;
