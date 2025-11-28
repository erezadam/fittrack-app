export const WORKOUT_TYPES = [
    'מכשירים',
    'משקולות חופשיות',
    'כבלים',
    'משקל גוף'
];

export const initialExercises = [
    // Chest
    { id: 'c1', name: 'Bench Press', mainMuscle: 'Chest', subMuscle: 'חזה מרכזי', equipment: 'משקולות חופשיות' },
    { id: 'c2', name: 'Incline Dumbbell Press', mainMuscle: 'Chest', subMuscle: 'חזה עליון', equipment: 'משקולות חופשיות', video_url: 'https://www.youtube.com/watch?v=8iPEnn-ltC8' },
    { id: 'c3', name: 'Cable Flys', mainMuscle: 'Chest', subMuscle: 'חזה פנימי', equipment: 'כבלים' },
    { id: 'c4', name: 'Push Ups', mainMuscle: 'Chest', subMuscle: 'חזה מרכזי', equipment: 'משקל גוף' },
    { id: 'c5', name: 'Chest Press Machine', mainMuscle: 'Chest', subMuscle: 'חזה מרכזי', equipment: 'מכשירים' },

    // Back
    { id: 'b1', name: 'Pull Ups', mainMuscle: 'Back', subMuscle: 'רחב גבי', equipment: 'משקל גוף' },
    { id: 'b2', name: 'Lat Pulldown', mainMuscle: 'Back', subMuscle: 'רחב גבי', equipment: 'כבלים' },
    { id: 'b3', name: 'Bent Over Row', mainMuscle: 'Back', subMuscle: 'מרכז גב', equipment: 'משקולות חופשיות' },
    { id: 'b4', name: 'Face Pulls', mainMuscle: 'Back', subMuscle: 'טרפזים', equipment: 'כבלים' },
    { id: 'b5', name: 'Seated Row Machine', mainMuscle: 'Back', subMuscle: 'מרכז גב', equipment: 'מכשירים' },

    // Legs
    { id: 'l1', name: 'Squat', mainMuscle: 'Legs', subMuscle: 'ארבע ראשי', equipment: 'משקולות חופשיות' },
    { id: 'l2', name: 'Leg Press', mainMuscle: 'Legs', subMuscle: 'ארבע ראשי', equipment: 'מכשירים' },
    { id: 'l3', name: 'Romanian Deadlift', mainMuscle: 'Legs', subMuscle: 'המסטרינג', equipment: 'משקולות חופשיות' },
    { id: 'l4', name: 'Leg Extensions', mainMuscle: 'Legs', subMuscle: 'ארבע ראשי', equipment: 'מכשירים' },
    { id: 'l5', name: 'Calf Raises', mainMuscle: 'Legs', subMuscle: 'תאומים', equipment: 'מכשירים' },

    // Shoulders
    { id: 's1', name: 'Overhead Press', mainMuscle: 'Shoulders', subMuscle: 'כתף קדמית', equipment: 'משקולות חופשיות' },
    { id: 's2', name: 'Lateral Raises', mainMuscle: 'Shoulders', subMuscle: 'כתף אמצעית', equipment: 'משקולות חופשיות' },
    { id: 's3', name: 'Face Pulls', mainMuscle: 'Shoulders', subMuscle: 'כתף אחורית', equipment: 'כבלים' },

    // Arms
    { id: 'a1', name: 'Bicep Curls', mainMuscle: 'Arms', subMuscle: 'יד קדמית', equipment: 'משקולות חופשיות' },
    { id: 'a2', name: 'Tricep Pushdown', mainMuscle: 'Arms', subMuscle: 'יד אחורית', equipment: 'כבלים' },
    { id: 'a3', name: 'Hammer Curls', mainMuscle: 'Arms', subMuscle: 'יד קדמית', equipment: 'משקולות חופשיות' },
    { id: 'a4', name: 'Skull Crushers', mainMuscle: 'Arms', subMuscle: 'יד אחורית', equipment: 'משקולות חופשיות' },

    // Core
    { id: 'cr3', name: 'Leg Raises', mainMuscle: 'Core', subMuscle: 'בטן תחתונה', equipment: 'Bodyweight' },
    { id: 'cr4', name: 'Russian Twists', mainMuscle: 'Core', subMuscle: 'אלכסונים', equipment: 'Bodyweight' },
    { id: 'cr5', name: 'Ab Wheel Rollout', mainMuscle: 'Core', subMuscle: 'בטן עליונה', equipment: 'Other' }
];

export const initialMuscles = {
    'Chest': { label: 'חזה', icon: '👕', subMuscles: ['חזה עליון', 'חזה מרכזי', 'חזה תחתון', 'חזה פנימי'] },
    'Back': { label: 'גב', icon: '🦅', subMuscles: ['רחב גבי', 'זוקפי גב', 'מרכז גב', 'טרפזים'] },
    'Legs': { label: 'רגליים', icon: '🦵', subMuscles: ['ארבע ראשי', 'המסטרינג', 'ישבן', 'תאומים'] },
    'Shoulders': { label: 'כתפיים', icon: '🥥', subMuscles: ['כתף קדמית', 'כתף אמצעית', 'כתף אחורית'] },
    'Arms': { label: 'ידיים', icon: '💪', subMuscles: ['יד קדמית', 'יד אחורית', 'אמה'] },
    'Core': { label: 'בטן', icon: '🍫', subMuscles: ['בטן עליונה', 'בטן תחתונה', 'אלכסונים', 'בטן סטטית'] },
    'Glutes': { label: 'ישבן', icon: '🍑', subMuscles: ['ישבן עליון', 'ישבן תחתון', 'צידי הישבן'] },
    'Cardio': { label: 'אירובי', icon: '🏃‍♂️', subMuscles: ['ריצה', 'הליכה', 'אופניים'] },
    'Full Body': { label: 'כל הגוף', icon: '⚡', subMuscles: [] }
};
