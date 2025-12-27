import { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

/**
 * Hook to fetch the last known stats (benchmarks) for a list of exercises.
 * 
 * @param {string} userId - The current user's ID.
 * @param {Array} exercises - The list of exercises to fetch stats for.
 * @param {string} excludeLogId - The ID of the current active log (draft) to exclude from searching.
 * @returns {Object} { stats, loading } where stats is a map { [exerciseId]: string }
 */
export const useExerciseStats = (userId, exercises, excludeLogId) => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!userId || !exercises || exercises.length === 0) {
                setLoading(false);
                return;
            }

            console.log(`useExerciseStats: Fetching history for user ${userId}, excluding log ${excludeLogId}`);

            try {
                const exerciseIds = new Set(exercises.map(e => e.id));
                const statsMap = {};

                // Fetch all workout logs
                // Note: In a production app with huge history, we'd want a more targeted query
                const logs = await storageService.getAllWorkoutLogs(userId);

                for (const log of logs) {
                    // CRITICAL: Exclude the current session's draft log
                    // This prevents the "0-0kg" collision where the new draft is seen as the "latest"
                    if (excludeLogId && log.id === excludeLogId) continue;

                    // Skip planned workouts
                    if (log.status === 'planned') continue;

                    // Stop if we have stats for all exercises
                    if (Object.keys(statsMap).length === exerciseIds.size) break;

                    if (log.exercises) {
                        for (const ex of log.exercises) {
                            if (exerciseIds.has(ex.exercise_id) && !statsMap[ex.exercise_id]) {
                                // Find best set in this log
                                if (ex.sets && ex.sets.length > 0) {
                                    let bestSet = null;
                                    let maxWeight = -1;

                                    ex.sets.forEach(set => {
                                        const w = parseFloat(set.weight) || 0;
                                        const r = parseFloat(set.reps) || 0;

                                        // Validity Check: Ignore empty/placeholder sets (0kg - 0reps)
                                        if (w === 0 && r === 0) return;

                                        if (w > maxWeight) {
                                            maxWeight = w;
                                            bestSet = set;
                                        } else if (w === maxWeight) {
                                            if (r > (parseFloat(bestSet?.reps) || 0)) {
                                                bestSet = set;
                                            }
                                        }
                                    });

                                    if (bestSet) {
                                        statsMap[ex.exercise_id] = `${bestSet.weight || 0}kg - ${bestSet.reps || 0}`;
                                    }
                                }
                            }
                        }
                    }
                }

                setStats(statsMap);
            } catch (err) {
                console.error("Error fetching exercise stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [userId, exercises, excludeLogId]); // Re-run if exercises or log ID changes

    return { stats, loading };
};
