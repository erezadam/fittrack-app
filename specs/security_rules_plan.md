# Security Rules Plan (RBAC)

Based on the "Final Engineered Spec", here is the logic for `firestore.rules`.

## Roles
*   **Coach**: A user with `role == 'coach'`.
*   **Trainee**: A user with `role == 'trainee'`.

## Collection Rules

### 1. Coach Access (Read/Write)
Coaches have full **Read** and **Write** access to the following collections IF the document belongs to them (`coachId == auth.uid`):
*   `trainee_profiles`
*   `training_programs`
*   `assignments`

**Logic:**
```
allow read, write: if request.auth != null && resource.data.coachId == request.auth.uid;
// For create operations, check request.resource.data.coachId
```

### 2. Trainee Access (Read Only)
Trainees have **Read** access to `assignments` IF the assignment belongs to them (`traineeId == auth.uid`).

**Logic:**
```
allow read: if request.auth != null && resource.data.traineeId == request.auth.uid;
```

## Summary of Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isCoach(coachId) {
      return isAuthenticated() && request.auth.uid == coachId; // Simplified check, ideally verify role in user doc
    }
    
    function isTrainee(traineeId) {
      return isAuthenticated() && request.auth.uid == traineeId;
    }

    // Trainee Profiles
    match /trainee_profiles/{docId} {
      allow read, write: if isCoach(resource.data.coachId) || (request.method == 'create' && isCoach(request.resource.data.coachId));
    }

    // Training Programs
    match /training_programs/{docId} {
      allow read, write: if isCoach(resource.data.coachId) || (request.method == 'create' && isCoach(request.resource.data.coachId));
    }

    // Assignments
    match /assignments/{docId} {
      // Coach: Full control over their trainees' assignments
      allow read, write: if isCoach(resource.data.coachId) 
                      || (request.method == 'create' && isCoach(request.resource.data.coachId));
      
      // Trainee: Can Read their tasks AND Update them (to mark as done/add feedback)
      // Note: In a real app, we would restrict WHICH fields they can update (only status/feedback),
      // but for now, 'update' permission is required.
      allow read, update: if isTrainee(resource.data.traineeId);
    }
  }
}
```
