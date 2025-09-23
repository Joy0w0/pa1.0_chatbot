import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import processedData from '../../processed_team_data.json';

interface BubbleData {
  type: string;
  count: number;
}

interface TimelineEntry {
  start: number;
  end: number;
  type: string;
  user: string;
  bubbles: BubbleData[];
  duration: number;
  aidd_count: number;
}

interface ProjectData {
  team_name: string;
  developers: string[];
  timeline_data: TimelineEntry[];
  summary: {
    total_fingertime: number;
    total_braintime: number;
    total_closetime: number;
    fingertime_percent: number;
    braintime_percent: number;
    top_aidd_types: [string, number][];
    all_aidd_types: { [key: string]: number };
  };
  max_quality: number;
  max_tasks: number;
}

type ProcessedData = {
  [projectName: string]: ProjectData;
};

// Parse and validate the data structure
const validateTopAIDDTypes = (data: any[]): [string, number][] => {
  return data.map(([type, count]) => [String(type), Number(count)]);
};

const realData: ProcessedData = Object.entries(processedData).reduce(
  (acc, [key, value]) => {
    const projectData = value as any;
    return {
      ...acc,
      [key]: {
        ...projectData,
        summary: {
          ...projectData.summary,
          top_aidd_types: validateTopAIDDTypes(
            projectData.summary.top_aidd_types,
          ),
        },
      },
    };
  },
  {} as ProcessedData,
);

