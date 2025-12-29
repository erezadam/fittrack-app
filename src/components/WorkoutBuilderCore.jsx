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

export default function WorkoutBuilderCore({
    user,
    onStartWorkout,
    onBack,
    mode = 'create', // 'create' | 'trainer' | 'add'
    initialSelectedExercises = [],

    // Controlled Props (Optional)
    workoutName: controlledName,
    onWorkoutNameChange,
    workoutDate: controlledDate,
    onDateChange,

    onAdd,
    onSave
}) {
    const [step, setStep] = useState('dashboard');
    const [showAICoach, setShowAICoach] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Internal State (fallback if not controlled)
    const [internalName, setInternalName] = useState('');
    const [internalDate, setInternalDate] = useState(new Date().toISOString().split('T')[0]);

    // Resolved Values
    const workoutName = controlledName !== undefined ? controlledName : internalName;
    const workoutDate = controlledDate !== undefined ? controlledDate : internalDate;

    // Handlers
    const handleNameChange = (val) => {
        if (onWorkoutNameChange) onWorkoutNameChange(val);
        setInternalName(val);
    };

    const handleDateChange = (val) => {
        if (onDateChange) onDateChange(val);
        setInternalDate(val);
    };

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

    const handleSave = async () => {
        if (!workoutName.trim()) {
            alert('נא להזין שם לאימון');
            return;
        }
        if (selectedExercises.length === 0) {
            alert('נא לבחור לפחות תרגיל אחד');
            return;
        }

        const safeExercises = getCleanExercises();

        // Trainer Mode Delegate
        if (mode === 'trainer' && onSave) {
            onSave(safeExercises);
            return;
        }

        setIsSaving(true);
        try {
            await storageService.savePlannedWorkout(safeExercises, workoutDate, workoutName, user.id);
            if (onBack) onBack();
            else alert('האימון נשמר בהצלחה!');
        } catch (error) {
            console.error(error);
            alert('שגיאה בשמירת האימון');
        } finally {
            setIsSaving(false);
        }
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
                    <div className="bg-brand-card p-6 rounded-2xl shadow-sm border border-brand-accent/10 mb-6">
                        <label className="block text-sm font-bold text-brand-text mb-2">כינוי לאימון</label>
                        <input
                            type="text"
                            value={workoutName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="לדוגמה: אימון חזה ויד אחורית"
                            className="w-full p-3 !bg-[var(--bg-card)] border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all font-bold text-lg !text-[var(--text-primary)] !placeholder-brand-muted"
                        />

                        <label className="block text-sm font-bold text-brand-text mt-4 mb-2">תאריך אימון (אופציונלי)</label>
                        <input
                            type="date"
                            value={workoutDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="w-full p-3 !bg-[var(--bg-card)] border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-accent outline-none transition-all font-bold text-lg !text-[var(--text-primary)]"
                        />
                    </div>
                    <h3 className="text-xl font-bold mt-8">בחר שרירים</h3>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        {availableMuscles.map(m => {
                            const mapping = muscles[m] || { label: m };
                            const IconComp = MUSCLE_ICONS_FALLBACK[m.toLowerCase()] || Activity;

                            return (
                                <div key={m} onClick={() => toggleMuscle(m)}
                                    className={`neu-card p-6 cursor-pointer transition-all text-center flex flex-col items-center gap-2 ${selectedMuscles.includes(m) ? 'ring-2 ring-brand-accent bg-brand-accent/10' : 'hover:bg-brand-accent/5'}`}>

                                    {mapping.icon && ((typeof mapping.icon === 'string' && mapping.icon.startsWith('http')) || (typeof mapping.icon === 'string' && mapping.icon.startsWith('data:'))) ? (
                                        <img src={mapping.icon} alt={m} className="w-16 h-16 object-contain mb-2" />
                                    ) : (
                                        <IconComp size={48} className="text-brand-accent mb-2" strokeWidth={1} />
                                    )}

                                    <span className='font-bold text-lg text-brand-text'>{HEBREW_MUSCLE_NAMES[m] || m}</span>
                                    {selectedMuscles.includes(m) && <span className="text-brand-accent text-sm">✓ נבחר</span>}
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
            <div className='flex justify-between items-center mb-6 sticky top-0 bg-brand-card z-10 py-4 border-b'>
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
                            <div className="flex items-center gap-4 mb-4 border-b pb-2 border-brand-accent/10">
                                <h2 className="text-2xl font-bold text-brand-accent">{muscleLabel}</h2>
                                <span className="text-sm text-brand-muted">({displayedEx.length} תרגילים)</span>
                            </div>

                            <div className="mb-6 space-y-3">
                                {availableSubs.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {availableSubs.map(sm => (
                                            <button key={sm} onClick={() => toggleSubMuscle(sm)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedSubMuscles.includes(sm) ? 'bg-brand-accent text-white border-brand-accent' : 'bg-brand-card text-brand-muted border-brand-accent/20 hover:border-brand-accent/40'}`}>
                                                {sm}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {WORKOUT_TYPES.map(eq => (
                                        <button key={eq} onClick={() => toggleEquipment(eq)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedEquipment.includes(eq) ? 'bg-brand-card text-brand-accent border-brand-accent' : 'bg-brand-card text-brand-muted border-brand-accent/20 hover:border-brand-accent/40'}`}>
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
                                            className={`neu-card p-3 cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'ring-2 ring-brand-accent bg-brand-accent/10' : 'hover:bg-brand-card shadow-sm'}`}>
                                            <div className='flex items-center gap-4'>
                                                <div onClick={(e) => { e.stopPropagation(); setSelectedImages({ images: ex.imageUrls || [], title: ex.name }); }} className="relative w-16 h-16 flex-shrink-0 group cursor-zoom-in">
                                                    {ex.imageUrls?.[0] ? (
                                                        <img src={ex.imageUrls[0]} className='w-full h-full rounded-lg object-cover bg-brand-bg border border-brand-accent/10' alt='' />
                                                    ) : (
                                                        <div className="w-full h-full rounded-lg bg-brand-bg/50 border border-brand-accent/10 flex items-center justify-center text-xl">💪</div>
                                                    )}
                                                    {ex.imageUrls?.length > 0 && <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold">הגדל</span></div>}
                                                </div>
                                                <div>
                                                    <div className='font-bold text-brand-text text-base leading-tight'>{ex.name}</div>
                                                    <div className="text-xs text-brand-muted mt-1">{ex.subMuscle} • {ex.equipment}</div>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-accent border-brand-accent text-white' : 'border-brand-muted/30'}`}>
                                                {isSelected && <Plus size={14} />}
                                            </div>
                                        </div>
                                    );
                                })}
                                {displayedEx.length === 0 && <div className="text-brand-muted italic text-sm p-4">לא נמצאו תרגילים בסינון זה</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className='fixed bottom-0 left-0 right-0 p-4 bg-brand-card border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50'>
                <div className='max-w-4xl mx-auto flex gap-3 items-center'>
                    <div className='text-sm text-brand-muted font-bold whitespace-nowrap hidden md:block'>נבחרו: {selectedExercises.length}</div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="py-4 px-6 bg-brand-card text-brand-accent border border-brand-accent hover:bg-brand-accent/10 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                    >
                        <Save size={20} /> <span className="hidden md:inline">{mode === 'trainer' ? 'סיים ושיבץ' : 'שמור'}</span>
                    </button>

                    <button onClick={handleStart} className='flex-1 p-4 bg-brand-accent text-white rounded-xl font-bold text-xl shadow-lg transform active:scale-95 transition-transform'>
                        {mode === 'add' ? 'הוסף לאימון' : 'התחל אימון'}
                    </button>
                </div>
            </div>

            <ImageGalleryModal isOpen={!!selectedImages} onClose={() => setSelectedImages(null)} images={selectedImages?.images || []} title={selectedImages?.title} />
        </div>
    );
}
