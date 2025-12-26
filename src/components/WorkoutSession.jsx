import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Circle, ChevronDown, ChevronUp, Plus, Save, ArrowRight, Image as ImageIcon, Trash2 } from 'lucide-react';
import ImageGalleryModal from './ImageGalleryModal';
import { storageService } from '../services/storageService';

const HEBREW_MUSCLE_NAMES = { 'Chest': 'חזה', 'Back': 'גב', 'Legs': 'רגליים', 'Shoulders': 'כתפיים', 'Arms': 'זרועות', 'Core': 'בטן', 'Glutes': 'ישבן', 'Cardio': 'אירובי', 'Full Body': 'כל הגוף', 'Abs': 'בטן' };

export default function WorkoutSession({ workout, onBack, onFinish, onAdd, initialDuration = 0, userId }) {
    const [exercises, setExercises] = useState(() => {
        const initial = workout?.exercises || [];
        // Ensure every exercise has at least one set to start
        return initial.map(ex => ({
            ...ex,
            sets: ex.sets && ex.sets.length > 0
                ? ex.sets
                : [{ weight: '', reps: '', isCompleted: false }]
        }));
    });
    const [duration, setDuration] = useState(initialDuration);
    const [expandedEx, setExpandedEx] = useState({});
    const [selectedImages, setSelectedImages] = useState(null);
    const [lastStats, setLastStats] = useState({});

    // New State for Summary/Calories
    const [calories, setCalories] = useState('');
    const [showSummary, setShowSummary] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Last Stats
    useEffect(() => {
        const loadStats = async () => {
            if (!userId) return;
            const statsMap = {};
            // Use Promise.all for parallel fetching if needed, or sequential is fine for small lists
            for (const ex of exercises) {
                const stats = await storageService.fetchLastExerciseStats(userId, ex.id);
                if (stats) {
                    statsMap[ex.id] = stats;
                }
            }
            setLastStats(statsMap);
        };
        loadStats();
    }, [userId, exercises.length]);

    // Fallback: Fetch missing images
    useEffect(() => {
        const fetchMissingImages = async () => {
            const missingImages = exercises.some(ex => !ex.imageUrls || ex.imageUrls.length === 0);
            if (missingImages) {
                try {
                    console.log("WorkoutSession: Missing images detected, fetching global exercises...");
                    const allExercises = await storageService.getExercises();
                    setExercises(prevExs => prevExs.map(ex => {
                        if (ex.imageUrls && ex.imageUrls.length > 0) return ex;
                        // Safe comparison enforcing strings
                        const match = allExercises.find(a => String(a.id) === String(ex.id) || String(a.name) === String(ex.name));
                        return match ? { ...ex, imageUrls: match.imageUrls || [] } : ex;
                    }));
                } catch (error) {
                    console.error("Failed to fetch exercises for image fallback:", error);
                }
            }
        };

        fetchMissingImages();
        // ESLint might warn about 'exercises' dep, but we only want to run this once or when heavy changes happen.
        // If we add exercises, they usually come with images. This is mainly for initial load.
        // Let's dep on length to be safe without inf loop.
    }, [exercises.length]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleSetComplete = (exIndex, setIndex) => {
        const newExercises = [...(exercises || [])];
        if (!newExercises[exIndex]) return;

        const set = newExercises[exIndex].sets?.[setIndex];
        if (!set) return;

        set.isCompleted = !set.isCompleted;

        const allSetsDone = newExercises[exIndex].sets?.every(s => s.isCompleted);
        newExercises[exIndex].isCompleted = allSetsDone;

        setExercises(newExercises);
    };

    const toggleExerciseComplete = (exIndex) => {
        const newExercises = [...(exercises || [])];
        if (!newExercises[exIndex]) return;

        const isComplete = !newExercises[exIndex].isCompleted;
        newExercises[exIndex].isCompleted = isComplete;
        newExercises[exIndex].sets?.forEach(s => s.isCompleted = isComplete);
        setExercises(newExercises);

        // Auto-collapse if marking as active (completed)
        if (isComplete) {
            setExpandedEx(prev => ({ ...prev, [newExercises[exIndex].id]: false }));
        }
    };

    const toggleExpand = (id) => {
        setExpandedEx(prev => ({
            // If we want accordion style (only one open):
            // ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
            // But user asked for standard behavior, so multiple can be open or toggle.
            // Let's stick to simple toggle for now, BUT ensure we can Force Close.
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleRemoveExercise = (exerciseId) => {
        if (!window.confirm('להסיר את התרגיל מהאימון?')) return;
        const newExercises = exercises.filter(e => e.id !== exerciseId);
        setExercises(newExercises);
    };

    const handleAddSet = (exIndex) => {
        const newExercises = [...exercises];
        if (!newExercises[exIndex].sets) newExercises[exIndex].sets = [];

        // Add new set with previous set's weight/reps if available, or empty
        const lastSet = newExercises[exIndex].sets[newExercises[exIndex].sets.length - 1];
        newExercises[exIndex].sets.push({
            weight: lastSet?.weight || '',
            reps: lastSet?.reps || '',
            isCompleted: false
        });
        setExercises(newExercises);
    };

    // Updated Finish Handler
    const handleFinish = () => {
        const safeExercises = exercises || [];
        const completedCount = safeExercises.filter(e => e.isCompleted).length;

        // If not all done, confirm first
        if (completedCount < safeExercises.length) {
            if (!window.confirm(`סיימת רק ${completedCount} מתוך ${safeExercises.length} תרגילים. להמשיך לסיכום?`)) return;
        }

        // Show Summary Modal instead of immediate exit
        setShowSummary(true);
    };

    // Final Save from Modal
    const handleFinalSave = () => {
        const safeExercises = exercises || [];
        onFinish({
            ...workout,
            exercises: safeExercises,
            duration,
            calories: calories ? Number(calories) : 0
        });
    };

    // Grouping Logic
    const groupedExercises = (exercises || []).reduce((acc, ex, index) => {
        const muscleKey = ex.muscle_group_id || ex.mainMuscle || 'Other';
        if (!acc[muscleKey]) acc[muscleKey] = [];
        acc[muscleKey].push({ ...ex, originalIndex: index });
        return acc;
    }, {});

    const completedCount = (exercises || []).filter(e => e.isCompleted).length;

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-5 rounded-b-3xl shadow-lg sticky top-0 z-10">
                <div className="flex justify-between items-start mb-3">
                    <button onClick={onBack} className="text-teal-100 hover:text-white flex items-center gap-1 text-sm font-medium">
                        <ArrowRight size={16} /> יציאה
                    </button>
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-xs font-mono backdrop-blur-sm">
                        <Clock size={12} /> {formatTime(duration)}
                    </div>
                </div>

                <div className="text-center">
                    <h1 className="text-xl font-bold mb-1">אימון פעיל</h1>
                    <div className="text-teal-100 text-sm">
                        <span className="font-bold">{completedCount}</span> / {exercises?.length || 0} בוצעו
                    </div>
                </div>
            </div>

            {/* EXERCISE LIST */}
            <div className="max-w-4xl mx-auto p-3 space-y-6 mt-2">
                {Object.entries(groupedExercises).map(([muscle, groupExs]) => (
                    <div key={muscle} className="animate-fade-in">
                        <h3 className="text-lg font-bold text-teal-700 mb-2 border-b border-teal-100 pb-1 mx-1 flex items-center gap-2">
                            {HEBREW_MUSCLE_NAMES[muscle] || muscle}
                        </h3>

                        <div className="space-y-3">
                            {groupExs?.map((ex) => {
                                const realIndex = ex.originalIndex;
                                const isExpanded = expandedEx[ex.id];

                                return (
                                    <div key={ex.id} className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${ex.isCompleted ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100'}`}>
                                        <div className="p-3 flex items-center justify-between cursor-pointer gap-2" onClick={() => toggleExpand(ex.id)}>

                                            {/* Left Side: Checkbox + Image + Text */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">

                                                {/* CHECKBOX - Status only, no click */}
                                                <div className="shrink-0">
                                                    {ex.isCompleted ? <CheckCircle className="text-teal-500" size={24} /> : <Circle className="text-gray-300" size={24} />}
                                                </div>

                                                {/* IMAGE THUMBNAIL */}
                                                <div onClick={(e) => { e.stopPropagation(); setSelectedImages({ images: ex.imageUrls || [], title: ex.name }); }} className="relative w-10 h-10 shrink-0 group">
                                                    {ex.imageUrls?.[0] ? (
                                                        <img src={ex.imageUrls[0]} className="w-full h-full rounded-md object-cover bg-gray-100 border border-gray-200" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center"><ImageIcon size={14} className="text-gray-400" /></div>
                                                    )}
                                                </div>

                                                {/* TEXT CONTENT (Truncated correctly) */}
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold text-base leading-tight truncate ${ex.isCompleted ? 'text-teal-700 line-through decoration-teal-300' : 'text-gray-800'}`}>
                                                        {ex.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate mt-0.5">
                                                        {ex.sets?.length || 0} סטים • {ex.equipment || 'ללא'}
                                                        {lastStats[ex.id] && (
                                                            <span className="text-teal-600 font-bold mr-2">
                                                                | אימון אחרון: {lastStats[ex.id]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Arrow & Trash Icons */}
                                            <div className="flex items-center gap-3 shrink-0 pl-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveExercise(ex.id);
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <div className="text-gray-400">
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* EXPANDED SETS */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 p-3 bg-gray-50/50">
                                                <div className="space-y-3">
                                                    {ex.sets?.map((set, sIdx) => (
                                                        <div key={sIdx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                                    {sIdx + 1}
                                                                </div>

                                                                <div className={`flex-1 grid gap-2 ${(ex.trackingType === 'reps' || ex.trackingType === 'time') ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                                    {/* Weight Input - Show if trackingType is 'weight' OR undefined/null */}
                                                                    {(ex.trackingType === 'weight' || !ex.trackingType) && (
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                placeholder="0"
                                                                                defaultValue={set.weight}
                                                                                disabled={ex.isCompleted}
                                                                                className="w-full pl-2 pr-8 py-2 border rounded-lg text-center font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none disabled:opacity-50 disabled:bg-gray-100 placeholder-gray-300"
                                                                                onChange={(e) => {
                                                                                    const newExercises = [...exercises];
                                                                                    if (newExercises[realIndex]?.sets?.[sIdx]) {
                                                                                        newExercises[realIndex].sets[sIdx].weight = e.target.value;
                                                                                        setExercises(newExercises);
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">ק״ג</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Reps/Time Input */}
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            placeholder="0"
                                                                            defaultValue={set.reps}
                                                                            disabled={ex.isCompleted}
                                                                            className="w-full pl-2 pr-8 py-2 border rounded-lg text-center font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none disabled:opacity-50 disabled:bg-gray-100 placeholder-gray-300"
                                                                            onChange={(e) => {
                                                                                const newExercises = [...exercises];
                                                                                if (newExercises[realIndex]?.sets?.[sIdx]) {
                                                                                    newExercises[realIndex].sets[sIdx].reps = e.target.value;
                                                                                    setExercises(newExercises);
                                                                                }
                                                                            }}
                                                                        />
                                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                                                                            {ex.trackingType === 'time' ? 'שניות' : 'חזרות'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>


                                                        </div>
                                                    ))}
                                                    {!ex.isCompleted && (
                                                        <div className="space-y-3 pt-2">
                                                            <button
                                                                onClick={() => handleAddSet(realIndex)}
                                                                className="w-full py-3 text-teal-600 text-sm font-bold border-2 border-dashed border-teal-100 rounded-xl hover:bg-teal-50 hover:border-teal-300 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Plus size={16} /> הוסף סט
                                                            </button>

                                                            <button
                                                                onClick={() => toggleExerciseComplete(realIndex)}
                                                                className="w-full py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <CheckCircle size={16} /> סיום תרגיל
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-20">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <button
                        className="p-3 rounded-xl border-2 border-teal-100 text-teal-600 font-bold flex items-center justify-center hover:bg-teal-50 transition-colors bg-white shadow-sm"
                        onClick={() => onAdd(exercises, duration)}
                    >
                        <Plus size={20} />
                    </button>
                    <button onClick={handleFinish} className="flex-1 p-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                        <CheckCircle size={20} /> סיים אימון
                    </button>
                </div>
            </div>

            <ImageGalleryModal isOpen={!!selectedImages} onClose={() => setSelectedImages(null)} images={selectedImages?.images || []} title={selectedImages?.title} />

            {/* SUMMARY MODAL */}
            {showSummary && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in relative">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">כל הכבוד!</h2>
                        <p className="text-gray-500 mb-8">האימון הושלם</p>

                        <div className="space-y-6 mb-8">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">תרגילים שבוצעו</span>
                                <span className="text-xl font-bold text-gray-800">{completedCount} / {exercises.length}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">זמן אימון</span>
                                <span className="text-xl font-bold text-gray-800">{formatTime(duration)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-gray-500">קלוריות (משוער)</span>
                                <div className="w-24 relative">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={calories}
                                        onChange={(e) => setCalories(e.target.value)}
                                        className="w-full text-right text-xl font-bold text-gray-800 border-none outline-none focus:ring-0 p-0 bg-transparent placeholder-gray-300"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSummary(false)}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                חזור
                            </button>
                            <button
                                onClick={handleFinalSave}
                                className="flex-[2] py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all"
                            >
                                שמור וסיים
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
