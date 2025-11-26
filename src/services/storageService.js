import { initialExercises } from '../data/initialData';

const EXERCISE_KEY = 'fittrack_exercises';
const HISTORY_KEY = 'fittrack_history';
const TEMPLATE_KEY = 'fittrack_templates';

export const storageService = {
    initialize: () => {
        const existing = localStorage.getItem(EXERCISE_KEY);
        if (!existing) {
            localStorage.setItem(EXERCISE_KEY, JSON.stringify(initialExercises));
            console.log('Initialized DB with default data');
        }
    },

    getExercises: () => {
        const data = localStorage.getItem(EXERCISE_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveExercises: (exercises) => {
        localStorage.setItem(EXERCISE_KEY, JSON.stringify(exercises));
    },

    resetData: () => {
        localStorage.setItem(EXERCISE_KEY, JSON.stringify(initialExercises));
        return initialExercises;
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
