import { initialExercises, initialMuscles } from '../data/initialData';

const EXERCISE_KEY = 'fittrack_exercises';
const MUSCLE_KEY = 'fittrack_muscles';
const HISTORY_KEY = 'fittrack_history';
const TEMPLATE_KEY = 'fittrack_templates';

export const storageService = {
    initialize: () => {
        const existingEx = localStorage.getItem(EXERCISE_KEY);
        if (!existingEx) {
            localStorage.setItem(EXERCISE_KEY, JSON.stringify(initialExercises));
        }

        const existingMuscles = localStorage.getItem(MUSCLE_KEY);
        if (!existingMuscles) {
            localStorage.setItem(MUSCLE_KEY, JSON.stringify(initialMuscles));
        }
    },

    getExercises: () => {
        const data = localStorage.getItem(EXERCISE_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveExercises: (exercises) => {
        localStorage.setItem(EXERCISE_KEY, JSON.stringify(exercises));
    },

    getMuscles: () => {
        const data = localStorage.getItem(MUSCLE_KEY);
        return data ? JSON.parse(data) : initialMuscles;
    },

    saveMuscles: (muscles) => {
        localStorage.setItem(MUSCLE_KEY, JSON.stringify(muscles));
    },

    resetData: () => {
        localStorage.setItem(EXERCISE_KEY, JSON.stringify(initialExercises));
        localStorage.setItem(MUSCLE_KEY, JSON.stringify(initialMuscles));
        return { exercises: initialExercises, muscles: initialMuscles };
    },

    saveWorkout: (workout) => {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const newEntry = {
            id: Date.now(),
            date: new Date().toISOString(),
            ...workout
        };
        history.push(newEntry);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        return newEntry;
    },

    getHistory: () => {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    },

    // Templates
    saveTemplate: (name, exercises) => {
        const templates = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]');
        const newTemplate = { id: Date.now(), name, exercises };
        templates.push(newTemplate);
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
        return newTemplate;
    },

    getTemplates: () => {
        return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]');
    },

    deleteTemplate: (id) => {
        const templates = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]');
        const updated = templates.filter(t => t.id !== id);
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(updated));
        return updated;
    }
};
