import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export const migrateMuscleNames = async () => {
    console.log("Starting migration of muscle names (Hebrew -> English Keys)...");
    const EXERCISE_COLLECTION = 'exercises';

    // Mapping from Hebrew (current DB value) to English Key (desired value)
    const muscleMapping = {
        'ידיים': 'Arms',
        'גב': 'Back',
        'רגליים': 'Legs',
        'חזה': 'Chest',
        'כתפיים': 'Shoulders',
        'בטן': 'Core',
        'ישבן': 'Glutes',
        'אירובי': 'Cardio',
        'כל הגוף': 'Full Body'
    };

    try {
        const querySnapshot = await getDocs(collection(db, EXERCISE_COLLECTION));
        const batch = writeBatch(db);
        let updateCount = 0;

        querySnapshot.docs.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const currentMuscle = data.mainMuscle;

            // If the current muscle is in our mapping (meaning it's Hebrew), update it to English
            if (muscleMapping[currentMuscle]) {
                const newMuscle = muscleMapping[currentMuscle];
                const docRef = doc(db, EXERCISE_COLLECTION, docSnapshot.id);
                batch.update(docRef, { mainMuscle: newMuscle });
                updateCount++;
                console.log(`Migrating ${docSnapshot.id}: ${currentMuscle} -> ${newMuscle}`);
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`Successfully updated ${updateCount} documents.`);
            alert(`תיקון מסד נתונים הסתיים בהצלחה! עודכנו ${updateCount} תרגילים לשמות באנגלית.`);
        } else {
            console.log("No documents needed updating.");
            alert("לא נמצאו תרגילים לתיקון (הכל כבר באנגלית).");
        }
    } catch (error) {
        console.error("Error migrating muscle names:", error);
        alert("שגיאה בתיקון מסד הנתונים.");
    }
};

import { initialExercises } from '../data/initialData';
import { addDoc } from 'firebase/firestore';

export const seedMissingExercises = async () => {
    console.log("Seeding missing exercises...");
    const EXERCISE_COLLECTION = 'exercises';

    try {
        // 1. Get all existing exercises
        const querySnapshot = await getDocs(collection(db, EXERCISE_COLLECTION));
        const existingExercises = querySnapshot.docs.map(doc => doc.data());

        let addedCount = 0;
        const batch = writeBatch(db);

        // 2. Check each initial exercise
        initialExercises.forEach(initEx => {
            // Check if exists by name (approximate match)
            const exists = existingExercises.some(ex => ex.name === initEx.name);

            if (!exists) {
                // Add to batch
                const newRef = doc(collection(db, EXERCISE_COLLECTION));
                // Ensure we use Hebrew muscle names if possible, or rely on migration later
                // Let's use the mapping directly here to be safe
                const dataToSave = {
                    ...initEx,
                    // Ensure we use the English key as is (initialData has English keys)
                    mainMuscle: initEx.mainMuscle
                };

                batch.set(newRef, dataToSave);
                addedCount++;
                console.log(`Adding missing exercise: ${initEx.name}`);
            }
        });

        if (addedCount > 0) {
            await batch.commit();
            console.log(`Successfully added ${addedCount} missing exercises.`);
            alert(`נוספו ${addedCount} תרגילים חסרים למערכת.`);
        } else {
            console.log("All initial exercises already exist.");
            alert("כל התרגילים כבר קיימים במערכת.");
        }

    } catch (error) {
        console.error("Error seeding exercises:", error);
        alert("שגיאה בטעינת תרגילים.");
    }
};
