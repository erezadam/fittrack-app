# Functional Specifications (`FUNCTIONAL_SPEC.md`)

## 1. Overview
This document outlines the functional logic for the core modules of the application: Admin Panel, Workout Builder, Planned Workouts/History, and the Active Workout Session.

## 2. Core Screens

### 2.1 Admin Page
**Purpose**: Manage the exercise database and user roles.
- **Exercise Management**: 
  - Add, Edit, Delete exercises.
  - Manage "Sub-Muscles" for specific muscle groups.
  - **CSV Import/Export**: Bulk update exercises using a specific template.
  - **Migration Tools**: One-click fix for database name headers and muscle naming conventions.
- **User Management**: 
  - View all users.
  - Assign "Admin" or "Trainer" roles.

### 2.2 Workout Builder
**Purpose**: Create custom workouts.
- **Flow**:
  1. **Select Muscles**: Choose target muscle groups (e.g., Chest, Back).
  2. **Select Exercises**: Filter by sub-muscle or equipment. View icons (with fallback to default icons).
  3. **Review & Save**:
     - **Date Picker**: Optional field to schedule the workout for a future date.
     - **Save Button**: Saves the workout as "Planned" into the user's history without starting it immediately.

### 2.3 Planned Workouts (formerly History)
**Purpose**: A unified hub for past performance and future plans.
- **Display**:
  - **Planned Workouts**: Shown at the top with a distinct badge. Sorted by date.
  - **Completed History**: Chronological list of past workouts.
- **Interaction**:
  - Clicking a **Planned Workout** opens it in the *Workout Session* mode, passing its ID to ensure the final save updates this specific record.
  - Clicking a **Completed Workout** expands it to show details or allows "Repeating" it (copying to a new workout).

### 2.4 Workout Session (Active Workout)
**Purpose**: The interface for performing the workout.

#### Logic & interactions:
- **Exercise Cards**: Grouped by main muscle or displayed as a list.
- **Measurement Types**:
  - **Weight + Reps**: Standard input fields for `kg` and `reps`.
  - **Reps Only**: Single input field (e.g., for bodyweight exercises).
  - **Time**: Input for seconds/minutes (e.g., Planks, Cardio).
- **Blue Completion Button**:
  - **Function**: Marks the exercise (and all its sets) as "Done".
  - **Visual Feedback**: 
    - The exercise header text is struck through.
    - The card borders/background may change to indicate success.
  - **Auto-Collapse**: Upon clicking, the card automatically collapses to save screen space, enhancing focus on the next exercise.
  - **Input Locking**: Once marked complete, inputs are effectively "locked" (visually verified) to prevent accidental edits, though they can be reopened.
- **Save/Finish**:
  - **Updating**: If the session started from a "Planned Workout", saving updates the *existing* database record status to 'completed'.
  - **New**: If spontaneous, a new record is created.
