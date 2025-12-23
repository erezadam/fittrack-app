import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Circle, ChevronDown, ChevronUp, Plus, Save, ArrowRight, Image as ImageIcon } from 'lucide-react';
import ImageGalleryModal from './ImageGalleryModal';

const HEBREW_MUSCLE_NAMES = { 'Chest': 'חזה', 'Back': 'גב', 'Legs': 'רגליים', 'Shoulders': 'כתפיים', 'Arms': 'זרועות', 'Core': 'בטן', 'Glutes': 'ישבן', 'Cardio': 'אירובי', 'Full Body': 'כל הגוף', 'Abs': 'בטן' };

export default function WorkoutSession({ workout, onBack, onFinish }) {
    const [exercises, setExercises] = useState(workout?.exercises || []);
    const [duration, setDuration] = useState(0);
    const [expandedEx, setExpandedEx] = useState({});
    const [selectedImages, setSelectedImages] = useState(null);

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
    };

    const toggleExpand = (id) => {
        setExpandedEx(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleFinish = () => {
        const safeExercises = exercises || [];
        const completedCount = safeExercises.filter(e => e.isCompleted).length;
        if (completedCount < safeExercises.length) {
            if (!window.confirm(`סיימת רק ${completedCount} מתוך ${safeExercises.length} תרגילים. לסיים בכל זאת?`)) return;
        }
        onFinish({ ...workout, exercises: safeExercises, duration });
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

                                                {/* CHECKBOX */}
                                                <div onClick={(e) => { e.stopPropagation(); toggleExerciseComplete(realIndex); }} className="cursor-pointer shrink-0">
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
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Arrow Icon */}
                                            <div className="text-gray-400 pl-1 shrink-0">
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </div>

                                        {/* EXPANDED SETS */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 p-3 bg-gray-50/50">
                                                <div className="space-y-2">
                                                    {ex.sets?.map((set, sIdx) => (
                                                        <div key={sIdx} className="flex items-center gap-2">
                                                            <div className="w-5 text-xs font-bold text-gray-400">#{sIdx + 1}</div>
                                                            <input type="number" placeholder="קג" defaultValue={set.weight} className="w-16 p-2 border rounded-lg text-center bg-white shadow-sm text-sm" />
                                                            <input type="number" placeholder="חזרות" defaultValue={set.reps} className="w-16 p-2 border rounded-lg text-center bg-white shadow-sm text-sm" />

                                                            <button onClick={() => toggleSetComplete(realIndex, sIdx)} className={`flex-1 p-2 rounded-lg flex items-center justify-center font-medium transition-colors shadow-sm text-sm ${set.isCompleted ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                                                {set.isCompleted ? '✓' : 'סיים'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button className="w-full py-2 text-teal-600 text-sm font-bold border border-teal-200 rounded-lg bg-white mt-2 hover:bg-teal-50 transition-colors">+ הוסף סט</button>
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
                    <button className="p-3 rounded-xl border-2 border-gray-100 text-gray-500 font-bold flex items-center justify-center hover:bg-gray-50 transition-colors" onClick={() => alert('בקרוב: הוספת תרגיל תוך כדי אימון')}>
                        <Plus size={20} />
                    </button>
                    <button onClick={handleFinish} className="flex-1 p-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                        <CheckCircle size={20} /> סיים אימון
                    </button>
                </div>
            </div>

            <ImageGalleryModal isOpen={!!selectedImages} onClose={() => setSelectedImages(null)} images={selectedImages?.images || []} title={selectedImages?.title} />
        </div>
    );
}
