import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

export default function WorkoutBuilder({ onStartWorkout, onOpenAdmin }) {
    // Flow State: 'dashboard' -> 'selection'
    const [step, setStep] = useState('dashboard');

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

    // We use the keys from the muscles object to drive the UI, 
    // ensuring we only show muscles that exist in our definition.
    // Alternatively, we could intersect with available exercises if we want to hide empty muscles.
    // For now, let's show all defined muscles.
    const availableMuscleKeys = Object.keys(muscles);

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
                            {availableMuscleKeys.map(m => {
                                const isSelected = selectedMuscles.includes(m);
                                const mapping = muscles[m] || { label: m, icon: '💪' };
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
                                        <div style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {mapping.icon && mapping.icon.startsWith('http') ? (
                                                <img
                                                    src={mapping.icon}
                                                    alt={mapping.label}
                                                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                                                />
                                            ) : (
                                                mapping.icon
                                            )}
                                        </div>
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
                    const mapping = muscles[m] || { label: m };
                    const allMuscleExercises = exercises.filter(ex => (ex.muscle_group_id || ex.mainMuscle) === m);

                    // Extract Sub-Muscles
                    // We can now use the predefined sub-muscles from the muscle object if we want to show all options,
                    // or stick to what's available in the exercises.
                    // Let's stick to available exercises for now to avoid empty filters,
                    // OR better: show all defined sub-muscles for this muscle group so user knows what's possible?
                    // User asked for "filtering based on sub-muscle", usually implies showing available filters.
                    // Let's use the sub-muscles defined in the muscle object + any extras found in exercises.

                    const definedSubMuscles = mapping.subMuscles || [];
                    // We only show sub-muscles that are explicitly defined for this muscle group.
                    // This prevents "garbage" or old data from appearing as filter chips.
                    const subMuscles = definedSubMuscles;

                    // Filter Logic
                    const displayedExercises = allMuscleExercises.filter(ex => {
                        if (selectedSubMuscles.length === 0) return true;
                        // If any sub-muscle selected, check if this exercise matches one of them
                        // But we only want to filter if the selected sub-muscle belongs to THIS muscle group?
                        // Actually, global filter is fine if sub-muscles are unique enough, or we check intersection.
                        // Let's assume we want to show exercise if its subMuscle is in selectedSubMuscles
                        // OR if no subMuscles for THIS muscle group are selected.

                        // Better UX: Filter chips are per muscle group visually, but state is global?
                        // Let's check if any of THIS muscle's sub-muscles are selected.
                        const hasActiveFilter = subMuscles.some(sm => selectedSubMuscles.includes(sm));
                        if (!hasActiveFilter) return true;
                        return selectedSubMuscles.includes(ex.subMuscle);
                    });

                    return (
                        <div key={m} style={{ marginBottom: '24px' }}>
                            <h3 style={{ borderBottom: '2px solid var(--accent-color)', paddingBottom: '8px', display: 'inline-block' }}>
                                {mapping.label}
                            </h3>

                            {/* Sub-Muscle Filters */}
                            {subMuscles.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                    {subMuscles.map(sm => {
                                        const isActive = selectedSubMuscles.includes(sm);
                                        return (
                                            <div
                                                key={sm}
                                                onClick={() => toggleSubMuscle(sm)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    background: isActive ? 'var(--accent-color)' : 'var(--bg-color)',
                                                    color: isActive ? 'white' : 'var(--text-color)',
                                                    boxShadow: isActive ? 'inset 2px 2px 5px rgba(0,0,0,0.2)' : '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {sm}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="grid-cols-2">
                                {displayedExercises.map(ex => {
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
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                                                    {ex.subMuscle} {ex.subMuscle && ex.equipment ? '•' : ''} {ex.equipment}
                                                </div>
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
                            {displayedExercises.length === 0 && (
                                <div style={{ color: '#718096', fontStyle: 'italic' }}>אין תרגילים התואמים את הסינון.</div>
                            )}
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
