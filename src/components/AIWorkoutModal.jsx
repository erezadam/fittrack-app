import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';

export default function AIWorkoutModal({ onClose, onStartWorkout }) {
    const [loading, setLoading] = useState(false);
    const [muscles, setMuscles] = useState({});
    const [exercises, setExercises] = useState([]);
    const [aiMessage, setAiMessage] = useState(null); // For displaying AI feedback or errors

    // Form State
    const [selectedMuscles, setSelectedMuscles] = useState([]);
    const [duration, setDuration] = useState(45);
    const [equipment, setEquipment] = useState('weights'); // weights, machines, bodyweight
    const [goal, setGoal] = useState('hypertrophy'); // strength, hypertrophy, endurance, maintenance

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [muscleData, exList] = await Promise.all([
                storageService.getMuscles(),
                storageService.getExercises()
            ]);
            setMuscles(muscleData);
            setExercises(exList);
        } catch (error) {
            console.error("Failed to load data for AI Coach:", error);
        }
    };

    const toggleMuscle = (muscleKey) => {
        if (selectedMuscles.includes(muscleKey)) {
            setSelectedMuscles(selectedMuscles.filter(m => m !== muscleKey));
        } else {
            setSelectedMuscles([...selectedMuscles, muscleKey]);
        }
    };

    const handleGenerate = async () => {
        setAiMessage(null); // Clear previous messages
        if (selectedMuscles.length === 0) {
            setAiMessage({ type: 'error', text: 'נא לבחור לפחות שריר אחד' });
            return;
        }

        setLoading(true);

        const userInputs = {
            duration,
            equipment,
            goal,
            targetMuscles: selectedMuscles
        };

        try {
            // We pass null for history for now, or fetch it if needed. 
            // The prompt handles "Silent Assessment" but for this specific form flow, 
            // we are overriding the "Interview" phase with direct inputs.
            const lastWorkout = await storageService.getLastWorkout();

            // We can pass our structured inputs directly.
            const response = await aiService.generateWorkoutPlan(lastWorkout, userInputs, exercises);

            if (response.plan) {
                // Merge AI plan with full exercise data (images, etc.)
                const fullExercises = response.plan.exercises.map(aiEx => {
                    const originalEx = exercises.find(e => e.id === aiEx.id);
                    return {
                        ...originalEx, // Contains imageUrls, video_url, etc.
                        ...aiEx,       // Contains sets, reps, weight from AI
                        // Ensure we keep the ID from the AI if it matches, or original. 
                        // The AI is instructed to use the ID from the list.
                    };
                });

                onStartWorkout(fullExercises, response.plan.name || "AI Generated Workout");
                onClose();
            } else if (response.message) {
                // If AI returns a message instead of a plan, show it in UI
                setAiMessage({ type: 'info', text: response.message });
            }
        } catch (error) {
            console.error("AI Generation Error:", error);
            setAiMessage({ type: 'error', text: "אירעה שגיאה ביצירת האימון. אנא נסה שנית." });
        } finally {
            setLoading(false);
        }
    };

    const muscleKeys = Object.keys(muscles);

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/50">
                {/* Header */}
                {/* Header */}
                <div className="p-6 border-b border-brand-accent/10 flex justify-between items-center bg-brand-card text-brand-text relative overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="bg-brand-bg p-2 rounded-xl border border-brand-accent/20">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-xl tracking-wide text-brand-text">מאמן AI</h2>
                            <p className="text-xs text-brand-muted font-medium">הגדרת אימון חכם</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 text-brand-muted hover:text-white hover:bg-brand-accent/10 rounded-full p-2 transition-all"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Duration Slider */}
                    <div className="neu-card p-5">
                        <div className="flex justify-between items-center mb-4">
                            <label className="font-bold text-brand-text flex items-center gap-2">
                                <span>⏱️</span> משך האימון
                            </label>
                            <span className="bg-brand-accent/10 text-brand-accent px-3 py-1 rounded-lg text-sm font-bold border border-brand-accent/20 shadow-sm">
                                {duration} דקות
                            </span>
                        </div>
                        <input
                            type="range"
                            min="30"
                            max="120"
                            step="5"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full h-3 bg-brand-bg rounded-lg appearance-none cursor-pointer accent-brand-accent hover:accent-brand-accent/80 transition-all"
                        />
                        <div className="flex justify-between text-xs text-brand-muted mt-2 font-medium">
                            <span>30 דק'</span>
                            <span>120 דק'</span>
                        </div>
                    </div>

                    {/* Goal Selection */}
                    <div className="space-y-3">
                        <label className="font-bold text-brand-text px-1">🎯 מטרת האימון</label>
                        <div className="relative">
                            <select
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className="neu-input w-full appearance-none cursor-pointer"
                            >
                                <option value="hypertrophy">היפרטרופיה (בניית שריר)</option>
                                <option value="strength">כוח (Strength)</option>
                                <option value="endurance">סיבולת (Endurance)</option>
                                <option value="maintenance">תחזוקה (Maintenance)</option>
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-muted">
                                ▼
                            </div>
                        </div>
                    </div>

                    {/* Equipment Selection */}
                    <div className="space-y-3">
                        <label className="font-bold text-brand-text px-1">🏋️ ציוד זמין</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'weights', label: 'משקולות', icon: 'dumbbell' },
                                { id: 'machines', label: 'מכונות', icon: 'cogs' },
                                { id: 'bodyweight', label: 'משקל גוף', icon: 'running' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setEquipment(type.id)}
                                    className={`p-3 rounded-xl text-sm transition-all duration-300 flex flex-col items-center gap-2 ${equipment === type.id
                                        ? 'bg-brand-accent text-white shadow-lg transform scale-105'
                                        : 'bg-brand-card text-brand-muted hover:bg-brand-bg shadow-sm'
                                        }`}
                                >
                                    <span className="font-bold">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Muscle Selection */}
                    <div className="space-y-3">
                        <label className="font-bold text-brand-text px-1">💪 שרירים להתמקדות</label>
                        <div className="grid grid-cols-3 gap-3">
                            {muscleKeys.map(m => {
                                const isSelected = selectedMuscles.includes(m);
                                const mapping = muscles[m] || { label: m };
                                return (
                                    <button
                                        key={m}
                                        onClick={() => toggleMuscle(m)}
                                        className={`p-3 rounded-2xl text-sm transition-all duration-300 flex flex-col items-center gap-2 border-2 ${isSelected
                                            ? 'border-brand-accent bg-brand-accent/10 text-brand-accent shadow-md transform -translate-y-1'
                                            : 'border-transparent bg-brand-card text-brand-muted hover:bg-brand-bg shadow-sm'
                                            }`}
                                    >
                                        <div className="text-2xl filter drop-shadow-sm">
                                            {mapping.icon && (mapping.icon.startsWith('http') || mapping.icon.startsWith('data:')) ? (
                                                <img
                                                    src={mapping.icon}
                                                    alt={mapping.label}
                                                    className="w-8 h-8 object-contain mx-auto"
                                                />
                                            ) : (
                                                <span>{mapping.icon || '💪'}</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-xs">{mapping.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* AI Message Area */}
                {aiMessage && (
                    <div className={`mx-6 mb-2 p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${aiMessage.type === 'error'
                        ? 'bg-brand-card text-red-500 border border-red-500/30'
                        : 'bg-brand-card text-brand-accent border border-brand-accent/30'
                        }`}>
                        <span className="text-lg">{aiMessage.type === 'error' ? '⚠️' : '🤖'}</span>
                        <p>{aiMessage.text}</p>
                    </div>
                )}

                {/* Footer Action */}
                <div className="p-6 border-t border-brand-accent/10 bg-brand-card/95 backdrop-blur-sm">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="neu-btn primary w-full py-4 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-3 group"
                    >
                        {loading ? (
                            <>
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>ה-AI חושב...</span>
                            </>
                        ) : (
                            <>
                                <span>צור אימון מותאם אישית</span>
                                <span className="group-hover:rotate-12 transition-transform">✨</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
