import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const EXERCISES_TO_IMPORT = [
    { "name": "פשיטת מרפקים בשכיבה עם מוט", "nameEn": "Lying Barbell Triceps Extension", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Lying_Barbell_Triceps_Extension.jpeg"] },
    { "name": "פשיטת מרפקים בשכיבה עם משקולות יד", "nameEn": "Lying Dumbbell Triceps Extension", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Lying_Dumbbell_Triceps_Extension.jpeg"] },
    { "name": "פשיטת מרפק בקיק בק", "nameEn": "Dumbbell Triceps Kickback", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "משקולות", "imageUrls": [] },
    { "name": "פשיטת מרפקים בפולי עליון בעמידה", "nameEn": "Cable Triceps Pushdown", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "כבלים", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Cable_Triceps_Pushdown.jpeg"] },
    { "name": "פשיטת מרפקים בפולי מעל הראש (Overhead)", "nameEn": "Overhead Cable Triceps Extension", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "כבלים", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Overhead_Cable_Triceps_Extension_1.jpeg", "https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Overhead_Cable_Triceps_Extension_2.jpeg"] },
    { "name": "פשיטת מרפקים בישיבה במכונה ייעודית", "nameEn": "Seated Triceps Press Machine", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "מכונות", "imageUrls": [] },
    { "name": "לחיצת חזה צרה (Close Grip)", "nameEn": "Close Grip Bench Press", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Close_Grip_Bench_Press.jpeg"] },
    { "name": "לחיצת חזה צרה בסמית' משין", "nameEn": "Smith Machine Close Grip Bench Press", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "מכונות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Smith_Machine_Close_Grip_Bench_Press.jpeg"] },
    { "name": "מקבילים (Dips)", "nameEn": "Dips", "mainMuscle": "ידיים", "subMuscle": "יד אחורית", "equipment": "משקל גוף", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Dips.jpeg"] },
    { "name": "כפיפת מרפקים בעמידה עם מוט", "nameEn": "Standing Barbell Curl", "mainMuscle": "ידיים", "subMuscle": "יד קדמית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Standing_Barbell_Curl.jpeg"] },
    { "name": "כפיפת מרפקים בעמידה עם משקולות יד", "nameEn": "Standing Dumbbell Curl", "mainMuscle": "ידיים", "subMuscle": "יד קדמית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Standing_Dumbbell_Curl.jpeg"] },
    { "name": "כפיפת מרפקים בשיפוע חיובי (Incline)", "nameEn": "Incline Dumbbell Curl", "mainMuscle": "ידיים", "subMuscle": "יד קדמית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Incline_Dumbbell_Curl.jpeg"] },
    { "name": "כפיפת מרפקים בפטישים (Hammer)", "nameEn": "Hammer Curls", "mainMuscle": "ידיים", "subMuscle": "יד קדמית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Hammer_Curls.jpeg"] },
    { "name": "כפיפת מרפקים בפריצ'ר (Preacher)", "nameEn": "Preacher Curl", "mainMuscle": "ידיים", "subMuscle": "יד קדמית", "equipment": "מכונות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Preacher_Curl.jpeg"] },
    { "name": "כפיפת מרפקים בריכוז (Concentration)", "nameEn": "Concentration Curl", "mainMuscle": "ידיים", "subMuscle": "יד קדמית", "equipment": "משקולות", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Concentration_Curl.jpeg"] },
    { "name": "כפיפת מרפקים בפולי תחתון", "nameEn": "Cable Curl", "mainMuscle": "ידיים", "subMuscle": "יד קדמית", "equipment": "כבלים", "imageUrls": ["https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Cable_Curl.jpeg"] }
];

export const importExercises = async () => {
    const collectionRef = collection(db, 'exercises');
    let added = 0;
    let skipped = 0;

    console.log("Starting import...");

    for (const exercise of EXERCISES_TO_IMPORT) {
        // 1. Check for duplicates (by exact Hebrew Name)
        const q = query(collectionRef, where("name", "==", exercise.name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            console.log(`Skipping duplicate: ${exercise.name}`);
            skipped++;
            continue;
        }
        // 2. Add if not exists
        await addDoc(collectionRef, exercise);
        console.log(`Added: ${exercise.name}`);
        added++;
    }

    alert(`Import complete!\nAdded: ${added}\nSkipped (Duplicates): ${skipped}`);
};
