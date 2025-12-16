import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import WorkoutBuilder from './components/WorkoutBuilder';
import ActiveWorkout from './components/ActiveWorkout';
import AdminPage from './components/AdminPage';
import UserDashboard from './components/UserDashboard';
import WorkoutHistory from './components/WorkoutHistory';

import LoginScreen from './components/LoginScreen';

function App() {
  const [user, setUser] = useState(null);
  console.log("App Rendered - User State:", user);

  const [view, setView] = useState('dashboard'); // dashboard, builder, active, admin
  const [activeExercises, setActiveExercises] = useState([]);
  const [activeWorkoutName, setActiveWorkoutName] = useState('');
  const [tempWorkoutData, setTempWorkoutData] = useState(null); // Store progress when adding exercises

  useEffect(() => {
    const checkDevMode = async () => {
      try {
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
    // localStorage.setItem('fittrack_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    // localStorage.removeItem('fittrack_user');
    setView('dashboard');
  };

  const startWorkout = (exercises, name) => {
    setActiveExercises(exercises);
    setActiveWorkoutName(name || 'Untitled Workout');
    setView('active');
  };

  const finishWorkout = () => {
    setView('dashboard'); // Return to dashboard after workout
    setActiveExercises([]);
    setActiveWorkoutName('');
    setTempWorkoutData(null);
  };

  const handleAddExercises = (currentData) => {
    setTempWorkoutData(currentData);
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

  return (
    <div>
      {view === 'dashboard' && (
        <UserDashboard
          user={user}
          onNavigateToBuilder={() => setView('builder')}
          onNavigateToHistory={() => setView('history')}
          onLogout={handleLogout}
        />
      )}

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
          onAdd={handleExercisesAdded}
          onBack={() => setView('active')} // Cancel adding goes back to active
        />
      )}

      {view === 'active' && (
        <ActiveWorkout
          user={user}
          exercises={activeExercises}
          workoutName={activeWorkoutName}
          initialData={tempWorkoutData}
          onFinish={finishWorkout}
          onAddExercises={handleAddExercises}
          onCancel={() => setView('builder')}
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
        />
      )}
    </div>
  );
}

export default App;
