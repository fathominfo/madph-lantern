
/* TODO: use a more generic newick parser */
export function parseNewick(txt) {

  let id = 0;
  class Node {
    constructor(parent) {
      this.parent = parent;
      this.length = 0;
      this.name = null;
      this.__id = id++;
      if (parent) {
        parent.add(this);
      }
    }

    setBranchy() {
      if (!this.branchset) this.branchset = [];
    }

    setName(name) {
      this.name = name;
    }

    add(k){
      this.branchset.push(k);
    }

    setLength(buffer) {
      this.length = parseFloat(buffer) || 0;
      // console.log(buffer);
    }
  }

  let node = null,
    tL = txt.length,
    buffer = "";



  let root = new Node();
  node = root;

  // console.log("starting to parse");
  for (let i=0; i<tL; i++) {
    let c = txt[i];
    switch(c) {
    case '(':
      if (node) {
        node.setBranchy();
      }
      // console.log(txt.substring(i))
      node = new Node(node);
      buffer = "";
      break;
    case ')':
      if (buffer.length) {
        node.setLength(buffer);
      }
      node = node.parent;
      buffer = '';
      break;
    case ':':
      if (node) {
        node.setName(buffer);
      }
      buffer = '';
      break;
    case ',':
      if (buffer.length){
        node.setLength(buffer);
      }
      // we are adding a sibling
      node = new Node(node.parent);
      buffer = '';
      break;
    default:
      buffer += c;
    }
  }
  
  return root;
}