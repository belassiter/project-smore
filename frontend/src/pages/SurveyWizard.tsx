import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { 
  InstrumentType, Genre, SkillLevel, PlayerHours 
} from '../types';
import type { 
  Mouthpiece, Reed, PlayerSubmission 
} from '../types';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// API Client - Ideally moved to lib/api.ts
const API_BASE = 'http://localhost:8000/api/v1';

async function fetchMouthpieces(): Promise<Mouthpiece[]> {
  const res = await fetch(`${API_BASE}/options/mouthpieces`);
  if (!res.ok) throw new Error('Failed to fetch mouthpieces');
  return res.json();
}

async function fetchReeds(): Promise<Reed[]> {
  const res = await fetch(`${API_BASE}/options/reeds`);
  if (!res.ok) throw new Error('Failed to fetch reeds');
  return res.json();
}

async function postSubmission(data: PlayerSubmission) {
  const res = await fetch(`${API_BASE}/survey/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit survey');
  return res.json();
}

const STEPS = [
  'Context', 'Mouthpiece', 'Reed', 'Feedback'
];

const ErrorMsg = ({ field, errors }: { field: string; errors: Record<string, string> }) => {
    if (!errors[field]) return null;
    return (
        <div className="flex items-center mt-1 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors[field]}
        </div>
    );
};

export default function SurveyWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Data Options
  const [mouthpieces, setMouthpieces] = useState<Mouthpiece[]>([]);
  const [reeds, setReeds] = useState<Reed[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<PlayerSubmission>>({
    player_id: localStorage.getItem('player_id') || uuidv4(),
    suitability_rating: 3,
    resistance_feel: 0,
    brightness_feel: 0,
    strength_rating: 0,
    min_dynamic: 3, // ~p 
    max_dynamic: 6, // ~f
    is_mouthpiece_modified: false,
    is_reed_modified: false
  });

  // Persist Player ID
  useEffect(() => {
    if (!localStorage.getItem('player_id')) {
      localStorage.setItem('player_id', formData.player_id!);
    }
  }, [formData.player_id]);

  // Initial Data Fetch
  useEffect(() => {
    Promise.all([fetchMouthpieces(), fetchReeds()])
      .then(([mpcs, rds]) => {
        setMouthpieces(mpcs);
        setReeds(rds);
        setIsLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  // Filtered Options Logic
  const uniqueMpcMfgs = Array.from(new Set(mouthpieces.map(m => m.manufacturer))).sort();
  const [selectedMpcMfg, setSelectedMpcMfg] = useState<string>('');
  const [selectedMpcModel, setSelectedMpcModel] = useState<string>('');
  
  const mpcModelsFiltered = mouthpieces.filter(m => m.manufacturer === selectedMpcMfg);
  // Sort models alphabetically
  const mpcModelsUnique = Array.from(new Set(mpcModelsFiltered.map(m => m.model + (m.variant ? ` ${m.variant}` : "")))).sort();
  
  const getMouthpieceObj = (mfg: string, modelStr: string) => {
    return mouthpieces.find(m => m.manufacturer === mfg && (m.model + (m.variant ? ` ${m.variant}` : "") === modelStr));
  };
  const activeMouthpiece = getMouthpieceObj(selectedMpcMfg, selectedMpcModel);
  // Filter out potential empty/invalid tip openings to prevent UI ghosts
  const validTipOpenings = activeMouthpiece?.tip_openings.filter(t => t.id && t.label && t.label.trim() !== "") || [];
  const selectedTip = validTipOpenings.find(t => t.id === formData.tip_opening_id);
  
  const uniqueReedMfgs = Array.from(new Set(reeds.map(r => r.manufacturer))).sort();
  const [selectedReedMfg, setSelectedReedMfg] = useState<string>('');
  const [selectedReedModel, setSelectedReedModel] = useState<string>('');
  
  const reedModelsFiltered = reeds.filter(r => r.manufacturer === selectedReedMfg);
  const reedModelsUnique = Array.from(new Set(reedModelsFiltered.map(r => r.model))).sort();
  
  const reedStrengthsFiltered = reeds.filter(r => r.manufacturer === selectedReedMfg && r.model === selectedReedModel)
    .sort((a, b) => {
        // Try to sort numerically if possible, otherwise string sort
        const valA = parseFloat(a.strength_label);
        const valB = parseFloat(b.strength_label);
        if (!isNaN(valA) && !isNaN(valB)) return valA - valB;
        return a.strength_label.localeCompare(b.strength_label);
    });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (step === 0) {
        if (!formData.instrument) newErrors.instrument = "Please select your instrument.";
        if (!formData.genre) newErrors.genre = "Please select your primary genre.";
        if (!formData.skill_level) newErrors.skill_level = "Please select your skill level.";
        if (!formData.player_hours) newErrors.player_hours = "Please select your average playing hours.";
    }

    if (step === 1) {
        if (!selectedMpcMfg) newErrors.mpcMfg = "Manufacturer is required.";
        if (!selectedMpcModel) newErrors.mpcModel = "Model is required.";
        // Special case: Some mouthpieces (like Selmer Concept) might not have selectable tip openings in our DB yet,
        // or they are 'one size'. We only require tip opening if the active mouthpiece HAS options.
        if (activeMouthpiece && validTipOpenings.length > 0 && !formData.tip_opening_id) {
            newErrors.tipOpening = "Tip opening is required for this model.";
        }
    }

    if (step === 2) {
        if (!selectedReedMfg) newErrors.reedMfg = "Manufacturer is required.";
        if (!selectedReedModel) newErrors.reedModel = "Model is required.";
        if (!formData.reed_id) newErrors.reedStrength = "Reed strength is required.";
    }

    // Step 3 (Ratings) are mostly sliders with defaults, but we ensure range validity
    if (step === 3) {
        if ((formData.min_dynamic || 0) > (formData.max_dynamic || 8)) {
            newErrors.dynamics = "Min volume cannot be louder than max volume.";
        }
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        isValid = false;
    } else {
        setErrors({});
    }

    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(c => c + 1);
            window.scrollTo(0, 0);
        } else {
            handleSubmit();
        }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleSubmit = async () => {
    // Final check
    if (!validateStep(3)) return;
    
    try {
      await postSubmission(formData as PlayerSubmission);
      // Reset or redirect
      alert("Submission successful! Thank you.");
      navigate('/'); 
    } catch (e) {
      console.error(e);
      alert("Error submitting data. Please try again.");
    }
  };


  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading survey options...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">The Great Saxophone Mouthpiece-Reed Survey</h1>
            <p className="mt-2 text-slate-600">Help us build the ultimate database of saxophone setups.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-indigo-600 transition-all duration-500 ease-in-out" 
                    style={{ width: `${((currentStep + 1) / 4) * 100}%` }} 
                />
            </div>
            <div className="flex justify-between mt-2 text-sm text-slate-500 font-medium">
                {STEPS.map((s, i) => (
                    <span key={s} className={cn(
                        "transition-colors duration-300",
                        i <= currentStep ? "text-indigo-600" : "text-slate-400"
                    )}>{s}</span>
                ))}
            </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            
            {/* Step 1: Context */}
            {currentStep === 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">1</span>
                        About Your Playing
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="block">
                            <span className="text-slate-700 font-medium">Instrument <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors",
                                    errors.instrument && "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                                )}
                                value={formData.instrument || ''}
                                onChange={e => {
                                    setFormData({...formData, instrument: e.target.value as InstrumentType});
                                    if(errors.instrument) setErrors({...errors, instrument: ''});
                                }}
                            >
                                <option value="">Select Instrument</option>
                                {Object.values(InstrumentType).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <ErrorMsg field="instrument" errors={errors} />
                        </label>

                        <label className="block">
                            <span className="text-slate-700 font-medium">Primary Genre <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm transition-colors",
                                    errors.genre && "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                                )}
                                value={formData.genre || ''}
                                onChange={e => {
                                    setFormData({...formData, genre: e.target.value as Genre});
                                    if(errors.genre) setErrors({...errors, genre: ''});
                                }}
                            >
                                <option value="">Select Genre</option>
                                {Object.values(Genre).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <ErrorMsg field="genre" errors={errors} />
                        </label>

                        <label className="block">
                            <span className="text-slate-700 font-medium">Skill Level <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm transition-colors",
                                    errors.skill_level && "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                                )}
                                value={formData.skill_level || ''}
                                onChange={e => {
                                    setFormData({...formData, skill_level: e.target.value as SkillLevel});
                                    if(errors.skill_level) setErrors({...errors, skill_level: ''});
                                }}
                            >
                                <option value="">Select Level</option>
                                {Object.values(SkillLevel).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <ErrorMsg field="skill_level" errors={errors} />
                        </label>

                         <label className="block">
                            <span className="text-slate-700 font-medium">Playing Hours / Week <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm transition-colors",
                                    errors.player_hours && "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                                )}
                                value={formData.player_hours || ''}
                                onChange={e => {
                                    setFormData({...formData, player_hours: e.target.value as PlayerHours});
                                    if(errors.player_hours) setErrors({...errors, player_hours: ''});
                                }}
                            >
                                <option value="">Select Hours</option>
                                <option value={PlayerHours.LOW}>Low (&lt;3 hours/week)</option>
                                <option value={PlayerHours.MEDIUM}>Medium (&gt;6 hours/week)</option>
                                <option value={PlayerHours.HIGH}>High (&gt;10 hours/week)</option>
                                <option value={PlayerHours.VERY_HIGH}>Very High (&gt;20 hours/week)</option>
                            </select>
                            <ErrorMsg field="player_hours" errors={errors} />
                        </label>
                    </div>
                </div>
            )}

            {/* Step 2: Mouthpiece */}
            {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">2</span>
                        Mouthpiece Setup
                    </h2>
                    
                    <div className="space-y-5">
                        <label className="block">
                            <span className="text-slate-700 font-medium">Manufacturer <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm transition-colors",
                                    errors.mpcMfg && "border-red-300 bg-red-50"
                                )}
                                value={selectedMpcMfg}
                                onChange={e => {
                                    setSelectedMpcMfg(e.target.value);
                                    setSelectedMpcModel('');
                                    setFormData(prev => ({...prev, mouthpiece_id: undefined, tip_opening_id: undefined}));
                                    setErrors(p => ({...p, mpcMfg: '', mpcModel: '', tipOpening: ''}));
                                }}
                            >
                                <option value="">Select Manufacturer</option>
                                {uniqueMpcMfgs.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ErrorMsg field="mpcMfg" errors={errors} />
                        </label>

                        <label className="block">
                            <span className={cn("text-slate-700 font-medium", !selectedMpcMfg && "text-slate-400")}>Model <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm disabled:bg-slate-100 disabled:text-slate-400",
                                    errors.mpcModel && "border-red-300 bg-red-50"
                                )}
                                disabled={!selectedMpcMfg}
                                value={selectedMpcModel}
                                onChange={e => {
                                    setSelectedMpcModel(e.target.value);
                                    const mpc = getMouthpieceObj(selectedMpcMfg, e.target.value);
                                    setFormData(prev => ({...prev, mouthpiece_id: mpc?.id, tip_opening_id: undefined}));
                                    setErrors(p => ({...p, mpcModel: '', tipOpening: ''}));
                                }}
                            >
                                <option value="">Select Model</option>
                                {mpcModelsUnique.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ErrorMsg field="mpcModel" errors={errors} />
                        </label>

                        {/* Only show Tip Opening if the selected mouthpiece HAS tip openings defined */}
                        {activeMouthpiece && validTipOpenings.length > 0 && (
                            <label className="block animate-in fade-in zoom-in-95 duration-200">
                                <span className={cn("text-slate-700 font-medium", !formData.mouthpiece_id && "text-slate-400")}>Tip Opening <span className="text-red-500">*</span></span>
                                <select 
                                    className={cn(
                                        "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm disabled:bg-slate-100",
                                        errors.tipOpening && "border-red-300 bg-red-50"
                                    )}
                                    disabled={!formData.mouthpiece_id}
                                    value={formData.tip_opening_id || ''}
                                    onChange={e => {
                                        setFormData(p => ({...p, tip_opening_id: e.target.value}));
                                        if(errors.tipOpening) setErrors(p => ({...p, tipOpening: ''}));
                                    }}
                                >
                                    <option value="">Select Tip Opening</option>
                                    {validTipOpenings.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                                <ErrorMsg field="tipOpening" errors={errors} />
                                
                                {selectedTip && (
                                    <div className="mt-3 flex items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
                                        <span className="font-semibold mr-2">Specs:</span>
                                        {selectedTip.opening_inch}" ({ (selectedTip.opening_inch * 25.4).toFixed(2) } mm)
                                        {selectedTip.facing_length && <span className="mx-2">•</span>}
                                        {selectedTip.facing_length && <span>Facing: {selectedTip.facing_length}</span>}
                                    </div>
                                )}
                            </label>
                        )}
                        {/* Fallback for models like Selmer Concept which might have 0 tip openings in DB but are valid */}
                        {activeMouthpiece && validTipOpenings.length === 0 && (
                             <div className="mt-2 text-sm text-slate-500 italic">
                                Note: This model has a standard facing. No tip selection needed.
                             </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 mt-6">
                             <label className="flex items-center space-x-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={formData.is_mouthpiece_modified}
                                    onChange={e => setFormData(p => ({...p, is_mouthpiece_modified: e.target.checked}))}    
                                />
                                <span className="text-slate-700 group-hover:text-slate-900">This mouthpiece has been refaced or modified.</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Reed */}
            {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">3</span>
                        Reed Setup
                    </h2>
                    
                    <div className="space-y-5">
                        <label className="block">
                            <span className="text-slate-700 font-medium">Manufacturer <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm transition-colors",
                                    errors.reedMfg && "border-red-300 bg-red-50"
                                )}
                                value={selectedReedMfg}
                                onChange={e => {
                                    setSelectedReedMfg(e.target.value);
                                    setSelectedReedModel('');
                                    setFormData(p => ({...p, reed_id: undefined}));
                                    setErrors(p => ({...p, reedMfg: '', reedModel: '', reedStrength: ''}));
                                }}
                            >
                                <option value="">Select Manufacturer</option>
                                {uniqueReedMfgs.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ErrorMsg field="reedMfg" errors={errors} />
                        </label>

                        <label className="block">
                            <span className={cn("text-slate-700 font-medium", !selectedReedMfg && "text-slate-400")}>Model / Cut <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm disabled:bg-slate-100",
                                    errors.reedModel && "border-red-300 bg-red-50"
                                )}
                                disabled={!selectedReedMfg}
                                value={selectedReedModel}
                                onChange={e => {
                                    setSelectedReedModel(e.target.value);
                                    setFormData(p => ({...p, reed_id: undefined}));
                                    setErrors(p => ({...p, reedModel: '', reedStrength: ''}));
                                }}
                            >
                                <option value="">Select Model</option>
                                {reedModelsUnique.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ErrorMsg field="reedModel" errors={errors} />
                        </label>

                        <label className="block">
                            <span className={cn("text-slate-700 font-medium", !selectedReedModel && "text-slate-400")}>Strength <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm disabled:bg-slate-100",
                                    errors.reedStrength && "border-red-300 bg-red-50"
                                )}
                                disabled={!selectedReedModel}
                                value={formData.reed_id || ''}
                                onChange={e => {
                                    setFormData(p => ({...p, reed_id: e.target.value}));
                                    if(errors.reedStrength) setErrors({...errors, reedStrength: ''});
                                }}
                            >
                                <option value="">Select Strength</option>
                                {reedStrengthsFiltered.map(r => (
                                    <option key={r.id} value={r.id}>{r.strength_label}</option>
                                ))}
                            </select>
                            <ErrorMsg field="reedStrength" errors={errors} />
                        </label>
                        
                         <div className="pt-4 border-t border-slate-100 mt-6">
                             <label className="flex items-center space-x-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={formData.is_reed_modified}
                                    onChange={e => setFormData(p => ({...p, is_reed_modified: e.target.checked}))}    
                                />
                                <span className="text-slate-700 group-hover:text-slate-900">This reed is clipped or modified.</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Ratings */}
            {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                         <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">4</span>
                        Final Impressions
                    </h2>
                    
                    {/* Suitability */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                            <label className="font-medium text-slate-700">Overall Match</label>
                            <span className="text-indigo-600 font-bold text-lg">{formData.suitability_rating} / 5</span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={1} max={5} step={1}
                                value={formData.suitability_rating}
                                onChange={(val) => setFormData({...formData, suitability_rating: val as number})}
                                trackStyle={{ backgroundColor: '#4f46e5', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: '#fff', opacity: 1, boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.2)' }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ 1: 'Terrible', 2: 'Poor', 3: 'Adequate', 4: 'Good', 5: 'Great' }}
                            />
                        </div>
                    </div>

                    {/* Dynamic Range - DUAL SLIDER */}
                    <div className="space-y-4 pt-8 border-t border-slate-100">
                        <label className="font-medium text-slate-700 block mb-4">Comfortable Dynamic Range</label>
                        
                        <div className="px-2 pb-8">
                             <Slider 
                                range
                                min={1} max={8} step={1}
                                value={[formData.min_dynamic || 1, formData.max_dynamic || 8]}
                                onChange={(val) => {
                                    if(Array.isArray(val)) {
                                        setFormData({...formData, min_dynamic: val[0], max_dynamic: val[1]});
                                        if(errors.dynamics) setErrors({...errors, dynamics: ''});
                                    }
                                }}
                                trackStyle={[{ backgroundColor: '#4f46e5', height: 6 }]}
                                handleStyle={[
                                    { borderColor: '#4f46e5', backgroundColor: '#fff', opacity: 1 },
                                    { borderColor: '#4f46e5', backgroundColor: '#fff', opacity: 1 }
                                ]}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{
                                    1: 'ppp', 2: 'pp', 3: 'p', 4: 'mp', 5: 'mf', 6: 'f', 7: 'ff', 8: 'fff'
                                }}
                            />
                        </div>
                        <div className="text-center text-sm text-slate-600 bg-slate-50 py-2 rounded-lg">
                            Range: 
                            <span className="font-mono font-bold text-indigo-600 mx-2">
                                {['', 'ppp','pp','p','mp','mf','f','ff','fff'][formData.min_dynamic || 1]}
                            </span>
                            to
                            <span className="font-mono font-bold text-indigo-600 mx-2">
                                {['', 'ppp','pp','p','mp','mf','f','ff','fff'][formData.max_dynamic || 8]}
                            </span>
                        </div>
                         <ErrorMsg field="dynamics" errors={errors} />
                    </div>
                    
                    {/* Resistance (New) */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex justify-between">
                            <label className="font-medium text-slate-700">Resistance</label>
                            <span className="text-slate-500 font-medium">
                                {formData.resistance_feel === 0 ? "Medium" : formData.resistance_feel! > 0 ? "Resistant" : "Free-blowing"}
                            </span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={-5} max={5} step={1}
                                value={formData.resistance_feel}
                                onChange={(val) => setFormData({...formData, resistance_feel: val as number})}
                                trackStyle={{ backgroundColor: formData.resistance_feel === 0 ? '#4f46e5' : '#94a3b8', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: '#fff', opacity: 1 }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ '-5': 'Free-blowing', 0: 'Medium', 5: 'Resistant' }}
                            />
                        </div>
                    </div>

                    {/* Strength Rating */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex justify-between">
                            <label className="font-medium text-slate-700">Strength Match</label>
                            <span className="text-slate-500 font-medium">
                                {formData.strength_rating === 0 ? "Perfect" : formData.strength_rating! > 0 ? "Too Hard" : "Too Soft"}
                            </span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={-5} max={5} step={1}
                                value={formData.strength_rating}
                                onChange={(val) => setFormData({...formData, strength_rating: val as number})}
                                trackStyle={{ backgroundColor: formData.strength_rating === 0 ? '#4f46e5' : '#94a3b8', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: '#fff', opacity: 1 }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ '-5': 'Too Soft', 0: 'Perfect', 5: 'Too Hard' }}
                            />
                        </div>
                    </div>

                    {/* Brightness */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                         <div className="flex justify-between">
                            <label className="font-medium text-slate-700">Tone Color</label>
                            <span className="text-slate-500 font-medium">
                                {formData.brightness_feel === 0 ? "Neutral" : formData.brightness_feel! > 0 ? "Bright" : "Dark"}
                            </span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={-5} max={5} step={1}
                                value={formData.brightness_feel}
                                onChange={(val) => setFormData({...formData, brightness_feel: val as number})}
                                trackStyle={{ backgroundColor: '#4f46e5', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: '#fff', opacity: 1 }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ '-5': 'Dark', 0: 'Neutral', 5: 'Bright' }}
                            />
                        </div>
                    </div>
                    
                    {/* Modification Details if any flag is set */}
                    {(formData.is_mouthpiece_modified || formData.is_reed_modified) && (
                         <div className="space-y-2 pt-4 border-t border-slate-100 animated-in fade-in">
                             <label className="font-medium text-slate-700">Modification Details</label>
                             <textarea 
                                className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="Describe your modifications (e.g. 'Tip opened to .085', 'Clipped 1mm')..."
                                value={formData.modification_details || ''}
                                onChange={e => setFormData({...formData, modification_details: e.target.value})}
                             />
                         </div>
                    )}

                    <div className="space-y-2 pt-2">
                         <label className="font-medium text-slate-700">Additional Comments</label>
                         <textarea 
                            className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            rows={3}
                            placeholder="Any other notes on this setup?"
                            value={formData.comments || ''}
                            onChange={e => setFormData({...formData, comments: e.target.value})}
                         />
                     </div>
                </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-12 flex justify-between pt-6 border-t border-slate-100">
                <button 
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    type="button"
                    className="flex items-center px-6 py-3 text-slate-600 font-medium hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back
                </button>
                
                <button 
                    onClick={handleNext}
                    type="button"
                    className="flex items-center bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all hover:shadow-indigo-200 active:scale-95"
                >
                    {currentStep === 3 ? "Submit Contribution" : "Next Step"} 
                    {currentStep !== 3 && <ChevronRight className="w-5 h-5 ml-1" />}
                </button>
            </div>
            
        </div>
      </div>
    </div>
  );
}
