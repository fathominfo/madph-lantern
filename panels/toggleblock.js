
const TEMPLATE = document.querySelector("#templates .togglepanel");
TEMPLATE.remove();
const INPUT_TEMPLATE = TEMPLATE.querySelector("label");
INPUT_TEMPLATE.remove();


export class ToggleBlock {

	constructor(div, entry, childIds) {
		this.div = div;
    this.panelLookup = {};
    this.radios = TEMPLATE.querySelector(".radio").cloneNode(true);
    this.div.insertBefore(this.radios, this.div.childNodes[0]);
    this.options = [];
    childIds.forEach((id, order)=>{
      const d = this.div.querySelector(`#${id}`);
      const label = entry.contents[order].label || '';
      this.panelLookup[id] = d;
      this.addToggle(label, id, d, 0 === order);
    });
	}

  addToggle(label, id, chart, checked) {
    const option = INPUT_TEMPLATE.cloneNode(true);
    const input = option.querySelector("input");
    option.querySelector('span').textContent = label;
    input.checked = checked;
    input.value = id;
    this.options.push(input)
    this.radios.appendChild(option);
    option.addEventListener("click", ()=>this.setOption());
    chart.classList.toggle("hidden", !checked);
  }

  setOption() {
    const current = this.radios.ele.value;
    Object.entries(this.panelLookup).forEach(([id, panel])=>{
      panel.classList.toggle('hidden', id !== current);
    });
    
  }

}