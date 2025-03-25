// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Donut } from "./donut.js";

export class Treemap extends Donut {
  // constructor(container, pathogen, entry, triggerFilteringCallback) {
  //   super(container, pathogen, entry, triggerFilteringCallback);
  constructor(container, datasource, entry) {
    super(container, datasource, entry);
    this.div.querySelector('g').style.transform = null;
  }

  instantiateChart() {
    this.treemap = d3.treemap()
      .size([this.width, this.height])
      .padding(1);
  }

  drawChart() {
    const root = d3.hierarchy({ children: this.tally })
      .sum(d => d[1]);
    this.treemap(root);
    const g = this.svg.append("g")
    g.selectAll(".node")
      .data(root.leaves())
      .join("rect")
      .classed("node", true)
      .style("fill", d=>this.palette.getFill(d.data[0]))
      .attr("data-value", d => d.data[0])
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .on("click", (_, d)=>this.datasource.toggleValue(`${d.data[0]}`))
      .on("mouseenter", (_, d)=>this.datasource.highlight(`${d.data[0]}`))
      .on("mouseleave", (_, d)=>this.datasource.highlight(null));
  }


  updateStyles(filterValue, hoveredValue) {
    this.svg.selectAll(".node").style("fill", d=>{
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
}

