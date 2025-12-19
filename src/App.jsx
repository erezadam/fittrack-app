import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import WorkoutBuilder from './components/WorkoutBuilder';
import ActiveWorkout from './components/ActiveWorkout';
import AdminPage from './components/AdminPage';
import UserDashboard from './components/UserDashboard';
import WorkoutHistory from './components/WorkoutHistory';

import LoginScreen from './components/LoginScreen';

import TrainerDashboard from './components/TrainerDashboard';

function App() {
  const [user, setUser] = useState(null);
  console.log("App Rendered - User State:", user);

  const [view, setView] = useState('dashboard'); // dashboard, builder, active, admin
  const [isTrainerMode, setIsTrainerMode] = useState(false); // Trainer Mode State
  const [activeExercises, setActiveExercises] = useState([]);
  const [activeWorkoutName, setActiveWorkoutName] = useState('');
  const [activeLogId, setActiveLogId] = useState(null); // For resuming workouts
  const [tempWorkoutData, setTempWorkoutData] = useState(null); // Store progress when adding exercises

  useEffect(() => {
    // ... existing useEffect ...
    const checkDevMode = async () => {
      try {
        // Check for stored user first (Auto-Login)
        const storedUser = localStorage.getItem('fittrack_user');
        if (storedUser) {
          try {
            console.log("Auto-login from localStorage");
            setUser(JSON.parse(storedUser));
            return;
          } catch (e) {
            console.error("Failed to parse stored user:", e);
            localStorage.removeItem('fittrack_user'); // Clear invalid data
          }
        }

        const config = await storageService.getSystemConfig();
        if (config && config.devMode) {
          console.log("Dev Mode Enabled (Global)");
          setUser({
            id: 'dev_admin',
            firstName: 'Admin',
            lastName: 'User',
            phone: '0547895818',
            isAdmin: true
          });
        }
      } catch (error) {
        console.error("Failed to check dev mode:", error);
      }
    };

    checkDevMode();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('fittrack_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fittrack_user');
    setView('dashboard');
    setIsTrainerMode(false);
  };

  const startWorkout = async (exercises, name, logId = null) => {
    // ... existing startWorkout ...
    setActiveExercises(exercises);
    setActiveWorkoutName(name || 'Untitled Workout');

    if (logId) {
      setActiveLogId(logId);
    } else {
      // Create initial draft log
      try {
        const initialLogData = {
          workoutName: name || 'Untitled Workout',
          exercises: exercises.map(ex => ({
            exercise_id: ex.id,
            name: ex.name,
            mainMuscle: ex.mainMuscle,
            sets: [{ weight: '', reps: '' }]
          })),
          status: 'in_progress'
        };
        const newLog = await storageService.saveWorkout(initialLogData, user?.id);
        setActiveLogId(newLog.id);
      } catch (error) {
        console.error("Failed to create initial draft log:", error);
        // Fallback: proceed without logId (will try to save at end)
        setActiveLogId(null);
      }
    }

    setView('active');
  };

  const finishWorkout = () => {
    setView('dashboard'); // Return to dashboard after workout
    setActiveExercises([]);
    setActiveWorkoutName('');
    setActiveLogId(null);
    setTempWorkoutData(null);
  };

  const handleAddExercises = (currentData, name) => {
    setTempWorkoutData(currentData);
    if (name) setActiveWorkoutName(name);
    setView('builder_add'); // Special view state for adding exercises
  };

  const handleExercisesAdded = (newExercises) => {
    // Merge new exercises with existing ones, avoiding duplicates
    const existingIds = new Set(activeExercises.map(e => e.id));
    const uniqueNew = newExercises.filter(e => !existingIds.has(e.id));

    setActiveExercises([...activeExercises, ...uniqueNew]);
    setView('active');
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleResume = async (log) => {
    // ... existing handleResume ...
    try {
      // Fetch full exercises to get images/videos
      const allExercises = await storageService.getExercises();

      const exercisesForActive = log.exercises.map(le => {
        const fullExercise = allExercises.find(e => e.id === le.exercise_id);
        return {
          ...fullExercise, // Include all details (images, video, etc.)
          id: le.exercise_id, // Ensure ID matches
          name: le.name, // Fallback to log name
          mainMuscle: le.mainMuscle || le.muscle || fullExercise?.mainMuscle
        };
      });

      const initialDataForActive = {};
      log.exercises.forEach(le => {
        initialDataForActive[le.exercise_id] = {
          sets: le.sets,
          isCompleted: le.isCompleted // Pass completion status if available
        };
      });

      setActiveExercises(exercisesForActive);
      setActiveWorkoutName(log.workoutName);
      setActiveLogId(log.id);
      setTempWorkoutData(initialDataForActive);
      setView('active');
    } catch (error) {
      console.error("Failed to resume workout:", error);
      alert("שגיאה בטעינת האימון. אנא נסה שנית.");
    }
  };

  const handleRepeatWorkout = (log) => {
    // Extract exercises from log
    const exercisesToRepeat = log.exercises.map(le => ({
      id: le.exercise_id,
      name: le.name,
      mainMuscle: le.mainMuscle || le.muscle
    }));

    // Start NEW workout with these exercises
    // This will create a new draft log automatically
    startWorkout(exercisesToRepeat, log.workoutName);
  };

  if (isTrainerMode) {
    return <TrainerDashboard user={user} onBack={() => setIsTrainerMode(false)} />;
  }

  if (view === 'dashboard') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsTrainerMode(true)}
          className="absolute top-4 left-4 neu-btn text-xs bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 z-10"
        >
          Switch to Coach Mode
        </button>
        <UserDashboard
          user={user}
          onNavigateToBuilder={() => setView('builder')}
          onNavigateToHistory={() => setView('history')}
          onLogout={() => {
            setUser(null);
            localStorage.removeItem('dev_mode');
          }}
          onResume={handleResume}
        />
      </div>
    );
  }

  return (
    <div>
      {view === 'builder' && (
        <WorkoutBuilder
          user={user}
          onStartWorkout={startWorkout}
          onOpenAdmin={() => setView('admin')}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'builder_add' && (
        <WorkoutBuilder
          user={user}
          mode="add"
          initialSelectedExercises={activeExercises}
          initialWorkoutName={activeWorkoutName}
          onAdd={handleExercisesAdded}
          onBack={() => setView('active')} // Cancel adding goes back to active
        />
      )}

      {view === 'active' && (
        <ActiveWorkout
          user={user}
          exercises={activeExercises}
          workoutName={activeWorkoutName}
          logId={activeLogId}
          initialData={tempWorkoutData}
          onFinish={finishWorkout}
          onAddExercises={handleAddExercises}
          onCancel={() => {
            setActiveLogId(null);
            setView('builder');
          }}
        />
      )}

      {view === 'admin' && (
        <AdminPage
          user={user}
          onBack={() => setView('builder')}
        />
      )}

      {view === 'history' && (
        <WorkoutHistory
          user={user}
          onBack={() => setView('dashboard')}
          onResume={handleResume}
          onRepeat={handleRepeatWorkout}
        />
      )}

      {/* Version Footer */}
      <div className="fixed bottom-2 left-0 w-full text-center text-[10px] text-gray-500 pointer-events-none z-50 opacity-50">
        גרסה: מחיקת תרגיל ודיווח קלוריות | Antigravity | 18.12.2025
      </div>
    </div>
  );
}

export default App;
