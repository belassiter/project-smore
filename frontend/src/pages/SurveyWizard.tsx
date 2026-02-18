import { useState, useEffect, useMemo } from 'react';
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
  Mouthpiece, Reed, PlayerSubmission, PlayerSubmissionResponse 
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
  if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Submission Error Response:", errorData);
      throw new Error(JSON.stringify(errorData.detail || 'Failed to submit survey'));
  }
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


const HelpPopover = ({ text }: { text: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = () => {
             // If open provided by state, close on any click.
             // We need this because sometimes overlay/backdrop z-index strategy fails depending on parent container stacking contexts.
             // Global click listener is safer for "close on any click".
             if (isOpen) {
                 setIsOpen(false);
             }
        };

        if (isOpen) {
            // Defer slightly to avoid the immediate click that opened it
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 0);
        }
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-flex items-center ml-2">
            <button
                type="button"
                className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 shadow-sm"
                onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); // Stop propagation so global listener doesn't immediately catch it if we didn't use timeout (but we do). 
                    setIsOpen(!isOpen); 
                }}
                aria-label="More information"
            >
                <span className="text-xs font-bold leading-none">?</span>
            </button>
            
            {isOpen && (
                <div 
                    className="absolute right-0 top-full mt-2 w-64 p-4 bg-white rounded-lg shadow-xl border border-slate-200 z-50 text-sm text-slate-700 leading-snug animate-in fade-in zoom-in-95 duration-200 md:left-full md:top-1/2 md:-translate-y-1/2 md:ml-3 md:mt-0 cursor-pointer"
                >
                    {/* Desktop Pointer */}
                    <div className="hidden md:block absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-white filter drop-shadow-sm transform -translate-x-[1px]" />
                    {/* Mobile Pointer */}
                    <div className="md:hidden absolute -top-2 right-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white filter drop-shadow-sm" />
                    {text}
                </div>
            )}
        </div>
    );
};

