import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import VideoModal from './VideoModal';
import ImageGalleryModal from './ImageGalleryModal';
import { trainerService } from '../services/trainerService';

export default function ActiveWorkout({ user, exercises = [], workoutName, onFinish, onCancel, onAddExercises, initialData, logId, assignmentId }) {
    const isCancelledRef = React.useRef(false);

    // --- RESTORED STATE ---
    const [workoutData, setWorkoutData] = useState(() => {
        const initial = {};
        if (exercises) {
            exercises.forEach(ex => {
                if (initialData && initialData[ex.id]) {
                    initial[ex.id] = initialData[ex.id];
                } else {
                    initial[ex.id] = {
                        sets: [{ weight: '', reps: '' }]
                    };
                }
            });
        }
        return initial;
    });

    const [completedExercises, setCompletedExercises] = useState(new Set(
        initialData ? Object.keys(initialData).filter(id => initialData[id].isCompleted) : []
    ));
    const [deletedExerciseIds, setDeletedExerciseIds] = useState(new Set());
    const [expandedExerciseId, setExpandedExerciseId] = useState(null);
    const [startTime] = useState(Date.now());
    const [calories, setCalories] = useState('');
    const [duration, setDuration] = useState('');
    const [summaryData, setSummaryData] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedImages, setSelectedImages] = useState(null);
    const [historyStats, setHistoryStats] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Sync workoutData when exercises change (e.g. adding exercises)
    useEffect(() => {
        setWorkoutData(prev => {
            const next = { ...prev };
            exercises.forEach(ex => {
                if (!next[ex.id]) {
                    next[ex.id] = { sets: [{ weight: '', reps: '' }] };
                }
            });
            return next;
        });
    }, [exercises]);

    // Load History Stats
    useEffect(() => {
        const loadHistory = async () => {
            if (user?.id) {
                const stats = {};
                for (const ex of exercises) {
                    try {
                        const history = await storageService.getExerciseHistory(user.id, ex.id);
                        if (history && history.length > 0) {
                            const lastSet = history[0].sets[history[0].sets.length - 1];
                            stats[ex.id] = `${lastSet.weight}kg x ${lastSet.reps}`;
                        }
                    } catch (e) { console.error("Error loading history", e); }
                }
                setHistoryStats(stats);
            }
        };
        loadHistory();
    }, [exercises, user]);

    // Added Logic: Fetch log data if passed ID but no exercises
    useEffect(() => {
        const loadLogData = async () => {
            if (logId && (!exercises || exercises.length === 0)) {
                console.log("ActiveWorkout: Loading missing log data for ID:", logId);
                try {
                    const log = await storageService.getWorkoutLog(logId);
                    if (log && log.exercises) {
                        console.warn("ActiveWorkout mounted with logId but no exercises.");
                    }
                } catch (e) { console.error("Failed to self-load log:", e); }
            }
        };
        loadLogData();
    }, [logId, exercises]);


    const updateSet = (exerciseId, setIndex, field, value) => {
        setWorkoutData(prev => {
            const newData = { ...prev };
            if (!newData[exerciseId]) newData[exerciseId] = { sets: [] };

            const newSets = [...newData[exerciseId].sets];
            if (!newSets[setIndex]) newSets[setIndex] = { weight: '', reps: '' };

            newSets[setIndex] = { ...newSets[setIndex], [field]: value };
            newData[exerciseId] = { ...newData[exerciseId], sets: newSets };
            return newData;
        });
    };

    const addSet = (exerciseId) => {
        setWorkoutData(prev => {
            const newData = { ...prev };
            const currentSets = newData[exerciseId]?.sets || [];
            // Auto-fill from previous set if exists
            const lastSet = currentSets.length > 0 ? currentSets[currentSets.length - 1] : { weight: '', reps: '' };
            newData[exerciseId] = {
                ...newData[exerciseId],
                sets: [...currentSets, { ...lastSet }]
            };
            return newData;
        });
    };

    const removeSet = (exerciseId, setIndex) => {
        setWorkoutData(prev => {
            const newData = { ...prev };
            const newSets = newData[exerciseId].sets.filter((_, i) => i !== setIndex);
            newData[exerciseId] = { ...newData[exerciseId], sets: newSets };
            return newData;
        });
    };

    const markAsDone = (exerciseId, e) => {
        e.stopPropagation();
        const next = new Set(completedExercises);
        if (next.has(exerciseId)) next.delete(exerciseId);
        else next.add(exerciseId);
        setCompletedExercises(next);
        setExpandedExerciseId(null); // Collapse on done
    };

    const toggleExercise = (id) => {
        setExpandedExerciseId(expandedExerciseId === id ? null : id);
    };

    const handleDeleteExercise = (id, e) => {
        e.stopPropagation();
        if (window.confirm('להסיר את התרגיל מהאימון הזה?')) {
            const next = new Set(deletedExerciseIds);
            next.add(id);
            setDeletedExerciseIds(next);
        }
    };

    const handleFinish = async () => {
        const activeExercisesList = exercises.filter(ex => !deletedExerciseIds.has(ex.id));
        const allCompleted = activeExercisesList.every(ex => completedExercises.has(ex.id));

        if (!allCompleted) {
            if (!window.confirm("האם אתה בטוח לשמור את האימון?")) return;
        }

        if (isSaving) return;
        setIsSaving(true);
        try {
            const logData = {
                workout_id: assignmentId || null,
                workoutName: workoutName || 'אימון ללא שם',
                exercises: Object.entries(workoutData)
                    .filter(([id]) => !deletedExerciseIds.has(id))
                    .map(([id, data]) => ({
                        exercise_id: id,
                        name: exercises.find(e => e.id === id)?.name || 'Unknown Exercise',
                        mainMuscle: exercises.find(e => e.id === id)?.mainMuscle,
                        sets: data.sets,
                        isCompleted: completedExercises.has(id),
                        imageUrls: (exercises.find(e => e.id === id)?.imageUrls || []).filter(url => typeof url === 'string')
                    })),
                status: allCompleted ? 'completed' : 'partial',
                calories: calories ? Number(calories) : 0,
                durationMinutes: duration ? Number(duration) : Math.round((Date.now() - startTime) / 60000),
                assignmentId: assignmentId || null
            };

            // Consolidate Save Logic: Always use saveWorkout
            if (logId) {
                logData.id = logId;
            }
            // Use saveWorkout for both new and existing logs (it handles upsert)
            // This ensures our new defensive coding applies to updates too.
            await storageService.saveWorkout(logData, user?.id);

            if (assignmentId) {
                await trainerService.completeTrainingProgram(assignmentId);
            }

            setSummaryData({
                exercisesCount: activeExercisesList.filter(ex => completedExercises.has(ex.id)).length,
                duration: logData.durationMinutes,
                calories: logData.calories
            });
            setShowSummary(true);
        } catch (error) {
            console.error("Failed to save workout:", error);
            alert("שגיאה בשמירת האימון");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = async () => {
        if (window.confirm('האם אתה בטוח שברצונך לבטל את האימון?')) {
            isCancelledRef.current = true;
            if (logId) {
                try { await storageService.deleteWorkoutLog(logId); } catch (e) { }
            }
            onCancel();
        }
    };

    useEffect(() => {
        let timer;
        if (showSummary) {
            timer = setTimeout(() => { onFinish(); }, 30000);
        }
        return () => clearTimeout(timer);
    }, [showSummary, onFinish]);

    if (showSummary && summaryData) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onFinish}>
                <div className="bg-brand-card rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-extrabold text-brand-text mb-2">כל הכבוד!</h2>
                    <p className="text-gray-500 mb-8">סיימת את האימון בהצלחה</p>
                    <div className="space-y-6 mb-8">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-500">תרגילים</span>
                            <span className="text-xl font-bold text-brand-text">{summaryData.exercisesCount}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-500">זמן</span>
                            <span className="text-xl font-bold text-brand-text">{summaryData.duration} דק'</span>
                        </div>
                    </div>
                    <button onClick={onFinish} className="neu-btn primary w-full py-4 text-lg shadow-lg">סיום ויציאה</button>
                </div>
            </div>
        );
    }

    // Filter out deleted exercises for display
    const activeExercises = exercises.filter(ex => !deletedExerciseIds.has(ex.id));

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-brand-text border-r-4 border-teal-500 pr-3">{workoutName || 'אימון פעיל'}</h2>
                <div className="flex gap-2">
                    <button onClick={() => onAddExercises(workoutData, workoutName)} className="neu-btn text-sm px-4 bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100">+ הוסף תרגילים</button>
                    <button onClick={handleCancel} className="neu-btn text-red-500 hover:text-red-600 text-sm px-4">ביטול</button>
                </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-500 to-teal-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
                <h3 className="text-xl font-bold opacity-90">סיכום אימון</h3>
                <div className="text-3xl font-extrabold mt-1">בחרת היום {activeExercises.length} תרגילים</div>
            </div>

            <div className="space-y-8 mb-32">
                {activeExercises.map((ex, idx) => {
                    const isExpanded = expandedExerciseId === ex.id;
                    const isCompleted = completedExercises.has(ex.id);
                    // Defensive check for workoutData existence
                    const currentSets = workoutData[ex.id]?.sets || [];

                    return (
                        <div key={ex.id} className={`neu-card relative overflow-hidden transition-all duration-300 ${isCompleted ? 'bg-blue-50 border-blue-200' : ''}`}>
                            <div onClick={() => toggleExercise(ex.id)} className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? 'border-b border-gray-100' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCompleted ? 'bg-blue-500 text-white' : 'bg-teal-100 text-teal-700'}`}>
                                        {isCompleted ? '✓' : idx + 1}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${isCompleted ? 'text-blue-800' : 'text-brand-text'}`}>{ex.name}</h3>
                                        {!isExpanded && (
                                            <p className={`text-sm ${isCompleted ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {currentSets.length} סטים • {isCompleted ? 'בוצע' : 'לחץ לפירוט'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-gray-400">{isExpanded ? '▲' : '▼'}</div>
                            </div>

                            {isExpanded && (
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="text-sm">
                                            {historyStats[ex.id] ? (
                                                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium border border-teal-100">
                                                    <span>↺</span><span>{historyStats[ex.id]}</span>
                                                </span>
                                            ) : <span className="text-gray-400 italic text-sm">(אימון ראשון)</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            {ex.video_url && <button onClick={(e) => { e.stopPropagation(); setSelectedVideo({ url: ex.video_url, title: ex.name }); }} className="neu-btn text-xs px-3 py-2">🎥 וידאו</button>}
                                            {ex.imageUrls?.length > 0 && <button onClick={(e) => { e.stopPropagation(); setSelectedImages({ images: ex.imageUrls, title: ex.name }); }} className="neu-btn text-xs px-3 py-2">📷 תמונות</button>}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {currentSets.map((set, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <span className="w-6 font-bold text-gray-400 text-center">{idx + 1}</span>
                                                <div className="flex-1 relative">
                                                    <input type="number" placeholder={ex.trackingType === 'time' ? 'שניות' : 'ק״ג'} className="neu-input text-center font-bold" value={set.weight} onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)} />
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input type="number" placeholder="חזרות" className="neu-input text-center font-bold" value={set.reps} onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)} />
                                                </div>
                                                {idx > 0 && <button onClick={() => removeSet(ex.id, idx)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50">×</button>}
                                            </div>
                                        ))}
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={() => addSet(ex.id)} className="flex-1 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-teal-200">+ הוסף סט</button>
                                            <button onClick={(e) => markAsDone(ex.id, e)} className="flex-1 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md">✓ בוצע</button>
                                            <button onClick={(e) => handleDeleteExercise(ex.id, e)} className="w-12 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="neu-card p-6 mb-32">
                <h3 className="text-lg font-bold text-brand-text mb-4 border-b border-gray-100 pb-2">סיכום אימון (אופציונלי)</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">קלוריות</label>
                        <input type="number" placeholder="0" className="neu-input w-full" value={calories} onChange={(e) => setCalories(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">משך זמן (דקות)</label>
                        <input type="number" placeholder="0" className="neu-input w-full" value={duration} onChange={(e) => setDuration(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 shadow-lg z-40">
                <div className="max-w-4xl mx-auto flex justify-center">
                    <button onClick={handleFinish} disabled={isSaving} className={`neu-btn primary w-full max-w-md text-lg py-4 shadow-xl ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                        {isSaving ? 'שומר...' : 'סיים אימון ✓'}
                    </button>
                </div>
            </div>

            <VideoModal isOpen={!!selectedVideo} onClose={() => setSelectedVideo(null)} videoUrl={selectedVideo?.url} title={selectedVideo?.title} />
            <ImageGalleryModal isOpen={!!selectedImages} onClose={() => setSelectedImages(null)} images={selectedImages?.images || []} title={selectedImages?.title} />
        </div>
    );
}
