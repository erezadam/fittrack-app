import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Circle, ChevronDown, ChevronUp, Plus, Save, ArrowRight, Image as ImageIcon } from 'lucide-react';
import ImageGalleryModal from './ImageGalleryModal';

const HEBREW_MUSCLE_NAMES = { 'Chest': 'חזה', 'Back': 'גב', 'Legs': 'רגליים', 'Shoulders': 'כתפיים', 'Arms': 'זרועות', 'Core': 'בטן', 'Glutes': 'ישבן', 'Cardio': 'אירובי', 'Full Body': 'כל הגוף', 'Abs': 'בטן' };

export default function WorkoutSession({ workout, onBack, onFinish }) {
    const [exercises, setExercises] = useState(workout.exercises || []);
    const [duration, setDuration] = useState(0);
    const [expandedEx, setExpandedEx] = useState({});
    const [selectedImages, setSelectedImages] = useState(null); // For Image Modal

    useEffect(() => {
        const timer = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleSetComplete = (exIndex, setIndex) => {
        const newExercises = [...exercises];
        const set = newExercises[exIndex].sets[setIndex];
        set.isCompleted = !set.isCompleted;

        const allSetsDone = newExercises[exIndex].sets.every(s => s.isCompleted);
        newExercises[exIndex].isCompleted = allSetsDone;

        setExercises(newExercises);
    };

    const toggleExerciseComplete = (exIndex) => {
        const newExercises = [...exercises];
        const isComplete = !newExercises[exIndex].isCompleted;
        newExercises[exIndex].isCompleted = isComplete;
        newExercises[exIndex].sets.forEach(s => s.isCompleted = isComplete);
        setExercises(newExercises);
    };

    const toggleExpand = (id) => {
        setExpandedEx(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleFinish = () => {
        const completedCount = exercises.filter(e => e.isCompleted).length;
        if (completedCount < exercises.length) {
            if (!window.confirm(`סיימת רק ${completedCount} מתוך ${exercises.length} תרגילים. לסיים בכל זאת?`)) return;
        }
        onFinish({ ...workout, exercises, duration });
    };

    // Grouping Logic
    const groupedExercises = exercises.reduce((acc, ex, index) => {
        const muscleKey = ex.muscle_group_id || ex.mainMuscle || 'Other';
        if (!acc[muscleKey]) acc[muscleKey] = [];
        acc[muscleKey].push({ ...ex, originalIndex: index });
        return acc;
    }, {});

    const completedCount = exercises.filter(e => e.isCompleted).length;

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
                <div className="flex justify-between items-start mb-4">
                    <button onClick={onBack} className="text-teal-100 hover:text-white flex items-center gap-1 text-sm font-medium">
                        <ArrowRight size={16} /> יציאה
                    </button>
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-sm font-mono backdrop-blur-sm">
                        <Clock size={14} /> {formatTime(duration)}
                    </div>
                </div>

                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-1">אימון פעיל</h1>
                    <div className="text-teal-100 text-lg">
                        בחרת {exercises.length} תרגילים • <span className="text-white font-bold">בוצע {completedCount}</span>
                    </div>
                </div>
            </div>

            {/* EXERCISE LIST */}
            <div className="max-w-4xl mx-auto p-4 space-y-8 mt-4">
                {Object.entries(groupedExercises).map(([muscle, groupExs]) => (
                    <div key={muscle} className="animate-fade-in">
                        <h3 className="text-xl font-bold text-teal-700 mb-3 border-b border-teal-100 pb-2 mx-2 flex items-center gap-2">
                            {HEBREW_MUSCLE_NAMES[muscle] || muscle}
                        </h3>

                        <div className="space-y-4">
                            {groupExs.map((ex) => {
                                const realIndex = ex.originalIndex;
                                const isExpanded = expandedEx[ex.id];

                                return (
                                    <div key={ex.id} className={`bg-white rounded-xl shadow-sm border transition-all ${ex.isCompleted ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100'}`}>
                                        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(ex.id)}>
                                            <div className="flex items-center gap-4 flex-1">
                                                {/* CHECKBOX */}
                                                <div onClick={(e) => { e.stopPropagation(); toggleExerciseComplete(realIndex); }} className="cursor-pointer shrink-0">
                                                    {ex.isCompleted ? <CheckCircle className="text-teal-500" size={28} /> : <Circle className="text-gray-300" size={28} />}
                                                </div>

                                                {/* IMAGE THUMBNAIL (RESTORED) */}
                                                <div onClick={(e) => { e.stopPropagation(); setSelectedImages({ images: ex.imageUrls || [], title: ex.name }); }} className="relative w-12 h-12 shrink-0 group">
                                                    {ex.imageUrls?.[0] ? (
                                                        <img src={ex.imageUrls[0]} className="w-full h-full rounded-lg object-cover bg-gray-100 border border-gray-200" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center"><ImageIcon size={16} className="text-gray-400" /></div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold text-lg truncate ${ex.isCompleted ? 'text-teal-700 line-through decoration-teal-300' : 'text-gray-800'}`}>
                                                        {ex.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate">
                                                        {ex.sets.length} סטים • {ex.equipment || 'ללא ציוד'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-gray-400 pl-2">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>

                                        {/* SETS */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 p-4 bg-gray-50/50 rounded-b-xl">
                                                <div className="space-y-3">
                                                    {ex.sets.map((set, sIdx) => (
                                                        <div key={sIdx} className="flex items-center gap-3">
                                                            <div className="w-6 text-sm font-bold text-gray-400">#{sIdx + 1}</div>
                                                            <input type="number" placeholder="קג" defaultValue={set.weight} className="w-20 p-2 border rounded-lg text-center bg-white shadow-sm" />
                                                            <input type="number" placeholder="חזרות" defaultValue={set.reps} className="w-20 p-2 border rounded-lg text-center bg-white shadow-sm" />

                                                            <button onClick={() => toggleSetComplete(realIndex, sIdx)} className={`flex-1 p-2 rounded-lg flex items-center justify-center font-medium transition-colors shadow-sm ${set.isCompleted ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                                                {set.isCompleted ? 'בוצע ✓' : 'סיים סט'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button className="w-full py-3 text-teal-600 text-sm font-bold border border-teal-200 rounded-lg bg-white mt-2 hover:bg-teal-50 transition-colors">+ הוסף סט</button>
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

            {/* FOOTER ACTIONS (RESTORED DESIGN) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-20">
                <div className="max-w-4xl mx-auto flex gap-4">
                    <button className="p-4 rounded-xl border-2 border-gray-100 text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors" onClick={() => alert('בקרוב: הוספת תרגיל תוך כדי אימון')}>
                        <Plus size={20} />
                    </button>
                    <button onClick={handleFinish} className="flex-1 p-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-bold text-xl shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                        <CheckCircle size={24} /> סיים אימון
                    </button>
                </div>
            </div>

            <ImageGalleryModal isOpen={!!selectedImages} onClose={() => setSelectedImages(null)} images={selectedImages?.images || []} title={selectedImages?.title} />
        </div>
    );
}
