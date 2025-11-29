import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import VideoModal from './VideoModal';

export default function ActiveWorkout({ exercises, workoutName, onFinish, onCancel }) {

    const [workoutData, setWorkoutData] = useState(
        exercises.reduce((acc, ex) => ({
            ...acc,
            [ex.id]: { sets: [{ weight: '', reps: '' }] }
        }), {})
    );

    const [historyStats, setHistoryStats] = useState({});
    const [selectedVideo, setSelectedVideo] = useState(null); // { url, title } or null

    useEffect(() => {
        const fetchHistory = async () => {
            console.log("Fetching history for exercises:", exercises.map(e => e.id));
            const stats = {};
            for (const ex of exercises) {
                const performance = await storageService.getLastExercisePerformance(ex.id);
                console.log(`Performance for ${ex.name} (${ex.id}):`, performance);
                if (performance) {
                    stats[ex.id] = performance;
                }
            }
            console.log("Final history stats:", stats);
            setHistoryStats(stats);
        };
        fetchHistory();
    }, [exercises]);

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

    const [isSaving, setIsSaving] = useState(false);

    const handleFinish = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const logData = {
                workout_id: null, // TODO: Pass workout ID if started from a plan
                exercises: Object.entries(workoutData).map(([id, data]) => ({
                    exercise_id: id,
                    sets: data.sets
                }))
            };

            console.log("Saving workout data:", JSON.stringify(logData, null, 2));
            await storageService.saveWorkout(logData);
            alert('Workout saved to database!');
            onFinish();
        } catch (error) {
            console.error("Failed to save workout:", error);
            alert("Failed to save workout. Please try again.");
        } finally {
            setIsSaving(false);
        }
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ marginTop: 0, marginBottom: '4px' }}>{ex.name}</h3>
                                <div className="mb-3 text-sm" style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                                    {historyStats[ex.id] ? (
                                        <span className="text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded" style={{ color: '#0d9488', fontWeight: 'bold', backgroundColor: '#f0fdfa', padding: '4px 8px', borderRadius: '4px' }}>
                                            ↺ פעם שעברה: {historyStats[ex.id].weight}kg / {historyStats[ex.id].reps} reps
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 italic" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                            (אימון ראשון בתרגיל זה)
                                        </span>
                                    )}
                                </div>
                            </div>
                            {ex.video_url && (
                                <button
                                    onClick={() => setSelectedVideo({ url: ex.video_url, title: ex.name })}
                                    className="neu-btn"
                                    style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    🎥 וידאו
                                </button>
                            )}
                        </div>
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
                    disabled={isSaving}
                    className={`neu-btn primary ${isSaving ? 'disabled' : ''}`}
                    style={{ padding: '16px 48px', fontSize: '1.2rem', width: '100%', maxWidth: '400px', opacity: isSaving ? 0.7 : 1 }}
                >
                    {isSaving ? 'Saving...' : 'Finish Workout'}
                </button>
            </div>
            <VideoModal
                isOpen={!!selectedVideo}
                onClose={() => setSelectedVideo(null)}
                videoUrl={selectedVideo?.url}
                title={selectedVideo?.title}
            />
        </div>
    );
}