export default function SurveyWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<{name: string, rating: number} | null>(null);
  
  // Data Options
  const [mouthpieces, setMouthpieces] = useState<Mouthpiece[]>([]);
  const [reeds, setReeds] = useState<Reed[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<PlayerSubmission>>({
    player_id: localStorage.getItem('player_id') || uuidv4(),
    suitability_rating: undefined,
    resistance_feel: undefined,
    brightness_feel: undefined,
    strength_rating: undefined,
    min_dynamic: undefined, 
    max_dynamic: undefined,
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

  // 1. Filtered Logic for Manufacturers (Filter by Instrument if selected)
  const uniqueMpcMfgs = useMemo(() => {
    let relevantMp = mouthpieces;
    if (formData.instrument) {
        relevantMp = relevantMp.filter(m => m.tip_openings.some(t => t.instrument === formData.instrument));
    }
    return Array.from(new Set(relevantMp.map(m => m.manufacturer))).sort();
  }, [mouthpieces, formData.instrument]);

  const [selectedMpcMfg, setSelectedMpcMfg] = useState<string>('');
  const [selectedMpcModel, setSelectedMpcModel] = useState<string>('');
  
  // 2. Filter Models by Mfg AND Instrument
  const mpcModelsUnique = useMemo(() => {
    if (!selectedMpcMfg || selectedMpcMfg === "Not Listed") return [];
    
    let relevant = mouthpieces.filter(m => m.manufacturer === selectedMpcMfg);
    if (formData.instrument) {
        relevant = relevant.filter(m => m.tip_openings.some(t => t.instrument === formData.instrument));
    }

    return Array.from(new Set(relevant.map(m => m.model + (m.variant ? ` ${m.variant}` : "")))).sort();
  }, [mouthpieces, selectedMpcMfg, formData.instrument]);
  
  const getMouthpieceObj = (mfg: string, modelStr: string) => {
    return mouthpieces.find(m => m.manufacturer === mfg && (m.model + (m.variant ? ` ${m.variant}` : "") === modelStr));
  };
  const activeMouthpiece = getMouthpieceObj(selectedMpcMfg, selectedMpcModel);
  // Reset logic handled in onChange of instrument select
  
  // Filter tip openings by selected instrument
  const instrumentTips = useMemo(() => {
    if ((!activeMouthpiece && selectedMpcMfg !== "Not Listed") || !formData.instrument) return [];
    if (selectedMpcMfg === "Not Listed") return [];
    return activeMouthpiece?.tip_openings.filter(t => t.instrument === formData.instrument) || [];
  }, [activeMouthpiece, formData.instrument, selectedMpcMfg]);

  // Ensure all tips are valid for UI, providing fallback label if missing
  const validTipOpenings = useMemo(() => {
    return instrumentTips.map(t => ({
        ...t,
        label: (t.label && t.label.trim() !== "") ? t.label : "Standard"
    }));
  }, [instrumentTips]);
  
  // Find selected tip in ALL openings for this mouthpiece (in case ID is already set)
  const selectedTip = activeMouthpiece?.tip_openings?.find(t => t.id === formData.tip_opening_id);
  
  // Auto-select tip opening if logic dictates (ONLY from instrument-compatible tips)
  useEffect(() => {
    if (activeMouthpiece && !formData.tip_opening_id && formData.instrument) {
        // Case A: Only one option available (whether it had a label or we gave it one)
        if (validTipOpenings.length === 1) {
             // eslint-disable-next-line react-hooks/set-state-in-effect
             setFormData(prev => ({ ...prev, tip_opening_id: validTipOpenings[0].id }));
        } 
    }
  }, [activeMouthpiece, validTipOpenings, formData.tip_opening_id, formData.instrument]);

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
        if (!formData.skill_level) newErrors.skill_level = "Please select your skill level.";
        if (!formData.player_hours) newErrors.player_hours = "Please select your average playing hours.";
    }

    if (step === 1) {
        if (!formData.instrument) newErrors.instrument = "Please select your instrument.";
        if (!formData.genre) newErrors.genre = "Please select your primary genre.";

        if (!selectedMpcMfg) newErrors.mpcMfg = "Manufacturer is required.";
        
        // Validation logic considering "Not Listed"
        if (selectedMpcMfg !== "Not Listed") {
            if (!selectedMpcModel) newErrors.mpcModel = "Model is required.";
            
            if (selectedMpcModel && selectedMpcModel !== "Not Listed") {
                 // Strict Tip Opening Validation for known models
                 if (activeMouthpiece) {
                     const totalTips = activeMouthpiece.tip_openings.length;
                     const compatibleTips = activeMouthpiece.tip_openings.filter(t => t.instrument === formData.instrument);
    
                     if (totalTips === 0) {
                         newErrors.tipOpening = "Configuration Error: This model has no tip openings defined.";
                     } else if (compatibleTips.length === 0) {
                         newErrors.tipOpening = `This model is not available for ${formData.instrument}.`;
                     } else if (!formData.tip_opening_id) {
                         newErrors.tipOpening = "Tip opening is required for this model.";
                     }
                 }
            }
        }
    }

    if (step === 2) {
        if (!selectedReedMfg) newErrors.reedMfg = "Manufacturer is required.";
        
        if (selectedReedMfg !== "Not Listed") {
            if (!selectedReedModel) newErrors.reedModel = "Model is required.";
            if (selectedReedModel !== "Not Listed" && !formData.reed_id) {
                newErrors.reedStrength = "Reed strength is required.";
            }
        }
    }

    // Step 3 (Ratings)
    if (step === 3) {
        if (formData.suitability_rating === undefined) newErrors.suitability = "Please rate the overall match.";
        // Resistance is optional
        if (formData.strength_rating === undefined) newErrors.strength = "Please rate the strength match.";
        // Brightness is optional

        // Dynamics is optional
        if (formData.min_dynamic !== undefined && formData.max_dynamic !== undefined) {
            if ((formData.min_dynamic) > (formData.max_dynamic)) {
               newErrors.dynamics = "Min volume cannot be louder than max volume.";
            }
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
      
      // Calculate Recommendation for Success Screen
      if (activeMouthpiece && formData.instrument) {
          fetch(`${API_BASE}/submissions/mouthpiece/${activeMouthpiece.id}`)
              .then(res => res.json())
              .then((subs: PlayerSubmissionResponse[]) => {
                    const relevant = subs.filter(s => s.instrument === formData.instrument);
                    const scores = new Map<string, { total: number, count: number }>();
                    
                    relevant.forEach(s => {
                        if (s.suitability_rating) {
                            const current = scores.get(s.reed_id) || { total: 0, count: 0 };
                            current.total += s.suitability_rating;
                            current.count += 1;
                            scores.set(s.reed_id, current);
                        }
                    });
                    
                    let bestId: string | null = null;
                    let maxScore = -1;
                    
                    scores.forEach((val, key) => {
                        const avg = val.total / val.count;
                        if (avg > maxScore && val.count >= 1) { // simple threshold
                            maxScore = avg;
                            bestId = key;
                        }
                    });

                    if (bestId) {
                        const r = reeds.find(x => x.id === bestId);
                        if (r) {
                            setRecommendation({
                                name: `${r.manufacturer} ${r.model} ${r.strength_label}`,
                                rating: maxScore
                            });
                        }
                    }
              })
              .catch(err => console.error("Rec fetch failed", err));
      }

      setIsSuccess(true);
      window.scrollTo(0, 0);
    } catch (err) {
        console.error(err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any;
        const msg = e.response?.data?.detail || e.message || "Failed to submit";
        // Show detailed error in alert so user knows what's wrong (e.g. 422)
        alert(`Error submitting survey: ${typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg}`);
    }
  };

  const handleReset = () => {
      setIsSuccess(false);
      setCurrentStep(0);
      setFormData({
        player_id: formData.player_id,
        suitability_rating: undefined,
        resistance_feel: undefined,
        brightness_feel: undefined,
        strength_rating: undefined,
        min_dynamic: undefined, 
        max_dynamic: undefined,
        is_mouthpiece_modified: false,
        is_reed_modified: false,
        comments: '',
        modification_details: ''
      });
      setSelectedMpcMfg('');
      setSelectedMpcModel('');
      setSelectedReedMfg('');
      setSelectedReedModel('');
  };



  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading survey options...</div>;

  if (isSuccess) {
      return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
             <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Thank you for contributing!</h2>
                <div className="text-left bg-slate-50 rounded-lg p-6 mb-8 border border-slate-100">
                    <p className="text-sm text-slate-500 uppercase tracking-wide font-semibold mb-1">Instrument</p>
                    <p className="text-lg text-slate-800 font-medium mb-4">{formData.instrument}</p>

                    <p className="text-sm text-slate-500 uppercase tracking-wide font-semibold mb-1">Your Setup</p>
                    <p className="text-lg text-slate-800 font-medium mb-1">
                        {activeMouthpiece?.manufacturer} {activeMouthpiece?.model} {activeMouthpiece?.variant ? activeMouthpiece.variant : ''} {selectedTip?.label ? `- ${selectedTip.label}` : ''}
                    </p>
                    <p className="text-lg text-slate-800 font-medium">
                        {selectedReedMfg} {selectedReedModel} {formData.reed_id ? reeds.find(r => r.id === formData.reed_id)?.strength_label : ''}
                    </p>

                    {recommendation && (
                        <div className="mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                             <p className="text-sm text-indigo-600 uppercase tracking-wide font-bold mb-2">Top Recommendation</p>
                             <p className="text-slate-700">
                                 Players on this setup love the <span className="font-bold text-slate-900">{recommendation.name}</span>
                                 <span className="block text-sm text-slate-500 mt-1">Average Match: {recommendation.rating.toFixed(1)} / 5.0</span>
                             </p>
                        </div>
                    )}
                </div>
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                    <button 
                        onClick={handleReset}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-200"
                    >
                        Submit another setup
                    </button>
                    <a 
                        href="/" 
                        className="bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                        Back to main menu
                    </a>
                </div>
             </div>
        </div>
      );
  }

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
                             <div className="flex items-center mb-1">
                                <span className="text-slate-700 font-medium">Skill Level <span className="text-red-500">*</span></span>
                                <HelpPopover text="If you're a student, you're likely a beginner or intermediate. If you're an adult that just plays for fun, enthusiast probably fits. If you're at a level where you're making money sometimes, but it's not your full-time gig, the Semi-Pro is a good fit. If playing sax is your primary profession, or you're primarily playing with people in that category, choose Pro." />
                            </div>
                            <select 
                                className={cn(
                                    "block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm transition-colors",
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
                            <span className="text-slate-700 font-medium">Instrument <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors",
                                    errors.instrument && "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                                )}
                                value={formData.instrument || ''}
                                onChange={e => {
                                    setFormData({...formData, instrument: e.target.value as InstrumentType, mouthpiece_id: undefined, tip_opening_id: undefined});
                                    if(errors.instrument) setErrors({...errors, instrument: ''});
                                    setSelectedMpcMfg('');
                                    setSelectedMpcModel('');
                                }}
                            >
                                <option value="">Select Instrument</option>
                                {Object.values(InstrumentType).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <ErrorMsg field="instrument" errors={errors} />
                        </label>

                        <label className="block">
                            <span className="text-slate-700 font-medium">Setup Primary Genre <span className="text-red-500">*</span></span>
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

                        {formData.genre && (
                            <label className="block animate-in fade-in">
                                <span className="text-slate-700 font-medium">Sub-Genre</span>
                                <select
                                    className="mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm"
                                    value={formData.sub_genre || ''}
                                    onChange={e => setFormData({...formData, sub_genre: e.target.value})}
                                >
                                    <option value="">Select Sub-Genre</option>
                                    {formData.genre === "Jazz" && ["Bebop", "Swing", "Modern", "Fusion", "Big Band"].map(s => <option key={s} value={s}>{s}</option>)}
                                    {formData.genre === "Classical" && ["Solo", "Chamber", "Orchestral", "Concert Band"].map(s => <option key={s} value={s}>{s}</option>)}
                                    {formData.genre === "Pop" && ["Rock", "R&B", "Soul"].map(s => <option key={s} value={s}>{s}</option>)}
                                    {formData.genre === "Funk" && ["Funk", "Soul", "R&B"].map(s => <option key={s} value={s}>{s}</option>)}
                                    <option value="Other">Other</option>
                                </select>
                            </label>
                        )}

                        <label className="block">
                            <span className="text-slate-700 font-medium">Manufacturer <span className="text-red-500">*</span></span>
                            <select 
                                className={cn(
                                    "mt-1 block w-full rounded-md border-slate-300 bg-slate-50 p-2.5 shadow-sm transition-colors",
                                    errors.mpcMfg && "border-red-300 bg-red-50",
                                    !formData.instrument && "opacity-50 cursor-not-allowed"
                                )}
                                disabled={!formData.instrument}
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
                                <option value="Not Listed">Not Listed</option>
                            </select>
                            <ErrorMsg field="mpcMfg" errors={errors} />
                        </label>

                        {/* If Mfg is Not Listed, don't show Model/Tip dropdowns. Show text area instead. */}
                        {selectedMpcMfg === "Not Listed" ? (
                             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <label className="block">
                                    <span className="text-slate-700 font-medium">Tell us about your mouthpiece <span className="text-red-500">*</span></span>
                                    <p className="text-sm text-slate-500 mb-2">Please include: Manufacturer, Model, Tip Opening size (if known), and any other info.</p>
                                    <textarea 
                                        className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-[100px]"
                                        placeholder="e.g. Berg Larsen 105/3 SMS, bronze. Or Beechler 7*, 0.085, vintage."
                                        value={formData.mouthpiece_man_details || ''}
                                        onChange={e => setFormData({...formData, mouthpiece_man_details: e.target.value})}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">We may add this to our database in the future.</p>
                                </label>
                            </div>
                        ) : (
                            <>
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
                                        const val = e.target.value;
                                        setSelectedMpcModel(val);
                                        const mpc = getMouthpieceObj(selectedMpcMfg, val);
                                        
                                        // Auto-select logic
                                        let autoTipId: string | undefined = undefined;
                                        if (mpc && formData.instrument) {
                                            const instTips = mpc.tip_openings.filter(t => t.instrument === formData.instrument);
                                            // Since we treat all as valid now with fallback labels:
                                            if (instTips.length === 1) {
                                                autoTipId = instTips[0].id;
                                            }
                                        }

                                        setFormData(prev => ({...prev, mouthpiece_id: mpc?.id, tip_opening_id: autoTipId}));
                                        setErrors(p => ({...p, mpcModel: '', tipOpening: ''}));
                                    }}
                                >
                                    <option value="">Select Model</option>
                                    {mpcModelsUnique.map(m => <option key={m} value={m}>{m}</option>)}
                                    <option value="Not Listed">Not Listed</option>
                                </select>
                                <ErrorMsg field="mpcModel" errors={errors} />
                            </label>
    
                            {/* Tip Opening Selection */}
                            {(selectedMpcModel === "Not Listed") ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 mt-4">
                                    <label className="block">
                                        <span className="text-slate-700 font-medium">Tell us about this model <span className="text-red-500">*</span></span>
                                        <p className="text-sm text-slate-500 mb-2">Please include the Model Name and Tip Opening size.</p>
                                        <textarea 
                                            className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="e.g. Super Jet 7"
                                            value={formData.mouthpiece_man_details || ''}
                                            onChange={e => setFormData({...formData, mouthpiece_man_details: e.target.value})}
                                        />
                                    </label>
                                </div>
                            ) : (
                                activeMouthpiece && validTipOpenings.length > 0 && (
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
                                            {/* Note: We don't really support "Not Listed" for tip opening here easily
                                                because tip_opening_id is a UUID foreign key. 
                                                For now, if they can't find their tip, they might be stuck or choose nearest. 
                                                But per user request, we should add it. */}
                                            <option value="Not Listed">Not Listed</option>
                                        </select>
                                        <ErrorMsg field="tipOpening" errors={errors} />
                                        
                                        {/* If they chose Not Listed for Tip Opening */}
                                        {formData.tip_opening_id === "Not Listed" && (
                                             <div className="mt-2 animate-in fade-in">
                                                 <label className="block">
                                                    <span className="text-sm text-slate-700 font-medium">What is your tip opening size?</span>
                                                    <input 
                                                        type="text" 
                                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                        placeholder="e.g. 7*, .105, 6"
                                                        onChange={e => setFormData(p => ({...p, mouthpiece_man_details: (p.mouthpiece_man_details ? p.mouthpiece_man_details + "\nTip: " : "Tip: ") + e.target.value}))}
                                                    />
                                                </label>
                                             </div>
                                        )}
        
                                        {(() => {
                                            const displayTip = selectedTip || validTipOpenings.find(t => t.id === formData.tip_opening_id);
                                            if (!displayTip) return null;
                                            return (
                                                <div className="mt-3 flex items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
                                                    <span className="font-semibold mr-2">Specs:</span>
                                                    {displayTip.opening_inch.toFixed(3)}" ({ (displayTip.opening_inch * 25.4).toFixed(2) } mm)
                                                    {displayTip.facing_length && <span className="mx-2">•</span>}
                                                    {displayTip.facing_length && <span>Facing: {displayTip.facing_length}</span>}
                                                </div>
                                            );
                                        })()}
                                    </label>
                                )
                            )}
                            </>
                        )}
                        
                        <div className="pt-4 border-t border-slate-100 mt-6 animate-in fade-in">
                             <label className="flex items-center space-x-3 cursor-pointer group mb-2">
                                <input 
                                    type="checkbox" 
                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={formData.is_mouthpiece_modified}
                                    onChange={e => setFormData(p => ({...p, is_mouthpiece_modified: e.target.checked}))}    
                                />
                                <span className="text-slate-700 group-hover:text-slate-900">This mouthpiece has been refaced or modified.</span>
                            </label>
                            
                            {formData.is_mouthpiece_modified && (
                                <textarea 
                                    className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mt-2 text-sm"
                                    placeholder="Describe modifications (e.g. 'Tip opened to .085', 'Baffle added')..."
                                    value={formData.mouthpiece_mod_details || ''}
                                    onChange={e => setFormData(p => ({...p, mouthpiece_mod_details: e.target.value}))}
                                />
                            )}
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
                                <option value="Not Listed">Not Listed</option>
                            </select>
                            <ErrorMsg field="reedMfg" errors={errors} />
                        </label>

                        {/* If Reed Mfg is Not Listed, don't show Model/Strength dropdowns */}
                        {selectedReedMfg === "Not Listed" ? (
                             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <label className="block">
                                    <span className="text-slate-700 font-medium">Tell us about your reed <span className="text-red-500">*</span></span>
                                    <p className="text-sm text-slate-500 mb-2">Please include: Manufacturer, Model/Cut, and Strength.</p>
                                    <textarea 
                                        className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-[100px]"
                                        placeholder="e.g. Rigotti Gold 3 Strong"
                                        value={formData.reed_man_details || ''}
                                        onChange={e => setFormData({...formData, reed_man_details: e.target.value})}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">We may add this to our database in the future.</p>
                                </label>
                            </div>
                        ) : (
                            <>
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
                                    <option value="Not Listed">Not Listed</option>
                                </select>
                                <ErrorMsg field="reedModel" errors={errors} />
                            </label>
    
                            {(selectedReedModel === "Not Listed") ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 mt-4">
                                    <label className="block">
                                        <span className="text-slate-700 font-medium">Tell us about this reed <span className="text-red-500">*</span></span>
                                        <p className="text-sm text-slate-500 mb-2">Please include the Model/Cut Name and Strength.</p>
                                        <textarea 
                                            className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="e.g. V12 Strength 3.5"
                                            value={formData.reed_man_details || ''}
                                            onChange={e => setFormData({...formData, reed_man_details: e.target.value})}
                                        />
                                    </label>
                                </div>
                            ) : (
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
                                        <option value="Not Listed">Not Listed</option>
                                    </select>
                                    <ErrorMsg field="reedStrength" errors={errors} />
                                    
                                    {formData.reed_id === "Not Listed" && (
                                         <div className="mt-2 animate-in fade-in">
                                             <label className="block">
                                                <span className="text-sm text-slate-700 font-medium">What is your reed strength?</span>
                                                <input 
                                                    type="text" 
                                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    placeholder="e.g. 3.25, Medium Hard"
                                                    onChange={e => setFormData(p => ({...p, reed_man_details: (p.reed_man_details ? p.reed_man_details + "\nStrength: " : "Strength: ") + e.target.value}))}
                                                />
                                            </label>
                                         </div>
                                    )}
                                </label>
                            )}
                            </>
                        )}
                        
                         <div className="pt-4 border-t border-slate-100 mt-6 md-4">
                             <label className="flex items-center space-x-3 cursor-pointer group mb-2">
                                <input 
                                    type="checkbox" 
                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={formData.is_reed_modified}
                                    onChange={e => setFormData(p => ({...p, is_reed_modified: e.target.checked}))}    
                                />
                                <span className="text-slate-700 group-hover:text-slate-900">This reed is clipped or modified.</span>
                            </label>
                            
                            {formData.is_reed_modified && (
                                <textarea 
                                    className="w-full rounded-md border-slate-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mt-2 text-sm"
                                    placeholder="Describe modifications (e.g. 'Clipped', 'Sanded')..."
                                    value={formData.reed_mod_details || ''}
                                    onChange={e => setFormData(p => ({...p, reed_mod_details: e.target.value}))}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Evaluation */}
            {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                         <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">4</span>
                        Evaluation
                    </h2>

                    {/* 1. Overall Match (Suitability) */}
                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-baseline">
                            <label className="font-medium text-slate-700 flex items-center">
                                Overall Match <span className="text-red-500 mr-1">*</span>
                                <HelpPopover text="How do you feel about this setup, overall? Do you use it regularly? Is it good enough, but not as good as you want? Do you only use it as a backup?" />
                            </label>
                            <span className="text-indigo-600 font-bold text-lg">
                                {formData.suitability_rating !== undefined ? `${formData.suitability_rating} / 5` : "-"}
                            </span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={1} max={5} step={1}
                                value={formData.suitability_rating ?? 3}
                                onChange={(val) => setFormData({...formData, suitability_rating: val as number})}
                                trackStyle={{ backgroundColor: formData.suitability_rating === undefined ? '#cbd5e1' : '#4f46e5', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: formData.suitability_rating === undefined ? '#f1f5f9' : '#fff', opacity: 1, boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.2)' }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ 1: 'Terrible', 2: 'Poor', 3: 'Adequate', 4: 'Good', 5: 'Great' }}
                            />
                        </div>
                        <ErrorMsg field="suitability" errors={errors} />
                    </div>

                    {/* 2. Strength Match */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex justify-between">
                            <label className="font-medium text-slate-700 flex items-center">
                                Strength Match <span className="text-red-500 mr-1">*</span>
                                <HelpPopover text="How does the reed strength match the mouthpiece? Reeds that are too hard will often feel stuffy, difficult to blow, and have a limited dynamic range. Reeds that are too soft are easy to play, but will distort easily at higher dynamics." />
                            </label>
                            <span className="text-slate-500 font-medium">
                                {formData.strength_rating === undefined ? "Select..." :
                                 formData.strength_rating === 0 ? "Perfect" : 
                                 formData.strength_rating > 0 ? "Too Hard" : "Too Soft"}
                            </span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={-5} max={5} step={1}
                                value={formData.strength_rating ?? 0}
                                onChange={(val) => setFormData({...formData, strength_rating: val as number})}
                                trackStyle={{ backgroundColor: formData.strength_rating === undefined ? '#cbd5e1' : formData.strength_rating === 0 ? '#4f46e5' : '#94a3b8', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: formData.strength_rating === undefined ? '#f1f5f9' : '#fff', opacity: 1 }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ '-5': 'Too Soft', 0: 'Perfect', 5: 'Too Hard' }}
                            />
                        </div>
                        <ErrorMsg field="strength" errors={errors} />
                    </div>

                    {/* 3. Resistance */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex justify-between">
                            <label className="font-medium text-slate-700 flex items-center">
                                Resistance
                                <HelpPopover text='How much does this setup push back at you? Note: some people prefer a more open or resistive setup, depending on the genre and personal tastes. So this is not a "good/bad" scale.' />
                            </label>
                            <span className="text-slate-500 font-medium">
                                {formData.resistance_feel === undefined ? "Select..." :
                                 formData.resistance_feel === 0 ? "Medium" : 
                                 formData.resistance_feel > 0 ? "Resistant" : "Free-blowing"}
                            </span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={-5} max={5} step={1}
                                value={formData.resistance_feel ?? 0}
                                onChange={(val) => setFormData({...formData, resistance_feel: val as number})}
                                trackStyle={{ backgroundColor: formData.resistance_feel === undefined ? '#cbd5e1' : formData.resistance_feel === 0 ? '#4f46e5' : '#94a3b8', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: formData.resistance_feel === undefined ? '#f1f5f9' : '#fff', opacity: 1 }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ '-5': 'Free-blowing', 0: 'Medium', 5: 'Resistant' }}
                            />
                        </div>
                        <ErrorMsg field="resistance" errors={errors} />
                    </div>

                    {/* 4. Tone Color */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                         <div className="flex justify-between">
                            <label className="font-medium text-slate-700 flex items-center">
                                Tone Color
                                <HelpPopover text="Try to think of this objectively, separate from your preferences. Bright setups are more piercing, with lots of high frequencies. Darker setups are more mellow, without a lot of highs." />
                            </label>
                            <span className="text-slate-500 font-medium">
                                {formData.brightness_feel === undefined ? "Select..." :
                                 formData.brightness_feel === 0 ? "Neutral" : 
                                 formData.brightness_feel > 0 ? "Bright" : "Dark"}
                            </span>
                        </div>
                        <div className="px-2 pb-6">
                             <Slider 
                                min={-5} max={5} step={1}
                                value={formData.brightness_feel ?? 0}
                                onChange={(val) => setFormData({...formData, brightness_feel: val as number})}
                                trackStyle={{ backgroundColor: formData.brightness_feel === undefined ? '#cbd5e1' : '#4f46e5', height: 6 }}
                                handleStyle={{ borderColor: '#4f46e5', backgroundColor: formData.brightness_feel === undefined ? '#f1f5f9' : '#fff', opacity: 1 }}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{ '-5': 'Dark', 0: 'Neutral', 5: 'Bright' }}
                            />
                        </div>
                        <ErrorMsg field="brightness" errors={errors} />
                    </div>

                    {/* 5. Dynamic Range */}
                    <div className="space-y-4 pt-8 border-t border-slate-100">
                        <label className="font-medium text-slate-700 mb-4 flex items-center">
                            Comfortable Dynamic Range
                            <HelpPopover text="Give thought to how quietly/loudly you can play easily. Yeah, you can get a wide open jazz mouthpiece to play p if you really struggle, but the goal here is to capture the comfortable volume range." />
                        </label>
                        
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
                                trackStyle={[{ backgroundColor: (formData.min_dynamic === undefined || formData.max_dynamic === undefined) ? '#cbd5e1' : '#4f46e5', height: 6 }]}
                                handleStyle={[
                                    { borderColor: '#4f46e5', backgroundColor: (formData.min_dynamic === undefined) ? '#f1f5f9' : '#fff', opacity: 1 },
                                    { borderColor: '#4f46e5', backgroundColor: (formData.max_dynamic === undefined) ? '#f1f5f9' : '#fff', opacity: 1 }
                                ]}
                                railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                                marks={{
                                    1: 'ppp', 2: 'pp', 3: 'p', 4: 'mp', 5: 'mf', 6: 'f', 7: 'ff', 8: 'fff'
                                }}
                            />
                        </div>
                         <ErrorMsg field="dynamics" errors={errors} />
                    </div>

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
