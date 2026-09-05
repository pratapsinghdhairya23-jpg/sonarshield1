import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { MissionProvider } from "./hooks/MissionContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import SonarAnalysis from "./pages/SonarAnalysis";
import Detection from "./pages/Detection";
import AnomalyIntelligence from "./pages/AnomalyIntelligence";
import SurveyMap from "./pages/SurveyMap";
import MissionHistory from "./pages/MissionHistory";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <MissionProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sonar-analysis" element={<SonarAnalysis />} />
            <Route path="/detection" element={<Detection />} />
            <Route path="/anomaly-intelligence" element={<AnomalyIntelligence />} />
            <Route path="/survey-map" element={<SurveyMap />} />
            <Route path="/mission-history" element={<MissionHistory />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </MissionProvider>
  );
}
