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
                onStartWorkout(response.plan.exercises, response.plan.name || "AI Generated Workout");
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
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-teal-500 to-cyan-600 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-xl tracking-wide">מאמן AI</h2>
                            <p className="text-xs text-teal-50 font-medium">הגדרת אימון חכם</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Duration Slider */}
                    <div className="neu-card p-5">
                        <div className="flex justify-between items-center mb-4">
                            <label className="font-bold text-gray-700 flex items-center gap-2">
                                <span>⏱️</span> משך האימון
                            </label>
                            <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-lg text-sm font-bold border border-teal-100 shadow-sm">
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
                            className="w-full h-3 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 transition-all"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                            <span>30 דק'</span>
                            <span>120 דק'</span>
                        </div>
                    </div>

                    {/* Goal Selection */}
                    <div className="space-y-3">
                        <label className="font-bold text-gray-700 px-1">🎯 מטרת האימון</label>
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
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                ▼
                            </div>
                        </div>
                    </div>

                    {/* Equipment Selection */}
                    <div className="space-y-3">
                        <label className="font-bold text-gray-700 px-1">🏋️ ציוד זמין</label>
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
                                        ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg transform scale-105'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 shadow-sm'
                                        }`}
                                >
                                    <span className="font-bold">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Muscle Selection */}
                    <div className="space-y-3">
                        <label className="font-bold text-gray-700 px-1">💪 שרירים להתמקדות</label>
                        <div className="grid grid-cols-3 gap-3">
                            {muscleKeys.map(m => {
                                const isSelected = selectedMuscles.includes(m);
                                const mapping = muscles[m] || { label: m };
                                return (
                                    <button
                                        key={m}
                                        onClick={() => toggleMuscle(m)}
                                        className={`p-3 rounded-2xl text-sm transition-all duration-300 flex flex-col items-center gap-2 border-2 ${isSelected
                                            ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md transform -translate-y-1'
                                            : 'border-transparent bg-white text-gray-500 hover:bg-gray-50 shadow-sm'
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
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                        <span className="text-lg">{aiMessage.type === 'error' ? '⚠️' : '🤖'}</span>
                        <p>{aiMessage.text}</p>
                    </div>
                )}

                {/* Footer Action */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm">
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
