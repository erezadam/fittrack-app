import { db } from '../firebase';
import {
    collection,
    addDoc,
    setDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp,
    updateDoc
} from 'firebase/firestore';

const TRAINING_PROGRAMS_COLLECTION = 'training_programs';
const TRAINEE_PROFILES_COLLECTION = 'trainee_profiles';
const USERS_COLLECTION = 'users';

/**
 * Service for Trainer Mode functionality.
 */
export const trainerService = {

    /**
     * Creates a new training program document.
     * @param {Object} programData - The program data.
     * @param {string} programData.coachId
     * @param {string} programData.templateId
     * @param {string} [programData.traineeId]
     * @param {string} [programData.inviteToken]
     * @param {Date} programData.startDate
     * @param {Date} programData.endDate
     * @returns {Promise<string>} The ID of the created program.
     */
    createTrainingProgram: async (programData) => {
        try {
            const docData = {
                ...programData,
                startDate: Timestamp.fromDate(programData.startDate),
                endDate: Timestamp.fromDate(programData.endDate),
                status: 'pending',
                isEmailSent: false,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, TRAINING_PROGRAMS_COLLECTION), docData);
            return docRef.id;
        } catch (error) {
            console.error("Error creating training program:", error);
            throw error;
        }
    },

    /**
     * Fetches trainee profiles linked to a specific coach.
     * @param {string} coachId - The ID of the coach.
     * @returns {Promise<Array<Object>>} List of trainee profiles with their IDs.
     */
    getTraineesForCoach: async (coachId) => {
        try {
            const q = query(
                collection(db, TRAINEE_PROFILES_COLLECTION),
                where('coachId', '==', coachId)
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching trainees for coach:", error);
            throw error;
        }
    },

    /**
     * Creates a new trainee profile without sending an invite.
     * 
     * @param {string} coachId - The coach's ID.
     * @param {Object} traineeData - Trainee details (firstName, lastName, email, phone, age, notes).
     * @returns {Promise<string>} The ID of the created profile.
     */
    createTraineeProfile: async (coachId, traineeData) => {
        try {
            const email = traineeData.email.toLowerCase().trim();
            const firstName = traineeData.firstName || '';
            const lastName = traineeData.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || email;

            // 1. Sync with 'users' collection (The "Shadow User")
            let userId = null;
            const usersRef = collection(db, USERS_COLLECTION);

            // Check if user exists by email
            const q = query(usersRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);

            const userPayload = {
                email,
                firstName,
                lastName,
                displayName: fullName,
                phoneNumber: traineeData.phone || '',
                role: 'trainee',
                coachId,
                lastUpdated: serverTimestamp()
            };

            if (!querySnapshot.empty) {
                // User exists - Update details (careful merge)
                const userDoc = querySnapshot.docs[0];
                userId = userDoc.id;
                await setDoc(doc(db, USERS_COLLECTION, userId), userPayload, { merge: true });
            } else {
                // User does not exist - Create new
                const newUserRef = await addDoc(usersRef, {
                    ...userPayload,
                    createdAt: serverTimestamp()
                });
                userId = newUserRef.id;
            }

            // 2. Create Trainee Profile (linked to userId)
            const profileData = {
                userId, // Link to the user doc
                coachId,
                email,
                firstName,
                lastName,
                name: fullName,
                phone: traineeData.phone || '',
                age: traineeData.age || '',
                notes: traineeData.notes || '',
                photoURL: null, // Placeholder
                status: 'created', // Initial status before invitation
                joinedAt: serverTimestamp()
            };

            const profileRef = await addDoc(collection(db, TRAINEE_PROFILES_COLLECTION), profileData);
            return profileRef.id;
        } catch (error) {
            console.error("Error creating trainee profile:", error);
            throw error;
        }
    },

    /**
     * Assigns a workout to a trainee.
     * @param {Object} params
     * @param {string} params.coachId
     * @param {string} params.traineeId
     * @param {string} params.date - Date string YYYY-MM-DD
     * @param {Array} params.exercises - List of exercises
     * @param {string} params.name - Workout name
     */
    assignWorkout: async ({ coachId, traineeId, date, exercises, name }) => {
        try {
            const startDate = new Date(date);
            const endDate = new Date(date);
            // set to end of day? or just same date. 
            // createTrainingProgram expects Date objects.

            const programData = {
                coachId,
                traineeId,
                name,
                exercises, // Store exercises directly
                startDate,
                endDate,
                status: 'assigned'
            };

            // Reuse createTrainingProgram
            // Ensure createTrainingProgram handles 'exercises' field if we added it (it spreads ...programData so it should be fine).
            return await trainerService.createTrainingProgram(programData);
        } catch (error) {
            console.error("Error assigning workout:", error);
            throw error;
        }
    },

    /**
     * Updates a training program status to 'completed'.
     * @param {string} programId 
     */
    completeTrainingProgram: async (programId) => {
        try {
            const programRef = doc(db, TRAINING_PROGRAMS_COLLECTION, programId);
            await updateDoc(programRef, {
                status: 'completed',
                completedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error completing training program:", error);
            throw error;
        }
    },

    /**
     * Fetches details and history for a specific trainee.
     * @param {string} traineeId 
     * @returns {Promise<Object>} Object containing profile, logs, and assignments.
     */
    getTraineeDetails: async (traineeId) => {
        try {
            // 1. Fetch Assignments (Training Programs)
            const assignmentsQuery = query(
                collection(db, TRAINING_PROGRAMS_COLLECTION),
                where('traineeId', '==', traineeId)
            );
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            const assignments = assignmentsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'assignment',
                    date: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
                    ...data
                };
            });

            // 2. Fetch Completed Workouts (Logs)
            // Note: Logs collection is usually 'workout_logs'
            const logsQuery = query(
                collection(db, 'workout_logs'),
                where('userId', '==', traineeId)
            );
            const logsSnapshot = await getDocs(logsQuery);
            const logs = logsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'log',
                    date: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
                    ...data
                };
            });

            return {
                assignments,
                logs
            };
        } catch (error) {
            console.error("Error fetching trainee details:", error);
            throw error;
        }
    }
};
