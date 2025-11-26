import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const MUSCLE_MAP = {
    'Chest': { label: 'חזה', icon: '👕' },
    'Back': { label: 'גב', icon: '🦅' },
    'Legs': { label: 'רגליים', icon: '🦵' },
    'Shoulders': { label: 'כתפיים', icon: '🥥' },
    'Arms': { label: 'ידיים', icon: '💪' },
    'Core': { label: 'בטן', icon: '🍫' },
    'Cardio': { label: 'אירובי', icon: '🏃‍♂️' },
    'Full Body': { label: 'כל הגוף', icon: '⚡' }
};

export default function WorkoutBuilder({ onStartWorkout, onOpenAdmin }) {
    // Flow State: 'dashboard' -> 'selection'
    const [step, setStep] = useState('dashboard');

    // Data State
    const [exercises, setExercises] = useState([]);
    const [templates, setTemplates] = useState([]);

    // Workout State
    const [workoutName, setWorkoutName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('new');
    const [selectedExercises, setSelectedExercises] = useState([]);

    // Selection State
    const [selectedMuscles, setSelectedMuscles] = useState([]); // Array of strings

    useEffect(() => {
        storageService.initialize();
        loadData();
    }, []);

    const loadData = () => {
        const exList = storageService.getExercises();
        setExercises(exList);

        const userTemplates = storageService.getTemplates();
        setTemplates(userTemplates);
    };

    // --- Logic ---

    const handleTemplateChange = (e) => {
        const val = e.target.value;
        setSelectedTemplateId(val);

        if (val !== 'new') {
            // Template IDs are numbers (Date.now()), val is string from select
            const template = templates.find(t => t.id === Number(val));
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
        }
    };

    const toggleMuscle = (muscleKey) => {
        if (selectedMuscles.includes(muscleKey)) {
            setSelectedMuscles(selectedMuscles.filter(m => m !== muscleKey));
        } else {
            setSelectedMuscles([...selectedMuscles, muscleKey]);
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
            storageService.saveTemplate(workoutName, selectedExercises);
        }

        onStartWorkout(selectedExercises, workoutName);
    };

    // --- Renderers ---

    const availableMuscles = [...new Set(exercises.map(e => e.muscle_group_id || e.mainMuscle))];

    if (step === 'dashboard') {
        return (
            <div className="container" style={{ marginTop: '20px' }}>
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                    <button onClick={onOpenAdmin} className="neu-btn" style={{ fontSize: '0.8rem' }}>מנהל ⚙</button>
                    <div style={{ textAlign: 'left' }}>
                        <h1 className="title" style={{ margin: 0, fontSize: '1.5rem', textAlign: 'right', color: 'var(--accent-color)' }}>
                            איזה כיף שחזרת להתאמן
                        </h1>
                        <div style={{ fontSize: '1rem', color: '#718096' }}>יצירת/פתיחת אימון</div>
                    </div>
                </div>

                {/* Section A: Choose Workout */}
                <div className="neu-card" style={{ marginBottom: '24px', padding: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>בחר אימון</label>
                    <select
                        className="neu-input"
                        value={selectedTemplateId}
                        onChange={handleTemplateChange}
                        style={{ fontSize: '1rem' }}
                    >
                        <option value="new">צור אימון חדש +</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Section B & C: Only if New Workout */}
                {selectedTemplateId === 'new' && (
                    <div className="animate-fade-in">
                        <div className="neu-card" style={{ marginBottom: '24px', padding: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>שם האימון החדש</label>
                            <input
                                type="text"
                                className="neu-input"
                                placeholder="למשל: אימון חזה וכתפיים"
                                value={workoutName}
                                onChange={(e) => setWorkoutName(e.target.value)}
                            />
                        </div>

                        <h3 style={{ marginBottom: '16px' }}>בחר שרירים לאימון</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '16px',
                            marginBottom: '32px'
                        }}>
                            {availableMuscles.map(m => {
                                const isSelected = selectedMuscles.includes(m);
                                const mapping = MUSCLE_MAP[m] || { label: m, icon: '💪' };
                                return (
                                    <div
                                        key={m}
                                        onClick={() => toggleMuscle(m)}
                                        className="neu-card"
                                        style={{
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            padding: '20px',
                                            border: isSelected ? '2px solid var(--accent-color)' : '2px solid transparent',
                                            background: isSelected ? 'var(--bg-color)' : '',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexDirection: 'row-reverse'
                                        }}
                                    >
                                        <div style={{ fontSize: '1.5rem' }}>{mapping.icon}</div>
                                        <div style={{ fontWeight: 600 }}>{mapping.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Main Action Button */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <button
                        onClick={handleContinue}
                        className="neu-btn primary"
                        style={{ width: '100%', maxWidth: '400px', padding: '16px', fontSize: '1.2rem' }}
                    >
                        {selectedTemplateId === 'new' ? 'המשך לבחירת תרגילים ←' : 'התחל אימון ←'}
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Selection View
    return (
        <div className="container" style={{ marginTop: '20px' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
                <button onClick={() => setStep('dashboard')} className="neu-btn">→ חזרה</button>
                <h2 style={{ margin: 0 }}>בחירת תרגילים</h2>
            </div>

            <div style={{ marginBottom: '20px' }}>
                {selectedMuscles.map(m => {
                    const mapping = MUSCLE_MAP[m] || { label: m };
                    const muscleExercises = exercises.filter(ex => (ex.muscle_group_id || ex.mainMuscle) === m);

                    return (
                        <div key={m} style={{ marginBottom: '24px' }}>
                            <h3 style={{ borderBottom: '2px solid var(--accent-color)', paddingBottom: '8px', display: 'inline-block' }}>
                                {mapping.label}
                            </h3>
                            <div className="grid-cols-2">
                                {muscleExercises.map(ex => {
                                    const isSelected = !!selectedExercises.find(e => e.id === ex.id);
                                    return (
                                        <div
                                            key={ex.id}
                                            className="neu-card"
                                            onClick={() => toggleExercise(ex)}
                                            style={{
                                                cursor: 'pointer',
                                                border: isSelected ? '2px solid var(--accent-color)' : '2px solid transparent',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{ex.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{ex.equipment}</div>
                                            </div>
                                            <div className={`neu-checkbox ${isSelected ? 'checked' : ''}`} style={{
                                                background: isSelected ? 'var(--accent-color)' : 'var(--bg-color)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                            }}>
                                                {isSelected && '✓'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                width: '90%',
                maxWidth: '400px'
            }}>
                <button
                    onClick={handleStart}
                    className="neu-btn primary"
                    style={{ width: '100%', padding: '16px', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                >
                    התחל אימון ({selectedExercises.length})
                </button>
            </div>
            <div style={{ height: '80px' }}></div>
        </div>
    );
}
