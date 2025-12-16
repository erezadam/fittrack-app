import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import VideoModal from './VideoModal';
import ImageGalleryModal from './ImageGalleryModal';

export default function ActiveWorkout({ user, exercises = [], workoutName, onFinish, onCancel, onAddExercises, initialData }) {

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

    // New State for UI Enhancements
    const [expandedExerciseId, setExpandedExerciseId] = useState(null);
    const [completedExercises, setCompletedExercises] = useState(new Set());

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

    useEffect(() => {
        const fetchHistory = async () => {
            console.log("Fetching history for exercises:", exercises.map(e => e.id));
            const stats = {};
            for (const ex of exercises) {
                const performance = await storageService.getLastExercisePerformance(ex.id, user?.id);
                console.log(`Performance for ${ex.name} (${ex.id}):`, performance);
                if (performance) {
                    stats[ex.id] = performance;
                }
            }
            console.log("Final history stats:", stats);
            setHistoryStats(stats);
        };
        fetchHistory();
    }, [exercises, user]);

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
                workoutName: workoutName || 'אימון ללא שם',
                exercises: Object.entries(workoutData).map(([id, data]) => ({
                    exercise_id: id,
                    name: exercises.find(e => e.id === id)?.name || 'Unknown Exercise', // Save name for history display
                    mainMuscle: exercises.find(e => e.id === id)?.mainMuscle, // Save muscle for history display
                    sets: data.sets
                }))
            };

            console.log("Saving workout data:", JSON.stringify(logData, null, 2));
            await storageService.saveWorkout(logData, user?.id);
            alert('האימון נשמר בהצלחה!');
            onFinish();
        } catch (error) {
            console.error("Failed to save workout:", error);
            alert("שגיאה בשמירת האימון. אנא נסה שנית.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 border-r-4 border-teal-500 pr-3">
                    {workoutName || 'אימון פעיל'}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => onAddExercises(workoutData)}
                        className="neu-btn text-sm px-4 bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                    >
                        + הוסף תרגילים
                    </button>
                    <button onClick={onCancel} className="neu-btn text-red-500 hover:text-red-600 text-sm px-4">
                        ביטול
                    </button>
                </div>
            </div>

            {/* Header Stats */}
            <div className="bg-gradient-to-r from-cyan-500 to-teal-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
                <h3 className="text-xl font-bold opacity-90">סיכום אימון</h3>
                <div className="text-3xl font-extrabold mt-1">
                    בחרת היום {exercises.length} תרגילים
                </div>
            </div>

            <div className="space-y-8 mb-32">
                {(() => {
                    // Group exercises by mainMuscle
                    const grouped = exercises.reduce((acc, ex) => {
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
                                                                    <span>פעם שעברה: {historyStats[ex.id].weight} ק"ג / {historyStats[ex.id].reps} חזרות</span>
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
                                                                        placeholder="ק״ג"
                                                                        className="neu-input text-center font-bold"
                                                                        value={set.weight}
                                                                        onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">ק״ג</span>
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

            <ImageGalleryModal
                isOpen={!!selectedImages}
                onClose={() => setSelectedImages(null)}
                images={selectedImages?.images || []}
                title={selectedImages?.title}
            />
        </div>
    );
}
