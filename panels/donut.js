import { colors } from "../palette.js";
import { LISTENER_TYPES } from "./field.js";

const MAX_SECTORS = 9;

const TEMPLATE_DIV = document.querySelector("#templates .donut-chart");
TEMPLATE_DIV.remove();


export class Donut {
  // constructor(container, pathogen, entry, triggerFilteringCallback) {
  constructor(container, datasource, entry) {
    this.div = TEMPLATE_DIV.cloneNode(true);
    container.appendChild(this.div);
    this.datasource = datasource;
    datasource.addListener(LISTENER_TYPES.tally, tally=>this.applyTally(tally));
    datasource.addListener(LISTENER_TYPES.filterStatus, (filterValue, hoveredValue)=>this.updateStyles(filterValue, hoveredValue));
    this.pathogen = datasource.pathogen;
    this.prop = datasource.prop;
    this.set = datasource.set;
    this.palette = datasource.palette;
    this.values = datasource.getSortedValues();
    this.svg = d3.select(container.querySelector(".chart-svg"));
    this.width = parseInt(this.svg.attr("width"));
    this.height = parseInt(this.svg.attr("height"));
    this.maxSectors = entry.max_sectors || MAX_SECTORS;
    this.instantiateChart();
  }

  instantiateChart() {
    this.pieGenerator = d3.pie()
      .value(d => d[1])
      .sort(null);
    this.outerRad = this.width / 2;
    this.innerRad = this.outerRad / 2;
    this.svg.append("g")
      .style("transform", `translate(50px, 50px)`);
  }

  updateStyles(filterValue, hoveredValue) {
    this.svg.selectAll(".sector").style("fill", d=>{
      const value = d.data[0];
      const conf = this.palette.getConf(value);
      let fill = conf.Fill.Static;
      if (`${filterValue}` === value) {
        fill = conf.Filter.Fill.On;
      } else if (`${hoveredValue}` === value) {
        fill = conf.Fill.On;
      } 
      return fill;
    });
  }

  applyTally(counts) {
    const sorted = Object.entries(counts);
    sorted.sort((a, b)=>b[1] - a[1]);
    let included = sorted;
    let otherCount = 0;
    // sort according to the infiltered counts for display consistency
    if (sorted.length > this.maxSectors) {
      included = sorted.slice(0, this.maxSectors-1);
      otherCount = sorted.slice(this.maxSectors-1).reduce((tot, entry)=>tot+entry[1], 0);      
    }
    included.sort((a, b)=>this.values.indexOf(a[0]) - this.values.indexOf(b[0]));
    if (otherCount > 0) {
      included.push(['other', otherCount]);
    }
    this.tally = included;
    this.draw();
    this.updateStyles();
  }

  draw() {
    this.svg.html("");
    if (this.tally.length === 0) {
      this.drawNoData();
    } else {
      this.drawChart();
    }
  }

  drawChart() {
    const pie = this.pieGenerator(this.tally);
    const g = this.svg.append("g")
      .style("transform", `translate(50px, 50px)`)
    g.selectAll(".sector")
      .data(pie)
      .join("path")
      .classed("sector", true)
      .style("fill", d=>this.palette.getFill(d.data[0]))
      .attr("data-value", d => d.data[0])
      .attr("d", d3.arc().innerRadius(this.innerRad).outerRadius(this.outerRad))
      .on("click", (_, d)=>this.datasource.toggleValue(`${d.data[0]}`))
      .on("mouseenter", (_, d)=>this.datasource.highlight(`${d.data[0]}`))
      .on("mouseleave", (_, d)=>this.datasource.highlight(null));
  }

  drawNoData() {
    this.svg.append("text")
      .attr("x", 50)
      .attr("y", 44)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "60%")
      .style("fill", colors.Module.Readout.Text.Off)
      .text("No data");
    this.svg.append("text")
      .attr("x", 50)
      .attr("y", 56)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "60%")
      .style("fill", colors.Module.Readout.Text.Off)
      .text("available");
  }


}

