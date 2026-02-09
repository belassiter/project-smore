import { Link, useLocation } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

// Mock Data for Results (In real app, fetch from API based on query/state)
const MOCK_RECOMMENDATIONS = [
  {
    id: 1,
    mouthpiece: { name: "Meyer 5M", brand: "Meyer", price: 149.99 },
    reed: { name: "Vandoren Java Green", strength: "2.5", brand: "Vandoren" },
    matchScore: 98,
    reason: "The industry standard for jazz alto. Provides the brightness you need for big band work.",
    chartData: [
      { subject: 'Bright', A: 120, fullMark: 150 },
      { subject: 'Edgy', A: 98, fullMark: 150 },
      { subject: 'Focused', A: 86, fullMark: 150 },
      { subject: 'Dark', A: 40, fullMark: 150 },
      { subject: 'Easy', A: 130, fullMark: 150 },
      { subject: 'Complex', A: 65, fullMark: 150 },
    ]
  },
  {
    id: 2,
    mouthpiece: { name: "D'Addario Select Jazz", brand: "D'Addario", price: 165.00 },
    reed: { name: "D'Addario Jazz Select", strength: "2M", brand: "D'Addario" },
    matchScore: 92,
    reason: "A modern classic. extremely consistent and projection-heavy.",
    chartData: [
      { subject: 'Bright', A: 110, fullMark: 150 },
      { subject: 'Edgy', A: 90, fullMark: 150 },
      { subject: 'Focused', A: 110, fullMark: 150 },
      { subject: 'Dark', A: 50, fullMark: 150 },
      { subject: 'Easy', A: 110, fullMark: 150 },
      { subject: 'Complex', A: 80, fullMark: 150 },
    ]
  },
  {
    id: 3,
    mouthpiece: { name: "Vandoren V16", brand: "Vandoren", price: 139.99 },
    reed: { name: "Vandoren V16", strength: "2.5", brand: "Vandoren" },
    matchScore: 88,
    reason: "Inspired by the vintage 50s sound. Great punch.",
    chartData: [
      { subject: 'Bright', A: 130, fullMark: 150 },
      { subject: 'Edgy', A: 110, fullMark: 150 },
      { subject: 'Focused', A: 90, fullMark: 150 },
      { subject: 'Dark', A: 30, fullMark: 150 },
      { subject: 'Easy', A: 100, fullMark: 150 },
      { subject: 'Complex', A: 70, fullMark: 150 },
    ]
  }
];

export default function ResultsDashboard() {
  const location = useLocation();
  const submission = location.state?.submission || { experience: 'Unknown', genre: 'Unknown' };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Your Recommended Setup</h1>
            <p className="text-slate-500">Based on your {submission.experience} skill level and {submission.genre} goals.</p>
          </div>
          <Link to="/wizard" className="text-indigo-600 font-semibold hover:underline">
            Retake Survey
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {MOCK_RECOMMENDATIONS.map((rec) => (
            <div key={rec.id} className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white relative">
                <div className="absolute top-4 right-4 bg-green-500 text-xs font-bold px-2 py-1 rounded-full text-white">
                  {rec.matchScore}% Match
                </div>
                <h3 className="text-xl font-bold">{rec.mouthpiece.name}</h3>
                <p className="text-slate-400 text-sm">with {rec.reed.name} {rec.reed.strength}</p>
              </div>

              {/* Chart */}
              <div className="h-48 bg-slate-50 border-b border-slate-100">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={rec.chartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                      <Radar
                        name={rec.mouthpiece.name}
                        dataKey="A"
                        stroke="#4f46e5"
                        fill="#4f46e5"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                 </ResponsiveContainer>
              </div>

              {/* Details */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                    "{rec.reason}"
                  </p>
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-800 mb-2">
                    <span>Mouthpiece Price</span>
                    <span>${rec.mouthpiece.price}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
                    <span>Reed Type</span>
                    <span>{rec.reed.brand}</span>
                  </div>
                </div>
                
                <button className="w-full mt-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
