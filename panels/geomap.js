import * as Lookout from '../lookout.js' ;
import { Geography } from "./geography.js";
import { getMapDataColor } from '../paletteutil.js';
import { colors } from '../palette.js';

const MAP_COLORS = colors.Map;
const PURGABLE = ["#site_nodes", "#site_links", "#city_nodes"];

export class GeoMap extends Geography {
  svg = null;
  missingCodes;

  constructor(parentId, config) {
    super(parentId, config);

    const svgUrl = Lookout.getLocationUrl(config.uri);
    fetch(svgUrl)
      .then(response => response.text())
      .then(text => {
        // console.log('geo map', parentId)
        const parent = document.getElementById(parentId);
        this.parent = parent;
        const svgDiv = document.createElement('div');
        svgDiv.classList.add('map-svg-container');
        svgDiv.style.borderColor = MAP_COLORS.Module.Stroke;
        svgDiv.innerHTML = text;
        parent.appendChild(svgDiv);

        // PROCESS SVG
        this.svg = parent.getElementsByTagName('svg')[0];

        // 1. Remove extraneous SVG elements by ID
        PURGABLE.forEach(selector=>{
          this.svg.querySelectorAll(selector).forEach(ele=>ele.remove());
        });

        // 2. On click outside of subdivisions, remove selection
        this.svg.addEventListener("click", () => {
          Lookout.setSelectedGeo(null);
        });

        // 3. Add white background behind subdivision for blending on pushback if #entity element exists
        const entitye = this.svg.getElementById('entity');
        const entityBackground = entitye?.cloneNode(true);
        if (entityBackground) {
          entityBackground.id = 'entity-background';
          const backgroundPath = entityBackground.querySelector('path');
          backgroundPath.id = 'entity-background-path';
          backgroundPath.style.fill='white';
          this.svg.insertBefore(entityBackground, this.svg.getElementById('subdivisions'));
        }

        this.setListeners();
        this.setMissingColors();
        this.updateSelection();
      })
      .catch(console.error.bind(console));

    this.missingCodes = Lookout.geography.missing;
  }


  // color each "no data" region using the "missing" color
  setMissingColors() {
    this.missingCodes.forEach(code => {
      let el = this.svg.getElementById(code.replaceAll(' ', '_').toLowerCase()) || this.svg.getElementById(code.replaceAll(' ', '_'));
      if (el != null) {
        el.style.fill = MAP_COLORS.Unit.NA.Fill;
        el.style.stroke = MAP_COLORS.Unit.NA.Stroke;
        this.geoDom[code] = {
          svg: el
        };
      } else {
        console.error(`could not find ${code} to set its missing color`);
      }
    });
  }


  setListeners() {
    const allCodes = [...new Set(this.foundCodes.concat(this.missingCodes))];
    allCodes.forEach(code => {
      let el = this.svg.getElementById(code.replaceAll(' ', '_').toLowerCase()) || this.svg.getElementById(code.replaceAll(' ', '_'));
      if (el != null) {
        el.addEventListener('mouseenter', function(event) {
          if (!Lookout.getSelectedGeo()) {Lookout.setHoverGeo(code);}
          el.style.cursor = 'pointer';
        });
        el.addEventListener('click', function(event) {
          event.stopPropagation();
          Lookout.setSelectedGeo(code);
        });
        el.addEventListener('mouseleave', function(event) {
          if (!Lookout.getSelectedGeo()) {Lookout.setHoverGeo(null);}
          el.style.cursor = 'inherit';
        });
      } else {
        console.error(`code ${code} not found in the map svg`);
      }
    });
  }


  setFoundColors(sortedCodes) {
    this.foundCodes.forEach(code => {
      // as expected, can't use opacity since it just
      // passes through to the blue ocean layer
      const farbe = getMapDataColor(this.viewAmount[code]);
      const mapItem = this.svg.getElementById(code.toLowerCase()) || this.svg.getElementById(code);
      if (mapItem) {
        mapItem.style.fill = farbe.Fill;
        mapItem.style.stroke = farbe.Stroke;
      }
    });
    // also set the display order, putting the highest
    // values on top
    for (let i = sortedCodes.length - 1; i >= 0; i--) {
      const code = sortedCodes[i];
      const mapItem = this.svg.getElementById(code.toLowerCase()) || this.svg.getElementById(code);
      if (mapItem) {
        const parent = mapItem.parentNode;
        parent.appendChild(mapItem);
      }
    }
  }

  updateTallies(selectionIndex, selectionCount, activeTests) {
    super.updateTallies(selectionIndex, selectionCount, activeTests);
    if (this.svg != null) {
      this.setFoundColors(this.sortedCodes);
    }
    const geoOfInterest = Lookout.getSelectedGeo() || Lookout.getHoverGeo();
    this.highlightGeo(geoOfInterest);
  }

  highlightGeo(geo) {
    requestAnimationFrame(()=>{
      Object.entries(this.geoDom).forEach(([code, {svg}])=>{
        svg.classList.remove('highlight');
        svg.classList.toggle('back', geo!==code && Lookout.getSelectedGeo());
      });
      const dommy = this.geoDom[geo];
      if (dommy) {
        const mapItem = dommy.svg;
        if (mapItem) {
          mapItem.classList.add('highlight');
          const parent = mapItem.parentNode;
          parent.appendChild(mapItem);
        }
      }
    });
  }

}
