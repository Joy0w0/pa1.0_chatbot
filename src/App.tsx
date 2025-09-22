import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TimelineVisualization = ({ projectIndex, currentTime }: { projectIndex: number; currentTime: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Use D3.js for consistent styling with original DeveloperTimeline
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 520;
    const height = 80;
    const margin = { top: 20, right: 10, bottom: 20, left: 150 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const barHeight = 10;

    // Convert current time to minutes from 16:00
    const [hours, minutes, seconds] = currentTime.split(':').map(Number);
    const currentMinutes = (hours - 16) * 60 + minutes + seconds / 60;
    const totalMinutes = 120; // 16:00 to 18:00

    // Sample data for each project
    const projectData = [
      // Project 01
      [
        { start: 0, end: 30, type: 'fingertime', user: 'dev1@team061.com', bubbles: [{ type: 'Query2CodeRecommend', count: 3 }, { type: 'AIPlayRecommend', count: 2 }] },
        { start: 30, end: 45, type: 'braintime', user: 'dev1@team061.com', bubbles: [] },
        { start: 10, end: 60, type: 'fingertime', user: 'dev2@team061.com', bubbles: [{ type: 'RevisionMaker', count: 5 }, { type: 'AIPlayRecommend', count: 3 }] },
      ],
      // Project 02  
      [
        { start: 5, end: 35, type: 'fingertime', user: 'dev1@team116.com', bubbles: [{ type: 'QueryMakerRecommend', count: 4 }] },
        { start: 15, end: 90, type: 'fingertime', user: 'dev2@team116.com', bubbles: [{ type: 'RevisionMaker', count: 6 }, { type: 'Query2CodeRecommend', count: 3 }] },
      ],
      // Project 03
      [
        { start: 8, end: 40, type: 'fingertime', user: 'dev1@team073.com', bubbles: [{ type: 'AIPlayRecommend', count: 2 }] },
        { start: 20, end: 105, type: 'fingertime', user: 'dev2@team073.com', bubbles: [{ type: 'RevisionMaker', count: 4 }, { type: 'QueryMakerRecommend', count: 2 }] },
      ]
    ];

    const data = projectData[projectIndex];
    const users = Array.from(new Set(data.map(d => d.user)));

    // Set up SVG dimensions
    svg.attr('width', width).attr('height', height);

    // Create main group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const parseTime = d3.timeParse('%H:%M:%S');
    const startTime = parseTime('16:00:00')!;
    const endTime = parseTime('18:00:00')!;

    const xScale = d3.scaleTime()
      .domain([startTime, endTime])
      .range([0, chartWidth]);

    const yScale = d3.scaleBand()
      .domain(users)
      .range([0, chartHeight])
      .padding(0.3);

    // Add gradients (original DeveloperTimeline style)
    const defs = svg.append('defs');

    defs.append('linearGradient')
      .attr('id', `fingerGradient-${projectIndex}`)
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#0bd1b9' },
        { offset: '100%', color: '#1e7991' },
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    defs.append('linearGradient')
      .attr('id', `brainGradient-${projectIndex}`)
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#f78aff' },
        { offset: '100%', color: '#b13bff' },
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    // Add brain glow filter
    defs.append('filter')
      .attr('id', `brainGlow-${projectIndex}`)
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%')
      .html(`
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      `);

    // Time axis
    g.append('g')
      .call(d3.axisTop(xScale).ticks(4).tickFormat(d => d3.timeFormat('%H:%M')(d as Date)))
      .selectAll('text')
      .style('fill', '#e0e0e0')
      .style('font-size', '10px');

    // User labels
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => (d as string).split('@')[0]))
      .selectAll('text')
      .style('fill', '#f0f0f0')
      .style('font-size', '9px');

    // AIDD color scale (original style)
    const aiddColors = d3.schemeSet2.concat(d3.schemeSet3).slice(0, 10);
    const allAIDDTypes = ['Query2CodeRecommend', 'AIPlayRecommend', 'RevisionMaker', 'QueryMakerRecommend'];
    const aiddColorScale = d3.scaleOrdinal<string, string>()
      .domain(allAIDDTypes)
      .range(aiddColors);

    // Draw timeline bars
    data.forEach((item) => {
      const userY = yScale(item.user)!;
      const barY = userY + (yScale.bandwidth() - barHeight) / 2;
      const centerY = barY + barHeight / 2;

      // Calculate bar width based on current time
      const itemStartMinutes = item.start;
      const itemEndMinutes = Math.min(item.end, currentMinutes);

      if (itemEndMinutes > itemStartMinutes) {
        const itemStartTime = new Date(startTime.getTime() + itemStartMinutes * 60000);
        const itemEndTime = new Date(startTime.getTime() + itemEndMinutes * 60000);

        const startX = xScale(itemStartTime);
        const endX = xScale(itemEndTime);
        const barWidth = endX - startX;

        if (barWidth > 1) {
          // Create bar with original gradient style
          const rect = g.append('rect')
            .attr('x', startX)
            .attr('y', barY)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr('fill', item.type === 'fingertime' 
              ? `url(#fingerGradient-${projectIndex})` 
              : `url(#brainGradient-${projectIndex})`
            )
            .attr('rx', 0)
            .attr('opacity', 0.9)
            .attr('stroke', item.type === 'braintime' ? '#f78aff' : 'none')
            .attr('stroke-width', item.type === 'braintime' ? 2 : 0)
            .style('filter', item.type === 'braintime'
              ? 'drop-shadow(0 0 5px #f78aff) drop-shadow(0 0 10px #f78aff)'
              : 'none'
            );

          if (item.type === 'braintime') {
            rect.attr('filter', `url(#brainGlow-${projectIndex})`);
          }

          // Add AIDD bubbles (original style)
          if (item.type === 'fingertime' && barWidth > 15) {
            const entries = item.bubbles;
            if (entries.length > 0) {
              const radii = entries.map(bubble => 6 + Math.sqrt(bubble.count) * 3);
              const totalBubbleWidth = radii.reduce((sum, r) => sum + r * 2 + 6, -6);
              const scale = totalBubbleWidth > barWidth 
                ? Math.max(1, barWidth / totalBubbleWidth) 
                : 1;
              
              let currentX = startX + (barWidth - totalBubbleWidth * scale) / 2;

              entries.forEach((bubble, index) => {
                const rawR = 6 + Math.sqrt(bubble.count) * 3;
                const r = Math.max(6, rawR * scale);
                const cx = currentX + r;
                const cy = centerY;

                g.append('circle')
                  .attr('cx', cx)
                  .attr('cy', cy)
                  .attr('r', r)
                  .attr('fill', aiddColorScale(bubble.type))
                  .attr('stroke', '#fff')
                  .attr('stroke-width', 0.8)
                  .attr('opacity', 0.85);

                g.append('text')
                  .attr('x', cx)
                  .attr('y', cy + 4)
                  .text(bubble.count)
                  .style('fill', 'white')
                  .style('font-size', `${Math.min(12 * scale, 12)}px`)
                  .style('font-weight', 'bold')
                  .style('text-anchor', 'middle');

                currentX += r * 2 + 6 * scale;
              });
            }
          }
        }
      }
    });

  }, [projectIndex, currentTime]);

  return (
    <div className="w-full overflow-auto">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default function App() {
  const [currentTime, setCurrentTime] = useState('16:00:00');
  const [isPlaying, setIsPlaying] = useState(false);

  const startAnimation = () => {
    console.log('Animation started!');
    setIsPlaying(true);
    
    let seconds = 0;
    const interval = setInterval(() => {
      seconds += 10; // 10초씩 증가
      const hours = 16 + Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setCurrentTime(timeString);
      
      if (hours >= 18) {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 100); // 100ms마다 업데이트
  };

  const resetAnimation = () => {
    setCurrentTime('16:00:00');
    setIsPlaying(false);
  };

  return (
    <div className="w-full overflow-auto bg-gradient-to-r from-[#1c1b47] via-[rgb(35,38,100)] to-[#2f1b47] p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-white mb-8">
          개발자 Fingertime / Braintime 및 AIDD 사용 시각화
        </h1>
        
        <div className="flex justify-center items-center gap-4 mb-8">
          <button
            onClick={startAnimation}
            disabled={isPlaying}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPlaying ? 'Playing...' : 'Start Animation'}
          </button>
          <button
            onClick={resetAnimation}
            disabled={isPlaying}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Reset
          </button>
          <div className="text-white bg-gray-800 px-4 py-2 rounded">
            Current Time: {currentTime}
          </div>
        </div>

        <div className="space-y-6">
          {['Project 01', 'Project 02', 'Project 03'].map((projectName, index) => {
            // Calculate progress based on current time
            const [hours, minutes, seconds] = currentTime.split(':').map(Number);
            const currentMinutes = (hours - 16) * 60 + minutes + seconds / 60;
            const progress = Math.max(0, Math.min(1, currentMinutes / 120)); // 120 minutes from 16:00 to 18:00
            
            const maxTasks = [96, 77, 60][index];
            const maxQuality = [32, 12, 8][index];
            const currentTasks = Math.floor(progress * maxTasks);
            const currentQuality = Math.floor(progress * maxQuality);
            
            // F/B breakdown based on progress
            const fingertimeCount = Math.floor(progress * (index + 3));
            const braintimeCount = Math.floor(progress * (index + 1));
            
            // AI breakdown based on progress
            const aiCounts = [
              Math.floor(progress * (index + 4)),
              Math.floor(progress * (index + 2)),
              Math.floor(progress * (index + 1))
            ];

            return (
              <div key={projectName} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h2 className="text-lg font-bold text-white mb-3">{projectName}</h2>
                
                <div className="flex gap-6 items-center">
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-300 mb-2">Work Breakdown</h3>
                    <TimelineVisualization projectIndex={index} currentTime={currentTime} />
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">F/B Breakdown</h3>
                    <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded p-2 text-center text-white text-sm">
                      <div className="text-xs">Finger/Brain</div>
                      <div className="text-lg font-bold">{fingertimeCount} / {braintimeCount}</div>
                    </div>
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">AI Breakdown</h3>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded p-2 text-center text-white text-xs">
                      <div className="text-xs mb-1">상위 3개</div>
                      <div>1. Query: {aiCounts[0]}</div>
                      <div>2. AIPlay: {aiCounts[1]}</div>
                      <div>3. Revision: {aiCounts[2]}</div>
                    </div>
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">Task Completion</h3>
                    <div className="bg-gradient-to-br from-teal-700 to-teal-800 rounded p-2 text-center text-white">
                      <div className="text-xl font-bold">
                        {currentTasks}/{maxTasks}건
                      </div>
                      <div className="text-xs">{Math.round(progress * 100)}%</div>
                    </div>
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">Expected Quality</h3>
                    <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded p-2 text-center text-white">
                      <div className="text-xl font-bold">
                        {currentQuality}점
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}