import * as Lookout from '../lookout.js' ;
import { colors } from '../palette.js';

const PURGABLE = ["#site_nodes", "#site_links", "#city_nodes", "#region_coastline", "#adjacent_entities", "#adjacent_subdivisions", "#region_ocean", "#ocean"];
const MAP_COLORS = colors.Header.Overview.Selection;
const MAP_COLORS_ON = MAP_COLORS.On;
const MAP_COLORS_STATIC = MAP_COLORS.Static;

export class MiniMap {
  container;
  geoSet;
  svg;
  label;
  default_selection;


  constructor(config, minimapId) {
    this.geoSet = Lookout.site.sets[config.set];
    this.container = document.getElementById(minimapId);
    const svgUrl = Lookout.getLocationUrl(config.uri);
    this.adminSublevelName = config.admin_sublevel_name || 'State';
    this.adminSublevelNamePlural = config.admin_sublevel_name_pl || 'States';
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
        this.container.appendChild(theSource);
        this.svg = theSource;
        this.svg.id = 'minimap-svg';
        this.svgRegions = {}
        Object.keys(this.geoSet).forEach(key => {
          const el = this.svg.getElementById(key.replaceAll(' ', '_').toLowerCase()) || this.svg.getElementById(key.replaceAll(' ', '_'));;
          if (el) {
            el.style.strokeWidth = 10;
            this.setDefaultColors(el);
            this.svgRegions[key] = el;
          } else {
            console.log(`${key} is not a valid path ID for the minimap SVG.`);
          }
        });
        this.default_selection = `All ${this.adminSublevelNamePlural}`;
        this.label = document.createElement('span');
        this.label.innerText = this.default_selection;
        this.container.appendChild(this.label);
        this.container.addEventListener("click", () => {
          Lookout.setSelectedGeo(null);
        })
        this.setContainerDefaultColors();
      })
      .catch(err=>{
        console.warn(err);
        this.container.remove();
      });
  }

  setDefaultColors(el, activeSelection) {
    const colorSet = activeSelection ? MAP_COLORS_ON : MAP_COLORS_STATIC;
    const stateCode = el.id.toUpperCase();
    const hasData = stateCode in Lookout.geography.found;
    el.style.fill = hasData ? colorSet.Map.State.Fill.Static : colorSet.Map.State.Fill.Off;
    el.style.stroke = hasData ? colorSet.Map.State.Stroke.Static : colorSet.Map.State.Stroke.Off;
  }

  setContainerDefaultColors() {
    this.container.style.backgroundColor = MAP_COLORS_STATIC.Fill;
    this.container.querySelector('span').style.color = MAP_COLORS_STATIC.Label.Text;
  }

  setHighlightedColors(el) {
    const stateCode = el.id.toUpperCase();
    const hasData = stateCode in Lookout.geography.found;
    el.style.fill = hasData ? MAP_COLORS_ON.Map.State.Fill.On : MAP_COLORS_ON.Map.State.Fill.Off;
    el.style.stroke = hasData ? MAP_COLORS_ON.Map.State.Stroke.On : MAP_COLORS_ON.Map.State.Stroke.Off;
  }

  setContainerHighlightedColors() {
    this.container.style.backgroundColor = MAP_COLORS_ON.Fill;
    this.container.querySelector('span').style.color = MAP_COLORS_ON.Label.Text;
  }

  highlightGeo(geo) {
    this.label.innerText = this.geoSet[geo] || this.default_selection;
    Object.entries(this.svgRegions).forEach(([code, el]) => {
      el.classList.remove("highlight")
      this.setDefaultColors(el, !!this.geoSet[geo]);
      this.setContainerDefaultColors();
    });
    if (geo) {
      const el = this.svgRegions[geo]
      el.classList.add("highlight");
      this.setHighlightedColors(el);
      this.setContainerHighlightedColors();
    }
  }
}
