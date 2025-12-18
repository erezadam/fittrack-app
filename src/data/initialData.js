export const WORKOUT_TYPES = [
    'מכשירים',
    'משקולות חופשיות',
    'כבלים',
    'משקל גוף'
];

export const initialExercises = [
    // Chest
    { id: 'c1', name: 'לחיצת חזה (מוט)', mainMuscle: 'Chest', subMuscle: 'חזה מרכזי', equipment: 'משקולות חופשיות', imageUrls: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'] },
    { id: 'c2', name: 'לחיצת חזה בשיפוע עליון (משקולות יד)', mainMuscle: 'Chest', subMuscle: 'חזה עליון', equipment: 'משקולות חופשיות', video_url: 'https://www.youtube.com/watch?v=8iPEnn-ltC8' },
    { id: 'c3', name: 'פרפר בכבלים', mainMuscle: 'Chest', subMuscle: 'חזה פנימי', equipment: 'כבלים', imageUrls: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'] },
    { id: 'c4', name: 'שכיבות סמיכה', mainMuscle: 'Chest', subMuscle: 'חזה מרכזי', equipment: 'משקל גוף' },
    { id: 'c5', name: 'לחיצת חזה במכונה', mainMuscle: 'Chest', subMuscle: 'חזה מרכזי', equipment: 'מכשירים' },

    // Back
    { id: 'b1', name: 'מתח', mainMuscle: 'Back', subMuscle: 'רחב גבי', equipment: 'משקל גוף' },
    { id: 'b2', name: 'משיכת פולי עליון', mainMuscle: 'Back', subMuscle: 'רחב גבי', equipment: 'כבלים' },
    { id: 'b3', name: 'חתירה בהטיה (Bent Over Row)', mainMuscle: 'Back', subMuscle: 'מרכז גב', equipment: 'משקולות חופשיות' },
    { id: 'b4', name: 'Face Pulls (משיכת פנים)', mainMuscle: 'Back', subMuscle: 'טרפזים', equipment: 'כבלים' },
    { id: 'b5', name: 'חתירה בישיבה במכונה', mainMuscle: 'Back', subMuscle: 'מרכז גב', equipment: 'מכשירים' },

    // Legs
    { id: 'l1', name: 'סקוואט (Squat)', mainMuscle: 'Legs', subMuscle: 'ארבע ראשי', equipment: 'משקולות חופשיות' },
    { id: 'l2', name: 'לחיצת רגליים (Leg Press)', mainMuscle: 'Legs', subMuscle: 'ארבע ראשי', equipment: 'מכשירים' },
    { id: 'l3', name: 'דדליפט רומני', mainMuscle: 'Legs', subMuscle: 'המסטרינג', equipment: 'משקולות חופשיות' },
    { id: 'l4', name: 'פשיטת ברכיים', mainMuscle: 'Legs', subMuscle: 'ארבע ראשי', equipment: 'מכשירים' },
    { id: 'l5', name: 'הרמת עקבים (תאומים)', mainMuscle: 'Legs', subMuscle: 'תאומים', equipment: 'מכשירים' },

    // Shoulders
    { id: 's1', name: 'לחיצת כתפיים (Overhead Press)', mainMuscle: 'Shoulders', subMuscle: 'כתף קדמית', equipment: 'משקולות חופשיות' },
    { id: 's2', name: 'הרחקת כתפיים לצדדים', mainMuscle: 'Shoulders', subMuscle: 'כתף אמצעית', equipment: 'משקולות חופשיות' },
    { id: 's3', name: 'פרפר הפוך (כתף אחורית)', mainMuscle: 'Shoulders', subMuscle: 'כתף אחורית', equipment: 'כבלים' },

    // Arms
    { id: 'a1', name: 'כפיפת מרפקים (Bicep Curls)', mainMuscle: 'Arms', subMuscle: 'יד קדמית', equipment: 'משקולות חופשיות', imageUrls: ['https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80'] },
    { id: 'a2', name: 'פשיטת מרפקים בכבל (Tricep Pushdown)', mainMuscle: 'Arms', subMuscle: 'יד אחורית', equipment: 'כבלים', imageUrls: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'] },
    { id: 'a3', name: 'כפיפת פטישים', mainMuscle: 'Arms', subMuscle: 'יד קדמית', equipment: 'משקולות חופשיות' },
    { id: 'a4', name: 'לחיצה צרפתית (Skull Crushers)', mainMuscle: 'Arms', subMuscle: 'יד אחורית', equipment: 'משקולות חופשיות' },

    // Core
    { id: 'cr3', name: 'הרמות רגליים', mainMuscle: 'Core', subMuscle: 'בטן תחתונה', equipment: 'משקל גוף' },
    { id: 'cr4', name: 'טוויסט רוסי', mainMuscle: 'Core', subMuscle: 'אלכסונים', equipment: 'משקל גוף' },
    { id: 'cr5', name: 'גלגלת בטן', mainMuscle: 'Core', subMuscle: 'בטן עליונה', equipment: 'אחר' }
];

export const initialMuscles = {
    'Chest': { label: 'חזה', icon: '👕', subMuscles: ['חזה עליון', 'חזה מרכזי', 'חזה תחתון', 'חזה פנימי'] },
    'Back': { label: 'גב', icon: '🦅', subMuscles: ['רחב גבי', 'זוקפי גב', 'מרכז גב', 'טרפזים'] },
    'Legs': { label: 'רגליים', icon: '🦵', subMuscles: ['ארבע ראשי', 'המסטרינג', 'ישבן', 'תאומים'] },
    'Shoulders': { label: 'כתפיים', icon: '🥥', subMuscles: ['כתף קדמית', 'כתף אמצעית', 'כתף אחורית'] },
    'Arms': { label: 'זרועות', icon: '💪', subMuscles: ['יד קדמית', 'יד אחורית', 'אמות'] },
    'Core': { label: 'בטן', icon: '🍫', subMuscles: ['בטן עליונה', 'בטן תחתונה', 'אלכסונים', 'בטן סטטית'] },
    'Glutes': { label: 'ישבן', icon: '🍑', subMuscles: ['ישבן עליון', 'ישבן תחתון', 'צידי הישבן'] },
    'Cardio': { label: 'אירובי', icon: '🏃‍♂️', subMuscles: ['ריצה', 'הליכה', 'אופניים'] },
    'Full Body': { label: 'כל הגוף', icon: '⚡', subMuscles: [] }
};
