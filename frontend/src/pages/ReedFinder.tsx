import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { InstrumentType } from '../types';
import type { Mouthpiece, Reed, PlayerSubmission } from '../types';

const API_BASE = 'http://localhost:8000/api/v1';

// We need a type for the submissions we fetch
interface Submission extends PlayerSubmission {
    id: string;
    mouthpiece_id: string;
    instrument: InstrumentType;
    reed_id: string;
    suitability_rating: number;
}

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
    
    // Results
    const [submissions, setSubmissions] = useState<Submission[]>([]);
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

    // 1. Filter Mouthpieces by Instrument & Active Data
    const availableMouthpieces = useMemo(() => {
        if (!selectedInstrument) return [];
        return mouthpieces.filter(m => 
            activeMpcIds.has(m.id) && 
            m.tip_openings.some(t => t.instrument === selectedInstrument)
        );
    }, [mouthpieces, selectedInstrument, activeMpcIds]);

    // 2. Unique Manufacturers
    const uniqueMfgs = useMemo(() => {
        return Array.from(new Set(availableMouthpieces.map(m => m.manufacturer))).sort();
    }, [availableMouthpieces]);

    // 3. Unique Models for selected Mfg
    const uniqueModels = useMemo(() => {
        if (!selectedMfg) return [];
        return availableMouthpieces
            .filter(m => m.manufacturer === selectedMfg)
            .map(m => m.model + (m.variant ? ` ${m.variant}` : ""))
            .filter((v, i, a) => a.indexOf(v) === i) // unique
            .sort();
    }, [availableMouthpieces, selectedMfg]);

    // 4. Get Actual Mouthpiece Object & Tips
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
    
    // Fetch Submissions when selection is complete
    useEffect(() => {
        if (activeMouthpiece && selectedTipId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoadingResults(true);
            fetch(`${API_BASE}/submissions/mouthpiece/${activeMouthpiece.id}`)
                .then(r => r.json())
                .then((data: Submission[]) => {
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


    // Process Data for Table
    // Rows: Reed Mfg + Model
    // Cols: Ratings 1-5
    // Cell: List of strengths
    const tableData = useMemo(() => {
        if (submissions.length === 0) return [];

        const rows = new Map<string, { mfg: string, model: string, ratings: Record<number, Set<string>> }>();

        submissions.forEach(sub => {
            const reed = reeds.find(r => r.id === sub.reed_id);
            if (!reed) return;
            const key = `${reed.manufacturer}-${reed.model}`;
            
            if (!rows.has(key)) {
                rows.set(key, { 
                    mfg: reed.manufacturer, 
                    model: reed.model, 
                    ratings: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() } 
                });
            }
            
            const row = rows.get(key)!;
            // Map suitability rating to integer if needed (assuming 1-5 from context)
            const rating = sub.suitability_rating || 0;
            if (rating >= 1 && rating <= 5) {
                row.ratings[rating].add(reed.strength_label);
            }
        });

        return Array.from(rows.values()).sort((a,b) => a.mfg.localeCompare(b.mfg));
    }, [submissions, reeds]);

    const RATINGS = [
        { val: 1, label: "Terrible" },
        { val: 2, label: "Poor" },
        { val: 3, label: "Adequate" },
        { val: 4, label: "Good" },
        { val: 5, label: "Great" }
    ];

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
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-100">
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
                            {Object.values(InstrumentType).map(i => <option key={i} value={i}>{i}</option>)}
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
                            {availableTips.map(t => (
                                <option key={t.id} value={t.id}>{t.label || `${t.opening_inch}"`}</option>
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

                {/* Table */}
                {!isLoadingResults && selectedTipId && tableData.length > 0 && (
                     <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reed</th>
                                        {RATINGS.map(r => (
                                            <th key={r.val} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                {r.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {tableData.map(row => (
                                        <tr key={`${row.mfg}-${row.model}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-slate-900">{row.mfg}</div>
                                                <div className="text-sm text-slate-500">{row.model}</div>
                                            </td>
                                            {RATINGS.map(r => {
                                                const strengths = Array.from(row.ratings[r.val]).sort();
                                                return (
                                                    <td key={r.val} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                                        {strengths.length > 0 ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700">
                                                                {strengths.join(", ")}
                                                            </span>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}
                
                {!isLoadingResults && selectedTipId && tableData.length === 0 && (
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
