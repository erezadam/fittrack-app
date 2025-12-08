import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import AIWorkoutModal from './AIWorkoutModal';

export default function WorkoutBuilder({ onStartWorkout, onOpenAdmin }) {
    // Flow State: 'dashboard' -> 'selection'
    const [step, setStep] = useState('dashboard');
    const [showAICoach, setShowAICoach] = useState(false);

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

    useEffect(() => {
        // For dev: force reset to load new Hebrew data if needed, or just init
        // storageService.resetData(); // Uncomment to force update data
        storageService.initialize();
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const exList = await storageService.getExercises();
            setExercises(exList);

            const userTemplates = await storageService.getTemplates();
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
            storageService.saveTemplate(workoutName, selectedExercises).catch(console.error);
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
                                            <div className="text-4xl mb-2">
                                                {mapping.icon && (mapping.icon.startsWith('http') || mapping.icon.startsWith('data:')) ? (
                                                    <img
                                                        src={mapping.icon}
                                                        alt={mapping.label}
                                                        className="w-12 h-12 object-contain mx-auto"
                                                    />
                                                ) : (
                                                    <span>{mapping.icon || '💪'}</span>
                                                )}
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

                    const displayedExercises = allMuscleExercises.filter(ex => {
                        if (selectedSubMuscles.length === 0) return true;
                        const hasActiveFilter = subMuscles.some(sm => selectedSubMuscles.includes(sm));
                        if (!hasActiveFilter) return true;
                        return selectedSubMuscles.includes(ex.subMuscle);
                    });

                    return (
                        <div key={m} className="animate-fade-in">
                            <h3 className="text-xl font-bold text-teal-600 border-b-2 border-teal-100 pb-2 inline-block mb-4">
                                {mapping.label}
                            </h3>

                            {/* Sub-Muscle Filters */}
                            {subMuscles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
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
                                                <div className="font-bold text-gray-800">{ex.name}</div>
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
        </div>
    );
}
