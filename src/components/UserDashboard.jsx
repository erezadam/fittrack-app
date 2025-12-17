import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

export default function UserDashboard({ user, onNavigateToBuilder, onNavigateToHistory, onLogout, onResume }) {
    const [stats, setStats] = useState({
        monthCount: 0,
        weekCount: 0,
        lastWorkoutDate: '-',
        lastWorkoutName: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch logs for this specific user
                const logs = await storageService.getAllWorkoutLogs(user.id);
                calculateStats(logs);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchStats();
        }
    }, [user]);

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
        let lastDateStr = '-';
        let lastWorkoutName = '';

        // Find last COMPLETED workout (not in_progress)
        // Assuming logs are sorted by date desc (newest first)
        const lastCompletedLog = logs.find(log => log.status !== 'in_progress');

        if (lastCompletedLog) {
            const lastDate = new Date(lastCompletedLog.timestamp || lastCompletedLog.date);
            lastDateStr = lastDate.toLocaleDateString('he-IL');
            lastWorkoutName = lastCompletedLog.workoutName || 'אימון ללא שם';
        }

        logs.forEach(log => {
            // Only count completed workouts for stats? Or all? 
            // Usually stats count completed workouts.
            if (log.status === 'in_progress') return;

            const logDate = new Date(log.timestamp || log.date);
            if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                monthCount++;
            }
            if (logDate >= startOfWeek) {
                weekCount++;
            }
        });

        setStats({
            monthCount,
            weekCount,
            lastWorkoutDate: lastDateStr,
            lastWorkoutName
        });
    };

    // We need exercise names for the last workout list
    const [exerciseMap, setExerciseMap] = useState({});
    useEffect(() => {
        const loadExercises = async () => {
            const exs = await storageService.getExercises();
            const map = {};
            exs.forEach(e => map[e.id] = e.name);
            setExerciseMap(map);
        };
        loadExercises();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        ברוך הבא, <span className="text-teal-600">{user.firstName}</span> 👋
                    </h1>
                    <p className="text-gray-500 mt-1">הנה סיכום הפעילות שלך</p>
                </div>
                <button
                    onClick={onLogout}
                    className="neu-btn text-xs text-red-500 bg-red-50 hover:bg-red-100"
                >
                    יציאה
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 items-start">
                {/* Card 1: Month */}
                <div className="neu-card p-6 flex flex-col items-center justify-center text-center h-full">
                    <div className="text-gray-500 font-medium mb-2">אימונים החודש</div>
                    <div className="text-4xl font-extrabold text-teal-600">{stats.monthCount}</div>
                </div>

                {/* Card 2: Week */}
                <div className="neu-card p-6 flex flex-col items-center justify-center text-center h-full">
                    <div className="text-gray-500 font-medium mb-2">אימונים השבוע</div>
                    <div className="text-4xl font-extrabold text-cyan-600">{stats.weekCount}</div>
                </div>

                {/* Card 3: Last Workout */}
                <div className="neu-card p-6 flex flex-col items-center justify-center text-center h-full">
                    <div className="text-gray-500 font-medium mb-2">אימון אחרון</div>
                    <div className="text-xl font-bold text-gray-800">{stats.lastWorkoutDate}</div>
                    {stats.lastWorkoutName && (
                        <div className="text-sm text-teal-600 mt-1 font-medium truncate w-full px-2">
                            {stats.lastWorkoutName}
                        </div>
                    )}
                </div>
            </div>

            {/* CTA */}
            <div className="text-center flex flex-col md:flex-row gap-4 justify-center">
                <button
                    onClick={onNavigateToBuilder}
                    className="neu-btn primary text-xl py-4 px-12 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                >
                    עבור לתכנון האימון ←
                </button>
                <button
                    onClick={onNavigateToHistory}
                    className="neu-btn text-xl py-4 px-12 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all bg-gray-800 text-white border-gray-700"
                >
                    📜 היסטוריית אימונים
                </button>
            </div>
        </div>
    );
}
