import { useEffect, useRef, useState } from 'react';
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

interface AIDDTimeRow {
  email: string;
  feature_name: string;
  timestamp: string;
  data_source: string;
  file_path: string;
  usage_timestamp: string;
  actual_usage_time: string;
  milliseconds: number;
  sequence: number;
  team_name: string;
  file_type: string;
}

const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return (hours - 16) * 60 + minutes + seconds / 60;
};

const parseAIDDTimeToMinutes = (timeStr: string): number => {
  // "16:00:48" 형식의 시간을 분으로 변환
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

const processAIDDTimeData = async (): Promise<AIDDTimeRow[]> => {
  try {
    const response = await fetch('/aidd_time.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n').slice(1); // Remove header

    const aiddTimeData: AIDDTimeRow[] = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      const [
        email,
        feature_name,
        timestamp,
        data_source,
        file_path,
        usage_timestamp,
        actual_usage_time,
        milliseconds,
        sequence,
        team_name,
        file_type,
      ] = line.split(',');

      aiddTimeData.push({
        email,
        feature_name,
        timestamp,
        data_source,
        file_path,
        usage_timestamp,
        actual_usage_time,
        milliseconds: parseInt(milliseconds),
        sequence: parseInt(sequence),
        team_name,
        file_type,
      });
    });

    // Update TEAM00 developers' team_name in AIDD data
    const team00Developers = ['hwyang@biztechi.com', 'kimhk', 'gamja', 'twchung', 'suhyeok', 'quangnd'];
    aiddTimeData.forEach(item => {
      team00Developers.forEach(devName => {
        if (item.email.includes(devName) || item.email.includes(devName.toLowerCase())) {
          item.team_name = 'TEAM00';
        }
      });
    });

    return aiddTimeData;
  } catch (error) {
    console.error('Error processing AIDD time data:', error);
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

    // Create TEAM00 with specific developers
    const team00Developers = [
      'hwyang@biztechi.com', // TEAM035
      'kimhk', // TEAM039
      'gamja', // TEAM052
      'twchung', // TEAM052
      'suhyeok', // TEAM056
      'quangnd' // TEAM112
    ];
    const team00Data: CSVRow[] = [];

    // Find data for these developers from their original teams
    const originalTeams = ['TEAM035', 'TEAM039', 'TEAM052', 'TEAM052', 'TEAM056', 'TEAM112'];

    team00Developers.forEach((devName, index) => {
      const originalTeam = originalTeams[index];
      if (teamData[originalTeam]) {
        const devData = teamData[originalTeam].filter(row =>
          row.email.includes(devName) || row.email.includes(devName.toLowerCase())
        );
        devData.forEach(data => {
          team00Data.push({
            ...data,
            team_name: 'TEAM00'
          });
        });
      }
    });

    if (team00Data.length > 0) {
      teamData['TEAM00'] = team00Data;
    }

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
  aiddTimeData,
}: {
  teamName: string;
  realData: ProcessedData;
  aiddTimeData: AIDDTimeRow[];
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
      const height = window.innerWidth < 768 ? 280 : 320; // 높이를 크게 늘려서 간격 확보
      const margin = {
        top: 60,
        right: window.innerWidth < 768 ? 40 : 60,
        bottom: 20,
        left: window.innerWidth < 768 ? 80 : 100,
      };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const barHeight = 12; // 막대 높이를 조금 줄여서 간격 효과 증대

      // Show complete timeline (16:00 to 18:00)

      // Get team data from real data
      const teamData = realData[teamName];

      if (!teamData) return;

      const data = teamData.timeline_data;
      const users = teamData.developers;

      // Get AIDD time data for this team
      const teamAIDDData = aiddTimeData.filter(item => item.team_name === teamName);

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
        .padding(0.1); // 개발자 간격을 매우 크게 벌림

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

      // Draw AIDD feature usage markers (only during fingertime)
      teamAIDDData.forEach((aiddItem) => {
        const userY = yScale(aiddItem.email);
        if (!userY) return;

        const aiddTimeMinutes = parseAIDDTimeToMinutes(aiddItem.actual_usage_time);

        // Check if this AIDD usage is during fingertime
        const isDuringFingertime = data.some((timelineItem) => {
          return timelineItem.user === aiddItem.email &&
            timelineItem.type === 'fingertime' &&
            aiddTimeMinutes >= timelineItem.start &&
            aiddTimeMinutes <= timelineItem.end;
        });

        if (isDuringFingertime) {
          const aiddTime = new Date(startTime.getTime() + aiddTimeMinutes * 60000);
          const aiddX = xScale(aiddTime);

          const barY = userY + (yScale.bandwidth() - barHeight) / 2;

          // Determine feature type and draw appropriate marker
          const promptFeatures = ["AIPlayRecommend", "TestCaseRecommend", "SummaryRecommend", "CodeMacroRecommend", "CodeMacro"];
          const iconFeatures = [
            "QueryMakerRecommend", "MarkerRecommend", "Query2CodeRecommend", "ExceptionHelperRecommend", "MethodGenRecommend",
            "QueryTuningRecommend", "SimpleMethodRecommend", "Query2Code", "Marker", "SimpleMethod", "MethodGen"
          ];
          const autofillFeatures = ["NextLineRecommend", "RevisionMakerRecommend", "CommentRecommend", "RevisionMaker", "NextLine"];

          if (promptFeatures.includes(aiddItem.feature_name)) {
            // Prompt 기능: 연두색 역정삼각형 (막대 위, 별 크기와 비슷하게)
            const triangleSize = 8; // 정삼각형의 한 변의 길이
            const triangleColor = '#C7FF70'; // 연두색

            // Points for a downward-pointing equilateral triangle above the bar
            const centerY = barY - triangleSize / 2; // 막대 위에 딱 붙게
            const height = triangleSize * Math.sqrt(3) / 2; // 정삼각형의 높이
            const p1 = `${aiddX},${centerY + height / 2}`; // Bottom point
            const p2 = `${aiddX - triangleSize / 2},${centerY - height / 2}`; // Top left
            const p3 = `${aiddX + triangleSize / 2},${centerY - height / 2}`; // Top right

            g.append('polygon')
              .attr('points', `${p1} ${p2} ${p3}`)
              .attr('fill', triangleColor)
              .attr('opacity', 1);
          } else if (iconFeatures.includes(aiddItem.feature_name)) {
            // Icon 기능: 진한 빨간색 별 (막대 위)
            const starSize = 10; // 별 크기
            const starColor = '#EB0000'; // 진한 빨간색

            // Create a simple star shape with adjusted position
            const starPoints = [];
            const outerRadius = starSize / 2;
            const innerRadius = outerRadius * 0.4;
            const starY = barY - starSize / 2; // 막대 위에 딱 붙게

            for (let i = 0; i < 10; i++) {
              const angle = (i * Math.PI) / 5;
              const radius = i % 2 === 0 ? outerRadius : innerRadius;
              const x = aiddX + radius * Math.cos(angle - Math.PI / 2);
              const y = starY + radius * Math.sin(angle - Math.PI / 2);
              starPoints.push(`${x},${y}`);
            }

            g.append('polygon')
              .attr('points', starPoints.join(' '))
              .attr('fill', starColor)
              .attr('opacity', 1);
          } else if (autofillFeatures.includes(aiddItem.feature_name)) {
            // Autofill 기능: 노란색 선 (막대 아래)
            const lineY = barY + barHeight; // 막대 아래에 딱 붙게
            g.append('line')
              .attr('x1', aiddX)
              .attr('x2', aiddX)
              .attr('y1', lineY)
              .attr('y2', lineY + 12) // 세로 길이 살짝 증가
              .attr('stroke', '#ffff00') // Yellow color
              .attr('stroke-width', 3)
              .attr('opacity', 0.8);
          }
        }
      });

      // Add legend at the top (시간 타입만 표시)
      const legend = svg.append('g').attr('transform', `translate(10, 15)`); // 레전드를 더 왼쪽으로 이동

      const legendItems = [
        { label: 'Fingertime', color: '#0bd1b9', shape: 'rect' },
        { label: 'Braintime', color: '#e818f7', shape: 'rect' },
        { label: 'Prompt 기능', color: '#C7FF70', shape: 'triangle_up' },
        { label: 'Icon 기능', color: '#EB0000', shape: 'star' },
        { label: 'Autofill 기능', color: '#ffff00', shape: 'line_vertical' },
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
        } else if (item.shape === 'line') {
          legend
            .append('line')
            .attr('x1', x - 6)
            .attr('x2', x + 6)
            .attr('y1', y)
            .attr('y2', y)
            .attr('stroke', item.color)
            .attr('stroke-width', 2);
        } else if (item.shape === 'line_vertical') {
          // Draw vertical line (세로 선)
          legend
            .append('line')
            .attr('x1', x)
            .attr('x2', x)
            .attr('y1', y - 6)
            .attr('y2', y + 6)
            .attr('stroke', item.color)
            .attr('stroke-width', 3)
            .attr('opacity', 0.8);
        } else if (item.shape === 'triangle_up') {
          // Draw downward-pointing equilateral triangle (역정삼각형)
          const triangleSize = 6; // 정삼각형의 한 변의 길이
          const height = triangleSize * Math.sqrt(3) / 2; // 정삼각형의 높이
          const p1 = `${x},${y + height / 2}`; // Bottom point
          const p2 = `${x - triangleSize / 2},${y - height / 2}`; // Top left
          const p3 = `${x + triangleSize / 2},${y - height / 2}`; // Top right

          legend.append('polygon')
            .attr('points', `${p1} ${p2} ${p3}`)
            .attr('fill', item.color)
            .attr('opacity', 1);
        } else if (item.shape === 'star') {
          // Draw star
          const starSize = 8; // 레전드 별 크기도 증가
          const starPoints = [];
          const outerRadius = starSize / 2;
          const innerRadius = outerRadius * 0.4;

          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const starX = x + radius * Math.cos(angle - Math.PI / 2);
            const starY = y + radius * Math.sin(angle - Math.PI / 2);
            starPoints.push(`${starX},${starY}`);
          }

          legend.append('polygon')
            .attr('points', starPoints.join(' '))
            .attr('fill', item.color)
            .attr('opacity', 1);
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
  }, [teamName, realData, aiddTimeData]);

  return (
    <div className="w-full h-80 md:h-96" style={{ minWidth: '600px' }}>
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
  const [realData, setRealData] = useState<ProcessedData>({});
  const [aiddTimeData, setAiddTimeData] = useState<AIDDTimeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [csvData, aiddData] = await Promise.all([
        processCSVData(),
        processAIDDTimeData()
      ]);
      setRealData(csvData);
      setAiddTimeData(aiddData);
      setLoading(false);
    };

    loadData();
  }, []);

  // 지정된 팀만 표시
  const allowedTeams = ['TEAM035', 'TEAM039', 'TEAM052', 'TEAM056', 'TEAM112'];
  const projectKeys = Object.keys(realData)
    .filter(teamName => allowedTeams.includes(teamName))
    .sort((a, b) => {
      // 팀 번호 순으로 정렬
      const aNum = parseInt(a.replace('TEAM', ''));
      const bNum = parseInt(b.replace('TEAM', ''));
      return aNum - bNum;
    });

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
            Brain AI
          </h1>
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
                      aiddTimeData={aiddTimeData}
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
