import { parseNewick } from '../newick.js';
import { getLocationUrl } from '../lookout.js';
import { TreePanel, MARGIN, DEFAULT_CONF } from './treepanel.js';


export class NewickTreePanel extends TreePanel {

  fetchData(uri) {
    fetch(getLocationUrl(uri)).then(resp=>resp.text())
      .then(txt=>{
        this.treeData = parseNewick(txt);
        this.generateLayout();
      });
  }

  createNode(data, parent, index) {
    const node = super.createNode(data, parent, index);
    if (!node.isBranch) {
      const {nwk_delimiter, nwk_id_pos} = this.config;
      try {
        node.name = data.name;
        data = data.name.split(nwk_delimiter);
        node.id = data[nwk_id_pos]
      } catch(err) {
        console.log(data, err)
      }
    }
    return node;
  }


}

