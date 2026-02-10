import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%">
      <div className="bg-white/95 backdrop-blur-sm p-12 rounded-2xl shadow-2xl max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
          Find Your Perfect Sound
        </h1>
        <p className="text-xl text-slate-600">
          Stop guessing. Start playing. Our AI-driven engine matches your saxophone setup 
          to your unique playing style and goals.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link 
            to="/wizard" 
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all bg-indigo-600 rounded-lg hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Contribute Your Data
          </Link>
          <Link 
            to="/recommend" 
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all bg-indigo-600 rounded-lg hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Setup Recommender
          </Link>
        </div>
      </div>
    </div>
  );
}
