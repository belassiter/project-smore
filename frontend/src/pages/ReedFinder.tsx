import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { InstrumentType } from '../types';
import type { Mouthpiece, Reed, PlayerSubmissionResponse } from '../types';

const API_BASE = 'http://localhost:8000/api/v1';

const METRICS = {
    suitability_rating: { label: "Overall Match", min: 1, max: 5, axisLabels: ["Terrible", "Poor", "Adequate", "Good", "Great"] },
    strength_rating: { label: "Strength Match", min: -5, max: 5, axisLabels: ["Too Soft", "Perfect", "Too Hard"] },
    resistance_feel: { label: "Resistance", min: -5, max: 5, axisLabels: ["Free-blowing", "Medium", "Resistant"] },
    brightness_feel: { label: "Tone Color", min: -5, max: 5, axisLabels: ["Dark", "Neutral", "Bright"] },
    min_dynamic: { label: "Dynamic Range: Min", min: 1, max: 8, axisLabels: ["ppp", "mp", "fff"] },
    max_dynamic: { label: "Dynamic Range: Max", min: 1, max: 8, axisLabels: ["ppp", "mp", "fff"] },
} as const;
type MetricKey = keyof typeof METRICS;

export default function ReedFinder() {
    const [isLoading, setIsLoading] = useState(true);
    const [mouthpieces, setMouthpieces] = useState<Mouthpiece[]>([]);
    const [reeds, setReeds] = useState<Reed[]>([]);
    const [activeMpcIds, setActiveMpcIds] = useState<Set<string>>(new Set());
    
    // Selection State
    const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | ''>('');
    const [selectedMfg, setSelectedMfg] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedTipId, setSelectedTipId] = useState('');
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('suitability_rating');
    
    // Results
    const [submissions, setSubmissions] = useState<PlayerSubmissionResponse[]>([]);
    const [isLoadingResults, setIsLoadingResults] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch(`${API_BASE}/options/mouthpieces`).then(r => r.json()),
            fetch(`${API_BASE}/options/reeds`).then(r => r.json()),
            fetch(`${API_BASE}/stats/active_mouthpieces`).then(r => r.json())
        ]).then(([mpcs, rds, ids]) => {
            setMouthpieces(mpcs);
            setReeds(rds);
            setActiveMpcIds(new Set(ids));
            setIsLoading(false);
        }).catch(err => console.error(err));
    }, []);

    // 1. Valid Instruments (only show instruments with data)
    const validInstruments = useMemo(() => {
        const instruments = new Set<string>();
        mouthpieces.forEach(m => {
            if (activeMpcIds.has(m.id)) {
                m.tip_openings.forEach(t => { if (t.instrument) instruments.add(t.instrument); });
            }
        });
        // Filter out any that are not keys of InstrumentType if necessary, but data should be clean
        return Array.from(instruments).sort() as InstrumentType[];
    }, [mouthpieces, activeMpcIds]);

    // 2. Filter Mouthpieces by Instrument & Active Data
    const availableMouthpieces = useMemo(() => {
        if (!selectedInstrument) return [];
        return mouthpieces.filter(m => 
            activeMpcIds.has(m.id) && 
            m.tip_openings.some(t => t.instrument === selectedInstrument)
        );
    }, [mouthpieces, selectedInstrument, activeMpcIds]);

    // 3. Unique Manufacturers
    const uniqueMfgs = useMemo(() => {
        return Array.from(new Set(availableMouthpieces.map(m => m.manufacturer))).sort();
    }, [availableMouthpieces]);

    // 4. Unique Models for selected Mfg
    const uniqueModels = useMemo(() => {
        if (!selectedMfg) return [];
        return availableMouthpieces
            .filter(m => m.manufacturer === selectedMfg)
            .map(m => m.model + (m.variant ? ` ${m.variant}` : ""))
            .filter((v, i, a) => a.indexOf(v) === i) // unique
            .sort();
    }, [availableMouthpieces, selectedMfg]);

    // 5. Get Actual Mouthpiece Object & Tips
    const activeMouthpiece = useMemo(() => {
        if (!selectedMfg || !selectedModel) return null;
        return availableMouthpieces.find(m => 
            m.manufacturer === selectedMfg && 
            (m.model + (m.variant ? ` ${m.variant}` : "") === selectedModel)
        );
    }, [availableMouthpieces, selectedMfg, selectedModel]);

    const availableTips = useMemo(() => {
        if (!activeMouthpiece || !selectedInstrument) return [];
        return activeMouthpiece.tip_openings.filter(t => t.instrument === selectedInstrument);
    }, [activeMouthpiece, selectedInstrument]);
    
    // Auto-Select Logic
    useEffect(() => {
        if (!selectedInstrument && validInstruments.length === 1) {
             // eslint-disable-next-line react-hooks/set-state-in-effect
             setSelectedInstrument(validInstruments[0]);
        }
    }, [validInstruments, selectedInstrument]);

    useEffect(() => {
        if (selectedInstrument && !selectedMfg && uniqueMfgs.length === 1) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedMfg(uniqueMfgs[0]);
        }
    }, [selectedInstrument, uniqueMfgs, selectedMfg]);

     useEffect(() => {
        if (selectedInstrument && selectedMfg && !selectedModel && uniqueModels.length === 1) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedModel(uniqueModels[0]);
        }
    }, [selectedMfg, uniqueModels, selectedModel, selectedInstrument]);
    
    // Fetch Submissions when selection is complete
    useEffect(() => {
        if (activeMouthpiece && selectedTipId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoadingResults(true);
            fetch(`${API_BASE}/submissions/mouthpiece/${activeMouthpiece.id}`)
                .then(r => r.json())
                .then((data: PlayerSubmissionResponse[]) => {
                    // Filter locally by Instrument and Tip (since endpoint is generic)
                    // The prompt implies we select specific tip.
                    let filtered = data.filter(s => s.instrument === selectedInstrument);
                    if (selectedTipId !== 'ANY') {
                         filtered = filtered.filter(s => s.tip_opening_id === selectedTipId);
                    }
                    setSubmissions(filtered);
                    setIsLoadingResults(false);
                })
                .catch(err => {
                    console.error(err);
                    setIsLoadingResults(false);
                });
        } else {
            setSubmissions([]);
        }
    }, [activeMouthpiece, selectedTipId, selectedInstrument]);


    // Process Data for Visualization
    const visualizationData = useMemo(() => {
        if (submissions.length === 0) return [];
    
        // 1. Group by Reed Mfg + Model
        const groups = new Map<string, { mfg: string, model: string, strengthStats: Map<string, number[]> }>();

        submissions.forEach(sub => {
            const reed = reeds.find(r => r.id === sub.reed_id);
            if (!reed) return;
            const key = `${reed.manufacturer}-${reed.model}`;
            
            if (!groups.has(key)) {
                groups.set(key, { 
                    mfg: reed.manufacturer, 
                    model: reed.model, 
                    strengthStats: new Map() // Strength Label -> Array of ratings
                });
            }
            
            const group = groups.get(key)!;
            if (!group.strengthStats.has(reed.strength_label)) {
                group.strengthStats.set(reed.strength_label, []);
            }
            
            const val = sub[selectedMetric];
            if (val !== undefined && val !== null) {
                group.strengthStats.get(reed.strength_label)?.push(val);
            }
        });

        // 2. Flatten to array for rendering
        return Array.from(groups.values()).map(g => {
            const plots = Array.from(g.strengthStats.entries()).map(([strength, ratings]) => {
                if(ratings.length === 0) return { strength, avg: 0, count: 0 };
                const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                return { strength, avg, count: ratings.length };
            }).filter(p => p.count > 0);
            
            return {
                mfg: g.mfg,
                model: g.model,
                plots: plots.sort((a, b) => parseFloat(a.strength) - parseFloat(b.strength))
            };
        }).sort((a,b) => a.mfg.localeCompare(b.mfg));

    }, [submissions, reeds, selectedMetric]);

    if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading recommender...</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                     <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors font-medium mb-4">
                        <ChevronLeft className="w-5 h-5 mr-1" /> Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Reed Recommender</h1>
                    <p className="mt-2 text-slate-600">See what others are playing on your setup.</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-5 gap-4 border border-slate-100">
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700 block mb-1">Instrument</span>
                        <select 
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={selectedInstrument}
                            onChange={e => {
                                setSelectedInstrument(e.target.value as InstrumentType);
                                setSelectedMfg(''); setSelectedModel(''); setSelectedTipId('');
                            }}
                        >
                            <option value="">Select...</option>
                            {validInstruments.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700 block mb-1">Mouthpiece Mfg</span>
                        <select 
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                            disabled={!selectedInstrument}
                            value={selectedMfg}
                            onChange={e => {
                                setSelectedMfg(e.target.value);
                                setSelectedModel(''); setSelectedTipId('');
                            }}
                        >
                            <option value="">Select...</option>
                            {uniqueMfgs.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700 block mb-1">Model</span>
                        <select 
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                            disabled={!selectedMfg}
                            value={selectedModel}
                            onChange={e => {
                                setSelectedModel(e.target.value);
                                setSelectedTipId('');
                            }}
                        >
                            <option value="">Select...</option>
                            {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700 block mb-1">Tip Opening</span>
                        <select 
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                            disabled={!selectedModel}
                            value={selectedTipId}
                            onChange={e => setSelectedTipId(e.target.value)}
                        >
                            <option value="">Select...</option>
                             {/* Allow "Any" if needed, but prompt implies granular selection. We'll show specific tips. */}
                            {availableTips.map(t => {
                                const inch = t.opening_inch.toFixed(3);
                                const mm = (t.opening_inch * 25.4).toFixed(2);
                                return (
                                    <option key={t.id} value={t.id}>
                                        {t.label ? `${t.label}, ` : ''}{inch}" / {mm} mm
                                    </option>
                                );
                            })}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700 block mb-1">View Metric</span>
                        <select 
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={selectedMetric}
                            onChange={e => setSelectedMetric(e.target.value as MetricKey)}
                        >
                            {Object.entries(METRICS).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
                
                {/* Loader */}
                {isLoadingResults && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                )}

                {/* Results List */}
                {!isLoadingResults && selectedTipId && visualizationData.length > 0 && (
                     <div className="animate-in fade-in slide-in-from-bottom-4">
                        {/* Overall Header / Axis (Desktop Only) */}
                        <div className="hidden md:block bg-white rounded-t-xl shadow-sm border border-slate-200 border-b-0 p-6 pb-2">
                             <div className="flex items-center gap-6">
                                <div className="w-1/4 min-w-[200px] text-sm font-semibold text-slate-500 uppercase tracking-wider">Reed Model</div>
                                <div className="flex-1 text-center relative h-8 mx-8">
                                    <h4 className="absolute -top-6 left-0 right-0 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">{METRICS[selectedMetric].label}</h4>
                                    <div className="absolute inset-0 flex items-center">
                                         {METRICS[selectedMetric].axisLabels.map((label, i) => {
                                             const count = METRICS[selectedMetric].axisLabels.length;
                                             // Position logic
                                             // If 3 labels: 0%, 50%, 100%
                                             // If 5 labels: 0, 25, 50, 75, 100
                                             const pct = (i / (count - 1)) * 100;
                                             return (
                                                 <div 
                                                    key={label} 
                                                    className="absolute text-xs font-bold text-slate-400 uppercase tracking-wider -translate-x-1/2"
                                                    style={{ left: `${pct}%` }}
                                                 >
                                                    {label}
                                                 </div>
                                             );
                                         })}
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Combined Container for Rows */}
                        <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
                            {visualizationData.map((row) => (
                                <div key={`${row.mfg}-${row.model}`} className="p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-slate-50 transition-colors">
                                    {/* Reed Info */}
                                    <div className="w-full md:w-1/4 min-w-[200px] text-center md:text-left self-start md:self-center">
                                        <h3 className="text-lg font-bold text-slate-900">{row.mfg}</h3>
                                        <p className="text-slate-600">{row.model}</p>
                                    </div>
                                    
                                    {/* Visualization Track (Desktop) */}
                                    <div className="hidden md:block flex-1 w-full relative h-12 bg-slate-50/50 rounded-lg border border-slate-100 mx-8">
                                        {/* Grid Lines */}
                                        <div className="absolute inset-0">
                                            {[0, 25, 50, 75, 100].map(pct => (
                                                <div 
                                                    key={pct} 
                                                    className="absolute top-0 bottom-0 border-r border-slate-300 w-px"
                                                    style={{ left: `${pct}%` }}
                                                />
                                            ))}
                                        </div>
                                        
                                        {/* Plotted Points */}
                                        <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-8"> 
                                            {row.plots.map((stat, idx) => {
                                                 // Calculate percentage based on Min/Max of selected metric
                                                const { min, max } = METRICS[selectedMetric];
                                                const range = max - min;
                                                const pct = ((stat.avg - min) / range) * 100;
                                                
                                                return (
                                                    <div 
                                                        key={idx}
                                                        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-md cursor-help transition-transform hover:scale-110 hover:z-10 group"
                                                        style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
                                                        title={`Avg: ${stat.avg.toFixed(1)} (${stat.count} ratings)`}
                                                    >
                                                        {stat.strength}
                                                        {/* Tooltip */}
                                                        <span className="absolute bottom-full mb-2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 left-1/2 -translate-x-1/2">
                                                            {stat.avg.toFixed(2)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Mobile Vertical List */}
                                    <div className="md:hidden w-full space-y-3 mt-2">
                                        {row.plots.map((stat, idx) => {
                                            const { min, max, axisLabels } = METRICS[selectedMetric];
                                            const range = max - min;
                                            const pct = ((stat.avg - min) / range) * 100;
                                            
                                            // Calculate dynamic label
                                            const labelIndex = Math.round(((stat.avg - min) / range) * (axisLabels.length - 1));
                                            const label = axisLabels[Math.min(Math.max(labelIndex, 0), axisLabels.length - 1)];
                                             
                                             return (
                                                 <div key={idx} className="flex flex-col bg-slate-50 border border-slate-100 rounded-lg p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-sm">{stat.strength}</span>
                                                            <span className="text-sm text-slate-500 font-medium">
                                                                {label}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-bold text-indigo-600">{stat.avg.toFixed(1)}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
                                                    </div>
                                                 </div>
                                             );
                                        })}
                                    </div>

                                </div>
                            ))}
                        </div>
                     </div>
                )}
                
                {!isLoadingResults && selectedTipId && visualizationData.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
                        <p className="text-slate-500">No data found for this specific setup yet. Be the first to add one!</p>
                        <Link to="/wizard" className="inline-block mt-4 text-indigo-600 font-semibold hover:underline">
                            Contribute Data &rarr;
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
