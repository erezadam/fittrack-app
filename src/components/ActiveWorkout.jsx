import React, { useState } from 'react';
import { storageService } from '../services/storageService';

export default function ActiveWorkout({ exercises, workoutName, onFinish, onCancel }) {

    const [workoutData, setWorkoutData] = useState(
        exercises.reduce((acc, ex) => ({
            ...acc,
            [ex.id]: { sets: [{ weight: '', reps: '' }] }
        }), {})
    );

    const updateSet = (exId, setIndex, field, value) => {
        const currentSets = [...workoutData[exId].sets];
        currentSets[setIndex] = { ...currentSets[setIndex], [field]: value };
        setWorkoutData({
            ...workoutData,
            [exId]: { ...workoutData[exId], sets: currentSets }
        });
    };

    const addSet = (exId) => {
        setWorkoutData({
            ...workoutData,
            [exId]: {
                ...workoutData[exId],
                sets: [...workoutData[exId].sets, { weight: '', reps: '' }]
            }
        });
    };

    const removeSet = (exId, setIndex) => {
        const currentSets = workoutData[exId].sets.filter((_, i) => i !== setIndex);
        setWorkoutData({
            ...workoutData,
            [exId]: { ...workoutData[exId], sets: currentSets }
        });
    };

    const handleFinish = () => {
        const logData = {
            workout_id: null, // TODO: Pass workout ID if started from a plan
            exercises: Object.entries(workoutData).map(([id, data]) => ({
                exercise_id: id,
                sets: data.sets
            }))
        };

        storageService.saveWorkout(logData);
        alert('Workout Logged to Local Storage!');
        onFinish();
    };

    return (
        <div className="container">
            <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h2 className="title" style={{ margin: 0, fontSize: '1.5rem' }}>{workoutName || 'Active Workout'}</h2>
                <button onClick={onCancel} className="neu-btn danger" style={{ fontSize: '0.8rem' }}>Cancel</button>
            </div>

            <div className="flex-col" style={{ marginBottom: '100px' }}>
                {exercises.map(ex => (
                    <div key={ex.id} className="neu-card">
                        <h3 style={{ marginTop: 0 }}>{ex.name}</h3>
                        <div className="flex-col">
                            {workoutData[ex.id].sets.map((set, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ width: '20px', fontWeight: 'bold' }}>{idx + 1}</span>
                                    <input
                                        type="number"
                                        placeholder="kg"
                                        className="neu-input"
                                        value={set.weight}
                                        onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="reps"
                                        className="neu-input"
                                        value={set.reps}
                                        onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                                    />
                                    {idx > 0 && (
                                        <button onClick={() => removeSet(ex.id, idx)} className="neu-btn danger" style={{ padding: '8px' }}>×</button>
                                    )}
                                </div>
                            ))}
                            <button onClick={() => addSet(ex.id)} className="neu-btn" style={{ marginTop: '8px' }}>+ Add Set</button>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                position: 'fixed',
                bottom: '0',
                left: '0',
                width: '100%',
                background: 'var(--bg-color)',
                padding: '20px',
                boxShadow: '0 -5px 10px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'center'
            }}>
                <button
                    onClick={handleFinish}
                    className="neu-btn primary"
                    style={{ padding: '16px 48px', fontSize: '1.2rem', width: '100%', maxWidth: '400px' }}
                >
                    Finish Workout
                </button>
            </div>
        </div>
    );
}
