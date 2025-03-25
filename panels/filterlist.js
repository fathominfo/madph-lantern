const TEMPLATE_DIV = document.querySelector("#templates .filter-container");
TEMPLATE_DIV.remove();

const BUTTON_TEMPLATE = document.querySelector("#templates .filter-value");
BUTTON_TEMPLATE.remove();

export class FilterList {
  constructor(container, pathogen, id, drawCallback) {
    this.container = container;
    this.id = id;
    this.pathogen = pathogen;
    this.propTemplate = TEMPLATE_DIV.cloneNode(true);
    this.drawCallback = drawCallback;
  }

  update(datasource, value, prop, valueLabel, propLabel) {
    const propDivId = `${this.id}-${prop}`;
    let propDiv = this.container.querySelector(`#${propDivId}`);
    if (value === null) {
      this.clearDiv(propDiv);
    } else {
      if (!propDiv) {
        propDiv = this.propTemplate.cloneNode(true);
        propDiv.id = `${this.id}-${prop}`;
        propDiv.querySelector(".filter-label").textContent = propLabel;
        this.container.appendChild(propDiv);
      }
      const propList = propDiv.querySelector(".filter-list");
      propList.innerHTML = ``;
      const d = this.getButton(value, valueLabel, datasource.palette.getFilterConf(value));
      d.addEventListener('click', () => {
        datasource.removeFilter(value);
        this.clearDiv(propDiv);
        this.drawCallback();
      });
      propList.appendChild(d);
    }
  }

  getButton(value, valueLabel, palette) {
    const button = BUTTON_TEMPLATE.cloneNode(true);
    const label = button.querySelector(".value-label")
    label.textContent = valueLabel;
    button.style.backgroundColor = palette.Fill.Static;
    button.style.borderColor = palette.Stroke.Static;
    label.style.color = palette.Text.Static;
    button.querySelector('.dismisser').style.color = palette.Glyph.Static;
    button.setAttribute('value', value);
    return button;
  }

  clearDiv(propDiv) {
    if (propDiv) {
      this.container.removeChild(propDiv);
    }
  }

}