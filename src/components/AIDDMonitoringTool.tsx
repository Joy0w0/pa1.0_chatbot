import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';

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

// CSV data processing functions
interface CSVRow {
  team_name: string;
  email: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: string;
  aidd_count: number;
  recommend_types: string;
}

const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return (hours - 16) * 60 + minutes + seconds / 60;
};

const parseRecommendTypes = (typeStr: string): BubbleData[] => {
  try {
    if (!typeStr || typeStr === '{}') return [];
    const parsed = JSON.parse(typeStr.replace(/'/g, '"'));
    return Object.entries(parsed).map(([type, count]) => ({
      type: type as string,
      count: count as number,
    }));
  } catch {
    return [];
  }
};

const processCSVData = async (): Promise<ProcessedData> => {
  try {
    const response = await fetch('/data.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n').slice(1); // Remove header

    const teamData: { [teamName: string]: CSVRow[] } = {};

    // Group data by team
    lines.forEach((line) => {
      if (!line.trim()) return;
      const [
        team_name,
        email,
        start_time,
        end_time,
        duration,
        type,
        aidd_count,
        recommend_types,
      ] = line.split(',');

      if (!teamData[team_name]) {
        teamData[team_name] = [];
      }

      teamData[team_name].push({
        team_name,
        email,
        start_time,
        end_time,
        duration: parseFloat(duration),
        type,
        aidd_count: parseInt(aidd_count),
        recommend_types,
      });
    });

    // Convert to ProcessedData format
    const processedTeams: ProcessedData = {};

    Object.entries(teamData).forEach(([teamName, rows]) => {
      const developers = [...new Set(rows.map((row) => row.email))];

      const timeline_data: TimelineEntry[] = rows.map((row) => ({
        start: parseTimeToMinutes(row.start_time),
        end: parseTimeToMinutes(row.end_time),
        type: row.type,
        user: row.email,
        bubbles: parseRecommendTypes(row.recommend_types),
        duration: row.duration,
        aidd_count: row.aidd_count,
      }));

      // Calculate summary
      const fingertimeData = timeline_data.filter(
        (item) => item.type === 'fingertime',
      );
      const braintimeData = timeline_data.filter(
        (item) => item.type === 'braintime',
      );
      const closetimeData = timeline_data.filter(
        (item) => item.type === 'closetime',
      );

      const total_fingertime = fingertimeData.reduce(
        (sum, item) => sum + item.duration,
        0,
      );
      const total_braintime = braintimeData.reduce(
        (sum, item) => sum + item.duration,
        0,
      );
      const total_closetime = closetimeData.reduce(
        (sum, item) => sum + item.duration,
        0,
      );

      const totalActiveTime = total_fingertime + total_braintime;
      const fingertime_percent =
        totalActiveTime > 0
          ? Math.round((total_fingertime / totalActiveTime) * 100)
          : 0;
      const braintime_percent =
        totalActiveTime > 0
          ? Math.round((total_braintime / totalActiveTime) * 100)
          : 0;

      // Calculate AIDD types
      const aiddTotals: { [key: string]: number } = {};
      fingertimeData.forEach((item) => {
        item.bubbles.forEach((bubble) => {
          aiddTotals[bubble.type] =
            (aiddTotals[bubble.type] || 0) + bubble.count;
        });
      });

      const top_aidd_types: [string, number][] = Object.entries(aiddTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      processedTeams[teamName] = {
        team_name: teamName,
        developers,
        timeline_data,
        summary: {
          total_fingertime,
          total_braintime,
          total_closetime,
          fingertime_percent,
          braintime_percent,
          top_aidd_types,
          all_aidd_types: aiddTotals,
        },
        max_quality: Math.floor(Math.random() * 30) + 70, // Random quality 70-100
        max_tasks: Math.floor(Math.random() * 30) + 70, // Random tasks 70-100
      };
    });

    return processedTeams;
  } catch (error) {
    console.error('Error processing CSV data:', error);
    return {};
  }
};

const TimelineVisualization = ({
  teamName,
  realData,
}: {
  teamName: string;
  realData: ProcessedData;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const drawChart = () => {
      if (!svgRef.current) return;

      // Use D3.js for consistent styling with original DeveloperTimeline
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      // 반응형 크기 계산 - 컨테이너 크기에 맞춰 동적으로 조정
      const container = svgRef.current.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const width = Math.max(600, containerWidth - 40); // 패딩과 여백을 고려
      const height = window.innerWidth < 768 ? 180 : 220;
      const margin = {
        top: 60,
        right: window.innerWidth < 768 ? 40 : 60,
        bottom: 20,
        left: window.innerWidth < 768 ? 80 : 100,
      };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const barHeight = 14;

      // Show complete timeline (16:00 to 18:00)

      // Get team data from real data
      const teamData = realData[teamName];

      if (!teamData) return;

      const data = teamData.timeline_data;
      const users = teamData.developers;

      // Set up SVG dimensions - 부모 컨테이너에 맞춰 설정
      svg
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

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
        .padding(0.9);

      // Removed gradients and filters - using solid colors

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
        .call(
          d3.axisLeft(yScale).tickFormat((d) => (d as string).split('@')[0]),
        )
        .selectAll('text')
        .style('fill', '#f0f0f0')
        .style('font-size', '12px');

      // Removed AIDD color scale - only showing time bars

      // Draw timeline bars
      data.forEach((item) => {
        const userY = yScale(item.user);
        if (!userY) return;

        const barY = userY + (yScale.bandwidth() - barHeight) / 2;

        // Show complete bars
        const itemStartMinutes = item.start;
        const itemEndMinutes = item.end;

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

          if (barWidth > 1 && item.type !== 'closetime') {
            // Only create bars for fingertime and braintime with solid colors
            g.append('rect')
              .attr('x', startX)
              .attr('y', barY)
              .attr('width', barWidth)
              .attr('height', barHeight)
              .attr('fill', item.type === 'fingertime' ? '#0bd1b9' : '#e818f7')
              .attr('rx', 0)
              .attr('opacity', 0.8);

            // AIDD bubbles removed - showing only time bars
          }
        }
      });

      // Add legend at the top (시간 타입만 표시)
      const legend = svg.append('g').attr('transform', `translate(10, 15)`); // 레전드를 더 왼쪽으로 이동

      const legendItems = [
        { label: 'Fingertime', color: '#0bd1b9', shape: 'rect' },
        { label: 'Braintime', color: '#f78aff', shape: 'rect' },
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
    };

    // 초기 차트 그리기
    drawChart();

    // ResizeObserver로 컨테이너 크기 변화 감지
    const container = svgRef.current.parentElement;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: NodeJS.Timeout | null = null;

    if (container) {
      resizeObserver = new ResizeObserver((entries) => {
        // Debounce 처리로 성능 최적화
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }

        resizeTimeout = setTimeout(() => {
          const entry = entries[0];
          if (entry && entry.contentRect.width > 0) {
            drawChart();
          }
        }, 50);
      });

      resizeObserver.observe(container);
    }

    // 클린업
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (resizeObserver && container) {
        resizeObserver.unobserve(container);
        resizeObserver.disconnect();
      }
    };
  }, [teamName, realData]);

  return (
    <div className="w-full h-52 md:h-56" style={{ minWidth: '600px' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}></svg>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const [realData, setRealData] = useState<ProcessedData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await processCSVData();
      setRealData(data);
      setLoading(false);
    };

    loadData();
  }, []);

  const projectKeys = Object.keys(realData).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-[#1c1b47] via-[rgb(35,38,100)] to-[#2f1b47]">
        <div className="text-xl text-white">Loading team data...</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto bg-gradient-to-r from-[#1c1b47] via-[rgb(35,38,100)] to-[#2f1b47] p-4 md:p-8 min-h-screen">
      <div className="px-2 mx-auto md:px-4 max-w-none">
        {' '}
        {/* Removed max-width constraint for wider layout */}
        <div className="relative mb-6 md:mb-8">
          <h1 className="text-2xl font-bold text-center text-white md:text-3xl">
            AIDD Monitoring Tool
          </h1>
          {/* Navigation Button to Developer Timeline */}
          <button
            onClick={() => navigate('/developtimeline')}
            className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 text-white transition-all bg-purple-600 rounded-lg hover:bg-purple-700"
            title="Switch to Developer Timeline View">
            <span className="text-sm font-medium">All Data</span>
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
        <div className="space-y-4 md:space-y-6">
          {projectKeys.map((teamName) => {
            return (
              <div className="flex justify-center w-full" key={teamName}>
                <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 border border-gray-700 rounded-lg bg-gray-900/50 overflow-x-auto">
                  <h2 className="mb-3 text-lg font-bold text-white">
                    {teamName}
                  </h2>
                  <div className="w-full">
                    <TimelineVisualization
                      teamName={teamName}
                      realData={realData}
                    />
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
