import React, { useState, useEffect } from 'react';
import WorkoutBuilder from './components/WorkoutBuilder';
import ActiveWorkout from './components/ActiveWorkout';
import AdminPage from './components/AdminPage';

function App() {
  const [view, setView] = useState('builder'); // builder, active, admin
  const [activeExercises, setActiveExercises] = useState([]);
  const [activeWorkoutName, setActiveWorkoutName] = useState('');

  const startWorkout = (exercises, name) => {
    setActiveExercises(exercises);
    setActiveWorkoutName(name || 'Untitled Workout');
    setView('active');
  };

  const finishWorkout = () => {
    setView('builder');
    setActiveExercises([]);
    setActiveWorkoutName('');
  };

  return (
    <div>
      {view === 'builder' && (
        <WorkoutBuilder
          onStartWorkout={startWorkout}
          onOpenAdmin={() => setView('admin')}
        />
      )}

      {view === 'active' && (
        <ActiveWorkout
          exercises={activeExercises}
          workoutName={activeWorkoutName}
          onFinish={finishWorkout}
          onCancel={() => setView('builder')}
        />
      )}

      {view === 'admin' && (
        <AdminPage
          onBack={() => setView('builder')}
        />
      )}
    </div>
  );
}

export default App;
