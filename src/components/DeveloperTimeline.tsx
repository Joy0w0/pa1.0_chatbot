'use client';

import * as d3 from 'd3';
import Papa from 'papaparse';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function DeveloperTimeline() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [data, setData] = useState<Row[]>([]);

  useEffect(() => {
    Papa.parse('/assets/data.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        const rows = (result.data as any[])
          .filter((d) => d.start_time && d.end_time && d.email)
          .map((d) => ({
            ...d,
            recommend_types: d.recommend_types?.replace(/'/g, '"') || '{}',
          }));
        setData(rows as Row[]);
      },
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    const margin = { top: 100, right: 240, bottom: 30, left: 200 };
    const width = 1400 - margin.left - margin.right;
    const barHeight = 10;
    const rowGap = 32;
    const height = data.length * (barHeight + rowGap);

    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const parseTime = d3.timeParse('%H:%M:%S');

    const grouped = d3.groups(data, (d) => d.email);
    const allTimes = data
      .flatMap((d) => [parseTime(d.start_time), parseTime(d.end_time)])
      .filter(Boolean) as Date[];

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(allTimes) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(grouped.map(([email]) => email))
      .range([0, grouped.length * (barHeight + rowGap)])
      .padding(0.3);

    const typeColor = {
      fingertime: 'url(#fingerGradient)',
      braintime: 'url(#brainGradient)',
      close_time: 'rgba(0, 0, 0, 0)',
    };

    const aiddColors = d3.schemeSet2.concat(d3.schemeSet3).slice(0, 10);
    const allAIDDTypes = Array.from(
      new Set(
        data.flatMap((d) => {
          try {
            return Object.keys(JSON.parse(d.recommend_types || '{}'));
          } catch {
            return [];
          }
        }),
      ),
    );
    const aiddColorScale = d3
      .scaleOrdinal<string, string>()
      .domain(allAIDDTypes)
      .range(aiddColors);

    const defs = svg.append('defs');

    defs
      .append('linearGradient')
      .attr('id', 'fingerGradient')
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
      .attr('id', 'brainGradient')
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

    defs
      .append('filter')
      .attr('id', 'brainGlow')
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

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top - 20})`)
      .call(
        d3
          .axisTop(xScale)
          .ticks(d3.timeMinute.every(30))
          .tickFormat((d: any) => d3.timeFormat('%-H:%M')(d)),
      )
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#e0e0e0');

    const barLayer = g.append('g');
    const bubbleLayer = g.append('g');

    grouped.forEach(([email, items]) => {
      items.forEach((item) => {
        const start = parseTime(item.start_time);
        const end = parseTime(item.end_time);
        if (!start || !end || item.type === 'close_time') return;

        const startX = xScale(start);
        const endX = xScale(end);
        const barWidth = endX - startX;
        const barY = yScale(email)! + (yScale.bandwidth() - barHeight) / 2;
        const centerY = barY + barHeight / 2;

        const rect = barLayer
          .append('rect')
          .attr('x', startX)
          .attr('y', barY)
          .attr('width', barWidth)
          .attr('height', barHeight)
          .attr('fill', typeColor[item.type])
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
          rect.attr('filter', 'url(#brainGlow)');
        }

        if (item.type === 'fingertime') {
          let aiddMap: Record<string, number> = {};
          try {
            const parsed = JSON.parse(item.recommend_types || '{}');
            if (typeof parsed === 'object' && parsed !== null) {
              aiddMap = parsed;
            }
          } catch {
            aiddMap = {};
          }

          const entries = Object.entries(aiddMap);
          if (entries.length > 0) {
            const radii = entries.map(
              ([_, count]) => 6 + Math.sqrt(Number(count)) * 3,
            );
            const totalBubbleWidth = radii.reduce(
              (sum, r) => sum + r * 2 + 6,
              -6,
            );
            const scale =
              totalBubbleWidth > barWidth
                ? Math.max(1, barWidth / totalBubbleWidth)
                : 1;
            let currentX = startX + (barWidth - totalBubbleWidth * scale) / 2;

            entries.forEach(([type, count]) => {
              const rawR = 6 + Math.sqrt(Number(count)) * 3;
              const r = Math.max(6, rawR * scale);
              const cx = currentX + r;
              const cy = centerY;

              bubbleLayer
                .append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', r)
                .attr('fill', aiddColorScale(type))
                .attr('stroke', '#fff')
                .attr('stroke-width', 0.8)
                .attr('opacity', 0.85);

              bubbleLayer
                .append('text')
                .attr('x', cx)
                .attr('y', cy + 4)
                .text(count)
                .style('fill', 'white')
                .style('font-size', `${Math.min(12 * scale, 12)}px`)
                .style('font-weight', 'bold')
                .style('text-anchor', 'middle');

              currentX += r * 2 + 6 * scale;
            });
          }
        }
      });
    });

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#f0f0f0');

    const legend = svg
      .append('g')
      .attr(
        'transform',
        `translate(${margin.left + width + 40}, ${margin.top})`,
      );

    const legendItems = [
      { label: 'Fingertime', color: '#0bd1b9', shape: 'rect' },
      { label: 'Braintime', color: '#f78aff', shape: 'rect' },
      ...allAIDDTypes.map((key) => ({
        label: key,
        color: aiddColorScale(key),
        shape: 'circle',
      })),
    ];

    legendItems.forEach((item, i) => {
      const x = 0;
      const y = i * 24;

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
        .style('font-size', '12px');
    });
  }, [data]);

  return (
    <div className="w-full overflow-auto bg-gradient-to-r from-[#1c1b47] via-[rgb(35,38,100)] to-[#2f1b47] p-8 min-h-screen">
      <div className="relative mb-8">
        <h1 className="text-2xl font-bold text-center text-white">
          AIDD Monitoring Tool - All Data
        </h1>
        {/* Navigation Button to AIDD Monitoring Tool */}
        <button
          onClick={() => navigate('/aidd-monitoring')}
          className="absolute top-0 left-0 flex items-center gap-2 px-4 py-2 text-white transition-all bg-green-600 rounded-lg hover:bg-green-700"
          title="Switch to AIDD Monitoring Tool">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 17l-5-5m0 0l5-5m-5 5h12"
            />
          </svg>
          <span className="text-sm font-medium">Monitoring Tool</span>
        </button>
      </div>
      <div className="flex items-center justify-center">
        <div className="inline-block">
          <svg ref={svgRef}></svg>
        </div>
      </div>
    </div>
  );
}
