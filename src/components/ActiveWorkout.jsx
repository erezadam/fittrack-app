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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 border-r-4 border-teal-500 pr-3">
                    {workoutName || 'Active Workout'}
                </h2>
                <button onClick={onCancel} className="neu-btn text-red-500 hover:text-red-600 text-sm px-4">
                    ביטול
                </button>
            </div>

            <div className="space-y-6 mb-32">
                {exercises.map(ex => (
                    <div key={ex.id} className="neu-card animate-fade-in">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{ex.name}</h3>
                                <div className="text-sm">
                                    {historyStats[ex.id] ? (
                                        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium border border-teal-100">
                                            <span>↺</span>
                                            <span>פעם שעברה: {historyStats[ex.id].weight}kg / {historyStats[ex.id].reps} reps</span>
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 italic text-sm">
                                            (אימון ראשון בתרגיל זה)
                                        </span>
                                    )}
                                </div>
                            </div>
                            {ex.video_url && (
                                <button
                                    onClick={() => setSelectedVideo({ url: ex.video_url, title: ex.name })}
                                    className="neu-btn text-xs px-3 py-2"
                                >
                                    🎥 וידאו
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {workoutData[ex.id].sets.map((set, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="w-6 font-bold text-gray-400 text-center">{idx + 1}</span>
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            placeholder="kg"
                                            className="neu-input text-center font-bold"
                                            value={set.weight}
                                            onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">kg</span>
                                    </div>
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            placeholder="reps"
                                            className="neu-input text-center font-bold"
                                            value={set.reps}
                                            onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">reps</span>
                                    </div>
                                    {idx > 0 && (
                                        <button
                                            onClick={() => removeSet(ex.id, idx)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => addSet(ex.id)}
                                className="w-full py-2 mt-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-dashed border-teal-200"
                            >
                                + הוסף סט
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 shadow-lg z-40">
                <div className="max-w-4xl mx-auto flex justify-center">
                    <button
                        onClick={handleFinish}
                        disabled={isSaving}
                        className={`neu-btn primary w-full max-w-md text-lg py-4 shadow-xl ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isSaving ? 'שומר אימון...' : 'סיים אימון ✓'}
                    </button>
                </div>
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
