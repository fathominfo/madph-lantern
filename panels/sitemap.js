import * as Lookout from '../lookout.js' ;
import { colors } from '../palette.js';
import { Dropdown } from '../ui/dropdown.js';

const PURGABLE = ["#city_nodes", "#region_coastline", "#adjacent_entities", "#adjacent_subdivisions", "#region_ocean", "#subdivisions"];
const MAP_COLORS = colors.Header.Overview.Selection;
const MAP_COLORS_ON = MAP_COLORS.On;
const MAP_COLORS_STATIC = MAP_COLORS.Static;
const BACKGROUND_COLOR = colors.Header.Selection.Static.Site.Country.Fill;
const NODE_COLOR = colors.Header.Selection.Static.Site.Node.Fill;
const SITE_COLORS_OFF = colors.Header.Selection.Static.Site;
const SITE_COLORS_ON = colors.Header.Selection.On.Site;

export class SiteMap {
    container;
    element;
    geoSet;
    svg;
    label;
    dropdown;


    constructor(config, minimapId, container) {
        this.geoSet = Lookout.site.sets[config.set];
        this.container = container;
        this.element = container.querySelector(`#${minimapId}`);
        this.dropdown = new Dropdown(
          this.element,
          container.querySelector("#site-dropdown"),
          this.handleSelect,
          {
            "bg": MAP_COLORS_STATIC.Fill,
            "bg-active": MAP_COLORS_ON.Fill,
            "bg-on": "#76A6AD", // no color for this in the palette at the moment
            "fg": MAP_COLORS_STATIC.Label.Text,
            "fg-active": MAP_COLORS_ON.Label.Text
          }
        );

        const svgUrl = Lookout.getLocationUrl(config.uri);
        // console.log(svgUrl);
        fetch(svgUrl)
            .then(response => response.text())
            .then(text => {
                const temporaryWrapper = document.createElement('div');
                temporaryWrapper.innerHTML = text;
                const theSource = temporaryWrapper.querySelector('svg');
                PURGABLE.forEach(selector=>{
                  theSource.querySelectorAll(selector).forEach(ele=>ele.remove());
                });
                this.element.appendChild(theSource);
                this.svg = theSource;
                this.svg.id = 'sitemap-svg';
                this.nodes = {}
                Object.entries(this.geoSet).forEach(([k, v]) => {
                  v = v.toLowerCase();
                  const el = this.svg.getElementById(`site-${v}`);
                  if (el) {
                    this.setDefaultColors(el);
                    this.nodes[k] = el;
                  } else {
                    console.log(`site-${v} is not a valid path ID for the minimap SVG.`);
                  }
                });
                this.label = document.createElement('span');
                this.label.innerText = "All Sites";
                this.element.appendChild(this.label);
                this.dropdown.createList(Object.entries({...this.geoSet, '': 'All Sites'}));
                this.setContainerDefaultColors();
                this.svg.querySelector("#site_links").querySelectorAll("line").forEach(line => {
                  line.style.stroke = SITE_COLORS_OFF.Link.Stroke;
                  line.style.strokeWidth = 10;
                })
            })
            .catch(err=>{
              console.warn(err);
              this.element.remove();
            });
    }

    handleSelect(value) {
      const parsedValue = parseInt(value);
      const code = Number.isNaN(parsedValue) ? value : parsedValue;
      Lookout.setSelectedSite(code);
    }

    setDefaultColors(el, activeSelection) {
      el.style.fill = activeSelection ? SITE_COLORS_ON.Node.Fill.Static : SITE_COLORS_OFF.Node.Fill;
      if (activeSelection) {
        el.setAttribute('r', 15);
      } else {
        el.setAttribute('r', 25);
      }
    }

    setContainerDefaultColors() {
      this.element.style.backgroundColor = MAP_COLORS_STATIC.Fill;
      this.label.style.color = MAP_COLORS_STATIC.Label.Text;
      const entity = this.svg.getElementById("entity").querySelector('path');
      entity.style.fill = SITE_COLORS_OFF.Country.Fill;
      entity.style.stroke = SITE_COLORS_OFF.Country.Stroke;
    }

    setHighlightedColors(el) {
      el.style.fill = SITE_COLORS_ON.Node.Fill.On;
      el.setAttribute('r', 25);
    }

    setContainerHighlightedColors() {
      this.element.style.backgroundColor = MAP_COLORS_ON.Fill;
      this.label.style.color = MAP_COLORS_ON.Label.Text;
      const entity = this.svg.getElementById("entity").querySelector('path');
      entity.style.fill = SITE_COLORS_ON.Country.Fill;
      entity.style.stroke = SITE_COLORS_ON.Country.Stroke;
    }

    highlightSite(site) {
      this.label.innerText = this.geoSet[site] || "All Sites";
      Object.entries(this.nodes).forEach(([code, el]) => {
        el.removeAttribute("aria-current");
        this.setDefaultColors(el, !!this.geoSet[site]);
      });
      this.setContainerDefaultColors();
      if (site) {
        const el = this.nodes[site];
        if (el) {
          el.setAttribute("aria-current", "true");
          this.setHighlightedColors(el);
          this.setContainerHighlightedColors();
        }
      }
      this.dropdown.setSelected(site);
  }
}