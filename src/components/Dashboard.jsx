import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { TrendingUp, Calendar, Clock, Flame, Trophy, Plus } from 'lucide-react';

const Dashboard = ({ onCreateWorkout }) => {
    const [stats, setStats] = useState({
        monthWorkouts: 0,
        weekWorkouts: 0,
        lastWorkout: 'אין',
        streak: 0
    });
    const [topExercises, setTopExercises] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const logs = await storageService.getAllWorkoutLogs();
                calculateStats(logs);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const calculateStats = (logs) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Week calculation (Sunday to Saturday)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        let monthCount = 0;
        let weekCount = 0;
        let lastDate = null;
        let streak = 0;
        const exerciseCounts = {};

        // Sort logs by date desc just in case
        const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sortedLogs.length > 0) {
            const lastWorkoutDate = new Date(sortedLogs[0].timestamp);
            lastDate = lastWorkoutDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' });

            // Simple streak calculation (consecutive days with workouts)
            // This is a simplified version. For robust streak, we need to check gaps.
            // For MVP, let's count consecutive logs that are 1 day apart or same day.
            let currentStreak = 1;
            for (let i = 0; i < sortedLogs.length - 1; i++) {
                const d1 = new Date(sortedLogs[i].timestamp);
                const d2 = new Date(sortedLogs[i + 1].timestamp);
                const diffTime = Math.abs(d1 - d2);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 1) { // Same day or next day
                    if (d1.getDate() !== d2.getDate()) {
                        currentStreak++;
                    }
                } else {
                    break;
                }
            }
            streak = currentStreak;
        }

        sortedLogs.forEach(log => {
            const logDate = new Date(log.timestamp);

            if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                monthCount++;
            }

            if (logDate >= startOfWeek) {
                weekCount++;
            }

            if (log.exercises) {
                log.exercises.forEach(ex => {
                    const name = ex.name || 'Unknown Exercise';
                    exerciseCounts[name] = (exerciseCounts[name] || 0) + 1;
                });
            }
        });

        setStats({
            monthWorkouts: monthCount,
            weekWorkouts: weekCount,
            lastWorkout: lastDate || 'אין',
            streak: streak
        });

        const sortedExercises = Object.entries(exerciseCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        setTopExercises(sortedExercises);
    };

    if (loading) return <div className="p-8 text-center">טוען נתונים...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto font-sans" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-brand-accent flex items-center gap-2">
                        שלום, ארז! 👋
                    </h1>
                    <p className="text-brand-muted text-sm">הנה הסטטיסטיקות שלך</p>
                </div>
                <button
                    onClick={onCreateWorkout}
                    className="bg-brand-accent hover:bg-brand-accent/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                >
                    <Plus size={20} />
                    צור אימון
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Month Workouts */}
                <div className="bg-brand-card/50 p-6 rounded-2xl shadow-sm border border-brand-accent/10 flex flex-col items-center justify-center gap-2">
                    <div className="bg-brand-accent/10 p-3 rounded-xl text-brand-accent">
                        <TrendingUp size={24} />
                    </div>
                    <span className="text-3xl font-bold text-brand-text">{stats.monthWorkouts}</span>
                    <span className="text-sm text-brand-muted">אימונים החודש</span>
                </div>

                {/* Week Workouts */}
                <div className="bg-brand-card/50 p-6 rounded-2xl shadow-sm border border-brand-accent/10 flex flex-col items-center justify-center gap-2">
                    <div className="bg-brand-accent/10 p-3 rounded-xl text-brand-accent">
                        <Calendar size={24} />
                    </div>
                    <span className="text-3xl font-bold text-brand-text">{stats.weekWorkouts}</span>
                    <span className="text-sm text-brand-muted">אימונים השבוע</span>
                </div>

                {/* Last Workout */}
                <div className="bg-brand-card/50 p-6 rounded-2xl shadow-sm border border-brand-accent/10 flex flex-col items-center justify-center gap-2">
                    <div className="bg-brand-accent/10 p-3 rounded-xl text-brand-accent">
                        <Clock size={24} />
                    </div>
                    <span className="text-xl font-bold text-brand-text text-center">{stats.lastWorkout}</span>
                    <span className="text-sm text-brand-muted">אימון אחרון</span>
                </div>

                {/* Streak */}
                <div className="bg-brand-card/50 p-6 rounded-2xl shadow-sm border border-brand-accent/10 flex flex-col items-center justify-center gap-2">
                    <div className="bg-brand-accent/10 p-3 rounded-xl text-brand-accent">
                        <Flame size={24} />
                    </div>
                    <span className="text-3xl font-bold text-brand-text">{stats.streak}</span>
                    <span className="text-sm text-brand-muted">ימים ברצף</span>
                </div>
            </div>

            {/* Top Exercises */}
            <div className="bg-brand-card/50 rounded-2xl shadow-sm border border-brand-accent/10 overflow-hidden">
                <div className="p-4 border-b border-brand-accent/10 flex items-center gap-2">
                    <div className="bg-brand-accent/10 p-2 rounded-lg text-brand-accent">
                        <Trophy size={20} />
                    </div>
                    <h2 className="font-bold text-brand-text">10 התרגילים המובילים שלך</h2>
                </div>

                <div className="divide-y divide-slate-700">
                    {topExercises.length === 0 ? (
                        <div className="p-8 text-center text-brand-muted">עדיין אין נתונים. התחל להתאמן!</div>
                    ) : (
                        topExercises.map((ex, index) => (
                            <div key={index} className="p-4 flex items-center justify-between hover:bg-brand-accent/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className="w-8 h-8 flex items-center justify-center bg-brand-bg rounded-full text-sm font-bold text-brand-muted">
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-brand-text">{ex.name}</span>
                                </div>
                                <span className="text-sm text-brand-muted">{ex.count} פעמים</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
