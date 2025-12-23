import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { trainerService } from '../services/trainerService';

export default function WorkoutHistory({ user, onBack, onResume, onRepeat, onStartWorkout }) {
    const [logs, setLogs] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState(null);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch logs AND assignments via the unified service if possible, or separately
            // Assuming traineeService has getTraineeDetails which returns both
            const details = await trainerService.getTraineeDetails(user.id);

            // Filter assignments to show only "future" or "pending" ones?
            // For now, show all 'assigned' or 'pending' ones
            const pendingAssignments = details.assignments
                .filter(a => a.status === 'assigned' || a.status === 'pending')
                .sort((a, b) => new Date(a.date) - new Date(b.date)); // Earliest first

            setAssignments(pendingAssignments);
            setLogs(details.logs);
        } catch (error) {
            console.error("Failed to load workout history/data", error);
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
        const muscles = [...new Set(exercises.map(ex => ex.mainMuscle || ex.muscle))];
        return muscles.join(', ');
    };

    const handleStartAssignment = (assignment) => {
        if (onStartWorkout) {
            onStartWorkout(assignment.exercises, assignment.name, null, assignment.id);
        }
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
                <div className="w-10"></div>
            </div>

            <div className="space-y-8 max-w-md mx-auto">

                {/* UPCOMING WORKOUTS SECTION */}
                {assignments.length > 0 && (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-bold text-teal-400 mb-3 flex items-center gap-2">
                            <span>📅</span> אימונים מתוכננים
                        </h3>
                        <div className="space-y-3">
                            {assignments.map(assignment => (
                                <div key={assignment.id} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-teal-500/30 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-teal-500"></div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <div className="font-bold text-lg text-white">{assignment.name}</div>
                                            <div className="text-xs text-teal-300">
                                                {formatDate(assignment.date || assignment.startDate)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-teal-500/20 px-2 py-0.5 rounded text-[10px] text-teal-200 border border-teal-500/30">
                                                מתוכנן
                                            </span>
                                            <div className="bg-teal-500/10 px-2 py-1 rounded text-xs text-teal-300 border border-teal-500/20">
                                                {assignment.exercises?.length || 0} תרגילים
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStartAssignment(assignment)}
                                        className="w-full mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-teal-500/20"
                                    >
                                        <span>▶</span> התחל אימון זה
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PAST LOGS SECTION */}
                <div>
                    <h3 className="text-lg font-bold text-gray-400 mb-3 flex items-center gap-2">
                        <span>📜</span> היסטוריית ביצועים
                    </h3>

                    {logs.length === 0 ? (
                        <div className="text-center py-12 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
                            <div className="text-4xl mb-4 opacity-30">🏋️‍♂️</div>
                            <h3 className="text-lg font-medium text-gray-400">עדיין לא בוצעו אימונים</h3>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map(log => {
                                const isInProgress = log.status === 'in_progress' || log.status === 'partial';
                                return (
                                    <div
                                        key={log.id}
                                        onClick={() => toggleExpand(log.id)}
                                        className={`
                                            relative overflow-hidden rounded-2xl border 
                                            ${isInProgress
                                                ? 'border-orange-500/50 bg-orange-900/20'
                                                : 'border-white/10 bg-gray-800/40'}
                                            backdrop-blur-xl shadow-lg transition-all duration-300
                                            ${expandedLogId === log.id ? 'ring-1 ring-teal-500/50 bg-gray-800/60' : 'hover:bg-gray-800/60'}
                                        `}
                                    >
                                        {/* Card Header (Always Visible) */}
                                        <div className="p-4 flex justify-between items-center cursor-pointer">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="text-lg font-bold text-white">
                                                        {log.workoutName || 'אימון'}
                                                    </div>
                                                    {isInProgress && (
                                                        <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                                                            בתהליך
                                                        </span>
                                                    )}
                                                    {log.status === 'partial' && (
                                                        <span className="text-[10px] font-bold bg-yellow-500 text-white px-2 py-0.5 rounded-full">
                                                            חלקי
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-300 mb-1">
                                                    {formatDate(log.timestamp || log.date)}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {getMainMuscles(log.exercises)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm("האם אתה בטוח שברצונך למחוק את האימון?")) {
                                                            try {
                                                                await storageService.deleteWorkoutLog(log.id);
                                                                setLogs(logs.filter(l => l.id !== log.id));
                                                            } catch (error) {
                                                                alert("שגיאה במחיקת האימון");
                                                            }
                                                        }
                                                    }}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors"
                                                    title="מחק אימון"
                                                >
                                                    🗑️
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isInProgress ? 'bg-orange-500/20 text-orange-300' : 'bg-teal-500/20 text-teal-300'}`}>
                                                        {log.exercises?.length || 0} תרגילים
                                                    </span>
                                                    <span className={`text-gray-500 transform transition-transform ${expandedLogId === log.id ? 'rotate-180' : ''}`}>
                                                        ▼
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedLogId === log.id && (
                                            <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-fade-in">
                                                {/* Stats Row */}
                                                <div className="flex justify-around items-center py-3 border-b border-white/5 mb-2">
                                                    <div className="text-center">
                                                        <span className="text-xs text-gray-500 block">זמן</span>
                                                        <span className="font-bold text-white">{log.durationMinutes || 0} דק'</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-xs text-gray-500 block">קלוריות</span>
                                                        <span className="font-bold text-white">{log.calories || 0}</span>
                                                    </div>
                                                </div>
                                                {isInProgress && (
                                                    <div className="my-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const exercisesToLoad = log?.exercises || [];
                                                                if (onStartWorkout) {
                                                                    onStartWorkout(exercisesToLoad, log?.workoutName || 'אימון מהיסטוריה', log);
                                                                } else if (onResume) {
                                                                    onResume({ ...log, exercises: exercisesToLoad });
                                                                }
                                                            }}
                                                            className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
                                                        >
                                                            <span>▶</span> המשך אימון
                                                        </button>
                                                    </div>
                                                )}
                                                {!isInProgress && (
                                                    <div className="my-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onRepeat) {
                                                                    if (window.confirm(`האם להתחיל אימון חדש המבוסס על "${log.workoutName}"?`)) {
                                                                        onRepeat(log);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
                                                        >
                                                            <span>↺</span> חזור על אימון זה
                                                        </button>
                                                    </div>
                                                )}
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
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
