import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import VideoModal from './VideoModal';
import ImageGalleryModal from './ImageGalleryModal';

export default function ActiveWorkout({ user, exercises = [], workoutName, onFinish, onCancel, onAddExercises, initialData, logId }) {

    const isCancelledRef = React.useRef(false);

    const [workoutData, setWorkoutData] = useState(() => {
        const baseData = initialData || {};
        const merged = { ...baseData };

        (exercises || []).forEach(ex => {
            if (!merged[ex.id]) {
                merged[ex.id] = { sets: [{ weight: '', reps: '' }] };
            }
        });

        return merged;
    });

    const [historyStats, setHistoryStats] = useState({});
    const [selectedVideo, setSelectedVideo] = useState(null); // { url, title } or null
    const [selectedImages, setSelectedImages] = useState(null); // { images: [], title: '' } or null

    // Optional Stats
    // Optional Stats
    const [calories, setCalories] = useState('');
    const [duration, setDuration] = useState('');
    const [startTime] = useState(Date.now());
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState(null);

    // New State for UI Enhancements
    const [expandedExerciseId, setExpandedExerciseId] = useState(null);
    const [deletedExerciseIds, setDeletedExerciseIds] = useState(new Set()); // Track deleted exercises

    const [completedExercises, setCompletedExercises] = useState(() => {
        const completed = new Set();
        console.log("ActiveWorkout Initializing. InitialData:", initialData);
        if (initialData) {
            Object.entries(initialData).forEach(([id, data]) => {
                // Check explicit status or heuristic (has data)
                // If isCompleted is explicitly true, use it.
                // If it's undefined (legacy), check if has data.
                const hasData = data.sets && data.sets.some(s => s.weight || s.reps);
                if (data.isCompleted === true || (data.isCompleted === undefined && hasData)) {
                    completed.add(id);
                }
            });
        }
        console.log("Initialized Completed Exercises:", completed);
        return completed;
    });

    const toggleExercise = (id) => {
        if (expandedExerciseId === id) {
            setExpandedExerciseId(null);
        } else {
            setExpandedExerciseId(id);
        }
    };

    const markAsDone = (id, e) => {
        e.stopPropagation();
        const newCompleted = new Set(completedExercises);
        newCompleted.add(id);
        setCompletedExercises(newCompleted);
        setExpandedExerciseId(null); // Collapse after marking done
    };

    const handleDeleteExercise = (id, e) => {
        e.stopPropagation();
        if (window.confirm('האם אתה בטוח שברצונך למחוק את התרגיל מהאימון הנוכחי?')) {
            const newDeleted = new Set(deletedExerciseIds);
            newDeleted.add(id);
            setDeletedExerciseIds(newDeleted);
            if (expandedExerciseId === id) {
                setExpandedExerciseId(null);
            }
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user?.id) return;
            try {
                // Fetch all logs once
                const allLogs = await storageService.getAllWorkoutLogs(user.id);
                const stats = {};

                exercises.forEach(ex => {
                    // 1. Find all past workouts containing this exercise
                    const relevantWorkouts = allLogs
                        .filter(w => w.exercises && w.exercises.some(e => e.exercise_id === ex.id))
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

                    if (relevantWorkouts.length > 0) {
                        // 2. Get the most recent workout
                        const lastWorkout = relevantWorkouts[0];
                        const lastExerciseData = lastWorkout.exercises.find(e => e.exercise_id === ex.id);

                        if (lastExerciseData && lastExerciseData.sets && lastExerciseData.sets.length > 0) {
                            // 3. Extract the LAST set (as per user request)
                            const validSets = lastExerciseData.sets.filter(s => s.weight || s.reps);
                            if (validSets.length > 0) {
                                const lastSet = validSets[validSets.length - 1];

                                // 4. Format the string based on tracking type
                                if (ex.trackingType === 'time') {
                                    stats[ex.id] = `אימון אחרון: ${lastSet.reps} שניות`;
                                } else if (ex.trackingType === 'reps_only') {
                                    stats[ex.id] = `אימון אחרון: ${lastSet.reps} חזרות`;
                                } else {
                                    // Default (weight)
                                    stats[ex.id] = `אימון אחרון: ${lastSet.weight} ק"ג / ${lastSet.reps} חזרות`;
                                }
                            }
                        }
                    }
                });
                setHistoryStats(stats);
            } catch (error) {
                console.error("Failed to fetch history:", error);
            }
        };
        fetchHistory();
    }, [exercises, user]);

    // Auto-Save Effect
    useEffect(() => {
        if (!logId) return;

        const saveTimeout = setTimeout(async () => {
            if (isCancelledRef.current) return; // Prevent save if cancelled
            console.log("Auto-saving draft...");
            const logData = {
                workoutName: workoutName || 'אימון ללא שם',
                exercises: Object.entries(workoutData)
                    .filter(([id]) => !deletedExerciseIds.has(id)) // Filter out deleted exercises
                    .map(([id, data]) => ({
                        exercise_id: id,
                        name: exercises.find(e => e.id === id)?.name || 'Unknown Exercise',
                        mainMuscle: exercises.find(e => e.id === id)?.mainMuscle,
                        sets: data.sets,
                        isCompleted: completedExercises.has(id)
                    })),
                status: 'in_progress'
            };
            try {
                await storageService.updateWorkoutLog(logId, logData);
                console.log("Draft auto-saved");
            } catch (error) {
                console.error("Auto-save failed:", error);
            }
        }, 3000); // Debounce for 3 seconds

        return () => clearTimeout(saveTimeout);
    }, [workoutData, logId, workoutName, exercises, completedExercises, deletedExerciseIds]);

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
        // Filter out deleted exercises for completion check
        const activeExercises = exercises.filter(ex => !deletedExerciseIds.has(ex.id));

        // Check if all active exercises are completed
        const allCompleted = activeExercises.every(ex => completedExercises.has(ex.id));
        console.log("Finish Check - Active Exercises:", activeExercises.length, "Completed:", completedExercises.size, "All Completed:", allCompleted);

        if (!allCompleted) {
            const confirmFinish = window.confirm("האם אתה בטוח לשמור את האימון?");
            if (!confirmFinish) return;
        }

        if (isSaving) return;
        setIsSaving(true);
        try {
            const logData = {
                workout_id: null, // TODO: Pass workout ID if started from a plan
                workoutName: workoutName || 'אימון ללא שם',
                exercises: Object.entries(workoutData)
                    .filter(([id]) => !deletedExerciseIds.has(id)) // Filter out deleted exercises
                    .map(([id, data]) => ({
                        exercise_id: id,
                        name: exercises.find(e => e.id === id)?.name || 'Unknown Exercise', // Save name for history display
                        mainMuscle: exercises.find(e => e.id === id)?.mainMuscle, // Save muscle for history display
                        sets: data.sets,
                        isCompleted: completedExercises.has(id)
                    })),
                status: allCompleted ? 'completed' : 'partial',
                calories: calories ? Number(calories) : 0,
                durationMinutes: duration ? Number(duration) : Math.round((Date.now() - startTime) / 60000)
            };

            console.log("Saving workout data:", JSON.stringify(logData, null, 2));

            if (logId) {
                await storageService.updateWorkoutLog(logId, logData);
            } else {
                await storageService.saveWorkout(logData, user?.id);
            }

            // Show Summary
            setSummaryData({
                exercisesCount: activeExercises.filter(ex => completedExercises.has(ex.id)).length, // Count only completed ACTIVE exercises
                duration: logData.durationMinutes,
                calories: logData.calories
            });
            setShowSummary(true);
            // Alert removed to show modal instead
            // onFinish(); // Moved to modal close
        } catch (error) {
            console.error("Failed to save workout:", error);
            alert("שגיאה בשמירת האימון. אנא נסה שנית.");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        let timer;
        if (showSummary) {
            timer = setTimeout(() => {
                onFinish();
            }, 30000);
        }
        return () => clearTimeout(timer);
    }, [showSummary, onFinish]);

    if (showSummary && summaryData) {
        return (
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                onClick={onFinish}
            >
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-100 transition-transform" onClick={e => e.stopPropagation()}>
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-extrabold text-gray-800 mb-2">כל הכבוד!</h2>
                    <p className="text-gray-500 mb-8">סיימת את האימון בהצלחה</p>

                    <div className="space-y-6 mb-8">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-500">תרגילים שבוצעו</span>
                            <span className="text-xl font-bold text-gray-800">{summaryData.exercisesCount}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-500">זמן אימון</span>
                            <span className="text-xl font-bold text-gray-800">{summaryData.duration} דקות</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <span className="text-gray-500">קלוריות (משוער)</span>
                            <span className="text-xl font-bold text-gray-800">{summaryData.calories}</span>
                        </div>
                    </div>

                    <button
                        onClick={onFinish}
                        className="neu-btn primary w-full py-4 text-lg shadow-lg"
                    >
                        סיום ויציאה
                    </button>
                    <p className="text-xs text-gray-400 mt-4">המסך ייסגר אוטומטית תוך 30 שניות</p>
                </div>
            </div>
        );
    }

    const handleCancel = async () => {
        if (window.confirm('האם אתה בטוח שברצונך לבטל את האימון? האימון יימחק ולא יישמר בהיסטוריה.')) {
            isCancelledRef.current = true; // Mark as cancelled immediately
            if (logId) {
                try {
                    console.log("Deleting cancelled workout log:", logId);
                    await storageService.deleteWorkoutLog(logId);
                } catch (error) {
                    console.error("Failed to delete workout log:", error);
                }
            }
            onCancel();
        }
    };

    // Filter out deleted exercises for display
    const activeExercises = exercises.filter(ex => !deletedExerciseIds.has(ex.id));

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 border-r-4 border-teal-500 pr-3">
                    {workoutName || 'אימון פעיל'}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => onAddExercises(workoutData, workoutName)}
                        className="neu-btn text-sm px-4 bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                    >
                        + הוסף תרגילים
                    </button>
                    <button onClick={handleCancel} className="neu-btn text-red-500 hover:text-red-600 text-sm px-4">
                        ביטול
                    </button>
                </div>
            </div>

            {/* Header Stats */}
            <div className="bg-gradient-to-r from-cyan-500 to-teal-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
                <h3 className="text-xl font-bold opacity-90">סיכום אימון</h3>
                <div className="text-3xl font-extrabold mt-1">
                    בחרת היום {activeExercises.length} תרגילים
                </div>
            </div>

            <div className="space-y-8 mb-32">
                {(() => {
                    // Group exercises by mainMuscle
                    const grouped = activeExercises.reduce((acc, ex) => {
                        const muscle = ex.mainMuscle || 'Other';
                        if (!acc[muscle]) acc[muscle] = [];
                        acc[muscle].push(ex);
                        return acc;
                    }, {});

                    let globalIndex = 0;

                    const HEBREW_MUSCLE_NAMES = {
                        'Chest': 'חזה',
                        'Back': 'גב',
                        'Legs': 'רגליים',
                        'Shoulders': 'כתפיים',
                        'Arms': 'ידיים',
                        'Core': 'בטן',
                        'Glutes': 'ישבן',
                        'Cardio': 'אירובי',
                        'Full Body': 'כל הגוף',
                        'Abs': 'בטן'
                    };

                    return Object.entries(grouped).map(([muscle, groupExercises]) => (
                        <div key={muscle} className="animate-fade-in">
                            <h3 className="text-2xl font-bold text-gray-800 border-b-2 border-teal-100 pb-2 mb-4 inline-block">
                                {HEBREW_MUSCLE_NAMES[muscle] || muscle}
                            </h3>
                            <div className="space-y-4">
                                {groupExercises.map(ex => {
                                    globalIndex++;
                                    const currentGlobalIndex = globalIndex;
                                    const isExpanded = expandedExerciseId === ex.id;
                                    const isCompleted = completedExercises.has(ex.id);

                                    return (
                                        <div
                                            key={ex.id}
                                            className={`neu-card relative overflow-hidden transition-all duration-300 ${isCompleted ? 'bg-blue-50 border-blue-200' : ''}`}
                                        >
                                            {/* Collapsed Header / Toggle Trigger */}
                                            <div
                                                onClick={() => toggleExercise(ex.id)}
                                                className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? 'border-b border-gray-100' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCompleted ? 'bg-blue-500 text-white' : 'bg-teal-100 text-teal-700'}`}>
                                                        {isCompleted ? '✓' : currentGlobalIndex}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-bold text-lg ${isCompleted ? 'text-blue-800' : 'text-gray-800'}`}>
                                                            {ex.name}
                                                        </h3>
                                                        {!isExpanded && (
                                                            <p className={`text-sm ${isCompleted ? 'text-blue-600' : 'text-gray-500'}`}>
                                                                {workoutData[ex.id].sets.length} סטים • {isCompleted ? 'בוצע' : 'לחץ לפירוט'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-gray-400">
                                                    {isExpanded ? '▲' : '▼'}
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="p-4 animate-fade-in">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="text-sm">
                                                            {historyStats[ex.id] ? (
                                                                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium border border-teal-100">
                                                                    <span>↺</span>
                                                                    <span>{historyStats[ex.id]}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 italic text-sm">
                                                                    (אימון ראשון בתרגיל זה)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {ex.video_url && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedVideo({ url: ex.video_url, title: ex.name }); }}
                                                                    className="neu-btn text-xs px-3 py-2"
                                                                >
                                                                    🎥 וידאו
                                                                </button>
                                                            )}
                                                            {ex.imageUrls && ex.imageUrls.length > 0 && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedImages({ images: ex.imageUrls, title: ex.name }); }}
                                                                    className="neu-btn text-xs px-3 py-2"
                                                                >
                                                                    📷 תמונות
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {workoutData[ex.id].sets.map((set, idx) => (
                                                            <div key={idx} className="flex items-center gap-3">
                                                                <span className="w-6 font-bold text-gray-400 text-center">{idx + 1}</span>
                                                                <div className="flex-1 relative">
                                                                    <input
                                                                        type="number"
                                                                        placeholder={ex.trackingType === 'time' ? 'שניות' : 'ק״ג'}
                                                                        className="neu-input text-center font-bold"
                                                                        value={set.weight}
                                                                        onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                                                                        {ex.trackingType === 'time' ? 'שניות' : 'ק״ג'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1 relative">
                                                                    <input
                                                                        type="number"
                                                                        placeholder="חזרות"
                                                                        className="neu-input text-center font-bold"
                                                                        value={set.reps}
                                                                        onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">חזרות</span>
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
                                                        <div className="flex gap-3 mt-4">
                                                            <button
                                                                onClick={() => addSet(ex.id)}
                                                                className="flex-1 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border border-dashed border-teal-200"
                                                            >
                                                                + הוסף סט
                                                            </button>
                                                            <button
                                                                onClick={(e) => markAsDone(ex.id, e)}
                                                                className="flex-1 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-md"
                                                            >
                                                                ✓ בוצע
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteExercise(ex.id, e)}
                                                                className="w-12 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                                title="מחק תרגיל"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ));
                })()}
            </div>

            {/* Optional Stats Section */}
            <div className="neu-card p-6 mb-32 animate-fade-in">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                    סיכום אימון (אופציונלי)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">קלוריות</label>
                        <input
                            type="number"
                            placeholder="0"
                            className="neu-input w-full"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">משך זמן (דקות)</label>
                        <input
                            type="number"
                            placeholder="0"
                            className="neu-input w-full"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 shadow-lg z-40">
                <div className="max-w-4xl mx-auto flex justify-center">
                    <button
                        onClick={handleFinish}
                        disabled={isSaving}
                        className={`neu-btn primary w-full max-w-md text-lg py-4 shadow-xl ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isSaving ? (logId ? 'מעדכן אימון...' : 'שומר אימון...') : (logId ? 'עדכן אימון ✓' : 'סיים אימון ✓')}
                    </button>
                </div>
            </div>

            <VideoModal
                isOpen={!!selectedVideo}
                onClose={() => setSelectedVideo(null)}
                videoUrl={selectedVideo?.url}
                title={selectedVideo?.title}
            />

            <ImageGalleryModal
                isOpen={!!selectedImages}
                onClose={() => setSelectedImages(null)}
                images={selectedImages?.images || []}
                title={selectedImages?.title}
            />
        </div>
    );
}
