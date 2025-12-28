import React, { useEffect, useState } from 'react';
import { trainerService } from '../services/trainerService';
import { ArrowRight, Calendar, CheckCircle, Clock, Activity, Dumbbell } from 'lucide-react';

export default function TraineeDetails({ trainee, onBack }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSessionId, setExpandedSessionId] = useState(null);

    const toggleSession = (id) => {
        setExpandedSessionId(prev => prev === id ? null : id);
    };

    useEffect(() => {
        if (trainee?.id) {
            loadHistory();
        }
    }, [trainee]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const { assignments, logs } = await trainerService.getTraineeDetails(trainee.id);

            // Allow basic linking: check if an assignment has a log with similar date/content
            // For now, simply merge and sort.

            const merged = [
                ...assignments.map(a => ({ ...a, source: 'assignment' })),
                ...logs.map(l => ({ ...l, source: 'log' }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            setHistory(merged);
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="flex flex-col h-full bg-brand-card rounded-xl shadow-sm overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-teal-600 p-6 text-white text-right">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/80 hover:text-white mb-4 hover:bg-white/10 px-3 py-1 rounded-full transition-all w-fit"
                >
                    <ArrowRight size={18} />
                    <span>חזרה לרשימה</span>
                </button>

                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold mb-1">{trainee.name}</h1>
                        <div className="flex items-center gap-4 text-sm opacity-90">
                            <span>{trainee.email}</span>
                            {trainee.age && <span>• גיל: {trainee.age}</span>}
                            {trainee.phone && <span>• {trainee.phone}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {trainee.notes && (
                    <div className="mb-8 bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-sm text-gray-700">
                        <strong className="block text-yellow-800 mb-1">הערות:</strong>
                        {trainee.notes}
                    </div>
                )}

                <h3 className="text-xl font-bold text-brand-text mb-4 flex items-center gap-2">
                    <Activity className="text-teal-500" />
                    היסטוריית פעילות
                </h3>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">טוען היסטוריה...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-brand-card rounded-xl border border-gray-100">
                        אין פעילות מתועדת למתאמן זה.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item, idx) => {
                            const isAssignment = item.source === 'assignment';
                            const isCompleted = item.status === 'completed' || item.source === 'log'; // Logs are naturally completed
                            const isFuture = isAssignment && new Date(item.date) > new Date();

                            return (
                                <div
                                    key={`${item.source}-${item.id}`}
                                    onClick={() => toggleSession(item.id)}
                                    className={`relative p-4 rounded-xl border transition-all cursor-pointer ${isAssignment
                                        ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                                        : 'bg-brand-card border-gray-200 hover:border-teal-200'
                                        }`}
                                >
                                    {/* Status Badge */}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        {expandedSessionId === item.id && (
                                            <span className="text-xs text-gray-400 self-center">
                                                {item.exercises?.length || 0} תרגילים
                                            </span>
                                        )}
                                        {isAssignment ? (
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${isFuture ? 'bg-amber-100 text-amber-700 opacity-70' :
                                                item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {isFuture ? 'מתוכנן' : item.status === 'completed' ? 'הושלם' : 'ממתין לביצוע'}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700">
                                                בוצע עצמאית
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${isAssignment ? 'bg-amber-100 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                                            {isAssignment ? <Calendar size={24} /> : <Dumbbell size={24} />}
                                        </div>

                                        <div className="flex-1">
                                            <div className="font-bold text-lg text-brand-text">
                                                {item.name || item.workoutName || 'אימון ללא שם'}
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                                <Clock size={14} />
                                                {formatDate(item.date)}
                                            </div>

                                            {/* Preview (Collapsed) */}
                                            {expandedSessionId !== item.id && item.exercises && item.exercises.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {item.exercises.slice(0, 5).map((ex, i) => (
                                                        <span key={i} className={`text-xs px-2 py-1 rounded-md border ${isAssignment ? 'bg-brand-card border-amber-100 text-amber-900' : 'bg-gray-50 border-gray-100 text-gray-600'
                                                            }`}>
                                                            {ex.name}
                                                        </span>
                                                    ))}
                                                    {item.exercises.length > 5 && (
                                                        <span className="text-xs text-gray-400 self-center">
                                                            +{item.exercises.length - 5} נוספים
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Expanded Details */}
                                            {expandedSessionId === item.id && (
                                                <div className="mt-6 pt-4 border-t border-gray-200/50 animate-fade-in cursor-default" onClick={e => e.stopPropagation()}>
                                                    <div className="space-y-6">
                                                        {item.exercises && item.exercises.map((ex, i) => (
                                                            <div key={i} className="flex flex-col md:flex-row gap-4 bg-white/50 p-3 rounded-lg">
                                                                {/* Thumbnail */}
                                                                {ex.imageUrls && ex.imageUrls.length > 0 && (
                                                                    <img
                                                                        src={ex.imageUrls[0]}
                                                                        alt={ex.name}
                                                                        className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                                                                    />
                                                                )}

                                                                <div className="flex-1">
                                                                    <div className="font-bold text-brand-text mb-2">{ex.name}</div>

                                                                    {/* Sets Table */}
                                                                    <div className="w-full overflow-hidden text-sm border rounded-lg border-gray-100">
                                                                        <table className="w-full text-center bg-brand-card">
                                                                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                                                                <tr>
                                                                                    <th className="py-1 px-2 border-l border-gray-100">סט</th>
                                                                                    <th className="py-1 px-2 border-l border-gray-100">משקל (ק״ג)</th>
                                                                                    <th className="py-1 px-2 border-l border-gray-100">חזרות</th>
                                                                                    <th className="py-1 px-2">זמן (שנ׳)</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100">
                                                                                {ex.sets && ex.sets.map((set, setIdx) => (
                                                                                    <tr key={setIdx} className="hover:bg-gray-50/50">
                                                                                        <td className="py-1 px-2 border-l border-gray-100 font-bold text-teal-600">{setIdx + 1}</td>
                                                                                        <td className="py-1 px-2 border-l border-gray-100">{set.weight || '-'}</td>
                                                                                        <td className="py-1 px-2 border-l border-gray-100">{set.reps || '-'}</td>
                                                                                        <td className="py-1 px-2 text-gray-400">{set.time || '-'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                                {(!ex.sets || ex.sets.length === 0) && (
                                                                                    <tr>
                                                                                        <td colSpan="4" className="py-2 text-gray-400 italic text-xs">לא הוזנו נתונים</td>
                                                                                    </tr>
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
