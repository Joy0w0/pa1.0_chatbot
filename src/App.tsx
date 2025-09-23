import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import AIDDMonitoringTool from './components/AIDDMonitoringTool';
import DeveloperTimeline from './components/DeveloperTimeline';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/aidd-monitoring" replace />} />
        <Route path="/aidd-monitoring" element={<AIDDMonitoringTool />} />
        <Route path="/developer-timeline" element={<DeveloperTimeline />} />
      </Routes>
    </Router>
  );
}
