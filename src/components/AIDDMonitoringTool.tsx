'use client';

import * as d3 from 'd3';
import Papa from 'papaparse';
import { useEffect, useRef, useState, useCallback } from 'react';

interface Row {
  team_name: string;
  email: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: 'fingertime' | 'braintime' | 'close_time';
  aidd_count: number;
  recommend_types: string;
}

interface TeamData {
  teamName: string;
  members: Row[];
  taskCompletion: { completed: number; total: number };
  expectedQuality: number;
}

interface TeamStats {
  fbBreakdown: { fingertime: number; braintime: number };
  aiBreakdown: { [key: string]: number };
  taskCompletion: { completed: number; total: number };
  expectedQuality: number;
}

export default function AIDDMonitoringTool() {
  const [data, setData] = useState<Row[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [animatedStats, setAnimatedStats] = useState<{
    [key: string]: TeamStats;
  }>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);

  // 팀별 더미 데이터
  const teamMetrics = {
    'Project 01': {
      taskCompletion: { completed: 96, total: 96 },
      expectedQuality: 32,
    },
    'Project 02': {
      taskCompletion: { completed: 77, total: 77 },
      expectedQuality: 12,
    },
    'Project 03': {
      taskCompletion: { completed: 45, total: 60 },
      expectedQuality: 8,
    },
  };

  // 데이터 로딩 (현재는 더미 데이터 사용)
  useEffect(() => {
    console.log('Loading demo data...');

    // 데모용 더미 데이터
    const dummyData: Row[] = [
      // TEAM061 데이터
      {
        team_name: 'TEAM061',
        email: 'dev1@team061.com',
        start_time: '16:00:00',
        end_time: '16:30:00',
        duration: 30,
        type: 'fingertime',
        aidd_count: 5,
        recommend_types: '{"Query2CodeRecommend": 2, "AIPlayRecommend": 3}',
      },
      {
        team_name: 'TEAM061',
        email: 'dev1@team061.com',
        start_time: '16:30:00',
        end_time: '16:45:00',
        duration: 15,
        type: 'braintime',
        aidd_count: 0,
        recommend_types: '{}',
      },
      {
        team_name: 'TEAM061',
        email: 'dev1@team061.com',
        start_time: '16:45:00',
        end_time: '17:15:00',
        duration: 30,
        type: 'fingertime',
        aidd_count: 8,
        recommend_types: '{"RevisionMaker": 4, "QueryMakerRecommend": 4}',
      },
      {
        team_name: 'TEAM061',
        email: 'dev2@team061.com',
        start_time: '16:10:00',
        end_time: '17:00:00',
        duration: 50,
        type: 'fingertime',
        aidd_count: 12,
        recommend_types: '{"AIPlayRecommend": 5, "RevisionMaker": 7}',
      },
      {
        team_name: 'TEAM061',
        email: 'dev2@team061.com',
        start_time: '17:00:00',
        end_time: '17:10:00',
        duration: 10,
        type: 'braintime',
        aidd_count: 0,
        recommend_types: '{}',
      },

      // TEAM116 데이터
      {
        team_name: 'TEAM116',
        email: 'dev1@team116.com',
        start_time: '16:05:00',
        end_time: '16:35:00',
        duration: 30,
        type: 'fingertime',
        aidd_count: 6,
        recommend_types: '{"QueryMakerRecommend": 3, "AIPlayRecommend": 3}',
      },
      {
        team_name: 'TEAM116',
        email: 'dev1@team116.com',
        start_time: '16:35:00',
        end_time: '16:50:00',
        duration: 15,
        type: 'braintime',
        aidd_count: 0,
        recommend_types: '{}',
      },
      {
        team_name: 'TEAM116',
        email: 'dev2@team116.com',
        start_time: '16:15:00',
        end_time: '17:30:00',
        duration: 75,
        type: 'fingertime',
        aidd_count: 15,
        recommend_types:
          '{"RevisionMaker": 8, "Query2CodeRecommend": 4, "AIPlayRecommend": 3}',
      },
      {
        team_name: 'TEAM116',
        email: 'dev3@team116.com',
        start_time: '16:25:00',
        end_time: '17:45:00',
        duration: 80,
        type: 'fingertime',
        aidd_count: 9,
        recommend_types: '{"AIPlayRecommend": 5, "RevisionMaker": 4}',
      },

      // TEAM073 데이터
      {
        team_name: 'TEAM073',
        email: 'dev1@team073.com',
        start_time: '16:08:00',
        end_time: '16:40:00',
        duration: 32,
        type: 'fingertime',
        aidd_count: 4,
        recommend_types: '{"AIPlayRecommend": 2, "RevisionMakerRecommend": 2}',
      },
      {
        team_name: 'TEAM073',
        email: 'dev1@team073.com',
        start_time: '16:40:00',
        end_time: '17:00:00',
        duration: 20,
        type: 'braintime',
        aidd_count: 0,
        recommend_types: '{}',
      },
      {
        team_name: 'TEAM073',
        email: 'dev2@team073.com',
        start_time: '16:20:00',
        end_time: '17:45:00',
        duration: 85,
        type: 'fingertime',
        aidd_count: 10,
        recommend_types: '{"RevisionMaker": 6, "QueryMakerRecommend": 4}',
      },
      {
        team_name: 'TEAM073',
        email: 'dev3@team073.com',
        start_time: '16:25:00',
        end_time: '17:20:00',
        duration: 55,
        type: 'fingertime',
        aidd_count: 7,
        recommend_types: '{"AIPlayRecommend": 4, "Query2CodeRecommend": 3}',
      },
    ];

    console.log('Demo data loaded:', dummyData.length, 'records');
    setData(dummyData);
  }, []);

  // 팀 데이터 설정
  useEffect(() => {
    if (data.length === 0) {
      console.log('No data available yet');
      return;
    }

    console.log('Processing team data, total rows:', data.length);

    // 상위 3개 팀 추출
    const teamCounts = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.team_name,
    );
    const topTeams = Array.from(teamCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([team]) => team);

    console.log('Top 3 teams:', topTeams);

    const teamData: TeamData[] = topTeams.map((teamName, index) => {
      const teamMembers = data.filter((d) => d.team_name === teamName);
      const projectName = `Project 0${index + 1}`;
      const metrics = teamMetrics[projectName as keyof typeof teamMetrics];

      console.log(
        `${projectName} (${teamName}): ${teamMembers.length} members`,
      );

      return {
        teamName: projectName,
        members: teamMembers,
        taskCompletion: metrics.taskCompletion,
        expectedQuality: metrics.expectedQuality,
      };
    });

    setTeams(teamData);

    // 초기 시간 설정
    const parseTime = d3.timeParse('%H:%M:%S');
    const startTime = parseTime('16:00:00')!;
    setCurrentTime(startTime);

    console.log('Teams set:', teamData.length);
  }, [data]);

  // 통계 계산
  const calculateStats = useCallback(
    (currentTime: Date, teams: TeamData[]): { [key: string]: TeamStats } => {
      const parseTime = d3.timeParse('%H:%M:%S');
      const startTime = parseTime('16:00:00')!;
      const endTime = parseTime('18:00:00')!;

      const newStats: { [key: string]: TeamStats } = {};

      teams.forEach((team) => {
        const relevantData = team.members.filter((item) => {
          const start = parseTime(item.start_time);
          return start && start <= currentTime;
        });

        // F/B Breakdown
        const fbBreakdown = {
          fingertime: relevantData.filter((d) => d.type === 'fingertime')
            .length,
          braintime: relevantData.filter((d) => d.type === 'braintime').length,
        };

        // AI Breakdown
        const aiddMap: { [key: string]: number } = {};
        relevantData.forEach((item) => {
          try {
            const parsed = JSON.parse(item.recommend_types || '{}');
            Object.entries(parsed).forEach(([type, count]) => {
              aiddMap[type] = (aiddMap[type] || 0) + Number(count);
            });
          } catch (e) {
            console.error('Error parsing recommend_types:', e);
          }
        });

        const aiBreakdown = Object.fromEntries(
          Object.entries(aiddMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3),
        );

        // 시간 진행에 따른 비례 계산
        const progress = Math.max(
          0,
          Math.min(
            1,
            (currentTime.getTime() - startTime.getTime()) /
              (endTime.getTime() - startTime.getTime()),
          ),
        );

        newStats[team.teamName] = {
          fbBreakdown,
          aiBreakdown,
          taskCompletion: {
            completed: Math.floor(team.taskCompletion.completed * progress),
            total: team.taskCompletion.total,
          },
          expectedQuality: Math.floor(team.expectedQuality * progress),
        };
      });

      return newStats;
    },
    [],
  );

  // 현재 시간 변경시 통계 업데이트
  useEffect(() => {
    if (!currentTime || teams.length === 0) return;

    const newStats = calculateStats(currentTime, teams);
    setAnimatedStats(newStats);
    console.log(
      'Stats updated for time:',
      d3.timeFormat('%H:%M:%S')(currentTime),
      newStats,
    );
  }, [currentTime, teams, calculateStats]);

  const startAnimation = useCallback(() => {
    if (teams.length === 0) {
      console.log('No teams available for animation');
      return;
    }

    console.log('Starting animation...');
    setIsPlaying(true);

    const parseTime = d3.timeParse('%H:%M:%S');
    const startTime = parseTime('16:00:00')!;
    const endTime = parseTime('18:00:00')!;
    const duration = endTime.getTime() - startTime.getTime();
    const animationDuration = 10000; // 10초

    const startTimestamp = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimestamp;
      const progress = Math.min(elapsed / animationDuration, 1);

      const newTime = new Date(startTime.getTime() + duration * progress);
      setCurrentTime(newTime);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        animationRef.current = null;
        console.log('Animation completed');
      }
    };

    animate();
  }, [teams]);

  const resetAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    const parseTime = d3.timeParse('%H:%M:%S');
    const startTime = parseTime('16:00:00')!;
    setCurrentTime(startTime);
    console.log('Animation reset');
  }, []);

  // 컴포넌트 언마운트시 애니메이션 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const TeamTimeline = ({
    team,
    teamIndex,
    currentTime,
  }: {
    team: TeamData;
    teamIndex: number;
    currentTime: Date | null;
  }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
      if (!currentTime || !svgRef.current) return;

      const svg = d3.select(svgRef.current);
      const margin = { top: 20, right: 10, bottom: 20, left: 150 };
      const width = 520 - margin.left - margin.right;
      const height = 100 - margin.top - margin.bottom;

      svg.selectAll('*').remove();

      // 그라데이션 정의
      const defs = svg.append('defs');

      defs
        .append('linearGradient')
        .attr('id', `fingerGradient-${teamIndex}`)
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
        .attr('id', `brainGradient-${teamIndex}`)
        .selectAll('stop')
        .data([
          { offset: '0%', color: '#f78aff' },
          { offset: '100%', color: '#b13bff' },
        ])
        .enter()
        .append('stop')
        .attr('offset', (d) => d.offset)
        .attr('stop-color', (d) => d.color);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const parseTime = d3.timeParse('%H:%M:%S');
      const startTime = parseTime('16:00:00')!;
      const endTime = parseTime('18:00:00')!;

      const xScale = d3
        .scaleTime()
        .domain([startTime, endTime])
        .range([0, width]);

      const uniqueEmails = Array.from(
        new Set(team.members.map((d) => d.email)),
      );
      const yScale = d3
        .scaleBand()
        .domain(uniqueEmails)
        .range([0, height])
        .padding(0.2);

      // 시간 축
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

      // 이메일 라벨
      g.append('g')
        .call(
          d3.axisLeft(yScale).tickFormat((d) => (d as string).split('@')[0]),
        )
        .selectAll('text')
        .style('fill', '#f0f0f0')
        .style('font-size', '9px');

      // 현재 시간까지의 데이터만 렌더링
      const currentData = team.members.filter((item) => {
        const start = parseTime(item.start_time);
        return start && start <= currentTime;
      });

      console.log(
        `Rendering ${currentData.length} items for ${team.teamName} at ${d3.timeFormat('%H:%M:%S')(currentTime)}`,
      );

      // 막대 그래프와 버블 렌더링
      currentData.forEach((item) => {
        const start = parseTime(item.start_time);
        const end = parseTime(item.end_time);
        if (!start || !end || item.type === 'close_time') return;

        const actualEnd = end <= currentTime ? end : currentTime;
        const startX = xScale(start);
        const endX = xScale(actualEnd);
        const barWidth = Math.max(0, endX - startX);
        const barY = yScale(item.email)!;
        const barHeight = yScale.bandwidth();

        if (barWidth > 1) {
          // 막대 그래프
          g.append('rect')
            .attr('x', startX)
            .attr('y', barY)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr(
              'fill',
              item.type === 'fingertime'
                ? `url(#fingerGradient-${teamIndex})`
                : `url(#brainGradient-${teamIndex})`,
            )
            .attr('opacity', 0.9)
            .attr('rx', 2);

          // AIDD 버블 (fingertime인 경우에만)
          if (item.type === 'fingertime' && barWidth > 15) {
            try {
              const aiddMap = JSON.parse(item.recommend_types || '{}');
              const entries = Object.entries(aiddMap).filter(
                ([_, count]) => Number(count) > 0,
              );

              if (entries.length > 0) {
                const bubbleSpacing = Math.min(
                  barWidth / (entries.length + 1),
                  25,
                );

                entries.forEach(([type, count], bubbleIndex) => {
                  const bubbleX = startX + bubbleSpacing * (bubbleIndex + 1);
                  const bubbleY = barY + barHeight / 2;
                  const radius = Math.min(
                    3 + Math.sqrt(Number(count)) * 1.5,
                    barHeight / 3,
                  );

                  const colorIndex =
                    Math.abs(
                      type.split('').reduce((a, b) => a + b.charCodeAt(0), 0),
                    ) % d3.schemeSet2.length;

                  g.append('circle')
                    .attr('cx', bubbleX)
                    .attr('cy', bubbleY)
                    .attr('r', radius)
                    .attr('fill', d3.schemeSet2[colorIndex])
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 0.5)
                    .attr('opacity', 0.9);

                  if (radius > 4) {
                    g.append('text')
                      .attr('x', bubbleX)
                      .attr('y', bubbleY + 1)
                      .text(String(count))
                      .style('fill', 'white')
                      .style('font-size', `${Math.min(radius, 8)}px`)
                      .style('font-weight', 'bold')
                      .style('text-anchor', 'middle')
                      .style('pointer-events', 'none');
                  }
                });
              }
            } catch (e) {
              console.error(
                'Error parsing recommend_types:',
                e,
                item.recommend_types,
              );
            }
          }
        }
      });
    }, [currentTime, team, teamIndex]);

    return (
      <svg
        ref={svgRef}
        width={520}
        height={100}
        className="border border-gray-600 rounded bg-gray-800/30"
      />
    );
  };

  if (data.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-r from-[#1c1b47] via-[#232664] to-[#2f1b47] p-8 flex items-center justify-center">
        <div className="text-xl text-white">Loading CSV data...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-r from-[#1c1b47] via-[#232664] to-[#2f1b47] p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-center text-white">
          AIDD Monitoring Tool
        </h1>

        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={startAnimation}
            disabled={isPlaying}
            className="px-6 py-2 text-white transition-all bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
            {isPlaying ? 'Playing...' : 'Start Animation'}
          </button>
          <button
            onClick={resetAnimation}
            disabled={isPlaying}
            className="px-6 py-2 text-white transition-all bg-gray-600 rounded hover:bg-gray-700 disabled:opacity-50">
            Reset
          </button>
          {currentTime && (
            <div className="px-4 py-2 text-white bg-gray-800 rounded">
              Current Time: {d3.timeFormat('%H:%M:%S')(currentTime)}
            </div>
          )}
        </div>

        <div className="grid gap-8">
          {teams.map((team, index) => (
            <div
              key={team.teamName}
              className="p-6 border border-gray-700 rounded-lg bg-gray-900/50">
              <h2 className="mb-4 text-xl font-bold text-white">
                {team.teamName}
              </h2>

              <div className="flex items-start gap-8">
                {/* Work Breakdown (Timeline) */}
                <div className="flex-1">
                  <h3 className="mb-2 text-sm font-semibold text-gray-300">
                    Work Breakdown
                  </h3>
                  <TeamTimeline
                    team={team}
                    teamIndex={index}
                    currentTime={currentTime}
                  />
                </div>

                {/* F/B Breakdown */}
                <div className="w-36">
                  <h3 className="mb-2 text-sm font-semibold text-gray-300">
                    F/B Breakdown
                  </h3>
                  <div className="p-4 text-center text-white rounded-lg shadow-lg bg-gradient-to-br from-teal-600 to-teal-700">
                    <div className="mb-1 text-xs text-teal-100">
                      Finger/Brain
                    </div>
                    <div className="text-lg font-bold">
                      {animatedStats[team.teamName]?.fbBreakdown.fingertime ||
                        0}{' '}
                      /{' '}
                      {animatedStats[team.teamName]?.fbBreakdown.braintime || 0}
                    </div>
                  </div>
                </div>

                {/* AI Breakdown */}
                <div className="w-36">
                  <h3 className="mb-2 text-sm font-semibold text-gray-300">
                    AI Breakdown
                  </h3>
                  <div className="p-4 text-center text-white rounded-lg shadow-lg bg-gradient-to-br from-blue-600 to-blue-700">
                    <div className="mb-1 text-xs text-blue-100">상위 3개</div>
                    <div className="space-y-1">
                      {Object.entries(
                        animatedStats[team.teamName]?.aiBreakdown || {},
                      )
                        .slice(0, 3)
                        .map(([type, count], idx) => (
                          <div key={type} className="text-xs">
                            {idx + 1}.{' '}
                            {type.replace('Recommend', '').slice(0, 6)}: {count}
                          </div>
                        ))}
                      {Object.keys(
                        animatedStats[team.teamName]?.aiBreakdown || {},
                      ).length === 0 && (
                        <div className="text-xs text-blue-200">No data yet</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Completion */}
                <div className="w-36">
                  <h3 className="mb-2 text-sm font-semibold text-gray-300">
                    Task Completion
                  </h3>
                  <div className="p-4 text-center text-white rounded-lg shadow-lg bg-gradient-to-br from-teal-700 to-teal-800">
                    <div className="mb-1 text-2xl font-bold">
                      {animatedStats[team.teamName]?.taskCompletion.completed ||
                        0}
                      /{team.taskCompletion.total}건
                    </div>
                    <div className="text-xs text-teal-200">
                      {Math.round(
                        ((animatedStats[team.teamName]?.taskCompletion
                          .completed || 0) /
                          team.taskCompletion.total) *
                          100,
                      )}
                      %
                    </div>
                  </div>
                </div>

                {/* Expected Quality */}
                <div className="w-36">
                  <h3 className="mb-2 text-sm font-semibold text-gray-300">
                    Expected Quality
                  </h3>
                  <div className="p-4 text-center text-white rounded-lg shadow-lg bg-gradient-to-br from-blue-700 to-blue-800">
                    <div className="mb-1 text-2xl font-bold">
                      {animatedStats[team.teamName]?.expectedQuality || 0}점
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {teams.length === 0 && (
          <div className="mt-8 text-lg text-center text-white">
            No team data available. Please check the CSV file.
          </div>
        )}
      </div>
    </div>
  );
}
