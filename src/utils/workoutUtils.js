import { storageService } from '../services/storageService';

/**
 * Normalizes exercises for a workout session by:
 * 1. Normalizing fields (mainMuscle, ImageUrls)
 * 2. Ensuring sets array exists
 * 
 * Note: Benchmarks are now handled by useExerciseStats hook.
 * 
 * @param {Array} exercises - Raw exercise objects
 * @returns {Array} - Processed exercises
 */
export const normalizeSessionExercises = (exercises) => {
    if (!exercises || !Array.isArray(exercises)) return [];

    return exercises.map((ex) => {
        // Normalize Muscle Name
        // Robust Fallback: muscle_group_id -> mainMuscle -> muscle -> 'Other'
        const rawMuscle = ex.muscle_group_id || ex.mainMuscle || ex.muscle;
        const mainMuscle = (rawMuscle && typeof rawMuscle === 'string') ? rawMuscle : 'Other';

        // Normalize Images
        // Ensure it's an array of strings
        let imageUrls = [];
        if (Array.isArray(ex.imageUrls)) {
            imageUrls = ex.imageUrls.filter(url => typeof url === 'string');
        } else if (typeof ex.imageUrls === 'string') {
            imageUrls = [ex.imageUrls];
        }

        // Ensure sets exist. If not, create one empty set.
        // But preserve existing sets if coming from history/planned with pre-filled values
        const sets = (Array.isArray(ex.sets) && ex.sets.length > 0)
            ? ex.sets
            : [{ weight: '', reps: '', isCompleted: false }];

        return {
            ...ex,
            mainMuscle, // Normalized key for grouping
            imageUrls,
            sets
        };
    });
};
