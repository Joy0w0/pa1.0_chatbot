import { useState, useEffect } from 'react';

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
          {['Project 01', 'Project 02', 'Project 03'].map((projectName, index) => (
            <div key={projectName} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-bold text-white mb-3">{projectName}</h2>
              
              <div className="flex gap-6 items-center">
                <div className="flex-1">
                  <h3 className="text-sm text-gray-300 mb-2">Work Breakdown</h3>
                  <div className="w-full h-16 border border-gray-600 rounded bg-gray-800/30 flex items-center justify-center">
                    <div className="text-gray-400">Timeline visualization here</div>
                  </div>
                </div>

                <div className="w-28">
                  <h3 className="text-xs text-gray-300 mb-1">F/B Breakdown</h3>
                  <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded p-2 text-center text-white text-sm">
                    <div className="text-xs">Finger/Brain</div>
                    <div className="text-lg font-bold">{index + 2} / {index + 1}</div>
                  </div>
                </div>

                <div className="w-28">
                  <h3 className="text-xs text-gray-300 mb-1">AI Breakdown</h3>
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded p-2 text-center text-white text-xs">
                    <div className="text-xs mb-1">상위 3개</div>
                    <div>1. Query: {index + 3}</div>
                    <div>2. AIPlay: {index + 2}</div>
                    <div>3. Revision: {index + 1}</div>
                  </div>
                </div>

                <div className="w-28">
                  <h3 className="text-xs text-gray-300 mb-1">Task Completion</h3>
                  <div className="bg-gradient-to-br from-teal-700 to-teal-800 rounded p-2 text-center text-white">
                    <div className="text-xl font-bold">
                      {[96, 77, 45][index]}/{[96, 77, 60][index]}건
                    </div>
                    <div className="text-xs">{Math.round([96/96, 77/77, 45/60][index] * 100)}%</div>
                  </div>
                </div>

                <div className="w-28">
                  <h3 className="text-xs text-gray-300 mb-1">Expected Quality</h3>
                  <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded p-2 text-center text-white">
                    <div className="text-xl font-bold">
                      {[32, 12, 8][index]}점
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}