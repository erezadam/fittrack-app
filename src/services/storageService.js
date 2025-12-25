import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, setDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { initialExercises, initialMuscles } from '../data/initialData';

const EXERCISE_COLLECTION = 'exercises';
const MUSCLE_COLLECTION = 'muscles';
const TEMPLATE_COLLECTION = 'templates';
const WORKOUT_LOGS_COLLECTION = 'workout_logs';
const USERS_COLLECTION = 'users';
const SYSTEM_SETTINGS_COLLECTION = 'system_settings';

export const storageService = {
    // Users
    loginUser: async (firstName, lastName, phone, email = '') => {
        try {
            // Normalize inputs
            const cleanPhone = phone.replace(/-/g, '');
            const cleanEmail = email ? email.toLowerCase().trim() : '';
            const ADMIN_PHONE = '0547895818';
            const isAdmin = cleanPhone === ADMIN_PHONE;

            let userDoc = null;
            let userData = null;

            // 1. Try to find by Email first (Priority for Trainees)
            if (cleanEmail) {
                const qEmail = query(collection(db, USERS_COLLECTION), where('email', '==', cleanEmail));
                const snapshotEmail = await getDocs(qEmail);
                if (!snapshotEmail.empty) {
                    userDoc = snapshotEmail.docs[0];
                    userData = userDoc.data();
                }
            }

            // 2. If not found by email, try by Phone
            if (!userDoc) {
                const qPhone = query(collection(db, USERS_COLLECTION), where('phone', '==', cleanPhone));
                const snapshotPhone = await getDocs(qPhone);
                if (!snapshotPhone.empty) {
                    userDoc = snapshotPhone.docs[0];
                    userData = userDoc.data();
                }
            }

            if (userDoc) {
                // User Found - Update details to "Claim/Refresh"
                const updates = {};

                // If user should be admin but isn't, update it
                if (isAdmin && (userData.role !== 'admin' || !userData.isAdmin)) {
                    updates.role = 'admin';
                    updates.isAdmin = true;
                }

                // Update basic details if changed or missing
                if (firstName && firstName !== userData.firstName) updates.firstName = firstName;
                if (lastName && lastName !== userData.lastName) updates.lastName = lastName;
                if (cleanPhone && cleanPhone !== userData.phone) updates.phone = cleanPhone;
                if (cleanEmail && cleanEmail !== userData.email) updates.email = cleanEmail;

                // Ensure role exists for legacy users (default to trainee if missing, unless admin)
                if (!userData.role && !updates.role) {
                    updates.role = 'trainee';
                }

                // Only perform update if there are changes
                if (Object.keys(updates).length > 0) {
                    await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), updates);
                    userData = { ...userData, ...updates };
                }

                return { id: userDoc.id, ...userData };
            } else {
                // User not found - Register new user
                const newUser = {
                    firstName,
                    lastName,
                    phone: cleanPhone,
                    email: cleanEmail,
                    createdAt: new Date().toISOString(), // Use ISO string for consistency with other parts? Or serverTimestamp? Using string for now to match other usage.
                    isAdmin: isAdmin,
                    role: isAdmin ? 'admin' : 'trainee' // Default role
                };
                const docRef = await addDoc(collection(db, USERS_COLLECTION), newUser);
                return { id: docRef.id, ...newUser };
            }
        } catch (error) {
            console.error("Error logging in user:", error);
            throw error;
        }
    },

    updateUserRole: async (userId, newRole) => {
        try {
            await updateDoc(doc(db, USERS_COLLECTION, userId), { role: newRole });
            return { id: userId, role: newRole };
        } catch (error) {
            console.error("Error updating user role:", error);
            throw error;
        }
    },

    deleteUser: async (userId) => {
        try {
            await deleteDoc(doc(db, USERS_COLLECTION, userId));
            return userId;
        } catch (error) {
            console.error("Error deleting user:", error);
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

    // Helper to remove undefined values (Firestore doesn't like them)
    // and ensuring strings are safe
    cleanData: (data) => {
        if (data === null || data === undefined) return null;
        if (typeof data === 'string') return data;
        if (typeof data === 'number') return data;
        if (typeof data === 'boolean') return data;

        if (Array.isArray(data)) {
            return data
                .map(item => storageService.cleanData(item))
                .filter(item => item !== undefined);
        }

        if (typeof data === 'object') {
            const cleaned = {};
            Object.keys(data).forEach(key => {
                const value = storageService.cleanData(data[key]);
                if (value !== undefined) {
                    cleaned[key] = value;
                }
            });
            return cleaned;
        }

        return data;
    },

    // Workout Logs
    saveWorkout: async (workoutData, userId) => {
        try {
            console.log("Attempting to save workout for user:", userId);

            // 1. Prepare raw data
            const rawData = {
                ...workoutData,
                userId,
                timestamp: new Date().toISOString(), // Always set server time for ordering
                status: workoutData.status || 'completed'
            };

            // 2. Clean undefined values
            console.log("Raw Workout Data before cleanup:", JSON.stringify(rawData, null, 2));
            const dataToSave = storageService.cleanData(rawData);
            console.log("Final Workout Data (Cleaned):", JSON.stringify(dataToSave, null, 2));

            // 3. Save
            const docRef = await addDoc(collection(db, WORKOUT_LOGS_COLLECTION), dataToSave);
            console.log("Workout saved successfully with ID: ", docRef.id);
            return { id: docRef.id, ...dataToSave };
        } catch (error) {
            console.error("Error saving workout log:", error);
            console.error("Detailed Save Error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error;
        }
    },

    getAllWorkoutLogs: async (userId, isAdmin = false) => {
        try {
            let q = query(collection(db, WORKOUT_LOGS_COLLECTION), orderBy('timestamp', 'desc'));

            if (!isAdmin && userId) {
                // q = query(collection(db, WORKOUT_LOGS_COLLECTION), where('userId', '==', userId), orderBy('timestamp', 'desc'));
                // Temporary fix to check if index is missing: remove orderBy
                q = query(collection(db, WORKOUT_LOGS_COLLECTION), where('userId', '==', userId));
            }

            const querySnapshot = await getDocs(q);
            let results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort in memory since we removed orderBy
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return results;
        } catch (error) {
            console.error("Error getting all workout logs:", error);
            return [];
        }
    },

    getWorkoutLog: async (logId) => {
        try {
            const docRef = doc(db, WORKOUT_LOGS_COLLECTION, logId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                console.error("No such workout log!");
                return null;
            }
        } catch (error) {
            console.error("Error getting workout log:", error);
            throw error;
        }
    },

    getRecentWorkoutLogs: async (userId, limitCount = 5) => {
        try {
            // Use same query logic as getAllWorkoutLogs but slice the result since we are doing in-memory sort
            // Ideally we should use Firestore limit(), but due to index issues we are sorting in memory.
            const allLogs = await storageService.getAllWorkoutLogs(userId);
            return allLogs.slice(0, limitCount);
        } catch (error) {
            console.error("Error getting recent workout logs:", error);
            return [];
        }
    },

    updateWorkoutLog: async (logId, data) => {
        try {
            const logRef = doc(db, WORKOUT_LOGS_COLLECTION, logId);

            // Clean data before update
            const cleanedData = storageService.cleanData(data);
            console.log("Updating workout log. Cleaned Data:", cleanedData);

            await updateDoc(logRef, cleanedData);
            return { id: logId, ...cleanedData };
        } catch (error) {
            console.error("Error updating workout log:", error);
            throw error;
        }
    },

    deleteWorkoutLog: async (logId) => {
        try {
            await deleteDoc(doc(db, WORKOUT_LOGS_COLLECTION, logId));
            return logId;
        } catch (error) {
            console.error("Error deleting workout log:", error);
            throw error;
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
            // Query all workout logs for the user
            // We avoid orderBy here to prevent "Missing Index" errors if the index isn't built yet.
            // We'll sort in memory.
            const q = query(
                collection(db, WORKOUT_LOGS_COLLECTION),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(q);
            const logs = querySnapshot.docs.map(doc => doc.data());

            // Sort by timestamp descending (newest first)
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Iterate through logs to find the first occurrence of the exercise
            for (const workout of logs) {
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

    // System Config
    getSystemConfig: async () => {
        try {
            const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'config');
            const docSnap = await getDocs(query(collection(db, SYSTEM_SETTINGS_COLLECTION)));

            // We expect a single document named 'config', but let's be robust
            // Actually, let's just use getDoc if we knew the ID, but getDocs is fine for a collection.
            // Let's try to get specific doc 'config'
            // Wait, getDoc is not imported. Let's import getDoc or use getDocs.
            // I'll stick to getDocs for consistency with existing imports if getDoc isn't there.
            // Checking imports: import { ... getDocs ... } from 'firebase/firestore';
            // getDoc is NOT imported. I will use getDocs on the collection and look for id 'config' or just take the first one.

            // Better approach: Use setDoc/getDoc logic but since I can't change imports easily without checking, 
            // I'll use getDocs.

            const q = query(collection(db, SYSTEM_SETTINGS_COLLECTION));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return { devMode: false };
            }

            const configDoc = snapshot.docs.find(d => d.id === 'config');
            return configDoc ? configDoc.data() : (snapshot.docs[0]?.data() || { devMode: false });
        } catch (error) {
            console.error("Error getting system config:", error);
            return { devMode: false };
        }
    },

    saveSystemConfig: async (config) => {
        try {
            // We need setDoc, which IS imported.
            await setDoc(doc(db, SYSTEM_SETTINGS_COLLECTION, 'config'), config, { merge: true });
        } catch (error) {
            console.error("Error saving system config:", error);
            throw error;
        }
    },

    initialize: async () => {
        // No-op for now, or maybe check connection
        console.log("Storage service initialized");
    }
};
