import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TimelineVisualization = ({ projectIndex, currentTime }: { projectIndex: number; currentTime: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Use D3.js for consistent styling with original DeveloperTimeline
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 120;
    const margin = { top: 50, right: 240, bottom: 20, left: 150 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const barHeight = 10;

    // Convert current time to minutes from 16:00
    const [hours, minutes, seconds] = currentTime.split(':').map(Number);
    const currentMinutes = (hours - 16) * 60 + minutes + seconds / 60;
    const totalMinutes = 120; // 16:00 to 18:00

    // Sample data for each project (더 많은 AIDD 유형 포함)
    const projectData = [
      // Project 01
      [
        { start: 0, end: 30, type: 'fingertime', user: 'dev1@team061.com', bubbles: [
          { type: 'Query2CodeRecommend', count: 3 }, 
          { type: 'AIPlayRecommend', count: 2 },
          { type: 'RevisionMaker', count: 1 },
          { type: 'QueryMakerRecommend', count: 2 }
        ]},
        { start: 30, end: 45, type: 'braintime', user: 'dev1@team061.com', bubbles: [] },
        { start: 10, end: 60, type: 'fingertime', user: 'dev2@team061.com', bubbles: [
          { type: 'RevisionMaker', count: 5 }, 
          { type: 'AIPlayRecommend', count: 3 },
          { type: 'CommentRecommend', count: 2 },
          { type: 'TestCaseRecommend', count: 1 }
        ]},
      ],
      // Project 02  
      [
        { start: 5, end: 35, type: 'fingertime', user: 'dev1@team116.com', bubbles: [
          { type: 'QueryMakerRecommend', count: 4 },
          { type: 'RevisionMaker', count: 2 },
          { type: 'AIPlayRecommend', count: 1 }
        ]},
        { start: 15, end: 90, type: 'fingertime', user: 'dev2@team116.com', bubbles: [
          { type: 'RevisionMaker', count: 6 }, 
          { type: 'Query2CodeRecommend', count: 3 },
          { type: 'CommentRecommend', count: 2 },
          { type: 'TestCaseRecommend', count: 4 },
          { type: 'AIPlayRecommend', count: 1 }
        ]},
      ],
      // Project 03
      [
        { start: 8, end: 40, type: 'fingertime', user: 'dev1@team073.com', bubbles: [
          { type: 'AIPlayRecommend', count: 2 },
          { type: 'QueryMakerRecommend', count: 1 },
          { type: 'RevisionMaker', count: 1 }
        ]},
        { start: 20, end: 105, type: 'fingertime', user: 'dev2@team073.com', bubbles: [
          { type: 'RevisionMaker', count: 4 }, 
          { type: 'QueryMakerRecommend', count: 2 },
          { type: 'CommentRecommend', count: 3 },
          { type: 'Query2CodeRecommend', count: 2 },
          { type: 'TestCaseRecommend', count: 1 }
        ]},
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

    // AIDD color scale (original style) - 모든 유형 포함
    const aiddColors = d3.schemeSet2.concat(d3.schemeSet3).slice(0, 10);
    const allAIDDTypes = Array.from(
      new Set(data.flatMap(item => item.bubbles.map(b => b.type)))
    );
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

          // Add AIDD bubbles (original style with progressive growth)
          if (item.type === 'fingertime' && barWidth > 15) {
            const entries = item.bubbles;
            if (entries.length > 0) {
              // Calculate progress within this fingertime period
              const fingertimeStart = itemStartMinutes;
              const fingertimeEnd = item.end;
              const fingertimeProgress = fingertimeEnd > fingertimeStart 
                ? Math.min(1, (currentMinutes - fingertimeStart) / (fingertimeEnd - fingertimeStart))
                : 1;

              // Calculate current bubble sizes based on progress
              const currentBubbles = entries.map(bubble => ({
                ...bubble,
                currentCount: Math.floor(bubble.count * fingertimeProgress)
              }));

              const radii = currentBubbles.map(bubble => 6 + Math.sqrt(Math.max(1, bubble.currentCount)) * 3);
              const totalBubbleWidth = radii.reduce((sum, r) => sum + r * 2 + 6, -6);
              const scale = totalBubbleWidth > barWidth 
                ? Math.max(1, barWidth / totalBubbleWidth) 
                : 1;
              
              // 버블을 막대 위에 균등하게 분배
              let currentBubbleX = startX;

              const visibleBubbles = currentBubbles.filter(bubble => bubble.currentCount > 0);
              
              visibleBubbles.forEach((bubble, index) => {
                const rawR = 6 + Math.sqrt(bubble.currentCount) * 3;
                const r = Math.max(6, rawR * scale);
                
                // 버블을 막대 위에 균등하게 배치
                const bubbleSpacing = barWidth / (visibleBubbles.length + 1);
                const cx = startX + bubbleSpacing * (index + 1);
                const cy = centerY;

                g.append('circle')
                  .attr('cx', cx)
                  .attr('cy', cy)
                  .attr('r', r)
                  .attr('fill', aiddColorScale(bubble.type))
                  .attr('stroke', '#fff')
                  .attr('stroke-width', 0.8)
                  .attr('opacity', 0.85);

                if (r > 8) {
                  g.append('text')
                    .attr('x', cx)
                    .attr('y', cy + 4)
                    .text(bubble.currentCount)
                    .style('fill', 'white')
                    .style('font-size', `${Math.min(12 * scale, 12)}px`)
                    .style('font-weight', 'bold')
                    .style('text-anchor', 'middle');
                }
              });
            }
          }
        }
      }
    });

    // Add legend at the top (해당 팀의 AIDD 유형만 표시)
    const teamAIDDTypes = Array.from(
      new Set(data.flatMap(item => item.bubbles.map(b => b.type)))
    );
    
    const legend = svg.append('g')
      .attr('transform', `translate(${margin.left}, 5)`); // 상단으로 이동

    const legendItems = [
      { label: 'Fingertime', color: '#0bd1b9', shape: 'rect' },
      { label: 'Braintime', color: '#f78aff', shape: 'rect' },
      ...teamAIDDTypes.map((key) => ({
        label: key,
        color: aiddColorScale(key),
        shape: 'circle',
      })),
    ];

    // 가로로 배치하기 위한 계산
    let currentX = 0;
    legendItems.forEach((item, i) => {
      const x = currentX;
      const y = 0;

      if (item.shape === 'rect') {
        legend
          .append('rect')
          .attr('x', x - 6)
          .attr('y', y - 6)
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', item.color);
      } else {
        legend
          .append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 6)
          .attr('fill', item.color);
      }

      const text = legend
        .append('text')
        .attr('x', x + 16)
        .attr('y', y + 4)
        .text(item.label)
        .style('fill', 'white')
        .style('font-size', '10px');

      // 다음 아이템 위치 계산
      const textWidth = item.label.length * 6 + 30; // 대략적인 텍스트 너비
      currentX += textWidth;
    });

  }, [projectIndex, currentTime]);

  return (
    <div className="w-full h-32 overflow-visible">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default function App() {
  const [currentTime, setCurrentTime] = useState('16:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const startAnimation = () => {
    console.log('Animation started!');
    setIsPlaying(true);
    
    let seconds = 0;
    const id = setInterval(() => {
      seconds += 20; // 20초씩 증가 (더 빠르게)
      const hours = 16 + Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setCurrentTime(timeString);
      
      if (hours >= 18) {
        clearInterval(id);
        setIsPlaying(false);
        setIntervalId(null);
      }
    }, 50); // 50ms마다 업데이트 (더 부드럽게)
    
    setIntervalId(id);
  };

  const stopAnimation = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsPlaying(false);
  };

  const resetAnimation = () => {
    stopAnimation();
    setCurrentTime('16:00:00');
  };

  return (
    <div className="w-full overflow-auto bg-gradient-to-r from-[#1c1b47] via-[rgb(35,38,100)] to-[#2f1b47] p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          AIDD Monitoring Tool
        </h1>
        
        <div className="flex justify-center items-center gap-4 mb-8">
          <button
            onClick={isPlaying ? stopAnimation : startAnimation}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
          >
            {isPlaying ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={resetAnimation}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all"
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
            
            // AI breakdown based on progress - 해당 프로젝트의 실제 AIDD 사용량 계산
            // TimelineVisualization에서 정의된 projectData에 접근하기 위해 동일한 구조 사용
            const projectTeamData = [
              // Project 01
              [
                { start: 0, end: 30, type: 'fingertime', user: 'dev1@team061.com', bubbles: [
                  { type: 'Query2CodeRecommend', count: 3 }, 
                  { type: 'AIPlayRecommend', count: 2 },
                  { type: 'RevisionMaker', count: 1 },
                  { type: 'QueryMakerRecommend', count: 2 }
                ]},
                { start: 30, end: 45, type: 'braintime', user: 'dev1@team061.com', bubbles: [] },
                { start: 45, end: 55, type: 'closetime', user: 'dev1@team061.com', bubbles: [] },
                { start: 10, end: 60, type: 'fingertime', user: 'dev2@team061.com', bubbles: [
                  { type: 'RevisionMaker', count: 5 }, 
                  { type: 'AIPlayRecommend', count: 3 },
                  { type: 'CommentRecommend', count: 2 },
                  { type: 'TestCaseRecommend', count: 1 }
                ]},
                { start: 60, end: 75, type: 'braintime', user: 'dev2@team061.com', bubbles: [] },
              ],
              // Project 02  
              [
                { start: 5, end: 35, type: 'fingertime', user: 'dev1@team116.com', bubbles: [
                  { type: 'QueryMakerRecommend', count: 4 },
                  { type: 'RevisionMaker', count: 2 },
                  { type: 'AIPlayRecommend', count: 1 }
                ]},
                { start: 35, end: 50, type: 'braintime', user: 'dev1@team116.com', bubbles: [] },
                { start: 50, end: 60, type: 'closetime', user: 'dev1@team116.com', bubbles: [] },
                { start: 15, end: 90, type: 'fingertime', user: 'dev2@team116.com', bubbles: [
                  { type: 'RevisionMaker', count: 6 }, 
                  { type: 'Query2CodeRecommend', count: 3 },
                  { type: 'CommentRecommend', count: 2 },
                  { type: 'TestCaseRecommend', count: 4 },
                  { type: 'AIPlayRecommend', count: 1 }
                ]},
                { start: 90, end: 105, type: 'braintime', user: 'dev2@team116.com', bubbles: [] },
              ],
              // Project 03
              [
                { start: 8, end: 40, type: 'fingertime', user: 'dev1@team073.com', bubbles: [
                  { type: 'AIPlayRecommend', count: 2 },
                  { type: 'QueryMakerRecommend', count: 1 },
                  { type: 'RevisionMaker', count: 1 }
                ]},
                { start: 40, end: 55, type: 'braintime', user: 'dev1@team073.com', bubbles: [] },
                { start: 55, end: 65, type: 'closetime', user: 'dev1@team073.com', bubbles: [] },
                { start: 20, end: 105, type: 'fingertime', user: 'dev2@team073.com', bubbles: [
                  { type: 'RevisionMaker', count: 4 }, 
                  { type: 'QueryMakerRecommend', count: 2 },
                  { type: 'CommentRecommend', count: 3 },
                  { type: 'Query2CodeRecommend', count: 2 },
                  { type: 'TestCaseRecommend', count: 1 }
                ]},
                { start: 105, end: 120, type: 'braintime', user: 'dev2@team073.com', bubbles: [] },
              ]
            ];
            
            const currentProjectData = projectTeamData[index];
            
            // F/B breakdown based on actual data - Calculate actual fingertime and braintime durations
            let totalFingertimeDuration = 0;
            let totalBraintimeDuration = 0;
            let totalClosetimeDuration = 0;
            
            currentProjectData.forEach(item => {
              const itemStartMinutes = item.start;
              const itemEndMinutes = item.end;
              
              if (itemStartMinutes <= currentMinutes) {
                const actualEndMinutes = Math.min(itemEndMinutes, currentMinutes);
                const duration = Math.max(0, actualEndMinutes - itemStartMinutes);
                
                if (item.type === 'fingertime') {
                  totalFingertimeDuration += duration;
                } else if (item.type === 'braintime') {
                  totalBraintimeDuration += duration;
                } else if (item.type === 'closetime') {
                  totalClosetimeDuration += duration;
                }
              }
            });
            
            // Count of activities (keeping the original logic for counts)
            const fingertimeCount = Math.floor(progress * (index + 3));
            const braintimeCount = Math.floor(progress * (index + 1));
            
            // Calculate percentages (excluding closetime)
            const totalActiveTime = totalFingertimeDuration + totalBraintimeDuration;
            const fingertimePercent = totalActiveTime > 0 ? Math.round((totalFingertimeDuration / totalActiveTime) * 100) : 0;
            const braintimePercent = totalActiveTime > 0 ? Math.round((totalBraintimeDuration / totalActiveTime) * 100) : 0;
            
            const relevantFingertime = currentProjectData.filter(item => {
              const itemStartMinutes = item.start;
              return item.type === 'fingertime' && itemStartMinutes <= currentMinutes;
            });

            // 모든 AIDD 유형별 누적 카운트 계산
            const aiddTotals: { [key: string]: number } = {};
            relevantFingertime.forEach(item => {
              const itemStartMinutes = item.start;
              const itemEndMinutes = Math.min(item.end, currentMinutes);
              const itemProgress = Math.min(1, (currentMinutes - itemStartMinutes) / (item.end - itemStartMinutes));
              
              item.bubbles.forEach(bubble => {
                const currentCount = Math.floor(bubble.count * itemProgress);
                aiddTotals[bubble.type] = (aiddTotals[bubble.type] || 0) + currentCount;
              });
            });

            // 상위 3개 AIDD 유형 추출
            const topAIDDTypes = Object.entries(aiddTotals)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3);

            const aiCounts = topAIDDTypes;

            return (
              <div key={projectName} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h2 className="text-lg font-bold text-white mb-3">{projectName}</h2>
                
                <div className="flex gap-6 items-center">
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-300 mb-2">Work Breakdown</h3>
                    <TimelineVisualization projectIndex={index} currentTime={currentTime} />
                  </div>

                  <div className="w-32 flex-shrink-0">
                    <h3 className="text-xs text-gray-300 mb-1 h-4 flex items-center">F/B Breakdown</h3>
                    <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded p-3 text-center text-white h-20 flex flex-col justify-center">
                      <div className="text-xs text-teal-100 mb-1">Finger/Brain</div>
                      <div className="text-lg font-bold leading-none">{fingertimeCount} / {braintimeCount}</div>
                      <div className="text-xs text-teal-100 mt-1 leading-none">{fingertimePercent}% / {braintimePercent}%</div>
                    </div>
                  </div>

                  <div className="w-32 flex-shrink-0">
                    <h3 className="text-xs text-gray-300 mb-1 h-4 flex items-center">AI Breakdown</h3>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded p-3 text-center text-white h-20 flex flex-col justify-center">
                      <div className="text-xs text-blue-100 mb-1">상위 3개</div>
                      <div className="space-y-0.5">
                        {aiCounts.slice(0, 3).map(([type, count], idx) => (
                          <div key={type} className="text-xs leading-none">
                            {idx + 1}. {type.replace('Recommend', '').slice(0, 6)}: {count}
                          </div>
                        ))}
                        {aiCounts.length === 0 && (
                          <div className="text-xs text-blue-200">No data yet</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-32 flex-shrink-0">
                    <h3 className="text-xs text-gray-300 mb-1 h-4 flex items-center">Task Completion</h3>
                    <div className="bg-gradient-to-br from-teal-700 to-teal-800 rounded p-3 text-center text-white h-20 flex flex-col justify-center">
                      <div className="text-lg font-bold leading-none">
                        {currentTasks}/{maxTasks}건
                      </div>
                      <div className="text-xs text-teal-200 mt-1">{Math.round(progress * 100)}%</div>
                    </div>
                  </div>

                  <div className="w-32 flex-shrink-0">
                    <h3 className="text-xs text-gray-300 mb-1 h-4 flex items-center">Quality</h3>
                    <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded p-3 text-center text-white h-20 flex flex-col justify-center">
                      <div className="text-lg font-bold leading-none">
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