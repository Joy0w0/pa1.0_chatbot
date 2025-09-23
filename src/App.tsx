import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AIDDMonitoringTool from './components/AIDDMonitoringTool';
import DeveloperTimeline from './components/DeveloperTimeline';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AIDDMonitoringTool />} />
        <Route path="/developtimeline" element={<DeveloperTimeline />} />
      </Routes>
    </Router>
  );
}
