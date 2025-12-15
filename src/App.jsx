import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const isDevMode = localStorage.getItem('dev_mode') === 'true';
    if (isDevMode) {
      setUser({
        id: 'dev_admin',
        firstName: 'Admin',
        lastName: 'User',
        phone: '0547895818',
        isAdmin: true
      });
    }
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

      {view === 'active' && (
        <ActiveWorkout
          user={user}
          exercises={activeExercises}
          workoutName={activeWorkoutName}
          onFinish={finishWorkout}
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
