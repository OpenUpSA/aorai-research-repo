import React, { useEffect } from 'react';

import * as d3 from 'd3';



const BarChart = (props) => {

    
    

    

    useEffect(() => {

        const data = props.data;
        const containerWidth = d3.select(".chart-" + props.chartid).node().getBoundingClientRect().width;
        const margin = { top: 0, right: 0, bottom: 0, left: 0 };
        const padding = 10;
        const width = containerWidth - margin.left - margin.right;
        const barHeight = 30;

        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .range([0, width - 20]);

        const chart = d3.select('.chart-' + props.chartid + ' svg')
            .attr("width", width)
            .attr("height", barHeight * data.length);

        const bar = chart.selectAll("g")
            .data(data)
            .enter().append("g")
            .attr("transform", function (d, i) { return "translate(0," + i * barHeight + ")"; });

        bar.append("rect")
            .attr("width", width )
            .attr("height", barHeight - 5)
            .attr("fill", "#f3f4f3");

        bar.append("rect")
            .attr("width",0)
            .transition()
            .duration(300)
            .attr("width", function(d) { return x(d.count); })
            .attr("height", barHeight - 5)
            .attr("fill", "#dcdfde");

        // bar.on('mouseover', function (d, i) {
        //     d3.select(this).select('rect').attr('fill', '#a8a8a8');
        //     d3.select(this).select('.bar-chart-label').attr('fill', '#ffffff');
        //     d3.select(this).select('.bar-chart-value').attr('fill', '#ffffff');
        // });

        bar.append("text")
            .attr('class', 'bar-chart-label')
            .attr("x", function(d) { return 3; })
            .attr("y", barHeight / 2 - 2)
            .attr("dy", ".35em")
            .text(function(d) { return d.policy_area; });

        bar.append("text")
            .attr('class', 'bar-chart-value')
            .attr("x", function(d) { return x(d3.max(data, d => d.count)) + 5 })
            .attr("y", barHeight / 2 - 2) 
            .attr("dy", ".35em")
            .text(function(d) { return d.count; });

    }, [props]);



    return (

        
        <div className={'chart-' + props.chartid}>
            <svg></svg>
        </div>


	);
}

export default BarChart;