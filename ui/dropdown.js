const OPTION_TEMPLATE = document.createElement("template");
OPTION_TEMPLATE.innerHTML = `
  <button type="button" class="dropdown-option"></button>
`;

export class Dropdown {
  constructor(button, element, selectCallback, styleProperties={}) {
    this.button = button;
    this.element = element;
    this.selectCallback = selectCallback;
    this.optionLookup = {};

    // set any custom styles as css variables
    for (const key in styleProperties) {
      this.element.style.setProperty(`--${key}`, styleProperties[key]);
    }

    this.setListeners();
  }

  setListeners() {
    this.button.addEventListener("click", () => {
      this.toggleExpanded();
      if (this.isExpanded()) {
        this.element.focus();
      }
    });

    // handle clicking out or tabbing out
    this.element.addEventListener("focusout", (e) => {
      const relatedTarget = e.relatedTarget;

      if (relatedTarget === null) {
        // dismiss
        this.toggleExpanded(false);
      } else if (relatedTarget === this.button) {
        // ignore
      } else if (relatedTarget.closest(".dropdown") !== this.element) {
        // dismiss
        this.toggleExpanded(false);
      }
    });

    // handle escape
    this.element.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // dismiss
        this.toggleExpanded(false);
      }
    });
  }

  createList(options) {
    this.optionLookup = {};
    options.forEach(([key, value]) => {
      const clone = OPTION_TEMPLATE.content.cloneNode(true);
      const item = clone.querySelector(".dropdown-option");
      item.textContent = value;
      item.setAttribute('value', key);
      item.addEventListener("click", this.handleOptionClick.bind(this));
      this.optionLookup[key] = item;
      this.element.appendChild(item);
    });
  }

  handleOptionClick(e) {
    const target = e.target;
    const valueStr = target.value;
    const parsedValue = parseInt(valueStr);
    const value = Number.isNaN(parsedValue) ? valueStr : parsedValue;
    this.selectCallback(value);

    // dismiss dropdown
    this.toggleExpanded(false);
  }

  setSelected(value) {
    const options = Object.values(this.optionLookup);
    options.forEach(item => {
      const valueStr = item.value;
      const parsedValue = parseInt(item.value);
      const itemValue = Number.isNaN(parsedValue) ? valueStr : parsedValue;
      const selected = itemValue === value && value;
      item.setAttribute("aria-current", selected ? "true" : "false");
    });
  }

  toggleExpanded(expanded) {
    if (expanded === undefined) {
      expanded = !this.isExpanded();
    }
    this.button.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  isExpanded() {
    return this.button.getAttribute("aria-expanded") === "true";
  }
}