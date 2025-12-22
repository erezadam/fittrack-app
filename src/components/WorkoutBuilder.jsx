import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { initialExercises } from '../data/initialData';
import { Dumbbell, Activity, Footprints, Shirt, HeartPulse, User, Zap, BicepsFlexed, Plus, Trash2, Save } from 'lucide-react';

const HEBREW_MUSCLE_NAMES = { 'Chest': 'חזה', 'Back': 'גב', 'Legs': 'רגליים', 'Shoulders': 'כתפיים', 'Arms': 'זרועות', 'Core': 'בטן', 'Glutes': 'ישבן', 'Cardio': 'אירובי', 'Full Body': 'כל הגוף', 'Abs': 'בטן' };

export default function WorkoutBuilder({ user, onStartWorkout, onBack, mode = 'create', initialSelectedExercises = [], initialWorkoutName = '', onAdd, onSave, workoutDate }) {
    const [step, setStep] = useState('dashboard');
    const [workoutName, setWorkoutName] = useState(initialWorkoutName || '');
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [muscles, setMuscles] = useState({});
    const [activeMuscle, setActiveMuscle] = useState(null);

    useEffect(() => {
        storageService.initialize();
        loadData();
        if (initialSelectedExercises && initialSelectedExercises.length > 0) {
            // Clean init data
            const cleanInit = initialSelectedExercises
                .filter(e => e && e.id)
                .map(e => ({ ...e, sets: e.sets || [{ weight: '', reps: '' }] }));
            setSelectedExercises(cleanInit);
        }
    }, [initialSelectedExercises]);

    const loadData = async () => {
        try {
            const exList = await storageService.getExercises();
            setExercises(exList || []);
            const muscleData = await storageService.getMuscles();
            setMuscles(muscleData || {});
            if (muscleData && Object.keys(muscleData).length > 0) setActiveMuscle(Object.keys(muscleData)[0]);
        } catch (e) { console.error('Data Load Error', e); }
    };

    const toggleExercise = (ex) => {
        if (!ex || !ex.id) return;
        const exists = selectedExercises.find(e => e.id === ex.id);
        if (exists) {
            setSelectedExercises(selectedExercises.filter(e => e.id !== ex.id));
        } else {
            const safeExercise = { ...ex, sets: [{ weight: '', reps: '' }] };
            setSelectedExercises([...selectedExercises, safeExercise]);
        }
    };

    // --- SAFETY FILTER ---
    const getCleanExercises = () => {
        return selectedExercises
            .filter(e => e && e.id)
            .map(e => ({
                ...e,
                sets: (Array.isArray(e.sets) && e.sets.length > 0) ? e.sets : [{ weight: '', reps: '' }]
            }));
    };

    const handleStart = async () => {
        if (selectedExercises.length === 0) { alert('נא לבחור תרגילים'); return; }
        const safeExercises = getCleanExercises();

        if (mode === 'trainer') {
            if (onSave) onSave(safeExercises);
            return;
        }
        if (mode === 'add') {
            if (onAdd) onAdd(safeExercises);
            return;
        }

        try { await storageService.saveTemplate(workoutName || 'אימון ללא שם', safeExercises, user?.id); } catch (e) { }
        if (onStartWorkout) onStartWorkout(safeExercises, workoutName);
    };

    if (step === 'dashboard') {
        const availableMuscles = Object.keys(muscles).filter(m => !['cardio', 'full body'].includes(m.toLowerCase()));
        return (
            <div className='p-4 max-w-4xl mx-auto'>
                <div className='flex justify-between mb-6'>
                    <button onClick={onBack} className='px-4 py-2 bg-gray-100 rounded text-gray-700'>חזרה</button>
                    <h1 className='text-2xl font-bold text-gray-800'>בניית אימון</h1>
                </div>
                <div className='mb-8 space-y-4'>
                    <input type='text' placeholder='שם האימון' className='w-full p-4 border border-gray-200 rounded-xl shadow-sm text-lg' value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                        {availableMuscles.map(m => (
                            <div key={m} onClick={() => { setActiveMuscle(m); setStep('selection'); }} className='p-6 bg-white border border-gray-100 rounded-xl shadow-sm cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-all text-center'>
                                <span className='font-bold text-lg text-gray-700'>{HEBREW_MUSCLE_NAMES[m] || m}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setStep('selection')} className='w-full p-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-lg'>המשך לבחירת תרגילים</button>
            </div>
        );
    }

    const activeEx = exercises.filter(ex => (ex.muscle_group_id || ex.mainMuscle) === activeMuscle);
    return (
        <div className='p-4 max-w-4xl mx-auto pb-32'>
            <div className='flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-4 border-b'>
                <button onClick={() => setStep('dashboard')} className='px-4 py-2 bg-gray-100 rounded-lg'>חזרה</button>
                <h2 className='text-xl font-bold text-teal-600'>{HEBREW_MUSCLE_NAMES[activeMuscle] || activeMuscle}</h2>
            </div>
            <div className='grid grid-cols-1 gap-3'>
                {activeEx.map(ex => {
                    const isSelected = !!selectedExercises.find(e => e.id === ex.id);
                    return (
                        <div key={ex.id} onClick={() => toggleExercise(ex)} className={`p-4 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-400' : 'bg-white border-gray-100'}`}>
                            <div className='flex items-center gap-4'>
                                <span className='font-bold text-gray-800'>{ex.name}</span>
                            </div>
                            {isSelected && <div className='w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs'>✓</div>}
                        </div>
                    );
                })}
            </div>
            <div className='fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50'>
                <div className='max-w-4xl mx-auto flex gap-4 items-center'>
                    <div className='text-sm text-gray-500 font-bold'>נבחרו: {selectedExercises.length}</div>
                    <button onClick={handleStart} className='flex-1 p-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold text-xl shadow-lg'>
                        {mode === 'add' ? 'הוסף לאימון' : 'התחל אימון'}
                    </button>
                </div>
            </div>
        </div>
    );
}
