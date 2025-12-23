import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { initialExercises } from '../data/initialData';
import ImageGalleryModal from './ImageGalleryModal';
import AIWorkoutModal from './AIWorkoutModal';
import { Dumbbell, Activity, Footprints, Shirt, HeartPulse, User, Zap, BicepsFlexed, Plus, Trash2, Save, Filter } from 'lucide-react';

const HEBREW_MUSCLE_NAMES = { 'Chest': 'חזה', 'Back': 'גב', 'Legs': 'רגליים', 'Shoulders': 'כתפיים', 'Arms': 'זרועות', 'Core': 'בטן', 'Glutes': 'ישבן', 'Cardio': 'אירובי', 'Full Body': 'כל הגוף', 'Abs': 'בטן' };
const WORKOUT_TYPES = ['מכשירים', 'משקולות חופשיות', 'כבלים', 'משקל גוף'];

// Fallback icons if no URL is found
const MUSCLE_ICONS_FALLBACK = { chest: Shirt, back: User, legs: Footprints, arms: Dumbbell, shoulders: BicepsFlexed, cardio: HeartPulse, core: Zap, abs: Zap, fullbody: Activity };

export default function WorkoutBuilder({ user, onStartWorkout, onBack, mode = 'create', initialSelectedExercises = [], initialWorkoutName = '', onAdd, onSave }) {
    const [step, setStep] = useState('dashboard');
    const [showAICoach, setShowAICoach] = useState(false);
    const [workoutName, setWorkoutName] = useState(initialWorkoutName || '');

    // Data
    const [exercises, setExercises] = useState([]);
    const [muscles, setMuscles] = useState({});

    // Selection State
    const [selectedMuscles, setSelectedMuscles] = useState([]);
    const [selectedExercises, setSelectedExercises] = useState([]);

    // Filters State
    const [selectedSubMuscles, setSelectedSubMuscles] = useState([]);
    const [selectedEquipment, setSelectedEquipment] = useState([]);
    const [selectedImages, setSelectedImages] = useState(null);

    useEffect(() => {
        storageService.initialize();
        loadData();
        if (initialSelectedExercises && initialSelectedExercises.length > 0) {
            // Sanitize incoming data
            const cleanInit = initialSelectedExercises
                .filter(e => e && e.id)
                .map(e => ({ ...e, sets: e.sets || [{ weight: '', reps: '' }] }));
            setSelectedExercises(cleanInit);

            // Pre-select muscles based on exercises
            const musclesFromEx = [...new Set(cleanInit.map(e => e.muscle_group_id || e.mainMuscle))];
            if (musclesFromEx.length > 0) setSelectedMuscles(musclesFromEx);
        }
    }, [initialSelectedExercises]);

    const loadData = async () => {
        try {
            const exList = await storageService.getExercises();
            // Merge images from local data if missing in DB
            const mergedEx = exList.map(ex => {
                const local = initialExercises.find(i => i.id === ex.id || i.name === ex.name);
                if (!ex.imageUrls?.length && local?.imageUrls?.length) {
                    return { ...ex, imageUrls: local.imageUrls };
                }
                return ex;
            });
            setExercises(mergedEx);

            const muscleData = await storageService.getMuscles();
            setMuscles(muscleData || {});
        } catch (e) { console.error('Data Load Error', e); }
    };

    const toggleMuscle = (m) => {
        selectedMuscles.includes(m)
            ? setSelectedMuscles(selectedMuscles.filter(x => x !== m))
            : setSelectedMuscles([...selectedMuscles, m]);
    };

    const toggleExercise = (ex) => {
        if (!ex || !ex.id) return;
        const exists = selectedExercises.find(e => e.id === ex.id);
        if (exists) {
            setSelectedExercises(selectedExercises.filter(e => e.id !== ex.id));
        } else {
            const safeExercise = { ...ex, sets: [{ weight: '', reps: '' }] };
            setSelectedExercises([...selectedExercises, safeExercise]);
        }
    };

    const toggleSubMuscle = (sub) => {
        selectedSubMuscles.includes(sub)
            ? setSelectedSubMuscles(selectedSubMuscles.filter(s => s !== sub))
            : setSelectedSubMuscles([...selectedSubMuscles, sub]);
    };

    const toggleEquipment = (eq) => {
        selectedEquipment.includes(eq)
            ? setSelectedEquipment(selectedEquipment.filter(e => e !== eq))
            : setSelectedEquipment([...selectedEquipment, eq]);
    };

    // --- CRITICAL SAFETY FIX ---
    const getCleanExercises = () => {
        return selectedExercises
            .filter(e => e && e.id)
            .map(e => ({
                ...e,
                sets: (Array.isArray(e.sets) && e.sets.length > 0) ? e.sets : [{ weight: '', reps: '' }]
            }));
    };

    const handleStart = async () => {
        if (selectedExercises.length === 0) { alert('נא לבחור תרגילים'); return; }
        const safeExercises = getCleanExercises();

        if (mode === 'trainer') { if (onSave) onSave(safeExercises); return; }
        if (mode === 'add') { if (onAdd) onAdd(safeExercises); return; }

        try { await storageService.saveTemplate(workoutName || 'אימון ללא שם', safeExercises, user?.id); } catch (e) { }
        if (onStartWorkout) onStartWorkout(safeExercises, workoutName);
    };

    // --- RENDERERS ---

    if (step === 'dashboard') {
        const availableMuscles = Object.keys(muscles).filter(m => !['cardio', 'full body'].includes(m.toLowerCase()));
        return (
            <div className='container mx-auto px-4 py-8 max-w-4xl'>
                <div className='flex justify-between items-center mb-8'>
                    <button onClick={onBack} className='neu-btn text-sm'>→ חזרה</button>
                    <button onClick={() => setShowAICoach(true)} className='neu-btn primary text-sm'>🤖 מאמן AI</button>
                </div>
                {showAICoach && <AIWorkoutModal onClose={() => setShowAICoach(false)} onStartWorkout={onStartWorkout} />}

                <div className='space-y-6'>
                    <div className="neu-card">
                        <label className="block mb-2 font-bold">שם האימון</label>
                        <input type="text" className="neu-input w-full" value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} placeholder="למשל: אימון חזה וכתפיים" />
                    </div>

                    <h3 className="text-xl font-bold mt-8">בחר שרירים</h3>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        {availableMuscles.map(m => {
                            const mapping = muscles[m] || { label: m };
                            const IconComp = MUSCLE_ICONS_FALLBACK[m.toLowerCase()] || Activity;

                            return (
                                <div key={m} onClick={() => toggleMuscle(m)}
                                    className={`neu-card p-6 cursor-pointer transition-all text-center flex flex-col items-center gap-2 ${selectedMuscles.includes(m) ? 'ring-2 ring-teal-500 bg-teal-50' : 'hover:bg-gray-50'}`}>

                                    {/* ICON LOGIC: Try Firebase URL first, then Fallback */}
                                    {mapping.icon && (mapping.icon.startsWith('http') || mapping.icon.startsWith('data:')) ? (
                                        <img src={mapping.icon} alt={m} className="w-16 h-16 object-contain mb-2" />
                                    ) : (
                                        <IconComp size={48} className="text-teal-600 mb-2" strokeWidth={1} />
                                    )}

                                    <span className='font-bold text-lg text-gray-700'>{HEBREW_MUSCLE_NAMES[m] || m}</span>
                                    {selectedMuscles.includes(m) && <span className="text-teal-600 text-sm">✓ נבחר</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <button onClick={() => { if (selectedMuscles.length === 0) alert('בחר לפחות שריר אחד'); else setStep('selection'); }} className="neu-btn primary w-full max-w-md py-4 text-lg">המשך לבחירת תרגילים ({selectedMuscles.length})</button>
                </div>
            </div>
        );
    }

    // --- SELECTION VIEW ---
    return (
        <div className='container mx-auto px-4 py-8 max-w-4xl pb-32'>
            <div className='flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-4 border-b'>
                <button onClick={() => setStep('dashboard')} className='neu-btn text-sm'>→ שנה בחירת שרירים</button>
                <h2 className='text-xl font-bold'>בחירת תרגילים</h2>
            </div>

            <div className="space-y-12">
                {selectedMuscles.map(m => {
                    const muscleLabel = HEBREW_MUSCLE_NAMES[m] || m;
                    const muscleExercises = exercises.filter(ex => (ex.muscle_group_id || ex.mainMuscle) === m);

                    const availableSubs = muscles[m]?.subMuscles || [];

                    const displayedEx = muscleExercises.filter(ex => {
                        if (selectedSubMuscles.length > 0) {
                            const relevantFilters = selectedSubMuscles.filter(sm => availableSubs.includes(sm));
                            if (relevantFilters.length > 0 && !relevantFilters.includes(ex.subMuscle)) return false;
                        }
                        if (selectedEquipment.length > 0 && !selectedEquipment.includes(ex.equipment)) return false;
                        return true;
                    });

                    return (
                        <div key={m} className="animate-fade-in">
                            <div className="flex items-center gap-4 mb-4 border-b pb-2 border-gray-100">
                                <h2 className="text-2xl font-bold text-teal-600">{muscleLabel}</h2>
                                <span className="text-sm text-gray-400">({displayedEx.length} תרגילים)</span>
                            </div>

                            <div className="mb-6 space-y-3">
                                {availableSubs.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {availableSubs.map(sm => (
                                            <button key={sm} onClick={() => toggleSubMuscle(sm)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedSubMuscles.includes(sm) ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                                                {sm}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {WORKOUT_TYPES.map(eq => (
                                        <button key={eq} onClick={() => toggleEquipment(eq)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedEquipment.includes(eq) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                                            {eq}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {displayedEx.map(ex => {
                                    const isSelected = !!selectedExercises.find(e => e.id === ex.id);
                                    return (
                                        <div key={ex.id} onClick={() => toggleExercise(ex)}
                                            className={`neu-card p-3 cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'ring-2 ring-cyan-400 bg-cyan-50' : 'hover:bg-white shadow-sm'}`}>
                                            <div className='flex items-center gap-4'>
                                                <div onClick={(e) => { e.stopPropagation(); setSelectedImages({ images: ex.imageUrls || [], title: ex.name }); }} className="relative w-16 h-16 flex-shrink-0 group cursor-zoom-in">
                                                    {ex.imageUrls?.[0] ? (
                                                        <img src={ex.imageUrls[0]} className='w-full h-full rounded-lg object-cover bg-gray-100 border border-gray-200' alt='' />
                                                    ) : (
                                                        <div className="w-full h-full rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-xl">💪</div>
                                                    )}
                                                    {ex.imageUrls?.length > 0 && <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold">הגדל</span></div>}
                                                </div>
                                                <div>
                                                    <div className='font-bold text-gray-800 text-base leading-tight'>{ex.name}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{ex.subMuscle} • {ex.equipment}</div>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-gray-300'}`}>
                                                {isSelected && <Plus size={14} />}
                                            </div>
                                        </div>
                                    );
                                })}
                                {displayedEx.length === 0 && <div className="text-gray-400 italic text-sm p-4">לא נמצאו תרגילים בסינון זה</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className='fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50'>
                <div className='max-w-4xl mx-auto flex gap-4 items-center'>
                    <div className='text-sm text-gray-500 font-bold whitespace-nowrap'>נבחרו: {selectedExercises.length}</div>
                    <button onClick={handleStart} className='flex-1 p-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold text-xl shadow-lg transform active:scale-95 transition-transform'>
                        {mode === 'add' ? 'הוסף לאימון' : 'התחל אימון'}
                    </button>
                </div>
            </div>

            <ImageGalleryModal isOpen={!!selectedImages} onClose={() => setSelectedImages(null)} images={selectedImages?.images || []} title={selectedImages?.title} />
        </div>
    );
}
