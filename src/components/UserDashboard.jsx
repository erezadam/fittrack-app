import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { trainerService } from '../services/trainerService'; // Import trainerService

export default function UserDashboard({ user, onNavigateToBuilder, onNavigateToHistory, onLogout, onResume, onStartWorkout, onSwitchToTrainer, onNavigateToAdmin }) {
    const [stats, setStats] = useState({
        monthCount: 0,
        weekCount: 0,
        lastWorkoutDate: '-',
        lastWorkoutName: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Stats
                const logs = await storageService.getAllWorkoutLogs(user.id);
                calculateStats(logs);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
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
        const lastCompletedLog = logs.find(log => log.status !== 'in_progress');

        if (lastCompletedLog) {
            const lastDate = new Date(lastCompletedLog.timestamp || lastCompletedLog.date);
            lastDateStr = lastDate.toLocaleDateString('he-IL');
            lastWorkoutName = lastCompletedLog.workoutName || 'אימון ללא שם';
        }

        logs.forEach(log => {
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

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 md:px-4 py-2 md:py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-1 md:mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-gray-800 leading-tight">
                        ברוך הבא, <span className="text-teal-600">{user.firstName}</span>
                    </h1>
                    <p className="text-gray-400 mt-0.5 text-[10px] md:text-base hidden md:block">הנה סיכום הפעילות שלך</p>
                </div>
                <button
                    onClick={onLogout}
                    className="neu-btn text-[10px] md:text-xs text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 md:px-4 md:py-2"
                >
                    יציאה
                </button>
            </div>

            {/* Stats Grid - Aggressive Mobile Optimization */}
            <div className="grid grid-cols-3 gap-1 md:gap-4 mb-3 md:mb-12 items-stretch">
                <div className="neu-card p-1 py-1 md:p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-gray-500 text-[9px] md:text-base font-medium leading-none mb-0.5 md:mb-2 text-nowrap">אימונים החודש</div>
                    <div className="text-lg md:text-4xl font-extrabold text-teal-600 leading-none">{stats.monthCount}</div>
                </div>
                <div className="neu-card p-1 py-1 md:p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-gray-500 text-[9px] md:text-base font-medium leading-none mb-0.5 md:mb-2 text-nowrap">אימונים השבוע</div>
                    <div className="text-lg md:text-4xl font-extrabold text-cyan-600 leading-none">{stats.weekCount}</div>
                </div>
                <div className="neu-card p-1 py-1 md:p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-gray-500 text-[9px] md:text-base font-medium leading-none mb-0.5 md:mb-2 text-nowrap">אימון אחרון</div>
                    <div className="text-sm md:text-xl font-bold text-gray-800 leading-none">{stats.lastWorkoutDate}</div>
                    {stats.lastWorkoutName && (
                        <div className="hidden md:block text-xs md:text-sm text-teal-600 mt-0.5 md:mt-1 font-medium truncate w-full px-2 max-w-[200px] md:max-w-none">
                            {stats.lastWorkoutName}
                        </div>
                    )}
                </div>
            </div>

            {/* CTA */}
            <div className="text-center flex flex-col md:flex-row gap-3 md:gap-4 justify-center">
                <button
                    onClick={onNavigateToBuilder}
                    className="neu-btn primary text-lg md:text-xl py-3 md:py-4 px-8 md:px-12 shadow-lg hover:shadow-xl transition-all"
                >
                    בנה אימון חופשי +
                </button>
                <button
                    onClick={onNavigateToHistory}
                    className="neu-btn primary text-lg md:text-xl py-3 md:py-4 px-8 md:px-12 shadow-lg hover:shadow-xl transition-all"
                >
                    📅 תוכנית אימונים
                </button>
                {(user.role === 'trainer' || user.role === 'admin' || user.isAdmin) && (
                    <button
                        onClick={onSwitchToTrainer}
                        className="neu-btn text-lg md:text-xl py-3 md:py-4 px-8 md:px-12 shadow-lg hover:shadow-xl transition-all bg-teal-500 hover:bg-teal-600 text-white border-teal-600"
                    >
                        תכנון מאמן
                    </button>
                )}
                {user.role === 'admin' && (
                    <button
                        onClick={onNavigateToAdmin}
                        className="neu-btn text-lg md:text-xl py-3 md:py-4 px-8 md:px-12 shadow-lg hover:shadow-xl transition-all bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-600"
                    >
                        ניהול
                    </button>
                )}
            </div>
        </div>
    );
}
