import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as Lookout from '../lookout.js' ;
import { Geography } from "./geography.js";
import { colors } from '../palette.js';
import { hexToRGBA } from "../util.js";

const MAP_COLORS = colors.Map;
const PURGABLE = ["#site_nodes", "#site_links", "#city_nodes"];

export class CoordinateMap extends Geography {
  svg = null;
  missingCodes;

  constructor(parentId, config) {
    super(parentId, config);

    const svgUrl = Lookout.getLocationUrl(config.uri);
    fetch(svgUrl)
      .then(response => response.text())
      .then(text => {
        // console.log('coord map', parentId)
        const parent = document.getElementById(parentId);
        this.parentId = parentId;
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
        this.setScales();
        this.setDomReadout();
        parent.appendChild(this.readoutEle);
        this.updateSelection();
      })
      .catch(console.error.bind(console));

    this.missingCodes = Lookout.geography.missing;
  }

  setDomReadout() {
    this.readoutEle = document.createElement('div');
    this.readoutEle.classList.add("coordinate-readout");
    this.readoutEle.classList.add("hiding");
    // const numSpan = document.createElement('span');
    // numSpan.classList.add('num');
    // numSpan.textContent = 4;
    // const categorySpan = document.createElement('span');
    // categorySpan.classList.add('category');
    // categorySpan.textContent = 'Enterica'
    // this.readoutEle.appendChild(numSpan);
    // this.readoutEle.appendChild(categorySpan);
  }

  updateReadout(d) {
    if (d) {
      const r = Math.random();
      const day = Lookout.days[d.date_index];
      let exposure = 'nothing, really.';
      const exposures = ['meat_dairy_exposures', 'veg_exposures', 'other_exposures'];
      const choices = exposures.filter(e => e in d);
      if (choices.length > 0) {
        exposure = ''
        const i = Math.floor(Math.random() * choices.length);
        const choice = d[choices[i]];
        for (let j = 0; j < choice.length; j++) {
          if (choice.length > 1 && j === choice.length - 1) {
            exposure += 'and ';
          }
          exposure += choice[j];
          if (choice.length !== 2 && j !== choice.length - 1) {
            exposure += ', ';
          } else if (choice.length === 2 && j !== choice.length -1) {
            exposure += ' ';
          }
        }
      }
      
      // if (r < 0.4) {
      //   this.readoutEle.textContent = `A ${Lookout.site.sets.gender[d.gender].toLowerCase()} individual, ${Math.round(d.age)} years of age, with a propensity for ${exposure}.`;
      // } else if (r < 0.8) {
      //   this.readoutEle.textContent = `This is a ${Math.round(d.age)}-year-old ${Lookout.site.sets.gender[d.gender].toLowerCase()} from ${Lookout.site.sets.county_short[d.geo]} County. They had close contact with ${exposure}.`;
      // } else {
      //   this.readoutEle.textContent = `Looks like ${exposure} are the particular vices of this ${Lookout.site.sets.county_short[d.geo]} resident, a ${Math.round(d.age)}-year-old ${Lookout.site.sets.gender[d.gender].toLowerCase()}.`;
      // }
      this.readoutEle.innerHTML = '';
      let span = document.createElement('span');
      span.textContent = `ID: ${d.wgs_num}`;
      this.readoutEle.appendChild(span);
      if (d.address !== undefined) {
        span = document.createElement('span');
        let city = Lookout.site.sets.city[d.city];
        span.textContent = `${d.address}, ${city}`;
        this.readoutEle.appendChild(span);
      }
      // if (d.clusters !== undefined) {
      //   span = document.createElement('span');
      //   span.textContent = `Cluster${d.length === 1 ? '' : 's'}: ${d.clusters.join(', ')}`;
      //   this.readoutEle.appendChild(span);
      // }
      span = document.createElement('span');
      span.textContent = `${day}`;
      this.readoutEle.appendChild(span);
      this.readoutEle.classList.remove('hiding');
    } else {
      this.readoutEle.classList.add('hiding');
    }
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
  }

  setScales() {
    // const minLat = 40.65;
    // const maxLat = 43.68;
    // const minLon = -69.72;
    // const maxLon = -73.72;
    const minLat = 40.65;
    const maxLat = 43.68;
    const minLon = -69.62;
    const maxLon = -73.78;

    const viewBox = this.parent.querySelector('.map-svg-container svg')?.getAttribute('viewBox');

    let w = 0, h = 0;
    if (viewBox) {
        const [minX, minY, width, height] = viewBox.split(' ').map(Number);
        w = width;
        h = height;
    }

    this.projection = d3.geoConicConformal()
      .center([0, 42.17]) // .center([-71.0589, 42.3601])
      .rotate([71.715, 0])
      .parallels([41.71667, 42.6833])
      .scale(18700)
      .translate([w / 2, h / 2]);
    
    this.xScale = d3.scaleLinear()
      .domain([maxLon, minLon])
      .range([0, w]);

    this.yScale = d3.scaleLinear()
      .domain([maxLat, minLat])
      .range([0, h]);
  }

  drawCoordinates() {
    this.coords = []
    const buckets = this.getRecords();
    buckets.forEach(subcases=>subcases.forEach(recordIndex=>{
      const record = Lookout.records[recordIndex];
      if ("coords" in record) {
        this.coords.push(record);
      }
    }));

    d3.select(`#${this.parentId} .map-svg-container svg`)
      .selectAll("circle")
      .remove();

    const points = d3.select(`#${this.parentId} .map-svg-container svg`)
      .selectAll("circle")
      .data(this.coords)
      .enter().append("circle")
      .attr("r", 5)
      .attr("fill", hexToRGBA(MAP_COLORS.Location.City.Node.Fill, 0.7))
      .attr("cx", d => this.projection([d.coords.lon, d.coords.lat])[0]) // this.xScale(d.coords.lon)
      .attr("cy", d => this.projection([d.coords.lon, d.coords.lat])[1]) // this.yScale(d.coords.lat)
      .on("mouseenter", (event, d)=>{
        d3.select(event.currentTarget)
          .attr("r", 15)
          .attr("fill", hexToRGBA(MAP_COLORS.Module.Text, 0.9));
        this.updateReadout(d);
      })
      .on("mouseleave", (event, d)=>{
        d3.select(event.currentTarget)
          .attr("r", 5)
          .attr("fill", hexToRGBA(MAP_COLORS.Location.City.Node.Fill, 0.7));
        this.updateReadout();
      });
  }

  updateCoordinates() {
    if (this.svg != null) {
      this.drawCoordinates();
    }
  }

  highlightGeo(geo) {
    return;
  }

  updateSelection(_, __, activeTests) {
    this.updateCoordinates();
  }

}
