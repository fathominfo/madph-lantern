import { LISTENER_TYPES } from "./field.js";

const EXPANDER_TEMPLATE = document.querySelector("#templates .field-div.expander");
EXPANDER_TEMPLATE.remove();

const EXPANDED_MODULE_TEMPLATE = document.querySelector("#templates .expanded-module");
EXPANDED_MODULE_TEMPLATE.remove();

export class FieldDiv {
	
  constructor(div, datasource, config) {
    this.div = div;
    this.datasource = datasource;
    datasource.addListener(LISTENER_TYPES.filterStatus, filterValue=>this.applyStyles(filterValue));
    if (config.expand_layout) {
      const expander = EXPANDER_TEMPLATE.cloneNode(true);
      this.div.appendChild(expander);
      this.expandContents = config.contents.slice(0);
      const expandedClass = config.expand_layout === 'column' ? 'expanded-col' 
        : config.expand_layout === 'row' ? 'expanded-row' 
        : '';
      expander.addEventListener('click', ()=>{
        this.div.classList.toggle('expanded');
        this.div.classList.toggle(expandedClass);
      });
    }
  }

  applyStyles(filterValue) {
    const isFiltering = filterValue !== null;
    if (isFiltering) {
      const p = this.datasource.palette.getFilterConf(filterValue);
      this.div.style.backgroundColor = p.Module.Fill;
      this.div.style.borderColor = p.Module.Stroke;
      this.div.style.color = p.Module.Title.Text;
      this.div.classList.add("filtering");
    } else {
      this.div.style.backgroundColor = 'white';
      this.div.style.borderColor = 'transparent';
      this.div.style.color = 'black';
      this.div.classList.remove("filtering");
    }
  
  }



}