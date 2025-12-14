import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import AIWorkoutModal from './AIWorkoutModal';
import ImageGalleryModal from './ImageGalleryModal';
import { initialExercises } from '../data/initialData';
import { Dumbbell, Activity, Footprints, Shirt, HeartPulse, User, Zap, BicepsFlexed } from 'lucide-react';

const MUSCLE_ICONS = {
    chest: Shirt,
    back: User,
    legs: Footprints,
    arms: Dumbbell,
    shoulders: BicepsFlexed,
    cardio: HeartPulse,
    core: Zap,
    abs: Zap,
    fullbody: Activity
};

const WORKOUT_TYPES = [
    'מכשירים',
    'משקולות חופשיות',
    'כבלים',
    'משקל גוף'
];

export default function WorkoutBuilder({ user, onStartWorkout, onOpenAdmin, onBack }) {
    // Flow State: 'dashboard' -> 'selection'
    const [step, setStep] = useState('dashboard');
    const [showAICoach, setShowAICoach] = useState(false);
    const [selectedImages, setSelectedImages] = useState(null); // { images: [], title: '' } or null

    // Data State
    const [exercises, setExercises] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [muscles, setMuscles] = useState({}); // Object: { 'Chest': { label: '...', ... } }

    // Workout State
    const [workoutName, setWorkoutName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('new');
    const [selectedExercises, setSelectedExercises] = useState([]);

    // Selection State
    const [selectedMuscles, setSelectedMuscles] = useState([]); // Array of strings (keys)
    const [selectedSubMuscles, setSelectedSubMuscles] = useState([]); // Array of strings
    const [selectedEquipment, setSelectedEquipment] = useState({}); // Object: { 'Chest': ['Machines'], ... }

    useEffect(() => {
        // For dev: force reset to load new Hebrew data if needed, or just init
        // storageService.resetData(); // Uncomment to force update data
        storageService.initialize();
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            const exList = await storageService.getExercises();

            // Merge with local initial data to ensure images are present if missing in DB
            const mergedExercises = exList.map(ex => {
                // Try exact ID match first
                let localEx = initialExercises.find(ie => ie.id === ex.id);

                // If no ID match, try name match (normalized)
                if (!localEx) {
                    localEx = initialExercises.find(ie => ie.name.trim() === ex.name.trim());
                }

                if (localEx && localEx.imageUrls && localEx.imageUrls.length > 0) {
                    // console.log(`Merging images for ${ex.name}:`, localEx.imageUrls);
                    if (!ex.imageUrls || ex.imageUrls.length === 0) {
                        return { ...ex, imageUrls: localEx.imageUrls };
                    }
                }
                return ex;
            });

            // Debug: Check if specific exercises have images
            const debugEx = mergedExercises.find(e => e.name.includes('כפיפת מרפקים'));
            console.log("Debug Bicep Curls:", debugEx);

            setExercises(mergedExercises);

            const userTemplates = await storageService.getTemplates(user?.id);
            setTemplates(userTemplates);

            const muscleData = await storageService.getMuscles();
            setMuscles(muscleData);
        } catch (error) {
            console.error("Failed to load data:", error);
        }
    };

    // --- Logic ---

    const handleTemplateChange = (e) => {
        const val = e.target.value;
        setSelectedTemplateId(val);

        if (val !== 'new') {
            // Template IDs are strings in Firestore
            const template = templates.find(t => t.id === val);
            if (template) {
                setWorkoutName(template.name);
                // Hydrate exercises
                const fullExercises = template.exercises.map(te => {
                    const fullEx = exercises.find(e => e.id === te.id);
                    return fullEx ? { ...fullEx, ...te } : null;
                }).filter(Boolean);
                setSelectedExercises(fullExercises);
            }
        } else {
            setWorkoutName('');
            setSelectedExercises([]);
            setSelectedMuscles([]);
            setSelectedSubMuscles([]);
            setSelectedEquipment({});
        }
    };

    const toggleMuscle = (muscleKey) => {
        if (selectedMuscles.includes(muscleKey)) {
            setSelectedMuscles(selectedMuscles.filter(m => m !== muscleKey));
        } else {
            setSelectedMuscles([...selectedMuscles, muscleKey]);
        }
    };

    const toggleSubMuscle = (sub) => {
        if (selectedSubMuscles.includes(sub)) {
            setSelectedSubMuscles(selectedSubMuscles.filter(s => s !== sub));
        } else {
            setSelectedSubMuscles([...selectedSubMuscles, sub]);
        }
    };

    const toggleEquipment = (muscle, eq) => {
        const current = selectedEquipment[muscle] || [];
        if (current.includes(eq)) {
            setSelectedEquipment({
                ...selectedEquipment,
                [muscle]: current.filter(e => e !== eq)
            });
        } else {
            setSelectedEquipment({
                ...selectedEquipment,
                [muscle]: [...current, eq]
            });
        }
    };

    const toggleExercise = (ex) => {
        const exists = selectedExercises.find(e => e.id === ex.id);
        if (exists) {
            setSelectedExercises(selectedExercises.filter(e => e.id !== ex.id));
        } else {
            const newExercise = { ...ex, sets: [{ weight: '', reps: '' }] };
            setSelectedExercises([...selectedExercises, newExercise]);
        }
    };

    const handleContinue = () => {
        if (selectedTemplateId !== 'new') {
            // If template selected, go straight to workout
            onStartWorkout(selectedExercises, workoutName);
        } else {
            // New workout flow
            if (!workoutName) {
                alert('נא להזין שם לאימון');
                return;
            }
            if (selectedMuscles.length === 0) {
                alert('נא לבחור לפחות שריר אחד');
                return;
            }
            setStep('selection');
        }
    };

    const handleStart = () => {
        if (selectedExercises.length === 0) {
            alert('נא לבחור לפחות תרגיל אחד');
            return;
        }

        // Save as template if new
        if (selectedTemplateId === 'new') {
            storageService.saveTemplate(workoutName, selectedExercises, user?.id).catch(console.error);
        }

        onStartWorkout(selectedExercises, workoutName);
    };

    // --- Renderers ---

    const availableMuscleKeys = Object.keys(muscles);

    if (step === 'dashboard') {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-4">
                        <button onClick={onBack} className="neu-btn text-sm">
                            → חזרה
                        </button>
                        <button onClick={onOpenAdmin} className="neu-btn text-sm">
                            <span>⚙</span> מנהל
                        </button>
                        <button
                            onClick={() => setShowAICoach(true)}
                            className="neu-btn primary text-sm"
                        >
                            <span>🤖</span> מאמן AI
                        </button>
                    </div>
                    <div className="text-left">
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-600 mb-1">
                            איזה כיף שחזרת להתאמן
                        </h1>
                        <div className="text-gray-500 font-medium">יצירת/פתיחת אימון</div>
                    </div>
                </div>

                {showAICoach && (
                    <AIWorkoutModal
                        onClose={() => setShowAICoach(false)}
                        onStartWorkout={(exercises, name) => {
                            setShowAICoach(false);
                            onStartWorkout(exercises, name);
                        }}
                    />
                )}

                {/* Section A: Choose Workout */}
                <div className="neu-card mb-8 animate-fade-in">
                    <label className="block mb-3 font-bold text-gray-700">בחר אימון</label>
                    <select
                        className="neu-input"
                        value={selectedTemplateId}
                        onChange={handleTemplateChange}
                    >
                        <option value="new">צור אימון חדש +</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Section B & C: Only if New Workout */}
                {selectedTemplateId === 'new' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="neu-card">
                            <label className="block mb-3 font-bold text-gray-700">שם האימון החדש</label>
                            <input
                                type="text"
                                className="neu-input"
                                placeholder="למשל: אימון חזה וכתפיים"
                                value={workoutName}
                                onChange={(e) => setWorkoutName(e.target.value)}
                            />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold mb-4 text-gray-800">בחר שרירים לאימון</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {availableMuscleKeys.map(m => {
                                    const isSelected = selectedMuscles.includes(m);
                                    const mapping = muscles[m] || { label: m, icon: '💪' };
                                    return (
                                        <div
                                            key={m}
                                            onClick={() => toggleMuscle(m)}
                                            className={`neu-card cursor-pointer transition-all duration-300 flex items-center justify-between flex-row-reverse p-4 ${isSelected
                                                ? 'ring-2 ring-cyan-400 transform scale-105 shadow-lg'
                                                : 'hover:translate-y-[-2px]'
                                                }`}
                                        >
                                            <div className="text-4xl mb-2 flex justify-center">
                                                {mapping.icon && (mapping.icon.startsWith('http') || mapping.icon.startsWith('data:')) ? (
                                                    <img
                                                        src={mapping.icon}
                                                        alt={mapping.label}
                                                        className="w-12 h-12 object-contain mx-auto"
                                                    />
                                                ) : (() => {
                                                    const IconComponent = MUSCLE_ICONS[m.toLowerCase()] || MUSCLE_ICONS[mapping.label.toLowerCase()] || null;
                                                    if (IconComponent) {
                                                        return <IconComponent size={40} strokeWidth={1.5} className={isSelected ? 'text-cyan-500' : 'text-slate-400'} />;
                                                    }
                                                    return <span>{mapping.icon || '💪'}</span>;
                                                })()}
                                            </div>
                                            <div className={`font-bold ${isSelected ? 'text-teal-600' : 'text-gray-600'}`}>
                                                {mapping.label}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Action Button */}
                <div className="text-center mt-12 mb-8">
                    <button
                        onClick={handleContinue}
                        className="neu-btn primary w-full max-w-md mx-auto text-lg py-4"
                    >
                        {selectedTemplateId === 'new' ? 'המשך לבחירת תרגילים ←' : 'התחל אימון ←'}
                    </button>
                </div>

                {/* Version Footer */}
                <div className="text-center text-xs text-gray-300 mt-8 pb-4 font-mono">
                    גרסה: 8f2a1b9 | תאריך: 14/12/2025
                </div>
            </div>
        );
    }

    // Step 2: Selection View
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => setStep('dashboard')} className="neu-btn text-sm">
                    → חזרה
                </button>
                <h2 className="text-2xl font-bold text-gray-800">בחירת תרגילים</h2>
            </div>

            <div className="space-y-8">
                {selectedMuscles.map(m => {
                    const mapping = muscles[m] || { label: m };
                    const allMuscleExercises = exercises.filter(ex => (ex.muscle_group_id || ex.mainMuscle) === m);
                    const definedSubMuscles = mapping.subMuscles || [];
                    const subMuscles = definedSubMuscles;
                    const muscleEquipment = selectedEquipment[m] || [];

                    const displayedExercises = allMuscleExercises.filter(ex => {
                        // Filter by Sub-Muscle
                        if (selectedSubMuscles.length > 0) {
                            const hasActiveFilterForThisGroup = subMuscles.some(sm => selectedSubMuscles.includes(sm));
                            if (hasActiveFilterForThisGroup) {
                                if (!selectedSubMuscles.includes(ex.subMuscle)) return false;
                            }
                        }

                        // Filter by Equipment (Per Muscle)
                        if (muscleEquipment.length > 0) {
                            if (!muscleEquipment.includes(ex.equipment)) return false;
                        }

                        return true;
                    });

                    return (
                        <div key={m} className="animate-fade-in">
                            <h3 className="text-xl font-bold text-teal-600 border-b-2 border-teal-100 pb-2 inline-block mb-4">
                                {mapping.label}
                            </h3>

                            <div className="flex flex-col gap-3 mb-4">
                                {/* Sub-Muscle Filters */}
                                {subMuscles.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {subMuscles.map(sm => {
                                            const isActive = selectedSubMuscles.includes(sm);
                                            return (
                                                <div
                                                    key={sm}
                                                    onClick={() => toggleSubMuscle(sm)}
                                                    className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all shadow-sm ${isActive
                                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {sm}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Equipment Filters (Per Muscle) */}
                                <div className="mt-2">
                                    <div className="text-xs font-bold text-gray-400 mb-2">סוג ציוד:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {(WORKOUT_TYPES || []).map(eq => {
                                            const isActive = muscleEquipment.includes(eq);
                                            return (
                                                <div
                                                    key={eq}
                                                    onClick={() => toggleEquipment(m, eq)}
                                                    className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-all border ${isActive
                                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {eq}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {displayedExercises.map(ex => {
                                    const isSelected = !!selectedExercises.find(e => e.id === ex.id);
                                    return (
                                        <div
                                            key={ex.id}
                                            onClick={() => toggleExercise(ex)}
                                            className={`neu-card p-4 cursor-pointer flex justify-between items-center transition-all ${isSelected
                                                ? 'ring-2 ring-cyan-400 bg-cyan-50/50'
                                                : 'hover:bg-white'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                    {ex.name}
                                                    {ex.imageUrls && ex.imageUrls.length > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedImages({ images: ex.imageUrls, title: ex.name });
                                                            }}
                                                            className="neu-btn text-xs px-2 py-1 ml-2 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                                                        >
                                                            📷 תמונות
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {ex.subMuscle} {ex.subMuscle && ex.equipment ? '•' : ''} {ex.equipment}
                                                </div>
                                            </div>
                                            <div className={`neu-checkbox ${isSelected ? 'checked' : ''}`}>
                                                {isSelected && <span className="text-white text-sm">✓</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {displayedExercises.length === 0 && (
                                <div className="text-gray-400 italic text-sm mt-2">אין תרגילים התואמים את הסינון.</div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md z-50">
                <button
                    onClick={handleStart}
                    className="neu-btn primary w-full py-4 text-xl shadow-2xl"
                >
                    התחל אימון ({selectedExercises.length})
                </button>
            </div>
            <div className="h-24"></div>

            <ImageGalleryModal
                isOpen={!!selectedImages}
                onClose={() => setSelectedImages(null)}
                images={selectedImages?.images || []}
                title={selectedImages?.title}
            />
        </div>
    );
}
