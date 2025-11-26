import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

export default function WorkoutBuilder({ onStartWorkout, onOpenAdmin }) {
    const [exercises, setExercises] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('new');
    const [workoutName, setWorkoutName] = useState('');

    const [selectedMuscle, setSelectedMuscle] = useState(null);
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [filterEquipment, setFilterEquipment] = useState('');



    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const exList = storageService.getExercises();
        setExercises(exList);

        const userTemplates = storageService.getTemplates();
        setTemplates(userTemplates);
    };

    const muscles = [...new Set(exercises.map(e => e.muscle_group_id || e.mainMuscle))];
    const equipmentList = [...new Set(exercises.map(e => e.equipment_type || e.equipment))];

    const filteredExercises = exercises.filter(ex => {
        const mGroup = ex.muscle_group_id || ex.mainMuscle;
        const eqType = ex.equipment_type || ex.equipment;

        if (selectedMuscle && mGroup !== selectedMuscle) return false;
        if (filterEquipment && eqType !== filterEquipment) return false;
        return true;
    });

    const toggleExercise = (ex) => {
        if (selectedExercises.find(e => e.id === ex.id)) {
            setSelectedExercises(selectedExercises.filter(e => e.id !== ex.id));
        } else {
            setSelectedExercises([...selectedExercises, ex]);
        }
    };

    const handleTemplateChange = (e) => {
        const val = e.target.value;
        setSelectedTemplateId(val);

        if (val !== 'new') {
            const template = templates.find(t => t.id === val);
            if (template) {
                // Map template exercises (which only have IDs) to full exercise objects
                const fullExercises = template.exercises.map(te => {
                    const fullEx = exercises.find(e => e.id === te.id);
                    return fullEx ? { ...fullEx, ...te } : null;
                }).filter(Boolean);

                // Immediately start workout with these exercises
                onStartWorkout(fullExercises, template.name);
            }
        } else {
            // Reset for new workout
            setSelectedExercises([]);
            setWorkoutName('');
        }
    };

    const handleStart = () => {
        if (selectedExercises.length === 0) return;

        const nameToSave = workoutName || 'My Workout';

        // Save as template if it's a new one
        if (selectedTemplateId === 'new' && workoutName) {
            storageService.saveTemplate(nameToSave, selectedExercises);
        }

        // Proceed to active workout
        onStartWorkout(selectedExercises, nameToSave);
    };

    return (
        <div className="container">
            <div className="flex-between" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="title" style={{ margin: 0, fontSize: '1.8rem' }}>Fit<span className="accent-text">Track</span></h1>
                    <div style={{ fontSize: '1rem', color: '#718096', marginTop: '4px' }}>
                        Welcome Back
                    </div>
                </div>
                <button onClick={onOpenAdmin} className="neu-btn" style={{ fontSize: '0.8rem' }}>⚙ Admin</button>
            </div>

            {/* Muscle Selection */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>Select Muscle Group</h3>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
                    <button
                        onClick={() => setSelectedMuscle(null)}
                        className={`neu-btn ${selectedMuscle === null ? 'primary' : ''}`}
                    >
                        All
                    </button>
                    {muscles.map(m => (
                        <button
                            key={m}
                            onClick={() => setSelectedMuscle(m)}
                            className={`neu-btn ${selectedMuscle === m ? 'primary' : ''}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="neu-card" style={{ marginBottom: '24px', padding: '16px' }}>
                <div className="flex-between">
                    <span style={{ fontWeight: 600 }}>Filter by Equipment:</span>
                    <select
                        className="neu-input"
                        style={{ width: 'auto' }}
                        value={filterEquipment}
                        onChange={(e) => setFilterEquipment(e.target.value)}
                    >
                        <option value="">All Equipment</option>
                        {equipmentList.map(eq => (
                            <option key={eq} value={eq}>{eq}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Exercise List */}
            <div style={{ marginBottom: '80px' }}>
                <div className="grid-cols-2">
                    {filteredExercises.map(ex => {
                        const isSelected = !!selectedExercises.find(e => e.id === ex.id);
                        return (
                            <div
                                key={ex.id}
                                className="neu-card"
                                onClick={() => toggleExercise(ex)}
                                style={{
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid var(--accent-color)' : '2px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div className="flex-between" style={{ marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{ex.name}</span>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        readOnly
                                        className="neu-checkbox"
                                    />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                                    {ex.sub_muscle_id || ex.subMuscle} • {ex.equipment_type || ex.equipment}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Floating Action Button */}
            {selectedExercises.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100
                }}>
                    <button
                        onClick={handleStart}
                        className="neu-btn primary"
                        style={{ padding: '16px 32px', fontSize: '1.2rem' }}
                    >
                        Start Workout ({selectedExercises.length})
                    </button>
                </div>
            )}
        </div>
    );
}
