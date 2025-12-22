import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
/* Emergency Fixes */ window.tempWorkoutData = {}; window.setActiveLogId = () => {}; window.showSummary = false;
window.deletedExerciseIds = [];
window.deletedExerciseIds = new Set();
window.tempWorkoutData = {}; window.setActiveLogId = () => {}; window.showSummary = false; window.deletedExerciseIds = new Set(); window.expandedExerciseId = null; window.setExpandedExerciseId = () => {};
/* Emergency Patch */ window.tempWorkoutData = {}; window.setActiveLogId = () => {}; window.showSummary = false; window.deletedExerciseIds = new Set(); window.expandedExerciseId = null; window.setExpandedExerciseId = () => {}; window.completedExercises = new Set(); window.setCompletedExercises = () => {};
window.tempWorkoutData = {}; window.setActiveLogId = () => {}; window.showSummary = false; window.deletedExerciseIds = new Set(); window.expandedExerciseId = null; window.setExpandedExerciseId = () => {}; window.completedExercises = new Set(); window.setCompletedExercises = () => {}; window.workoutData = { exercises: [] }; window.setWorkoutData = () => {};
