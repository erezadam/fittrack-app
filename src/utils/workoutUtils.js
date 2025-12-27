import { storageService } from '../services/storageService';

/**
 * Prepares exercises for a workout session by:
 * 1. Normalizing fields (mainMuscle, ImageUrls, etc.)
 * 2. Ensuring sets array exists
 * 3. Injecting "Last Stats" (benchmarks) for the user
 * 
 * @param {Array} exercises - Raw exercise objects
 * @param {string} userId - Current user ID
 * @returns {Promise<Array>} - Processed exercises with injected stats
 */
export const prepareSessionExercises = async (exercises, userId) => {
    if (!exercises || !Array.isArray(exercises)) return [];

    console.log("prepareSessionExercises: Processing", exercises.length, "exercises for user", userId);

    // 1. Parallel Fetch of Stats
    const statsPromises = exercises.map(ex => {
        if (!userId) return Promise.resolve(null);
        return storageService.fetchLastExerciseStats(userId, ex.id);
    });

    const statsResults = await Promise.all(statsPromises);

    // 2. Map and Normalize
    return exercises.map((ex, index) => {
        // Normalize Muscle Name
        // Priority: muscle_group_id -> mainMuscle -> muscle -> 'Other'
        const mainMuscle = ex.muscle_group_id || ex.mainMuscle || ex.muscle || 'Other';

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
            sets,
            lastStats: statsResults[index] || null // Injected Benchmark
        };
    });
};
