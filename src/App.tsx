import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AIDDMonitoringTool from './components/AIDDMonitoringTool';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AIDDMonitoringTool />} />
      </Routes>
    </Router>
  );
}
