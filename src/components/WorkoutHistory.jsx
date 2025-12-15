import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

export default function WorkoutHistory({ user, onBack }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        loadLogs();
    }, [user]);

    const loadLogs = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await storageService.getAllWorkoutLogs(user.id);
            setLogs(data);
        } catch (error) {
            console.error("Failed to load workout logs", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getMainMuscles = (exercises) => {
        if (!exercises || exercises.length === 0) return 'ללא תרגילים';
        // Extract unique main muscles
        const muscles = [...new Set(exercises.map(ex => ex.mainMuscle || ex.muscle))]; // Handle potential data inconsistencies
        return muscles.join(', ');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full bg-gray-800/50 backdrop-blur-md border border-white/10 text-white hover:bg-gray-700/50 transition-all"
                >
                    ←
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                    היסטוריית אימונים
                </h1>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* List */}
            <div className="space-y-4 max-w-md mx-auto">
                {logs.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4 opacity-50">📅</div>
                        <h3 className="text-xl font-medium text-gray-300">עדיין לא בוצעו אימונים</h3>
                        <p className="text-gray-500 mt-2">התחל להתאמן כדי לראות את ההיסטוריה שלך כאן!</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div
                            key={log.id}
                            onClick={() => toggleExpand(log.id)}
                            className={`
                                relative overflow-hidden rounded-2xl border border-white/10 
                                bg-gray-800/40 backdrop-blur-xl shadow-lg transition-all duration-300
                                ${expandedLogId === log.id ? 'ring-1 ring-teal-500/50 bg-gray-800/60' : 'hover:bg-gray-800/60'}
                            `}
                        >
                            {/* Card Header (Always Visible) */}
                            <div className="p-4 flex justify-between items-center cursor-pointer">
                                <div>
                                    <div className="text-lg font-bold text-white mb-1">
                                        {log.workoutName || 'אימון'}
                                    </div>
                                    <div className="text-sm text-gray-300 mb-1">
                                        {formatDate(log.timestamp || log.date)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {getMainMuscles(log.exercises)}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold bg-teal-500/20 text-teal-300 px-2 py-1 rounded-full mb-1">
                                        {log.exercises?.length || 0} תרגילים
                                    </span>
                                    <span className={`text-gray-500 transform transition-transform ${expandedLogId === log.id ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedLogId === log.id && (
                                <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-fade-in">
                                    <div className="mt-3 space-y-3">
                                        {log.exercises?.map((ex, idx) => (
                                            <div key={idx} className="bg-black/20 rounded-lg p-3">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium text-teal-100">{ex.name}</span>
                                                    <span className="text-xs text-gray-500">{ex.muscle || ex.mainMuscle}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-400">
                                                    <div>סטים</div>
                                                    <div>חזרות</div>
                                                    <div>משקל (ק"ג)</div>
                                                </div>
                                                <div className="space-y-1 mt-1">
                                                    {ex.sets?.map((set, sIdx) => (
                                                        <div key={sIdx} className="grid grid-cols-3 gap-2 text-center text-sm text-gray-300">
                                                            <div>{sIdx + 1}</div>
                                                            <div>{set.reps}</div>
                                                            <div>{set.weight}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {log.notes && (
                                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                            <span className="text-xs font-bold text-yellow-500 block mb-1">הערות:</span>
                                            <p className="text-sm text-gray-300">{log.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
