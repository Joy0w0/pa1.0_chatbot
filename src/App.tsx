import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AIDDMonitoringTool from './components/AIDDMonitoringTool';
import DeveloperTimeline from './components/DeveloperTimeline';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AIDDMonitoringTool />} />
        <Route path="/developer-timeline" element={<DeveloperTimeline />} />
      </Routes>
    </Router>
  );
}
