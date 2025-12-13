import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, setDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { initialExercises, initialMuscles } from '../data/initialData';

const EXERCISE_COLLECTION = 'exercises';
const MUSCLE_COLLECTION = 'muscles';
const TEMPLATE_COLLECTION = 'templates';
const WORKOUT_LOGS_COLLECTION = 'workout_logs';
const USERS_COLLECTION = 'users';

export const storageService = {
    // Users
    loginUser: async (firstName, lastName, phone) => {
        try {
            // Normalize phone
            const cleanPhone = phone.replace(/-/g, '');
            const ADMIN_PHONE = '0547895818';
            const isAdmin = cleanPhone === ADMIN_PHONE;

            const q = query(collection(db, USERS_COLLECTION), where('phone', '==', cleanPhone));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();

                // If user should be admin but isn't marked as such in DB, update it
                if (isAdmin && !userData.isAdmin) {
                    await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), { isAdmin: true });
                    return { id: userDoc.id, ...userData, isAdmin: true };
                }

                return { id: userDoc.id, ...userData };
            } else {
                // Register new user
                const newUser = {
                    firstName,
                    lastName,
                    phone: cleanPhone,
                    createdAt: new Date().toISOString(),
                    isAdmin: isAdmin
                };
                const docRef = await addDoc(collection(db, USERS_COLLECTION), newUser);
                return { id: docRef.id, ...newUser };
            }
        } catch (error) {
            console.error("Error logging in user:", error);
            throw error;
        }
    },

    // Exercises
    getExercises: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, EXERCISE_COLLECTION));
            const exercises = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return exercises.length > 0 ? exercises : initialExercises; // Fallback if empty? Maybe not needed if we seed.
        } catch (error) {
            console.error("Error getting exercises:", error);
            return initialExercises;
        }
    },

    addExercise: async (exercise) => {
        try {
            // Remove id if present, let Firestore generate it, or use it if we want custom IDs (but Firestore auto-id is better)
            // The current app generates IDs. Let's let Firestore do it if possible, or keep using provided ID if we want to batch import with specific IDs.
            // For single add:
            const { id, ...data } = exercise;
            const docRef = await addDoc(collection(db, EXERCISE_COLLECTION), data);
            return { id: docRef.id, ...data };
        } catch (error) {
            console.error("Error adding exercise:", error);
            throw error;
        }
    },

    updateExercise: async (exercise) => {
        try {
            const { id, ...data } = exercise;
            const exerciseRef = doc(db, EXERCISE_COLLECTION, id);
            await updateDoc(exerciseRef, data);
            return exercise;
        } catch (error) {
            console.error("Error updating exercise:", error);
            throw error;
        }
    },

    deleteExercise: async (id) => {
        try {
            await deleteDoc(doc(db, EXERCISE_COLLECTION, id));
            return id;
        } catch (error) {
            console.error("Error deleting exercise:", error);
            throw error;
        }
    },

    deleteAllExercises: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, EXERCISE_COLLECTION));
            const batch = writeBatch(db);
            querySnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all exercises:", error);
            throw error;
        }
    },

    // Batch save (for import or initial save)
    saveExercisesBatch: async (exercises) => {
        try {
            const batch = writeBatch(db);
            exercises.forEach(ex => {
                const { id, ...data } = ex;
                // If ID is provided and looks like a Firestore ID (20 chars), use it? 
                // Or just generate new ones.
                // For simplicity in migration, let's create new docs.
                const newRef = doc(collection(db, EXERCISE_COLLECTION));
                batch.set(newRef, data);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch saving exercises:", error);
            throw error;
        }
    },

    // Muscles
    getMuscles: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, MUSCLE_COLLECTION));
            const muscles = {};
            querySnapshot.docs.forEach(doc => {
                muscles[doc.id] = doc.data();
            });
            // If empty, return initial?
            if (Object.keys(muscles).length === 0) return initialMuscles;
            return muscles;
        } catch (error) {
            console.error("Error getting muscles:", error);
            return initialMuscles;
        }
    },

    saveMuscle: async (key, muscleData) => {
        try {
            // Use setDoc with merge: true to handle both create and update
            await setDoc(doc(db, MUSCLE_COLLECTION, key), muscleData, { merge: true });
        } catch (error) {
            console.error("Error saving muscle:", error);
            throw error;
        }
    },

    // Helper to save all muscles (initial migration)
    saveMusclesBatch: async (musclesObj) => {
        try {
            const batch = writeBatch(db);
            Object.entries(musclesObj).forEach(([key, data]) => {
                const ref = doc(db, MUSCLE_COLLECTION, key);
                batch.set(ref, data);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error batch saving muscles:", error);
            throw error;
        }
    },

    // Templates
    getTemplates: async (userId) => {
        try {
            let q = collection(db, TEMPLATE_COLLECTION);
            if (userId) {
                q = query(q, where('userId', '==', userId));
            }
            const querySnapshot = await getDocs(q);
            const templates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return templates;
        } catch (error) {
            console.error("Error getting templates:", error);
            return [];
        }
    },

    saveTemplate: async (name, exercises, userId) => {
        try {
            // We use a numeric ID in the app logic (Date.now()), but Firestore uses string IDs.
            // Let's stick to Firestore IDs for new templates, but we might need to adapt the app logic if it expects numbers.
            // The app uses `selectedTemplateId` which can be 'new' or an ID.
            // Let's save it.
            const templateData = {
                name,
                exercises,
                userId,
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, TEMPLATE_COLLECTION), templateData);
            return { id: docRef.id, ...templateData };
        } catch (error) {
            console.error("Error saving template:", error);
            throw error;
        }
    },

    // Workout Logs
    saveWorkout: async (workoutData, userId) => {
        try {
            const dataToSave = {
                ...workoutData,
                userId,
                timestamp: new Date().toISOString()
            };
            console.log("storageService.saveWorkout payload:", JSON.stringify(dataToSave, null, 2));
            const docRef = await addDoc(collection(db, WORKOUT_LOGS_COLLECTION), dataToSave);
            return { id: docRef.id, ...dataToSave };
        } catch (error) {
            console.error("Error saving workout log:", error);
            throw error;
        }
    },

    getAllWorkoutLogs: async (userId, isAdmin = false) => {
        try {
            let q = query(collection(db, WORKOUT_LOGS_COLLECTION), orderBy('timestamp', 'desc'));

            if (!isAdmin && userId) {
                q = query(collection(db, WORKOUT_LOGS_COLLECTION), where('userId', '==', userId), orderBy('timestamp', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting all workout logs:", error);
            return [];
        }
    },

    deleteAllWorkoutLogs: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, WORKOUT_LOGS_COLLECTION));
            const batch = writeBatch(db);
            querySnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all workout logs:", error);
            throw error;
        }
    },

    deleteAllTemplates: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, TEMPLATE_COLLECTION));
            const batch = writeBatch(db);
            querySnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all templates:", error);
            throw error;
        }
    },

    getLastExercisePerformance: async (exerciseId, userId) => {
        try {
            // Query recent workout logs, ordered by date descending
            let q = query(
                collection(db, WORKOUT_LOGS_COLLECTION),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(20) // Limit to recent 20 workouts to avoid scanning everything
            );

            const querySnapshot = await getDocs(q);

            // Iterate through logs to find the first occurrence of the exercise
            for (const doc of querySnapshot.docs) {
                const workout = doc.data();
                if (workout.exercises) {
                    const exerciseData = workout.exercises.find(ex => ex.exercise_id === exerciseId);

                    if (exerciseData && exerciseData.sets && exerciseData.sets.length > 0) {
                        // Find the best set (highest weight)
                        // Assuming weight is stored as string or number, convert to float for comparison
                        let bestSet = null;
                        let maxWeight = -1;

                        exerciseData.sets.forEach(set => {
                            const weight = parseFloat(set.weight) || 0;
                            if (weight > maxWeight) {
                                maxWeight = weight;
                                bestSet = set;
                            }
                        });

                        if (bestSet) {
                            return {
                                weight: bestSet.weight,
                                reps: bestSet.reps
                            };
                        }
                    }
                }
            }
            return null; // No history found
        } catch (error) {
            console.error("Error getting last exercise performance:", error);
            return null;
        }
    },

    getLastWorkout: async (userId) => {
        try {
            const q = query(
                collection(db, WORKOUT_LOGS_COLLECTION),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error("Error getting last workout:", error);
            return null;
        }
    },

    initialize: async () => {
        // No-op for now, or maybe check connection
        console.log("Storage service initialized");
    }
};
