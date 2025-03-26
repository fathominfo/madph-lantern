import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { colors } from "../palette.js";
import { LISTENER_TYPES } from "./field.js";

const MAX_SECTORS = 9;

const TEMPLATE_DIV = document.querySelector("#templates .flat-donut-chart");
TEMPLATE_DIV.remove();


export class FlatDonut {
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
    this.selection = 0;
    this.svg = d3.select(container.querySelector(".chart-svg"));
    this.width = parseInt(this.svg.attr("width"));
    this.height = parseInt(this.svg.attr("height"));
    this.maxSectors = entry.max_sectors || MAX_SECTORS;
    this.instantiateChart();
    this.setDomReadout();
    container.appendChild(this.readoutEle);
  }

  setDomReadout() {
    this.readoutEle = document.createElement('div');
    this.readoutEle.classList.add("fd-readout");
    const numSpan = document.createElement('span');
    numSpan.classList.add('num');
    numSpan.textContent = '';
    const categorySpan = document.createElement('span');
    categorySpan.classList.add('category');
    categorySpan.textContent = '';
    this.readoutEle.appendChild(numSpan);
    this.readoutEle.appendChild(categorySpan);
    this.categorySpan = categorySpan;
    this.numSpan = numSpan; 
  }

  updateReadout(d) {
    let category;
    let num; 
    if (d) {
      num = d.data[1];
      category = d.data[0];
    } else {
      let index = 0;
      for (let i = 0; i < this.tally.length; i++) {
        if (this.tally[i][1] !== 0) {
          index = i;
          break;
        }
      }
      this.selection = index;
      num = this.tally[this.selection][1];
      category = this.tally[this.selection][0];
    }
    this.numSpan.textContent = num;
    this.categorySpan.textContent = num === 0 ? ''
        : category in this.set ? this.set[category] 
        : category === '' ? '(empty)'
        : category;
  }

  enlargeHover(g, barHeight) {
    g.selectAll("rect")
            .filter((dr, _) => dr.index === this.selection)
            .transition()
            .duration(200)
            .attr("height", 1.5*barHeight)
            .attr("y", (this.height - 1.5*barHeight)/2);
  }

  instantiateChart() {
    this.pieGenerator = d3.pie()
      .value(d => d[1])
      .sort(null);
    this.svg
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "none");
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
      const pie = this.pieGenerator(this.tally).filter(({value})=>value > 0);
      const TAU = Math.PI * 2;
      const g = this.svg.append("g")

      const barHeight = 18;
      const barSpacing = 0.5;

      g.selectAll(".sector")
        .data(pie)
        .join("rect")
        .classed("sector", true)
        .style("fill", d=>this.palette.getFill(d.data[0]))
        .attr("width", d => {
          const w = (d.endAngle - d.startAngle) / TAU * this.width;
          return w > 1 ? w - barSpacing : w;
        })
        .attr("x", d => d.startAngle / TAU * this.width)
        .attr("y", (_, i) => i === 0 ? (this.height - 1.5*barHeight)/2 : (this.height - barHeight)/2)
        .attr("height", (d, i) => i === 0 ? 1.5*barHeight : barHeight)
        .on("click", (_, d)=>{
          if (d.data[0] === 'other') {return;}
          this.datasource.toggleValue(`${d.data[0]}`)
          this.updateReadout();
          this.enlargeHover(g, barHeight);
        })
        .on("mouseenter", (_, d)=>{
          g.selectAll("rect")
            .transition()
            .duration(150)
            .attr("height", 1*barHeight)
            .attr("y", (this.height - 1*barHeight)/2);
          g.selectAll("rect")
            .filter((dr, _) => dr === d)
            .transition()
            .duration(150)
            .attr("height", 1.5*barHeight)
            .attr("y", (this.height - 1.5*barHeight)/2);
          this.updateReadout(d);
          this.datasource.highlight(`${d.data[0]}`);
        })
        .on("mouseleave", (_, d)=>{
          g.selectAll("rect")
            .transition()
            .duration(150)
            .attr("height", 1*barHeight)
            .attr("y", (this.height - 1*barHeight)/2);
          this.updateReadout();
          this.datasource.highlight(null);
          this.enlargeHover(g, barHeight);
        })
    this.updateReadout();
  }

  drawNoData() {
    // this.svg.append("text")
    //   .attr("x", 50)
    //   .attr("y", 44)
    //   .attr("text-anchor", "middle")
    //   .attr("dominant-baseline", "middle")
    //   .style("font-size", "60%")
    //   .style("fill", colors.Module.Readout.Text.Off)
    //   .text("No data");
    // this.svg.append("text")
    //   .attr("x", 50)
    //   .attr("y", 56)
    //   .attr("text-anchor", "middle")
    //   .attr("dominant-baseline", "middle")
    //   .style("font-size", "60%")
    //   .style("fill", colors.Module.Readout.Text.Off)
    //   .text("available");
    this.div.classList.add("no-data");
    // console.log(this.div.classList)
  }


}