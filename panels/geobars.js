import * as Lookout from '../lookout.js' ;
import { Geography } from "./geography.js";
import { getMapDataColor } from '../paletteutil.js';
import { colors } from '../palette.js';

const MAP_COLORS = colors.Map;

export class GeoBars extends Geography{
  
  constructor(parentId, config) {
    super(parentId, config);
    
    this.adminSublevelName = config.admin_sublevel_name || 'State';
    this.adminSublevelNamePlural = config.admin_sublevel_name_pl || 'States';
    const parent = document.getElementById(parentId);
    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('map-details');
    detailsDiv.innerHTML = `
      <div class="map-column state" >
        <div class="map-details-entry">${this.adminSublevelName}</div>
        <div class="column-values" id="mapNames-${this.parentId}"></div>
      </div>
      <div class="map-column bars">
        <div class="map-details-entry">Cases</div>
        <div class="column-values" id="mapBars-${this.parentId}"></div>
      </div>
      <div class="map-column counts">
        <div class="map-details-toggle">Total</div>
        <div class="column-values" id="mapValues-${this.parentId}"></div>
      </div>
    `;

    parent.appendChild(detailsDiv);

    const nameColumn = document.getElementById(`mapNames-${this.parentId}`);
    nameColumn.addEventListener('mouseleave', () => {
      Lookout.setHoverGeo(null);
    });
  }

  updateTallies(selectionIndex, selectionCount, activeTests) {
    super.updateTallies(selectionIndex, selectionCount, activeTests);
    this.updateBars(this.geoCount, this.sortedCodes);
  }

  updateBars(geoCount, sortedCodes) {
    const barColumn = document.getElementById(`mapBars-${this.parentId}`);
    const nameColumn = document.getElementById(`mapNames-${this.parentId}`);
    const valueColumn = document.getElementById(`mapValues-${this.parentId}`);
    if (!barColumn) {return;}

    // Clear previous columns
    barColumn.innerHTML = '';
    nameColumn.innerHTML = '';
    valueColumn.innerHTML = '';

    sortedCodes.forEach((code, i) => {
      if (geoCount[code] !== 0 && code) {
        const num = this.viewAmount[code];
        const farbe = getMapDataColor(num);

        const barContainer = document.createElement('div');
        barContainer.classList.add('bar-container');
        const barDiv = document.createElement('div');
        barDiv.classList.add('bar');
        barDiv.style.width = `${num * 100}%`;
        barDiv.style.backgroundColor = farbe.Fill;
        barDiv.style.borderColor = farbe.Stroke;
        barContainer.appendChild(barDiv);

        const ide = document.createElement('div');
        ide.classList.add('column-identifier')

        const nameDiv = document.createElement('div');
        nameDiv.classList.add('column-value');
        nameDiv.style.color = MAP_COLORS.Leader.Text;
        nameDiv.innerHTML = this.geoSet && this.geoSet[code] ? `${this.geoSet[code]}` : `${code}`;

        ide.addEventListener('mouseenter', () => {
          if (Lookout.getHoverGeo() !== code) {Lookout.setHoverGeo(code);}
        });
        ide.addEventListener('click', () => {
          Lookout.setSelectedGeo(code);
        });

        ide.appendChild(nameDiv);

        const valueDiv = document.createElement('div');
        valueDiv.classList.add('column-value');
        valueDiv.innerHTML = `${geoCount[code]}`;
        valueDiv.style.color = farbe.Text;
        // console.log(farbe.Text)

        barColumn.appendChild(barContainer);
        nameColumn.appendChild(ide);
        valueColumn.appendChild(valueDiv);
        this.geoDom[code] = {}
        this.geoDom[code].bar = barDiv;
        this.geoDom[code].name = nameDiv;
        this.geoDom[code].value = valueDiv;
      }
    });
    this.highlightGeo(Lookout.getSelectedGeo());
  }

  highlightGeo(geo) {
    requestAnimationFrame(()=>{
      Object.entries(this.geoDom).forEach(([code, {bar, value, name}])=>{
        if (bar) {
          if (geo && geo !== code) {
            bar.classList.add('back');
            value.classList.add('back');
            name.classList.add('back');
          } else {
            bar.classList.remove('back');
            value.classList.remove('back');
            name.classList.remove('back');
          }
        }
      });  
    });
  }

}
