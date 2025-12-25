# Data Schema (`DATA_SCHEMA.md`)

## 1. Overview
The application uses Firebase Firestore (NoSQL). Key collections are detailed below.
**Note**: All `undefined` values are strictly forbidden and are stripped/nullified before saving.

## 2. Collections

### `exercises`
Stores the library of available exercises.
- **id** (string): Auto-generated or custom string.
- **name** (string): Hebrew name.
- **nameEn** (string): English name.
- **mainMuscle** (string): e.g., 'Chest', 'Back' (Normalized to Hebrew in UI usually).
- **subMuscle** (string): Specific focus (e.g., 'Upper Chest').
- **equipment** (string): e.g., 'Dumbbells', 'Machine'.
- **trackingType** (string): 
  - `'weight_reps'` (Default)
  - `'reps'`
  - `'time'`
- **video_url** (string|null): YouTube link.
- **imageUrls** (array<string>): List of image URLs.
- **icon** (string|null): URL or internal icon reference.

### `workout_logs`
Stores both completed history and future planned workouts.
- **id** (string): Auto-generated.
- **userId** (string): Reference to `users`.
- **workoutName** (string): User-defined title.
- **status** (string): 
  - `'planned'`: Future workout.
  - `'in_progress'`: Currently active (if saved as draft).
  - `'completed'`: Finished workout.
  - `'partial'`: Finished but not all exercises done.
- **timestamp** (string ISO): Date of creation or completion.
- **date** (string ISO): Specifically for planned dates (often synced with timestamp).
- **durationMinutes** (number): Total time spent.
- **calories** (number): Estimated burn.
- **exercises** (array<object>):
  - `exercise_id` (string)
  - `name` (string)
  - `mainMuscle` (string)
  - `isCompleted` (boolean)
  - `sets` (array<object>):
    - `weight` (string|number)
    - `reps` (string|number)
    - `isCompleted` (boolean)

### `users`
- **id** (string): Auth UID.
- **email** (string)
- **firstName** (string)
- **lastName** (string)
- **phone** (string)
- **role** (string): `'admin'`, `'trainer'`, `'trainee'`.
- **coachId** (string|null): If trainee, who manages them.

### `training_programs` (Assignments)
Trainer-assigned plans.
- **coachId** (string)
- **traineeId** (string)
- **exercises** (array): Similar structure to logs.
- **status** (string): `'assigned'`, `'completed'`.
- **startDate** / **endDate** (Timestamp).