const TimelineVisualization = ({
  projectIndex,
  currentTime,
}: {
  projectIndex: number;
  currentTime: string;
}) => {
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
    // Total duration in minutes (16:00 to 18:00)

    // Get project data from real data
    const projectKeys = Object.keys(realData);
    const projectKey = projectKeys[projectIndex];
    const projectData = realData[projectKey];

    if (!projectData) return;

    const data = projectData.timeline_data;
    const users = projectData.developers;

    // Set up SVG dimensions
    svg.attr('width', width).attr('height', height);

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const parseTime = d3.timeParse('%H:%M:%S');
    const startTime = parseTime('16:00:00')!;
    const endTime = parseTime('18:00:00')!;

    const xScale = d3
      .scaleTime()
      .domain([startTime, endTime])
      .range([0, chartWidth]);

    const yScale = d3
      .scaleBand()
      .domain(users)
      .range([0, chartHeight])
      .padding(0.3);

    // Add gradients (original DeveloperTimeline style)
    const defs = svg.append('defs');

    defs
      .append('linearGradient')
      .attr('id', `fingerGradient-${projectIndex}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#0bd1b9' },
        { offset: '100%', color: '#1e7991' },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color);

    defs
      .append('linearGradient')
      .attr('id', `brainGradient-${projectIndex}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#f78aff' },
        { offset: '100%', color: '#b13bff' },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color);

    // Add brain glow filter
    defs
      .append('filter')
      .attr('id', `brainGlow-${projectIndex}`)
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%').html(`
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      `);

    // Time axis
    g.append('g')
      .call(
        d3
          .axisTop(xScale)
          .ticks(4)
          .tickFormat((d) => d3.timeFormat('%H:%M')(d as Date)),
      )
      .selectAll('text')
      .style('fill', '#e0e0e0')
      .style('font-size', '10px');

    // User labels - show email prefix before @
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat((d) => (d as string).split('@')[0]))
      .selectAll('text')
      .style('fill', '#f0f0f0')
      .style('font-size', '9px');

    // AIDD color scale (original style) - 모든 유형 포함
    const aiddColors = d3.schemeSet2.concat(d3.schemeSet3).slice(0, 10);
    const allAIDDTypes = Array.from(
      new Set(data.flatMap((item) => item.bubbles.map((b) => b.type))),
    );
    const aiddColorScale = d3
      .scaleOrdinal<string, string>()
      .domain(allAIDDTypes)
      .range(aiddColors);

    // Draw timeline bars
    data.forEach((item) => {
      const userY = yScale(item.user);
      if (!userY) return;

      const barY = userY + (yScale.bandwidth() - barHeight) / 2;
      const centerY = barY + barHeight / 2;

      // Calculate bar width based on current time
      const itemStartMinutes = item.start;
      const itemEndMinutes = Math.min(item.end, currentMinutes);

      if (itemEndMinutes > itemStartMinutes) {
        const itemStartTime = new Date(
          startTime.getTime() + itemStartMinutes * 60000,
        );
        const itemEndTime = new Date(
          startTime.getTime() + itemEndMinutes * 60000,
        );

        const startX = xScale(itemStartTime);
        const endX = xScale(itemEndTime);
        const barWidth = endX - startX;

        if (barWidth > 1) {
          // Create bar with original gradient style
          const rect = g
            .append('rect')
            .attr('x', startX)
            .attr('y', barY)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr(
              'fill',
              item.type === 'fingertime'
                ? `url(#fingerGradient-${projectIndex})`
                : `url(#brainGradient-${projectIndex})`,
            )
            .attr('rx', 0)
            .attr('opacity', 0.9)
            .attr('stroke', item.type === 'braintime' ? '#f78aff' : 'none')
            .attr('stroke-width', item.type === 'braintime' ? 2 : 0)
            .style(
              'filter',
              item.type === 'braintime'
                ? 'drop-shadow(0 0 5px #f78aff) drop-shadow(0 0 10px #f78aff)'
                : 'none',
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
              const fingertimeProgress =
                fingertimeEnd > fingertimeStart
                  ? Math.min(
                      1,
                      (currentMinutes - fingertimeStart) /
                        (fingertimeEnd - fingertimeStart),
                    )
                  : 1;

              // Calculate current bubble sizes based on progress
              const currentBubbles = entries.map((bubble) => ({
                ...bubble,
                currentCount: Math.floor(bubble.count * fingertimeProgress),
              }));

              const radii = currentBubbles.map(
                (bubble) =>
                  8 + Math.sqrt(Math.max(1, bubble.currentCount)) * 2.5, // Adjusted bubble size calculation
              );
              const totalBubbleWidth = radii.reduce(
                (sum, r) => sum + r * 2 + 10, // Increased spacing between bubbles
                -10,
              );
              const scale =
                totalBubbleWidth > barWidth
                  ? Math.max(0.8, barWidth / totalBubbleWidth) // Better minimum scale
                  : 1;

              // 버블을 막대 위에 균등하게 분배
              // Position bubbles along the bar

              const visibleBubbles = currentBubbles.filter(
                (bubble) => bubble.currentCount > 0,
              );

              visibleBubbles.forEach((bubble, index) => {
                const rawR = 8 + Math.sqrt(bubble.currentCount) * 2.5; // Consistent with radii calculation
                const r = Math.max(8, rawR * scale); // Minimum radius increased

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
      new Set(data.flatMap((item) => item.bubbles.map((b) => b.type))),
    );

    const legend = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 8)`); // 상단으로 이동

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
    legendItems.forEach((item) => {
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

      legend
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
    <div className="w-full h-52 overflow-visible">  {/* Increased height to h-52 for larger visualization */}
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
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

  const projectKeys = Object.keys(realData);

  return (
    <div className="w-full overflow-auto bg-gradient-to-r from-[#1c1b47] via-[rgb(35,38,100)] to-[#2f1b47] p-8 min-h-screen">
      <div className="px-4 mx-auto max-w-none">
        {' '}
        {/* Removed max-width constraint for wider layout */}
        <div className="relative mb-8">
          <h1 className="text-3xl font-bold text-center text-white">
            AIDD Monitoring Tool
          </h1>
          {/* Navigation Button to Developer Timeline */}
          <button
            onClick={() => navigate('/developer-timeline')}
            className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 text-white transition-all bg-purple-600 rounded-lg hover:bg-purple-700"
            title="Switch to Developer Timeline View">
            <span className="text-sm font-medium">Timeline View</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={isPlaying ? stopAnimation : startAnimation}
            className="px-6 py-2 text-white transition-all bg-blue-600 rounded hover:bg-blue-700">
            {isPlaying ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={resetAnimation}
            className="px-6 py-2 text-white transition-all bg-gray-600 rounded hover:bg-gray-700">
            Reset
          </button>
          <div className="px-4 py-2 text-white bg-gray-800 rounded">
            Current Time: {currentTime}
          </div>
        </div>
        <div className="space-y-6">
          {projectKeys.map((projectKey, index) => {
            const projectData = realData[projectKey];

            // Calculate progress based on current time
            const [hours, minutes, seconds] = currentTime
              .split(':')
              .map(Number);
            const currentMinutes = (hours - 16) * 60 + minutes + seconds / 60;
            const progress = Math.max(0, Math.min(1, currentMinutes / 120)); // 120 minutes from 16:00 to 18:00

            const maxTasks = projectData.max_tasks;
            const maxQuality = projectData.max_quality;
            const currentTasks = Math.floor(progress * maxTasks);
            const currentQuality = Math.floor(progress * maxQuality);

            // Calculate real-time F/B breakdown based on actual CSV data
            let totalFingertimeDuration = 0;
            let totalBraintimeDuration = 0;
            let totalClosetimeDuration = 0;

            projectData.timeline_data.forEach((item) => {
              const itemStartMinutes = item.start;
              const itemEndMinutes = item.end;

              if (itemStartMinutes <= currentMinutes) {
                const actualEndMinutes = Math.min(
                  itemEndMinutes,
                  currentMinutes,
                );
                const duration = Math.max(
                  0,
                  actualEndMinutes - itemStartMinutes,
                );

                if (item.type === 'fingertime') {
                  totalFingertimeDuration += duration;
                } else if (item.type === 'braintime') {
                  totalBraintimeDuration += duration;
                } else if (item.type === 'closetime') {
                  totalClosetimeDuration += duration;
                }
              }
            });

            // Calculate percentages (excluding closetime)
            const totalActiveTime =
              totalFingertimeDuration + totalBraintimeDuration;
            const fingertimePercent =
              totalActiveTime > 0
                ? Math.round((totalFingertimeDuration / totalActiveTime) * 100)
                : 0;
            const braintimePercent =
              totalActiveTime > 0
                ? Math.round((totalBraintimeDuration / totalActiveTime) * 100)
                : 0;

            // Count of activities for display
            const fingertimeEntries = projectData.timeline_data.filter(
              (item) =>
                item.type === 'fingertime' && item.start <= currentMinutes,
            ).length;
            const braintimeEntries = projectData.timeline_data.filter(
              (item) =>
                item.type === 'braintime' && item.start <= currentMinutes,
            ).length;

            // Calculate real-time AIDD usage
            const relevantFingertime = projectData.timeline_data.filter(
              (item) => {
                return (
                  item.type === 'fingertime' && item.start <= currentMinutes
                );
              },
            );

            // 모든 AIDD 유형별 누적 카운트 계산
            const aiddTotals: { [key: string]: number } = {};
            relevantFingertime.forEach((item) => {
              const itemStartMinutes = item.start;
              const itemProgress = Math.min(
                1,
                (currentMinutes - itemStartMinutes) /
                  (item.end - itemStartMinutes),
              );

              item.bubbles.forEach((bubble) => {
                const currentCount = Math.floor(bubble.count * itemProgress);
                aiddTotals[bubble.type] =
                  (aiddTotals[bubble.type] || 0) + currentCount;
              });
            });

            // 상위 3개 AIDD 유형 추출
            const topAIDDTypes = Object.entries(aiddTotals)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3);

            const aiCounts = topAIDDTypes;

            return (
              <div className="flex justify-center w-full" key={projectKey}>
                <div className="w-[1600px] mx-auto p-6 border border-gray-700 rounded-lg bg-gray-900/50">
                  {' '}
                  {/* Increased width and padding */}
                  <h2 className="mb-4 text-lg font-bold text-white">
                    {projectKey}
                  </h2>
                  <div className="w-full overflow-x-auto">
                    <div className="flex items-center gap-8 min-w-max">
                      {' '}
                      {/* Increased gap from 6 to 8 */}
                      <div className="flex-1 min-w-[1000px]">
                        {' '}
                        {/* Added minimum width for timeline */}
                        <h3 className="mb-2 text-sm text-gray-300">
                          Work Breakdown
                        </h3>
                        <TimelineVisualization
                          projectIndex={index}
                          currentTime={currentTime}
                        />
                      </div>
                      <div className="flex-shrink-0 w-36">
                        {' '}
                        {/* Increased width from w-32 to w-36 */}
                        <h3 className="flex items-center h-4 mb-1 text-xs text-gray-300">
                          F/B Breakdown
                        </h3>
                        <div className="flex flex-col justify-center h-20 p-3 text-center text-white rounded bg-gradient-to-br from-teal-600 to-teal-700">
                          <div className="mb-1 text-xs text-teal-100">
                            Finger/Brain
                          </div>
                          <div className="text-lg font-bold leading-none">
                            {fingertimePercent}% / {braintimePercent}%
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-44">
                        {' '}
                        {/* Increased width from w-36 to w-44 for longer AIDD names */}
                        <h3 className="flex items-center h-4 mb-1 text-xs text-gray-300">
                          AI Breakdown
                        </h3>
                        <div className="flex flex-col justify-center h-20 p-2 text-center text-white rounded bg-gradient-to-br from-blue-600 to-blue-700">
                          {' '}
                          {/* Reduced padding for more space */}
                          <div className="mb-1 text-xs text-blue-100">
                            상위 3개
                          </div>
                          <div className="space-y-0.5">
                            {aiCounts.slice(0, 3).map(([type, count], idx) => (
                              <div key={type} className="text-xs leading-tight">
                                {`${idx + 1}. ${type.replace('Recommend', '')}: ${count}`}
                                {/* Changed to leading-tight for better line spacing */}
                              </div>
                            ))}
                            {aiCounts.length === 0 && (
                              <div className="text-xs text-blue-200">
                                No data yet
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-36">
                        {' '}
                        {/* Increased width from w-32 to w-36 */}
                        <h3 className="flex items-center h-4 mb-1 text-xs text-gray-300">
                          Task Completion
                        </h3>
                        <div className="flex flex-col justify-center h-20 p-3 text-center text-white rounded bg-gradient-to-br from-teal-700 to-teal-800">
                          <div className="text-lg font-bold leading-none">
                            {currentTasks}/{maxTasks}건
                          </div>
                          <div className="mt-1 text-xs text-teal-200">
                            {Math.round(progress * 100)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-36">
                        {' '}
                        {/* Increased width from w-32 to w-36 */}
                        <h3 className="flex items-center h-4 mb-1 text-xs text-gray-300">
                          Expected Quality
                        </h3>
                        <div className="flex flex-col justify-center h-20 p-3 text-center text-white rounded bg-gradient-to-br from-blue-700 to-blue-800">
                          <div className="text-lg font-bold leading-none">
                            {currentQuality}점
                          </div>
                        </div>
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
