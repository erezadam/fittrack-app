/**
 * Final Engineered Spec - Firestore Schema (Corrected)
 * Based on Trainer Mode requirements.
 */

// 1. User & Auth Model

export interface User {
    uid: string;
    email: string;
    phone?: string;
    // CORRECTION: Added 'both' to allow a user to be a coach and a trainee
    role: 'trainee' | 'coach' | 'both';
    coachId?: string; // If role is trainee (or both), this links to their coach

    // Shadow User Logic:
    // If a coach invites a trainee by email who doesn't exist yet, 
    // we create a User document with a generated UUID (Shadow User).
}

// 2. New Collections

export interface TraineeProfile {
    traineeId: string; // References User.uid
    coachId: string;   // References User.uid (The Coach)
    goals: ('bulk' | 'cut' | 'strength')[]; // CORRECTION: Strict typing based on spec
    metrics: {
        weight?: number;
        height?: number;
        bodyFatPercentage?: number;
        [key: string]: any;
    };
    internalCoachNotes?: string;
}

export interface TrainingProgram {
    programId: string;
    coachId: string;
    traineeId: string | null; // Can be null if pending invite
    templateId: string;
    inviteToken?: string;
    isEmailSent: boolean;
    // CORRECTION: Added start and end dates defined in spec
    startDate: any; // Firestore Timestamp
    endDate: any;   // Firestore Timestamp
    status: 'pending' | 'active' | 'completed' | 'paused' | 'archived';
}

export interface Assignment {
    assignmentId: string;
    programId: string;
    traineeId: string;
    workoutTemplateId: string;
    scheduledDate: any; // Firestore Timestamp (preferred over string for queries)
    status: 'pending' | 'completed' | 'skipped';
    completedLogId?: string;
    // CORRECTION: Added feedback object defined in spec
    feedback?: {
        rpe?: number; // Rate of Perceived Exertion (1-10)
        notes?: string;
    };
}

// 3. Integration

export interface WorkoutLog {
    // ... existing fields ...
    assignmentId?: string; // Links this log to a specific Assignment
}
