# Backend API Plan (Cloud Functions)

This document outlines the 3 Cloud Functions required for the Trainer Mode integration.

## 1. sendInviteEmail

*   **Trigger Type**: Firestore Trigger (onCreate of `training_programs` document).
    *   *Alternative*: Could be an HTTP Callable if immediate feedback is needed, but spec suggests "Triggered on program creation".
*   **Inputs** (from the created document snapshot):
    *   `programId`
    *   `traineeId` (to fetch email if user exists) OR direct email field if stored in program/shadow user.
    *   `inviteToken`
*   **Outputs**: None (Side effect).
*   **Description**:
    1.  Listens for a new document in the `training_programs` collection.
    2.  Retrieves the `inviteToken` and the trainee's email address.
    3.  Sends an email (via SendGrid/SMTP) containing the invite link (e.g., `https://app.url/invite?token=...`).
    4.  Updates the `training_programs` document: sets `isEmailSent` to `true`.

## 2. acceptInvite

* **Trigger Type**: HTTP Callable (Invoked by the client when the user clicks the invite link).
* **Inputs**:
    * `token`: string (The `inviteToken`)
* **Outputs**:
    * `success`: boolean
    * `programId`: string
    * `coachId`: string
* **Description**:
    1.  Validates the provided `token` by searching the `training_programs` collection.
    2.  If valid:
        * **CRITICAL STEP:** Updates the authenticated user's document in the `users` collection:
            * Sets `coachId` to the program's coach.
            * Updates `role` to 'trainee' (or 'both' if they were already a coach).
        * Updates the `training_programs` document: Sets `traineeId` to `request.auth.uid` and status to `active`.
        * Creates/Updates the `trainee_profiles` document.
    3.  Returns success status to the client.

## 3. generateAssignmentsFromTemplate

*   **Trigger Type**: HTTP Callable (Invoked by the Coach).
*   **Inputs**:
    *   `programId`: string
    *   `startDate`: string (ISO Date)
    *   `frequency`: string[] (e.g., `['Monday', 'Wednesday', 'Friday']`)
    *   `durationWeeks`: number
*   **Outputs**:
    *   `assignmentsCreated`: number (Count of created docs)
*   **Description**:
    1.  Fetches the `training_programs` doc to get the `templateId` and `traineeId`.
    2.  Calculates the specific dates for the workouts based on `startDate`, `frequency`, and `durationWeeks`.
    3.  Performs a **Batch Write** to the `assignments` collection, creating a new document for each calculated date.
        *   Each assignment contains: `programId`, `traineeId`, `coachId`, `workoutTemplateId`, `scheduledDate`, `status: 'scheduled'`.
    4.  Returns the count of created assignments.
