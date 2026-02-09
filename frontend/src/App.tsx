import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SurveyWizard from './pages/SurveyWizard';
import ResultsDashboard from './pages/ResultsDashboard';
import ReedFinder from './pages/ReedFinder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/wizard' element={<SurveyWizard />} />
        <Route path='/recommend' element={<ReedFinder />} />
        <Route path='/results' element={<ResultsDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
