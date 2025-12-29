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
            console.log("Loading history for user:", user.id);

            // 1. Fetch Logs directly from storageService (Reliable)
            const workoutLogs = await storageService.getAllWorkoutLogs(user.id);

            // Separate History vs Planned
            const historyLogs = workoutLogs.filter(l => l.status !== 'planned');
            const plannedLogs = workoutLogs.filter(l => l.status === 'planned');

            setLogs(historyLogs);

            // 2. Fetch Assignments via trainerService (if any) and merge with planned logs
            let mergedAssignments = [...plannedLogs];
            try {
                const details = await trainerService.getTraineeDetails(user.id);
                const trainerAssignments = details.assignments
                    .filter(a => a.status === 'assigned' || a.status === 'pending');

                mergedAssignments = [...mergedAssignments, ...trainerAssignments];
            } catch (err) {
                console.warn("Failed to load assignments (User might not be a trainee):", err);
            }

            // Sort by date ascending
            mergedAssignments.sort((a, b) => new Date(a.date || a.timestamp) - new Date(b.date || b.timestamp));
            setAssignments(mergedAssignments);

        } catch (error) {
            console.error("Failed to load workout history:", error);
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
            // If it's a planned workout log, pass ID as logId (3rd arg) so it gets updated
            if (assignment.status === 'planned') {
                onStartWorkout(assignment.exercises, assignment.name, assignment.id, null);
            } else {
                // Trainer assignment
                onStartWorkout(assignment.exercises, assignment.name, null, assignment.id);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-brand-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-bg text-white p-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full bg-brand-card/50 backdrop-blur-md border border-white/10 text-white hover:bg-brand-card transition-all"
                >
                    ←
                </button>
                <h1 className="text-2xl font-bold text-brand-accent">
                    אימונים מתוכננים
                </h1>
                <div className="w-10"></div>
            </div>

            <div className="space-y-8 max-w-md mx-auto">

                {/* UPCOMING WORKOUTS SECTION */}
                {assignments.length > 0 && (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-bold text-brand-accent mb-3 flex items-center gap-2">
                            <span>📅</span> אימונים מתוכננים
                        </h3>
                        <div className="space-y-3">
                            {assignments.map(assignment => (
                                <div key={assignment.id} className="bg-brand-card border border-brand-accent/30 rounded-xl p-4 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-brand-accent"></div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <div className="text-brand-text font-bold text-lg text-center leading-none">{assignment.name}</div>
                                            <div className="text-xs text-brand-accent">
                                                {formatDate(assignment.date || assignment.startDate)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-brand-accent/20 px-2 py-0.5 rounded text-[10px] text-brand-accent border border-brand-accent/30">
                                                מתוכנן
                                            </span>
                                            <div className="bg-brand-accent/10 px-2 py-1 rounded text-xs text-brand-accent border border-brand-accent/20">
                                                {assignment.exercises?.length || 0} תרגילים
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStartAssignment(assignment)}
                                        className="w-full mt-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
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
                    <h3 className="text-lg font-bold text-brand-muted mb-3 flex items-center gap-2">
                        <span>📜</span> היסטוריית ביצועים
                    </h3>

                    {logs.length === 0 ? (
                        <div className="text-center py-12 bg-brand-card/20 rounded-xl border border-dashed border-gray-700">
                            <div className="text-4xl mb-4 opacity-30">🏋️‍♂️</div>
                            <h1 className="text-2xl font-bold text-brand-text">היסטוריית אימונים</h1>
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
                                                ? 'border-brand-accent/50 bg-brand-accent/5'
                                                : 'border-white/10 bg-brand-card'}
                                            backdrop-blur-xl shadow-lg transition-all duration-300
                                            ${expandedLogId === log.id ? 'ring-1 ring-brand-accent/50 bg-brand-card' : 'hover:bg-brand-card/80'}
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
                                                        <span className="text-[10px] font-bold bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-full animate-pulse">
                                                            בתהליך
                                                        </span>
                                                    )}
                                                    {log.status === 'partial' && (
                                                        <span className="text-[10px] font-bold bg-brand-card text-brand-muted px-2 py-0.5 rounded-full border border-brand-accent/20">
                                                            חלקי
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-brand-muted mb-1">
                                                    {formatDate(log.timestamp || log.date)}
                                                </div>
                                                <div className="text-xs text-brand-muted">
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
                                                    className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                                    title="מחק אימון"
                                                >
                                                    🗑️
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isInProgress ? 'bg-brand-accent/20 text-brand-accent' : 'bg-brand-accent/20 text-brand-accent'}`}>
                                                        {log.exercises?.length || 0} תרגילים
                                                    </span>
                                                    <span className={`text-brand-muted transform transition-transform ${expandedLogId === log.id ? 'rotate-180' : ''}`}>
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
                                                        <span className="text-xs text-brand-muted block">זמן</span>
                                                        <span className="font-bold text-white">{log.durationMinutes || 0} דק'</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-xs text-brand-muted block">קלוריות</span>
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
                                                            className="w-full py-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
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
                                                            className="w-full py-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
                                                        >
                                                            <span>↺</span> חזור על אימון זה
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="mt-3 space-y-3">
                                                    {log.exercises?.map((ex, idx) => (
                                                        <div key={idx} className="bg-brand-bg rounded-lg p-3">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-medium text-brand-accent">{ex.name}</span>
                                                                <span className="text-xs text-brand-muted">{ex.muscle || ex.mainMuscle}</span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 text-center text-xs text-brand-muted">
                                                                <div>סטים</div>
                                                                <div>חזרות</div>
                                                                <div>משקל (ק"ג)</div>
                                                            </div>
                                                            <div className="space-y-1 mt-1">
                                                                {ex.sets?.map((set, sIdx) => (
                                                                    <div key={sIdx} className="grid grid-cols-3 gap-2 text-center text-sm text-brand-muted">
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
                                                    <div className="mt-4 p-3 bg-brand-card border border-brand-accent/10 rounded-lg">
                                                        <span className="text-xs font-bold text-brand-accent block mb-1">הערות:</span>
                                                        <h3 className="font-bold text-lg text-brand-text">{log.workoutName || 'אימון ללא שם'}</h3>
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
