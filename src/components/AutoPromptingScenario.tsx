import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import DeveloperPromptingPanel from './DeveloperPromptingPanel';

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
    const team00Developers = [
      'hwyang@biztechi.com',
      'kimhk',
      'gamja',
      'twchung',
      'suhyeok',
      'quangnd',
    ];
    aiddTimeData.forEach((item) => {
      team00Developers.forEach((devName) => {
        if (
          item.email.includes(devName) ||
          item.email.includes(devName.toLowerCase())
        ) {
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
      'quangnd', // TEAM112
    ];
    const team00Data: CSVRow[] = [];

    // Find data for these developers from their original teams
    const originalTeams = [
      'TEAM035',
      'TEAM039',
      'TEAM052',
      'TEAM052',
      'TEAM056',
      'TEAM112',
    ];

    team00Developers.forEach((devName, index) => {
      const originalTeam = originalTeams[index];
      if (teamData[originalTeam]) {
        const devData = teamData[originalTeam].filter(
          (row) =>
            row.email.includes(devName) ||
            row.email.includes(devName.toLowerCase()),
        );
        devData.forEach((data) => {
          team00Data.push({
            ...data,
            team_name: 'TEAM00',
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

// 팀별 braintime 평균 계산 함수
const calculateTeamBraintimeAverage = (
  teamName: string,
  data: ProcessedData,
): number => {
  const teamData = data[teamName];
  if (!teamData) return 0;

  const totalBraintimeByDeveloper: { [email: string]: number } = {};

  // 각 개발자별 총 braintime 계산
  teamData.timeline_data.forEach((item) => {
    if (item.type === 'braintime') {
      if (!totalBraintimeByDeveloper[item.user]) {
        totalBraintimeByDeveloper[item.user] = 0;
      }
      totalBraintimeByDeveloper[item.user] += item.duration;
    }
  });

  // 개발자별 평균 계산
  const braintimes = Object.values(totalBraintimeByDeveloper);
  if (braintimes.length === 0) return 0;

  const average =
    braintimes.reduce((sum, time) => sum + time, 0) / braintimes.length;
  return Math.round(average * 10) / 10; // 소수점 첫째자리까지
};

// Braintime 평균 표시 컴포넌트
const BraintimeAverageCard = ({
  teamName,
  realData,
}: {
  teamName: string;
  realData: ProcessedData;
}) => {
  const average = calculateTeamBraintimeAverage(teamName, realData);

  return (
    <div className="mr-4 bg-purple-600/20 border border-purple-500/30 rounded-lg p-4 min-w-[120px]">
      <div className="mb-1 text-xs font-medium text-purple-300 ">
        Braintime 평균
      </div>
      <div className="text-lg font-bold text-white">{average}분</div>
      <div className="mt-1 text-xs text-purple-300">개발자당</div>
    </div>
  );
};

const TimelineVisualization = ({
  teamName,
  realData,
  aiddTimeData,
  currentTime,
  brainAIUsages,
  isAnimationPaused,
}: {
  teamName: string;
  realData: ProcessedData;
  aiddTimeData: AIDDTimeRow[];
  currentTime: string;
  brainAIUsages: BrainAIUsage[];
  isAnimationPaused: boolean;
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

      // 애니메이션 처리: 현재 시간 계산 (모든 표시되는 팀에 애니메이션 적용)
      const isAnimatedTeam = true; // 표시되는 모든 팀이 애니메이션 팀
      // Convert current time to minutes from 16:00
      const [hours, minutes, seconds] = currentTime.split(':').map(Number);
      const currentMinutes = (hours - 16) * 60 + minutes + seconds / 60;
      console.log(
        `${teamName}: currentTime=${currentTime}, currentMinutes=${currentMinutes}`,
      );

      // Get team data from real data
      const teamData = realData[teamName];

      if (!teamData) return;

      // 원본 데이터를 복사하고 Brain AI 사용에 따라 수정
      let modifiedData = [...teamData.timeline_data];

      // 해당 팀의 Brain AI 사용 기록 필터링
      const teamBrainAIUsages = brainAIUsages.filter(
        (usage) => usage.teamName === teamName,
      );

      // Brain AI 사용 시점 이후 braintime을 fingertime으로 전환
      teamBrainAIUsages.forEach((usage) => {
        modifiedData = modifiedData
          .map((item) => {
            if (item.user === usage.developer && item.type === 'braintime') {
              // Brain AI 사용 시점이 이 braintime 구간에 포함되는 경우
              if (usage.time >= item.start && usage.time <= item.end) {
                // 해당 시점 이전은 braintime, 이후는 fingertime으로 분할
                const splitTime = usage.time;
                const modifiedItems = [];

                // Brain AI 사용 이전 부분 (braintime 유지)
                if (splitTime > item.start) {
                  modifiedItems.push({
                    ...item,
                    end: splitTime,
                  });
                }

                // Brain AI 사용 이후 부분 (fingertime으로 전환)
                if (splitTime < item.end) {
                  modifiedItems.push({
                    ...item,
                    start: splitTime,
                    type: 'fingertime',
                  });
                }

                return modifiedItems;
              }
            }
            return [item];
          })
          .flat();
      });

      const data = modifiedData;
      const users = teamData.developers;

      // Get AIDD time data for this team
      const teamAIDDData = aiddTimeData.filter(
        (item) => item.team_name === teamName,
      );

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
          let barWidth = endX - startX;

          // 애니메이션 적용: 애니메이션 팀의 경우 현재 시간까지만 막대 표시
          if (isAnimatedTeam) {
            console.log(
              `${teamName} - ${item.user}: itemStart=${itemStartMinutes}, itemEnd=${itemEndMinutes}, current=${currentMinutes}`,
            );
            if (currentMinutes >= itemStartMinutes) {
              // 현재 시간이 막대 시작 시간을 지났으면 표시 시작
              const visibleEndMinutes = Math.min(
                itemEndMinutes,
                currentMinutes,
              );
              const visibleEndTime = new Date(
                startTime.getTime() + visibleEndMinutes * 60000,
              );
              const visibleEndX = xScale(visibleEndTime);
              const originalBarWidth = barWidth;
              barWidth = Math.max(0, visibleEndX - startX);
              console.log(
                `  -> originalWidth=${originalBarWidth}, animatedWidth=${barWidth}`,
              );
            } else {
              // 아직 시작 시간이 되지 않았으면 막대를 표시하지 않음
              console.log(`  -> 아직 시작 시간 전, barWidth=0`);
              barWidth = 0;
            }
          }

          if (
            (barWidth > 1 || (isAnimatedTeam && barWidth > 0)) &&
            item.type !== 'closetime'
          ) {
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

        const aiddTimeMinutes = parseAIDDTimeToMinutes(
          aiddItem.actual_usage_time,
        );

        // Check if this AIDD usage is during fingertime
        const isDuringFingertime = data.some((timelineItem) => {
          return (
            timelineItem.user === aiddItem.email &&
            timelineItem.type === 'fingertime' &&
            aiddTimeMinutes >= timelineItem.start &&
            aiddTimeMinutes <= timelineItem.end
          );
        });

        // 애니메이션 팀의 경우 현재 시간까지만 AIDD 마커 표시
        if (isDuringFingertime) {
          // 애니메이션 팀이 아니거나, 애니메이션 팀인데 현재 시간이 AIDD 사용 시간을 지났을 때만 표시
          if (!isAnimatedTeam || aiddTimeMinutes <= currentMinutes) {
            const aiddTime = new Date(
              startTime.getTime() + aiddTimeMinutes * 60000,
            );
            const aiddX = xScale(aiddTime);

            const barY = userY + (yScale.bandwidth() - barHeight) / 2;

            // Determine feature type and draw appropriate marker
            const promptFeatures = [
              'AIPlayRecommend',
              'TestCaseRecommend',
              'SummaryRecommend',
              'CodeMacroRecommend',
              'CodeMacro',
            ];
            const iconFeatures = [
              'QueryMakerRecommend',
              'MarkerRecommend',
              'Query2CodeRecommend',
              'ExceptionHelperRecommend',
              'MethodGenRecommend',
              'QueryTuningRecommend',
              'SimpleMethodRecommend',
              'Query2Code',
              'Marker',
              'SimpleMethod',
              'MethodGen',
            ];
            const autofillFeatures = [
              'NextLineRecommend',
              'RevisionMakerRecommend',
              'CommentRecommend',
              'RevisionMaker',
              'NextLine',
            ];

            if (promptFeatures.includes(aiddItem.feature_name)) {
              // Prompt 기능: 연두색 역정삼각형 (막대 위, 별 크기와 비슷하게)
              const triangleSize = 8; // 정삼각형의 한 변의 길이
              const triangleColor = '#C7FF70'; // 연두색

              // Points for a downward-pointing equilateral triangle above the bar
              const centerY = barY - triangleSize / 2; // 막대 위에 딱 붙게
              const height = (triangleSize * Math.sqrt(3)) / 2; // 정삼각형의 높이
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
        }
      });

      // Draw Brain AI usage markers (동그라미)
      teamBrainAIUsages.forEach((brainAIUsage) => {
        // 애니메이션 팀인 경우 현재 시간 이후의 Brain AI 사용은 표시하지 않음
        if (isAnimatedTeam && brainAIUsage.time > currentMinutes) {
          return;
        }

        const userY = yScale(brainAIUsage.developer);
        if (!userY) return;

        const brainAITime = new Date(
          startTime.getTime() + brainAIUsage.time * 60000,
        );
        const brainAIX = xScale(brainAITime);

        const barY = userY + (yScale.bandwidth() - barHeight) / 2;
        const circleY = barY + barHeight / 2; // 막대 중앙에 위치

        // Brain AI 사용 표시: 파란색 동그라미
        g.append('circle')
          .attr('cx', brainAIX)
          .attr('cy', circleY)
          .attr('r', 6)
          .attr('fill', '#3B82F6') // 파란색
          .attr('stroke', '#FFFFFF') // 흰색 테두리
          .attr('stroke-width', 2)
          .attr('opacity', 1);

        // 'AI' 텍스트 추가
        g.append('text')
          .attr('x', brainAIX)
          .attr('y', circleY + 1) // 약간 아래로 조정
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .text('AI')
          .style('fill', 'white')
          .style('font-size', '8px')
          .style('font-weight', 'bold');
      });

      // Add legend at the top (시간 타입만 표시)
      const legend = svg.append('g').attr('transform', `translate(10, 15)`); // 레전드를 더 왼쪽으로 이동

      const legendItems = [
        { label: 'Fingertime', color: '#0bd1b9', shape: 'rect' },
        { label: 'Braintime', color: '#e818f7', shape: 'rect' },
        { label: 'Brain AI 사용', color: '#3B82F6', shape: 'circle' },
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
          const height = (triangleSize * Math.sqrt(3)) / 2; // 정삼각형의 높이
          const p1 = `${x},${y + height / 2}`; // Bottom point
          const p2 = `${x - triangleSize / 2},${y - height / 2}`; // Top left
          const p3 = `${x + triangleSize / 2},${y - height / 2}`; // Top right

          legend
            .append('polygon')
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

          legend
            .append('polygon')
            .attr('points', starPoints.join(' '))
            .attr('fill', item.color)
            .attr('opacity', 1);
        } else if (item.shape === 'circle') {
          // Draw circle with border (Brain AI 마커와 동일하게)
          legend
            .append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 6)
            .attr('fill', item.color)
            .attr('stroke', '#FFFFFF')
            .attr('stroke-width', 1);

          // 'AI' 텍스트 추가
          legend
            .append('text')
            .attr('x', x)
            .attr('y', y + 1)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .text('AI')
            .style('fill', 'white')
            .style('font-size', '7px')
            .style('font-weight', 'bold');
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
  }, [
    teamName,
    realData,
    aiddTimeData,
    currentTime,
    brainAIUsages,
    isAnimationPaused,
  ]);

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

// Brain AI 사용 기록 타입 정의
interface BrainAIUsage {
  teamName: string;
  developer: string;
  time: number; // minutes from 16:00
}

// 팝업 상태 타입 정의
interface PopupState {
  show: boolean;
  teamName: string;
  developer: string;
  time: number;
  apiType: 'reservation' | 'checkin'; // API 타입 추가
}

export default function AIDDMonitoringTool() {
  const navigate = useNavigate();
  const [realData, setRealData] = useState<ProcessedData>({});
  const [aiddTimeData, setAiddTimeData] = useState<AIDDTimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('16:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('TEAM035');

  // 개발자별 누적 braintime 추적 (로컬 변수로 관리)

  // 팝업 상태 관리
  const [popupState, setPopupState] = useState<PopupState>({
    show: false,
    teamName: '',
    developer: '',
    time: 0,
    apiType: 'reservation',
  });

  // Brain AI 사용 기록
  const [brainAIUsages, setBrainAIUsages] = useState<BrainAIUsage[]>([]);

  // 개발자별 마지막 알림 시간 추적 (중복 방지 개선)
  const [lastNotificationTime, setLastNotificationTime] = useState<{ [key: string]: number }>({});

  // 개발자별 활성 상태 관리
  const [activeDevelopers, setActiveDevelopers] = useState<{ [key: string]: { isActive: boolean; apiType: 'reservation' | 'checkin'; lastActivated?: number } }>({});

  // 다른 개발자들이 모두 fingertime일 때 혼자 braintime인 경우 감지
  const checkLoneBraintimeAndShowPopup = (currentMinutes: number) => {
    // 이미 팝업이 떠있으면 체크하지 않음
    if (popupState.show || !realData[activeTab]) return;

    const teamData = realData[activeTab];

    // 현재 시간에 활동 중인 개발자들 찾기 (closetime 제외)
    const activeDevelopers = teamData.timeline_data.filter((item) => {
      return item.start <= currentMinutes && item.end > currentMinutes && item.type !== 'closetime';
    });

    if (activeDevelopers.length === 0) return;

    // 현재 시간에 fingertime인 개발자들
    const fingertimeDevelopers = activeDevelopers.filter((item) => item.type === 'fingertime');

    // 현재 시간에 braintime인 개발자들
    const braintimeDevelopers = activeDevelopers.filter((item) => item.type === 'braintime');

    // 조건: 다른 개발자들이 모두 fingertime이고, 혼자만 braintime인 경우
    // 1. braintime 개발자가 정확히 1명
    // 2. fingertime 개발자가 1명 이상 (다른 개발자들이 있음)
    // 3. 전체 활동 중인 개발자 = fingertime + braintime
    if (braintimeDevelopers.length === 1 &&
      fingertimeDevelopers.length >= 1 &&
      fingertimeDevelopers.length + braintimeDevelopers.length === activeDevelopers.length) {

      const loneBraintimeDeveloper = braintimeDevelopers[0];
      const developerKey = `${activeTab}-${loneBraintimeDeveloper.user}`;

      // 마지막 알림 시간 확인 (5분 후에 다시 알림 가능)
      const lastNotification = lastNotificationTime[developerKey] || 0;
      const timeSinceLastNotification = currentMinutes - lastNotification;

      // 5분 이상 지났거나 처음 알림인 경우
      if (timeSinceLastNotification >= 5) {
        // braintime 지속 시간 계산
        const braintimeDuration = Math.min(loneBraintimeDeveloper.end, currentMinutes) - loneBraintimeDeveloper.start;

        // 2분 이상 지속된 경우에만 알림 표시
        if (braintimeDuration >= 2) {
          // API 타입을 번갈아가면서 선택
          const apiType = Math.random() < 0.5 ? 'reservation' : 'checkin';

          console.log(`[AI 알림] ${loneBraintimeDeveloper.user} (${loneBraintimeDeveloper.type}) - ${apiType} API`);

          setPopupState({
            show: true,
            teamName: activeTab,
            developer: loneBraintimeDeveloper.user,
            time: currentMinutes,
            apiType: apiType,
          });

          // 마지막 알림 시간 업데이트
          setLastNotificationTime(prev => ({
            ...prev,
            [developerKey]: currentMinutes
          }));
        }
      }
    }
  };

  // 개발자별 누적 braintime 계산 및 팝업 체크 (기존 로직 유지)
  const checkBraintimeAndShowPopup = (currentMinutes: number) => {
    // 새로운 로직 사용
    checkLoneBraintimeAndShowPopup(currentMinutes);
  };

  // 팝업 확인 버튼 핸들러
  const handlePopupConfirm = () => {
    console.log('Popup confirm clicked');
    // Brain AI 사용 기록 추가
    setBrainAIUsages((prev) => [
      ...prev,
      {
        teamName: popupState.teamName,
        developer: popupState.developer,
        time: popupState.time,
      },
    ]);

    // 개발자별 프롬프팅 패널 활성화 (기존 상태가 있으면 업데이트)
    const developerKey = `${popupState.teamName}-${popupState.developer}`;
    setActiveDevelopers(prev => ({
      ...prev,
      [developerKey]: {
        isActive: true,
        apiType: popupState.apiType,
        lastActivated: Date.now() // 마지막 활성화 시간 추가
      }
    }));

    // 팝업 닫기 (애니메이션은 계속 진행됨)
    setPopupState({ show: false, teamName: '', developer: '', time: 0, apiType: 'reservation' });
  };

  // 팝업 취소 버튼 핸들러
  const handlePopupCancel = () => {
    console.log('Popup cancel clicked');
    // 팝업 닫기 (애니메이션은 계속 진행됨)
    setPopupState({ show: false, teamName: '', developer: '', time: 0, apiType: 'reservation' });
  };

  const startAnimation = () => {
    console.log('Animation started!');
    setIsPlaying(true);

    // 현재 시간에서 시작하도록 seconds 계산
    const [currentHours, currentMinutes, currentSeconds] = currentTime
      .split(':')
      .map(Number);
    let seconds =
      (currentHours - 16) * 3600 + currentMinutes * 60 + currentSeconds;

    const id = setInterval(() => {
      seconds += 15; // 15초씩 증가 (조금 더 천천히)
      const hours = 16 + Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setCurrentTime(timeString);

      // braintime 체크 (팝업이 떠있지 않을 때만)
      const currentMinutes = (hours - 16) * 60 + minutes + secs / 60;
      if (!popupState.show) {
        checkBraintimeAndShowPopup(currentMinutes);
      }

      if (hours >= 18) {
        clearInterval(id);
        setIsPlaying(false);
        setIntervalId(null);
      }
    }, 100); // 100ms마다 업데이트 (조금 더 천천히)

    setIntervalId(id);
  };

  const stopAnimation = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsPlaying(false);
  };

  // 개발자별 프롬프팅 패널 닫기 핸들러
  const handleCloseDeveloperPanel = (developerKey: string) => {
    setActiveDevelopers(prev => ({
      ...prev,
      [developerKey]: {
        ...prev[developerKey],
        isActive: false
      }
    }));
  };

  const resetAnimation = () => {
    stopAnimation();
    setCurrentTime('16:00:00');
    setLastNotificationTime({});
    setBrainAIUsages([]); // Brain AI 사용 기록 초기화
    setActiveDevelopers({});
    setPopupState({ show: false, teamName: '', developer: '', time: 0, apiType: 'reservation' });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [csvData, aiddData] = await Promise.all([
        processCSVData(),
        processAIDDTimeData(),
      ]);
      setRealData(csvData);
      setAiddTimeData(aiddData);
      setLoading(false);
    };

    loadData();
  }, []);

  // 탭 변경 시 상태 초기화
  useEffect(() => {
    resetAnimation();
  }, [activeTab]);

  // 팝업 상태 변화 감지 - 팝업이 뜨면 애니메이션 강제 중지
  useEffect(() => {
    if (popupState.show && intervalId) {
      console.log('Popup shown - force stopping animation');
      clearInterval(intervalId);
      setIntervalId(null);
      setIsPlaying(false);
    }
  }, [popupState.show, intervalId]);

  // 애니메이션을 적용할 특정 팀들만 표시
  const animatedTeams = ['TEAM035', 'TEAM039', 'TEAM052', 'TEAM056', 'TEAM112'];
  // 특정 팀들만 표시하고 번호 순으로 정렬
  const projectKeys = Object.keys(realData)
    .filter((teamName) => animatedTeams.includes(teamName))
    .sort((a, b) => {
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
          {/* Navigation Button */}
          <div className="absolute top-0 left-0">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-white transition-colors bg-green-600 rounded hover:bg-green-700 md:px-6 md:text-base">
              ← Monitoring Tool
            </button>
          </div>

          <h1 className="text-2xl font-bold text-center text-white md:text-3xl">
            Brain AI Scenario
          </h1>
          {/* Animation Controls */}
          <div className="flex items-center justify-center mt-4 space-x-4">
            <button
              onClick={isPlaying ? stopAnimation : startAnimation}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 md:px-6 md:text-base">
              {isPlaying ? 'Stop' : 'Start'}
            </button>
            <button
              onClick={resetAnimation}
              className="px-4 py-2 text-sm text-white bg-gray-600 rounded hover:bg-gray-700 md:px-6 md:text-base">
              Reset
            </button>
            <div className="px-3 py-2 text-xs text-white bg-gray-800 rounded md:px-4 md:text-sm">
              Current Time: {currentTime}
            </div>
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex justify-center">
            <div className="flex p-1 rounded-lg bg-gray-800/50">
              {projectKeys.map((teamName) => (
                <button
                  key={teamName}
                  onClick={() => setActiveTab(teamName)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === teamName
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }`}>
                  {teamName}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Active Team Content */}
        <div className="flex justify-center w-full">
          <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 border border-gray-700 rounded-lg bg-gray-900/50 overflow-x-auto">
            <h2 className="mb-3 text-lg font-bold text-white">{activeTab}</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <TimelineVisualization
                  teamName={activeTab}
                  realData={realData}
                  aiddTimeData={aiddTimeData}
                  currentTime={currentTime}
                  brainAIUsages={brainAIUsages}
                  isAnimationPaused={popupState.show}
                />
              </div>
              <div className="flex-shrink-0">
                <BraintimeAverageCard
                  teamName={activeTab}
                  realData={realData}
                />
              </div>
            </div>

            {/* 개발자별 프롬프팅 패널들 */}
            {realData[activeTab] && (
              <div className="mt-6">
                <h3 className="mb-4 text-md font-semibold text-white">개발자별 AI 어시스턴트</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {realData[activeTab].developers.map((developer) => {
                    const developerKey = `${activeTab}-${developer}`;
                    const developerState = activeDevelopers[developerKey];

                    return (
                      <div key={developer} className="h-80">
                        <DeveloperPromptingPanel
                          developer={developer}
                          isActive={developerState?.isActive || false}
                          apiType={developerState?.apiType || 'reservation'}
                          lastActivated={developerState?.lastActivated}
                          onClose={() => handleCloseDeveloperPanel(developerKey)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auto Prompt 제안 팝업 모달 */}
      {popupState.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="max-w-md p-6 mx-4 bg-white rounded-lg shadow-2xl">
            <div className="text-center">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                Brain AI 어시스턴트
              </h3>
              <div className="mb-6 leading-relaxed text-gray-600">
                <p>
                  {popupState.apiType === 'reservation'
                    ? '예약 등록 API 기능 구현을 시도 중이신 것으로 보입니다.'
                    : '체크인 API 기능 구현을 시도 중이신 것으로 보입니다.'
                  }
                </p>
                <p className="mt-2">
                  개발에 참고할 수 있도록, AIDD에 활용할 수 있는 프롬프트를 제공해드릴까요?
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handlePopupConfirm}
                  className="px-6 py-2 text-white transition-colors bg-blue-600 rounded shadow-lg hover:bg-blue-700">
                  확인
                </button>
                <button
                  onClick={handlePopupCancel}
                  className="px-6 py-2 text-gray-700 transition-colors bg-gray-300 rounded shadow-lg hover:bg-gray-400">
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
