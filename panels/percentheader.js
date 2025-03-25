import * as Lookout from '../lookout.js';
import { mapRecords, getTally} from '../views/single.js';

const TEMPLATE_DIV = document.querySelector("#templates .toggle-readout");
TEMPLATE_DIV.remove();


export class PercentHeader {


  constructor() {
    this.div = TEMPLATE_DIV.cloneNode(true);
  }

}
