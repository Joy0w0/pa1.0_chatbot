'use client';

import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';

interface Row {
  team_name: string;
  email: string;
  start_time: string;
  end_time: string;
  type: 'fingertime' | 'braintime' | 'close_time';
  recommend_types: string;
}

export default function SimpleAIDDTool() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [teams] = useState([
    {
      name: 'Project 01',
      data: [
        { team_name: 'TEAM061', email: 'dev1@team061.com', start_time: '16:00:00', end_time: '16:30:00', type: 'fingertime' as const, recommend_types: '{"Query2CodeRecommend": 2, "AIPlayRecommend": 3}' },
        { team_name: 'TEAM061', email: 'dev1@team061.com', start_time: '16:30:00', end_time: '16:45:00', type: 'braintime' as const, recommend_types: '{}' },
        { team_name: 'TEAM061', email: 'dev2@team061.com', start_time: '16:10:00', end_time: '17:00:00', type: 'fingertime' as const, recommend_types: '{"AIPlayRecommend": 5, "RevisionMaker": 7}' },
      ],
      metrics: { taskTotal: 96, qualityTotal: 32 }
    },
    {
      name: 'Project 02',
      data: [
        { team_name: 'TEAM116', email: 'dev1@team116.com', start_time: '16:05:00', end_time: '16:35:00', type: 'fingertime' as const, recommend_types: '{"QueryMakerRecommend": 3, "AIPlayRecommend": 3}' },
        { team_name: 'TEAM116', email: 'dev2@team116.com', start_time: '16:15:00', end_time: '17:30:00', type: 'fingertime' as const, recommend_types: '{"RevisionMaker": 8, "Query2CodeRecommend": 4}' },
      ],
      metrics: { taskTotal: 77, qualityTotal: 12 }
    },
    {
      name: 'Project 03',
      data: [
        { team_name: 'TEAM073', email: 'dev1@team073.com', start_time: '16:08:00', end_time: '16:40:00', type: 'fingertime' as const, recommend_types: '{"AIPlayRecommend": 2, "RevisionMakerRecommend": 2}' },
        { team_name: 'TEAM073', email: 'dev2@team073.com', start_time: '16:20:00', end_time: '17:45:00', type: 'fingertime' as const, recommend_types: '{"RevisionMaker": 6, "QueryMakerRecommend": 4}' },
      ],
      metrics: { taskTotal: 60, qualityTotal: 8 }
    }
  ]);

  useEffect(() => {
    const parseTime = d3.timeParse('%H:%M:%S');
    setCurrentTime(parseTime('16:00:00')!);
    console.log('SimpleAIDDTool initialized');
  }, []);

  const calculateStats = (teamData: Row[], currentTime: Date) => {
    const parseTime = d3.timeParse('%H:%M:%S');
    const startTime = parseTime('16:00:00')!;
    const endTime = parseTime('18:00:00')!;

    const relevantData = teamData.filter(item => {
      const start = parseTime(item.start_time);
      return start && start <= currentTime;
    });

    const fbBreakdown = {
      fingertime: relevantData.filter(d => d.type === 'fingertime').length,
      braintime: relevantData.filter(d => d.type === 'braintime').length,
    };

    const aiddMap: { [key: string]: number } = {};
    relevantData.forEach(item => {
      try {
        const parsed = JSON.parse(item.recommend_types || '{}');
        Object.entries(parsed).forEach(([type, count]) => {
          aiddMap[type] = (aiddMap[type] || 0) + Number(count);
        });
      } catch {}
    });

    const aiBreakdown = Object.entries(aiddMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    const progress = Math.max(0, Math.min(1, 
      (currentTime.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime())
    ));

    return { fbBreakdown, aiBreakdown, progress };
  };

  const startAnimation = () => {
    console.log('Starting animation...');
    setIsPlaying(true);
    
    const parseTime = d3.timeParse('%H:%M:%S');
    const startTime = parseTime('16:00:00')!;
    const endTime = parseTime('18:00:00')!;
    const duration = endTime.getTime() - startTime.getTime();
    const animationDuration = 8000; // 8초

    const startTimestamp = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimestamp;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      const newTime = new Date(startTime.getTime() + duration * progress);
      setCurrentTime(newTime);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        console.log('Animation completed');
      }
    };

    animate();
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    const parseTime = d3.timeParse('%H:%M:%S');
    setCurrentTime(parseTime('16:00:00')!);
  };

  const TeamVisualization = ({ team, index }: { team: any; index: number }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      if (!currentTime || !svgRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const margin = { top: 10, right: 10, bottom: 10, left: 100 };
      const width = 450 - margin.left - margin.right;
      const height = 60 - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const parseTime = d3.timeParse('%H:%M:%S');
      const startTime = parseTime('16:00:00')!;
      const endTime = parseTime('18:00:00')!;

      const xScale = d3.scaleTime().domain([startTime, endTime]).range([0, width]);
      const emails = Array.from(new Set(team.data.map((d: Row) => d.email)));
      const yScale = d3.scaleBand().domain(emails).range([0, height]).padding(0.2);

      // 현재 시간까지의 데이터만 필터링
      team.data.forEach((item: Row) => {
        const start = parseTime(item.start_time);
        const end = parseTime(item.end_time);
        if (!start || !end) return;

        const actualEnd = end <= currentTime ? end : currentTime;
        const startX = xScale(start);
        const endX = xScale(actualEnd);
        const barWidth = Math.max(0, endX - startX);

        if (barWidth > 1) {
          g.append('rect')
            .attr('x', startX)
            .attr('y', yScale(item.email)!)
            .attr('width', barWidth)
            .attr('height', yScale.bandwidth())
            .attr('fill', item.type === 'fingertime' ? '#0bd1b9' : '#f78aff')
            .attr('opacity', 0.8)
            .attr('rx', 2);

          // 버블 추가
          if (item.type === 'fingertime' && barWidth > 15) {
            try {
              const aiddMap = JSON.parse(item.recommend_types || '{}');
              const entries = Object.entries(aiddMap);
              entries.forEach(([type, count], bubbleIndex) => {
                const bubbleX = startX + (barWidth * (bubbleIndex + 1)) / (entries.length + 1);
                const bubbleY = yScale(item.email)! + yScale.bandwidth() / 2;
                const radius = 2 + Math.sqrt(Number(count)) * 1.5;

                g.append('circle')
                  .attr('cx', bubbleX)
                  .attr('cy', bubbleY)
                  .attr('r', radius)
                  .attr('fill', d3.schemeSet2[bubbleIndex % d3.schemeSet2.length])
                  .attr('stroke', '#fff')
                  .attr('stroke-width', 0.5);

                if (radius > 3) {
                  g.append('text')
                    .attr('x', bubbleX)
                    .attr('y', bubbleY + 1)
                    .text(count)
                    .style('fill', 'white')
                    .style('font-size', '8px')
                    .style('text-anchor', 'middle')
                    .style('font-weight', 'bold');
                }
              });
            } catch {}
          }
        }
      });

      // 라벨 추가
      emails.forEach(email => {
        g.append('text')
          .attr('x', -5)
          .attr('y', yScale(email)! + yScale.bandwidth() / 2 + 3)
          .text(email.split('@')[0])
          .style('fill', '#ccc')
          .style('font-size', '10px')
          .style('text-anchor', 'end');
      });

    }, [currentTime, team]);

    return <svg ref={svgRef} width={450} height={60} className="border border-gray-600 rounded bg-gray-800/30" />;
  };

  if (!currentTime) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-r from-[#1c1b47] via-[#232664] to-[#2f1b47] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          AIDD Monitoring Tool
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
            Current Time: {d3.timeFormat('%H:%M:%S')(currentTime)}
          </div>
        </div>

        <div className="space-y-6">
          {teams.map((team, index) => {
            const stats = calculateStats(team.data, currentTime);
            
            return (
              <div key={team.name} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h2 className="text-lg font-bold text-white mb-3">{team.name}</h2>
                
                <div className="flex gap-6 items-center">
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-300 mb-2">Work Breakdown</h3>
                    <TeamVisualization team={team} index={index} />
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">F/B Breakdown</h3>
                    <div className="bg-teal-600 rounded p-2 text-center text-white text-sm">
                      <div>F/B</div>
                      <div className="font-bold">{stats.fbBreakdown.fingertime} / {stats.fbBreakdown.braintime}</div>
                    </div>
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">AI Breakdown</h3>
                    <div className="bg-blue-600 rounded p-2 text-center text-white text-xs">
                      <div className="mb-1">상위 3개</div>
                      {stats.aiBreakdown.slice(0, 3).map(([type, count], idx) => (
                        <div key={type}>{idx + 1}. {type.slice(0, 6)}: {count}</div>
                      ))}
                      {stats.aiBreakdown.length === 0 && <div>No data</div>}
                    </div>
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">Task Completion</h3>
                    <div className="bg-teal-700 rounded p-2 text-center text-white">
                      <div className="text-lg font-bold">
                        {Math.floor(team.metrics.taskTotal * stats.progress)}/{team.metrics.taskTotal}건
                      </div>
                      <div className="text-xs">{Math.round(stats.progress * 100)}%</div>
                    </div>
                  </div>

                  <div className="w-28">
                    <h3 className="text-xs text-gray-300 mb-1">Expected Quality</h3>
                    <div className="bg-blue-700 rounded p-2 text-center text-white">
                      <div className="text-lg font-bold">
                        {Math.floor(team.metrics.qualityTotal * stats.progress)}점
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