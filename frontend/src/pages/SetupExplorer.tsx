import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useState, useEffect } from 'react';
import { ChevronLeft, X, Filter, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExplorationDataPoint {
  mouthpiece_manufacturer: string;
  mouthpiece_model: string;
  tip_label?: string;
  tip_opening_inch: number;
  baffle_type: string;
  chamber_size: string;
  facing_length: string;
  reed_manufacturer: string;
  reed_model: string;
  reed_strength: string;
  
  avg_suitability: number;
  avg_resistance: number;
  avg_brightness: number;
  avg_min_dynamic: number;
  avg_max_dynamic: number;
  avg_strength_rating: number;
  
  submission_count: number;
}

const AXIS_OPTIONS = [
  { label: 'Tip Opening (inches)', value: 'tip_opening_inch', type: 'number' },
  { label: 'Baffle Type', value: 'baffle_type', type: 'category' },
  { label: 'Chamber Size', value: 'chamber_size', type: 'category' },
  { label: 'Facing Length', value: 'facing_length', type: 'category' },
  { label: 'Suitability Rating', value: 'avg_suitability', type: 'number' },
  { label: 'Resistance Feel', value: 'avg_resistance', type: 'number' },
  { label: 'Brightness Feel', value: 'avg_brightness', type: 'number' },
  { label: 'Min Dynamic', value: 'avg_min_dynamic', type: 'number' },
  { label: 'Max Dynamic', value: 'avg_max_dynamic', type: 'number' },
  { label: 'Strength Rating', value: 'avg_strength_rating', type: 'number' },
];

const INSTRUMENTS = [
  "Sopranino", "Soprano", "Alto", "Tenor", "Baritone", "Bass", "Contrabass"
];

export default function SetupExplorer() {
  const [data, setData] = useState<ExplorationDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('Alto');
  const [xAxisKey, setXAxisKey] = useState<string>('tip_opening_inch');
  const [yAxisKey, setYAxisKey] = useState<string>('avg_suitability');
  const [selectedPoint, setSelectedPoint] = useState<ExplorationDataPoint | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
        // Assuming api base url is configurable or proxied. Using a relative path for now as per vite config usually.
      try {
        const response = await fetch(`http://localhost:8000/api/v1/stats/exploration?instrument=${selectedInstrument}`);
        if (response.ok) {
           const result = await response.json();
           setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    if (selectedInstrument) {
        fetchData();
    }
  }, [selectedInstrument]);

  const xConfig = AXIS_OPTIONS.find(opt => opt.value === xAxisKey);
  const yConfig = AXIS_OPTIONS.find(opt => opt.value === yAxisKey);
  
  // Custom Tooltip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 text-white p-3 rounded shadow-lg text-sm max-w-xs z-50">
           <p className="font-bold border-b border-slate-600 pb-1 mb-1">{data.mouthpiece_manufacturer} {data.mouthpiece_model}</p>
           <p>Tip: {data.tip_label} ({data.tip_opening_inch}")</p>
           <p>Reed: {data.reed_manufacturer} {data.reed_model} {data.reed_strength}</p>
           <div className="mt-2 pt-2 border-t border-slate-600 grid grid-cols-2 gap-x-4">
              <span>{xConfig?.label}:</span>
              <span className="font-mono">{payload[0].value}</span>
              <span>{yConfig?.label}:</span>
              <span className="font-mono">{payload[1].value}</span>
           </div>
           <p className="text-xs text-slate-400 mt-2 italic">{data.submission_count} submissions averaged</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       {/* Header */}
       <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                   <ChevronLeft size={24} />
                </Link>
                <div className="flex items-center gap-2">
                   <BarChart2 className="text-indigo-600" />
                   <h1 className="font-bold text-xl text-slate-900">Setup Explorer</h1>
                </div>
             </div>
          </div>
       </header>

       {/* Controls */}
       <div className="bg-white border-b border-slate-200 p-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-end md:items-center">
             
             {/* Instrument Selector */}
             <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-xs font-semibold text-slate-500 uppercase">Instrument</label>
                <select 
                   className="form-select block w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                   value={selectedInstrument}
                   onChange={e => setSelectedInstrument(e.target.value)}
                >
                   {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
             </div>

             <div className="h-8 w-px bg-slate-200 hidden md:block mx-2"></div>

             {/* X-Axis Selector */}
             <div className="flex flex-col gap-1 w-full md:w-auto flex-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">X-Axis (Variable)</label>
                <select 
                   className="form-select block w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                   value={xAxisKey}
                   onChange={e => setXAxisKey(e.target.value)}
                >
                   {AXIS_OPTIONS.filter(o => !o.value.startsWith('avg_')).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                   ))}
                   {/* Also allow outcome variables on X? Sure why not */}
                   <optgroup label="Outcomes">
                      {AXIS_OPTIONS.filter(o => o.value.startsWith('avg_')).map(opt => (
                         <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                   </optgroup>
                </select>
             </div>

             {/* Y-Axis Selector */}
             <div className="flex flex-col gap-1 w-full md:w-auto flex-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Y-Axis (Outcome)</label>
                <select 
                   className="form-select block w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                   value={yAxisKey}
                   onChange={e => setYAxisKey(e.target.value)}
                >
                   {AXIS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                   ))}
                </select>
             </div>
          </div>
       </div>

       {/* Chart Area */}
       <main className="flex-1 p-4 md:p-8 overflow-hidden relative">
          <div className="max-w-7xl mx-auto h-full min-h-[500px] bg-white rounded-xl shadow border border-slate-200 p-4 relative">
             {loading && (
                <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
             )}
             
             {data.length === 0 && !loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                   <Filter size={48} className="mb-4 opacity-50" />
                   <p>No data available for this selection.</p>
                </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                   <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                         type={xConfig?.type === 'category' ? 'category' : 'number'} 
                         dataKey={xAxisKey} 
                         name={xConfig?.label} 
                         unit={xAxisKey === 'tip_opening_inch' ? '"' : ''}
                         allowDuplicatedCategory={false}
                      />
                      <YAxis 
                         type="number" 
                         dataKey={yAxisKey} 
                         name={yConfig?.label} 
                         domain={['auto', 'auto']}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Setups" data={data} fill="#4f46e5" onClick={(data) => {
                         // Recharts onClick passes the clicked point data as the first argument, 
                         // but structure depends on version. Usually `data.payload` is the original item.
                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
                         const p = data as any;
                         if (p && p.payload) setSelectedPoint(p.payload);
                      }}>
                         {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill="#4f46e5" fillOpacity={0.6} />
                         ))}
                      </Scatter>
                   </ScatterChart>
                </ResponsiveContainer>
             )}
          </div>
       </main>

       {/* Drawer / Modal for Details */}
       {selectedPoint && (
          <div className="fixed inset-0 z-50 flex justify-end">
             {/* Backdrop */}
             <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedPoint(null)}></div>
             
             {/* Drawer */}
             <div className="relative bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                <button 
                   onClick={() => setSelectedPoint(null)}
                   className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500"
                >
                   <X size={20} />
                </button>

                <div className="mb-6">
                   <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded uppercase tracking-wider mb-2">
                      Selected Setup
                   </span>
                   <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                      {selectedPoint.mouthpiece_manufacturer} {selectedPoint.mouthpiece_model}
                   </h2>
                   <p className="text-lg text-slate-600 mt-1">
                      Tip: {selectedPoint.tip_label} ({selectedPoint.tip_opening_inch}")
                   </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6">
                   <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                      Reed Pairing
                   </h3>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                         <span className="block text-slate-500 text-xs">Manufacturer</span>
                         <span className="font-medium">{selectedPoint.reed_manufacturer}</span>
                      </div>
                      <div>
                         <span className="block text-slate-500 text-xs">Model</span>
                         <span className="font-medium">{selectedPoint.reed_model}</span>
                      </div>
                      <div>
                         <span className="block text-slate-500 text-xs">Strength</span>
                         <span className="font-medium">{selectedPoint.reed_strength}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Technical Specs</h3>
                   <div className="grid grid-cols-2 gap-y-4 text-sm">
                      <div>
                         <span className="block text-slate-500 text-xs">Baffle</span>
                         <span className="font-medium">{selectedPoint.baffle_type}</span>
                      </div>
                      <div>
                         <span className="block text-slate-500 text-xs">Chamber</span>
                         <span className="font-medium">{selectedPoint.chamber_size}</span>
                      </div>
                      <div>
                         <span className="block text-slate-500 text-xs">Facing</span>
                         <span className="font-medium">{selectedPoint.facing_length}</span>
                      </div>
                      <div>
                         <span className="block text-slate-500 text-xs">Submissions</span>
                         <span className="font-medium">{selectedPoint.submission_count}</span>
                      </div>
                   </div>

                   <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 pt-4">User Ratings (Avg)</h3>
                   <div className="space-y-3">
                      {[
                         { label: 'Suitability', val: selectedPoint.avg_suitability, max: 5 },
                         { label: 'Resistance', val: selectedPoint.avg_resistance, max: 5 }, // Scale -5 to 5 actually?
                         { label: 'Brightness', val: selectedPoint.avg_brightness, max: 5 }, // Scale -5 to 5
                         { label: 'Strength Feel', val: selectedPoint.avg_strength_rating, max: 5 },
                      ].map(stat => (
                         <div key={stat.label}>
                            <div className="flex justify-between text-xs mb-1">
                               <span>{stat.label}</span>
                               <span className="font-mono font-bold">{stat.val && stat.val.toFixed(1)}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                  className="h-full bg-indigo-500" 
                                  style={{ width: `${Math.min(100, Math.max(0, (stat.val / stat.max) * 100))}%` }}
                               ></div>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
       )}
    </div>
  );
}

