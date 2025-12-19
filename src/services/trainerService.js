import { db } from '../firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp
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
     * Initiates the trainee invitation flow.
     * Checks if a user with the email exists (optional logic can be added here),
     * then creates a training program which triggers the email sending Cloud Function.
     * 
     * @param {string} email - The trainee's email.
     * @param {string} coachId - The coach's ID.
     * @param {string} templateId - The ID of the workout template to assign.
     * @param {Date} startDate - Program start date.
     * @param {Date} endDate - Program end date.
     * @returns {Promise<string>} The ID of the created program (invite).
     */
    inviteTrainee: async (email, coachId, templateId, startDate, endDate) => {
        try {
            // 1. Check if user exists (Optional: could link immediately if they do)
            // For now, we follow the invite flow: create program -> trigger email

            const inviteToken = crypto.randomUUID(); // Generate a unique token

            const programData = {
                coachId,
                traineeId: null, // Pending invite
                templateId,
                inviteToken,
                traineeEmail: email, // Store email to send invite to
                startDate,
                endDate
            };

            const programId = await trainerService.createTrainingProgram(programData);
            return programId;
        } catch (error) {
            console.error("Error inviting trainee:", error);
            throw error;
        }
    }
};
