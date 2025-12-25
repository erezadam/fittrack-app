# User Flows (`USER_FLOWS.md`)

## 1. Planned Workout to Execution (The Primary Flow)
This flow describes how a user plans ahead and then fulfills that plan.

1.  **Planning Phase**:
    *   User navigates to **"Workout Builder"**.
    *   Selects desired muscles and specific exercises.
    *   **Action**: Selects a future date in the "Date Picker".
    *   **Action**: Clicks **"Save Workout"** (not "Start").
    *   **System**: Saves to `workout_logs` with `status: 'planned'`. Redirects to "Planned Workouts".

2.  **Viewing**:
    *   User sees the new card in **"Planned Workouts"** (top section) with a "Planned" badge.

3.  **Execution Phase**:
    *   User clicks the planned workout card.
    *   System opens **"Workout Session"** loaded with those exercises. **Crucially**, the system keeps the `id` of the planned log.
    *   User performs exercises, inputting weights and reps.
    *   User marks exercises as complete (Blue Button).

4.  **Completion**:
    *   User clicks **"Finish Workout"**.
    *   **System**: Detects existing `id`. Updates the *same* document in Firestore.
    *   Sets `status` to `'completed'` (or `'partial'`).
    *   Sets `timestamp` to `now`.
    *   **Result**: The item moves from the "Planned" section to the "History" section (chronological list) without creating a duplicate.

## 2. Spontaneous Workout
This flow describes immediate action without prior planning.

1.  **Start**:
    *   User navigates to **"Workout Builder"** OR clicks "Quick Start".
    *   Selects exercises.
    *   Clicks **"Start Workout"**.

2.  **Execution**:
    *   System creates a temporary draft state (in memory or `in_progress` doc).
    *   User performs workout.

3.  **Completion**:
    *   User clicks **"Finish Workout"**.
    *   **System**: Calls `addDoc` to create a *new* record in `workout_logs` with `status: 'completed'`.
    *   Redirects to Dashboard/History.
