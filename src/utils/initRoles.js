import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const initializeUserRoles = async () => {
    console.log("Starting role initialization...");
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        let updatedCount = 0;
        let adminFound = false;

        for (const userDoc of snapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            let updates = {};

            // Normalize phone
            const phone = userData.phone ? userData.phone.replace(/-/g, '') : '';

            // Check for Erez Adam (Admin)
            if (phone === '0547895818') {
                if (userData.role !== 'admin' || !userData.isAdmin) {
                    updates.role = 'admin';
                    updates.isAdmin = true;
                    console.log(`Setting Admin role for user: ${userData.firstName} ${userData.lastName} (${userId})`);
                    adminFound = true;
                }
            } else {
                // For everyone else
                if (!userData.role) {
                    updates.role = 'trainee';
                    console.log(`Setting Default Trainee role for user: ${userData.firstName} ${userData.lastName} (${userId})`);
                }
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'users', userId), updates);
                updatedCount++;
            }
        }

        console.log(`Role initialization complete. Updated ${updatedCount} users.`);
        if (!adminFound) console.warn("Warning: Admin user (0547895818) was not found in the database.");

        return updatedCount;

    } catch (error) {
        console.error("Error initializing roles:", error);
        throw error;
    }
};
