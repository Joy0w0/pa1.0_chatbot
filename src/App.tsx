import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AIDDMonitoringTool from './components/AIDDMonitoringTool';
import AutoPromptingScenario from './components/AutoPromptingScenario';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AIDDMonitoringTool />} />
        <Route path="/scenario" element={<AutoPromptingScenario />} />
      </Routes>
    </Router>
  );
}
