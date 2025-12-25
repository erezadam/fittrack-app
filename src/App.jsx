import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { trainerService } from './services/trainerService';
import WorkoutBuilder from './components/WorkoutBuilder';
import WorkoutSession from './components/WorkoutSession';
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
  const [activeLogId, setActiveLogId] = useState(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [tempWorkoutData, setTempWorkoutData] = useState({}); // Temporary storage for workout data when adding exercises

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

  const startWorkout = async (exercises, name, logId = null, assignmentId = null) => {
    // ... existing startWorkout ...
    setActiveExercises(exercises);
    setActiveWorkoutName(name || 'Untitled Workout');
    setActiveAssignmentId(assignmentId);

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
          status: 'in_progress',
          assignmentId: assignmentId // Optional link in the log itself
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
    setActiveAssignmentId(null);
    setTempWorkoutData(null);
  };

  // New handler for WorkoutSession finish
  // New handler for WorkoutSession finish
  const handleSessionFinish = async (resultData) => {
    console.log("Workout Session Finished. Processing data:", resultData);
    const { exercises, duration } = resultData;

    if (!user || !user.id) {
      alert("שגיאה: משתמש לא מחובר. לא ניתן לשמור את האימון.");
      return;
    }

    try {
      const logData = {
        workout_id: activeAssignmentId || null,
        workoutName: activeWorkoutName || 'אימון ללא שם',
        exercises: exercises.map(ex => ({
          exercise_id: ex.id,
          name: String(ex.name || 'Unknown Exercise'),
          mainMuscle: String(ex.mainMuscle || 'Other'),
          sets: Array.isArray(ex.sets) ? ex.sets.map(s => ({
            weight: s.weight !== undefined && s.weight !== null ? String(s.weight) : '',
            reps: s.reps !== undefined && s.reps !== null ? String(s.reps) : '',
            isCompleted: !!s.isCompleted
          })) : [],
          isCompleted: !!ex.isCompleted,
          imageUrls: Array.isArray(ex.imageUrls)
            ? ex.imageUrls.filter(url => typeof url === 'string') // Explicitly filter non-strings
            : []
        })),
        status: 'completed',
        durationMinutes: Math.round(duration / 60),
        assignmentId: activeAssignmentId || null,
        date: new Date().toISOString()
      };

      console.log("Saving workout to storage (App.jsx pre-check):", JSON.stringify(logData, null, 2));

      console.log("Saving workout to storage (App.jsx pre-check):", JSON.stringify(logData, null, 2));

      // Consolidated Save Logic: Always use saveWorkout.
      // If activeLogId exists, we pass it inside the object (or ensure it's there) so saveWorkout can update it.
      if (activeLogId) {
        logData.id = activeLogId;
        console.log("Updating existing log:", activeLogId);
      }

      const savedLog = await storageService.saveWorkout(logData, user.id);
      console.log("Workout saved/updated successfully:", savedLog.id);

      if (activeAssignmentId) {
        try {
          await trainerService.completeTrainingProgram(activeAssignmentId);
          console.log("Assignment marked completed:", activeAssignmentId);
        } catch (err) {
          console.error("Failed to complete assignment:", err);
        }
      }

      alert('האימון נשמר בהצלחה! כל הכבוד!');

      // CRITICAL: Switch view AFTER save
      console.log("Switching to dashboard...");
      finishWorkout();

    } catch (error) {
      console.error("Failed to save workout:", error);
      alert("שגיאה בשמירת האימון: " + error.message);
      // Optional: Ask user if they want to exit anyway?
      if (window.confirm("השמירה נכשלה. האם לצאת בכל זאת? (הנתונים יאבדו)")) {
        finishWorkout();
      }
    }
  };

  const handleAddExercises = (currentExercises, currentDuration) => {
    console.log("Handling Add Exercises. Duration:", currentDuration);
    // Save current progress before switching view
    setTempWorkoutData({
      exercises: currentExercises,
      duration: currentDuration
    });
    // Update active exercises state immediately so we don't lose progress if we just switch back
    setActiveExercises(currentExercises);

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
    if (!log || !log.exercises) {
      console.error("Invalid log data for resume");
      return;
    }

    try {
      // Fetch full exercises to get images/videos
      let allExercises = [];
      try {
        allExercises = await storageService.getExercises();
      } catch (err) {
        console.warn("Failed to fetch all exercises during resume, using log data only", err);
      }

      const exercisesForActive = log.exercises.map(le => {
        const fullExercise = allExercises.find(e => e.id === le.exercise_id);
        // Fallback to log data if full exercise not found
        return {
          ...(fullExercise || {}), // Include full details if found
          id: le.exercise_id,
          name: le.name || fullExercise?.name || 'Unknown Exercise',
          mainMuscle: le.mainMuscle || le.muscle || fullExercise?.mainMuscle || 'Other',
          // Ensure critical fields exist
          imageUrls: fullExercise?.imageUrls || [],
          video_url: fullExercise?.video_url || null,
          trackingType: fullExercise?.trackingType || 'reps', // Default tracking type
          isCompleted: !!le.isCompleted // Ensure boolean
        };
      });

      const initialDataForActive = {};
      log.exercises.forEach(le => {
        initialDataForActive[le.exercise_id] = {
          sets: le.sets || [],
          isCompleted: le.isCompleted || false
        };
      });

      setActiveExercises(exercisesForActive);
      setActiveWorkoutName(log.workoutName);
      setActiveLogId(log.id);
      setActiveAssignmentId(log.assignmentId || null);
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

  if (isTrainerMode && (user.role === 'trainer' || user.role === 'admin' || user.isAdmin)) {
    return <TrainerDashboard user={user} onBack={() => setIsTrainerMode(false)} />;
  } else if (isTrainerMode) {
    // Fallback if unauthorized
    setIsTrainerMode(false);
  }

  if (view === 'dashboard') {
    return (
      <div className="relative">
        <UserDashboard
          user={user}
          onNavigateToBuilder={() => setView('builder')}
          onNavigateToHistory={() => setView('history')}
          onLogout={() => {
            setUser(null);
            localStorage.removeItem('dev_mode');
          }}
          onResume={handleResume}
          onStartWorkout={startWorkout}
          onSwitchToTrainer={() => setIsTrainerMode(true)}
          onNavigateToAdmin={() => setView('admin')}
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
        <WorkoutSession
          workout={{
            exercises: activeExercises,
            name: activeWorkoutName,
            id: activeLogId
          }}
          initialDuration={tempWorkoutData?.duration || 0}
          onAdd={handleAddExercises}
          onFinish={handleSessionFinish}
          onBack={() => {
            if (window.confirm('האם אתה בטוח שברצונך לבטל? השינויים לא יישמרו.')) {
              setActiveLogId(null);
              setActiveAssignmentId(null);
              setView('dashboard');
            }
          }}
        />
      )}

      {(view === 'admin' && user?.role === 'admin') && (
        <AdminPage
          user={user}
          onBack={() => setView('builder')}
        />
      )}

      {/* Security Guard: If trying to view admin but not admin, revert to dashboard */}
      {view === 'admin' && user?.role !== 'admin' && (
        (() => {
          console.warn("Unauthorized access attempt to Admin view");
          setTimeout(() => setView('dashboard'), 0);
          return null;
        })()
      )}

      {view === 'history' && (
        <WorkoutHistory
          user={user}
          onBack={() => setView('dashboard')}
          onResume={handleResume}
          onRepeat={handleRepeatWorkout}
          onStartWorkout={startWorkout}
        />
      )}

      {/* Version Footer */}
      <div className="fixed bottom-2 left-0 w-full text-center text-[10px] text-gray-500 pointer-events-none z-50 opacity-50">
        גרסה: התחברות טרייני וסנכרון תוכניות | Antigravity | 20.12.2025
      </div>
    </div>
  );
}

export default App;
