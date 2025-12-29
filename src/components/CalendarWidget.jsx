import React, { useState, useEffect } from 'react';
import { trainerService } from '../services/trainerService';
import { ChevronLeft, ChevronRight, Activity, Calendar } from 'lucide-react';

const DAYS_OF_WEEK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function CalendarWidget({ traineeId, selectedDate, onSelectDate }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState({}); // Map: 'YYYY-MM-DD' -> { type: 'assignment'|'log', ... }
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (traineeId) {
            fetchSchedule();
        }
    }, [traineeId, currentDate]);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const data = await trainerService.getTraineeDetails(traineeId);

            const eventMap = {};

            // Map Assignments
            if (data.assignments) {
                data.assignments.forEach(a => {
                    const dateStr = formatDateKey(a.date);
                    if (!eventMap[dateStr]) eventMap[dateStr] = [];
                    eventMap[dateStr].push({ type: 'assignment', ...a });
                });
            }

            // Map Logs
            if (data.logs) {
                data.logs.forEach(l => {
                    const dateStr = formatDateKey(l.date);
                    if (!eventMap[dateStr]) eventMap[dateStr] = [];
                    eventMap[dateStr].push({ type: 'log', ...l });
                });
            }

            setEvents(eventMap);
        } catch (error) {
            console.error("Error fetching schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateKey = (dateObj) => {
        if (!dateObj) return '';
        // Use a safe way to get YYYY-MM-DD in local time
        const d = new Date(dateObj);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day) => {
        const dateStr = formatDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        onSelectDate(dateStr);
    };

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const blanks = Array(firstDay).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const totalSlots = [...blanks, ...days];

        return totalSlots.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="h-24 bg-brand-card/50 border border-brand-accent/10"></div>;

            const dateKey = formatDateKey(new Date(year, month, day));
            const dayEvents = events[dateKey] || [];
            const isToday = dateKey === formatDateKey(new Date());
            const isSelected = selectedDate === dateKey;

            return (
                <div
                    key={dateKey}
                    onClick={() => handleDateClick(day)}
                    className={`h-24 border border-brand-accent/10 p-1 relative cursor-pointer transition-all hover:bg-brand-accent/5 flex flex-col justify-between
                        ${isSelected ? 'bg-brand-accent/10 ring-2 ring-inset ring-brand-accent' : 'bg-brand-card'}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full
                            ${isToday ? 'bg-brand-accent text-white' : 'text-brand-muted'}
                        `}>
                            {day}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1 overflow-hidden">
                        {dayEvents.map((evt, idx) => (
                            <div
                                key={idx}
                                className={`text-[10px] px-1 rounded truncate flex items-center gap-1
                                    ${evt.type === 'assignment'
                                        ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30'
                                        : 'bg-brand-accent/10 text-brand-muted border border-brand-accent/10'
                                    }
                                `}
                                title={evt.name || (evt.type === 'assignment' ? 'אימון מתוכנן' : 'אימון בוצע')}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${evt.type === 'assignment' ? 'bg-brand-accent' : 'bg-brand-muted'}`}></span>
                                {evt.name || (evt.type === 'assignment' ? 'אימון' : 'בוצע')}
                            </div>
                        ))}
                    </div>
                </div>
            );
        });
    };

    const monthNames = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    if (!traineeId) {
        return <div className="text-center text-brand-muted py-10 bg-brand-card rounded-lg">נא לבחור מתאמן להצגת לוח שנה</div>;
    }

    return (
        <div className="neu-card overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-brand-card border-b border-brand-accent/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Calendar className="text-brand-accent" size={20} />
                    <h3 className="font-bold text-lg text-brand-text">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-brand-accent/10 rounded-full text-brand-muted">
                        <ChevronRight size={20} />
                    </button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-brand-accent/10 rounded-full text-brand-muted">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-brand-accent hover:text-white px-3 py-1 bg-brand-accent/10 rounded-full">
                        היום
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 bg-brand-card border-b border-brand-accent/10">
                {DAYS_OF_WEEK.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-bold text-brand-muted">{d}</div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 bg-brand-card">
                {renderCalendarGrid()}
            </div>

            {/* Legend */}
            <div className="p-3 bg-brand-card/50 flex gap-4 text-xs text-brand-muted border-t border-brand-accent/10">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
                    <span>מתוכנן</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-muted"></span>
                    <span>בוצע</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-accent/50"></span>
                    <span>היום</span>
                </div>
            </div>
        </div>
    );
}
