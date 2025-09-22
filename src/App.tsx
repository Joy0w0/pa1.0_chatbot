import { useState, useEffect, useRef } from 'react';

const TimelineVisualization = ({ projectIndex, currentTime }: { projectIndex: number; currentTime: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    svg.innerHTML = ''; // Clear previous content

    const width = 450;
    const height = 60;
    const margin = { top: 10, right: 10, bottom: 10, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Convert current time to minutes from 16:00
    const [hours, minutes, seconds] = currentTime.split(':').map(Number);
    const currentMinutes = (hours - 16) * 60 + minutes + seconds / 60;
    const totalMinutes = 120; // 16:00 to 18:00

    // Sample data for each project
    const projectData = [
      // Project 01
      [
        { start: 0, end: 30, type: 'fingertime', user: 'dev1', bubbles: [{ type: 'Query', count: 3 }, { type: 'AI', count: 2 }] },
        { start: 30, end: 45, type: 'braintime', user: 'dev1', bubbles: [] },
        { start: 10, end: 60, type: 'fingertime', user: 'dev2', bubbles: [{ type: 'Revision', count: 5 }, { type: 'AI', count: 3 }] },
      ],
      // Project 02  
      [
        { start: 5, end: 35, type: 'fingertime', user: 'dev1', bubbles: [{ type: 'Query', count: 4 }] },
        { start: 15, end: 90, type: 'fingertime', user: 'dev2', bubbles: [{ type: 'Revision', count: 6 }, { type: 'Code', count: 3 }] },
      ],
      // Project 03
      [
        { start: 8, end: 40, type: 'fingertime', user: 'dev1', bubbles: [{ type: 'AI', count: 2 }] },
        { start: 20, end: 105, type: 'fingertime', user: 'dev2', bubbles: [{ type: 'Revision', count: 4 }, { type: 'Query', count: 2 }] },
      ]
    ];

    const data = projectData[projectIndex];
    const users = Array.from(new Set(data.map(d => d.user)));
    const userHeight = chartHeight / users.length;

    const svgEl = svg;
    svgEl.setAttribute('width', width.toString());
    svgEl.setAttribute('height', height.toString());

    // Create SVG groups
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svgEl.appendChild(g);

    // Draw timeline bars
    data.forEach((item, index) => {
      const userIndex = users.indexOf(item.user);
      const y = userIndex * userHeight + 5;
      const barHeight = userHeight - 10;

      // Calculate bar width based on current time
      const endTime = Math.min(item.end, currentMinutes);
      if (endTime > item.start) {
        const x = (item.start / totalMinutes) * chartWidth;
        const barWidth = ((endTime - item.start) / totalMinutes) * chartWidth;

        // Create bar
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x.toString());
        rect.setAttribute('y', y.toString());
        rect.setAttribute('width', barWidth.toString());
        rect.setAttribute('height', barHeight.toString());
        rect.setAttribute('fill', item.type === 'fingertime' ? '#0bd1b9' : '#f78aff');
        rect.setAttribute('opacity', '0.8');
        rect.setAttribute('rx', '2');
        g.appendChild(rect);

        // Add bubbles if fingertime and bar is wide enough
        if (item.type === 'fingertime' && barWidth > 20) {
          item.bubbles.forEach((bubble, bubbleIndex) => {
            const bubbleX = x + (barWidth * (bubbleIndex + 1)) / (item.bubbles.length + 1);
            const bubbleY = y + barHeight / 2;
            const radius = 2 + Math.sqrt(bubble.count) * 1.5;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', bubbleX.toString());
            circle.setAttribute('cy', bubbleY.toString());
            circle.setAttribute('r', radius.toString());
            circle.setAttribute('fill', ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][bubbleIndex % 4]);
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '0.5');
            g.appendChild(circle);

            if (radius > 3) {
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', bubbleX.toString());
              text.setAttribute('y', (bubbleY + 2).toString());
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('font-size', '8px');
              text.setAttribute('font-weight', 'bold');
              text.setAttribute('fill', 'white');
              text.textContent = bubble.count.toString();
              g.appendChild(text);
            }
          });
        }
      }
    });

    // Draw user labels
    users.forEach((user, index) => {
      const y = index * userHeight + userHeight / 2;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '-5');
      text.setAttribute('y', (y + 3).toString());
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '10px');
      text.setAttribute('fill', '#ccc');
      text.textContent = user;
      g.appendChild(text);
    });

    // Draw time axis
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * chartWidth;
      const hour = 16 + (i * 0.5);
      const timeLabel = `${Math.floor(hour)}:${(hour % 1) * 60 === 0 ? '00' : '30'}`;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x.toString());
      line.setAttribute('y1', '-5');
      line.setAttribute('x2', x.toString());
      line.setAttribute('y2', '0');
      line.setAttribute('stroke', '#666');
      g.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x.toString());
      text.setAttribute('y', '-8');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '9px');
      text.setAttribute('fill', '#ccc');
      text.textContent = timeLabel;
      g.appendChild(text);
    }

  }, [projectIndex, currentTime]);

  return (
    <div className="w-full h-16 border border-gray-600 rounded bg-gray-800/30 overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
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