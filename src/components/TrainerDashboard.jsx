import React, { useEffect, useState } from 'react';
import { trainerService } from '../services/trainerService';
import WorkoutBuilder from './WorkoutBuilder';
import TraineeDetails from './TraineeDetails';
import { User, UserPlus, Calendar, BarChart2, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export default function TrainerDashboard({ user, onBack }) {
    const [currentView, setCurrentView] = useState('hub'); // 'hub', 'reports', 'register', 'planner'
    const [trainees, setTrainees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [comparisonUrl, setComparisonUrl] = useState(null);

    // Invitation State
    const [inviteEmail, setInviteEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [age, setAge] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isInviting, setIsInviting] = useState(false);

    // Planner State
    const [selectedTraineeId, setSelectedTraineeId] = useState('');
    const [workoutDate, setWorkoutDate] = useState('');
    const [workoutName, setWorkoutName] = useState('');

    // Drill-Down State
    const [selectedTrainee, setSelectedTrainee] = useState(null);

    useEffect(() => {
        // Smart ID Detection
        const coachId = user?.uid || user?.id || user?.userId;
        if (coachId) {
            loadTrainees(coachId);
        }
        // Fetch Config
        storageService.getSystemConfig().then(config => {
            if (config?.comparisonUrl) setComparisonUrl(config.comparisonUrl);
        });
    }, [user]);

    const loadTrainees = async (coachId) => {
        try {
            setLoading(true);
            const data = await trainerService.getTraineesForCoach(coachId);
            setTrainees(data);
        } catch (error) {
            console.error("Failed to load trainees:", error);
            // alert("שגיאה בטעינת מתאמנים"); // Don't alert on load, just log
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setSelectedImage(imageUrl);
        }
    };

    const handleSaveTrainee = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsInviting(true);
        try {
            // Updated to use the user prop passed from App.jsx
            if (!user) {
                console.error("No user prop found in TrainerDashboard!");
                alert("שגיאה: המערכת לא מזהה משתמש מחובר. נסה לרענן את הדף.");
                return;
            }

            console.log("Attempting save with user prop:", user); // Debug log

            // Smart ID Detection
            const coachId = user.uid || user.id || user.userId;

            if (!coachId) {
                console.error("Critical: Could not find user ID in object:", user);
                alert("שגיאה: לא ניתן לזהות את המזהה הייחודי של המאמן.");
                return;
            }

            const traineeData = {
                email: inviteEmail,
                firstName,
                lastName,
                phone,
                age,
                notes,
            };

            // Use detected coachId
            await trainerService.createTraineeProfile(coachId, traineeData);

            alert("המתאמן נוצר בהצלחה. כעת ניתן לשבץ לו אימונים.");

            // Reset form
            setInviteEmail('');
            setFirstName('');
            setLastName('');
            setPhone('');
            setAge('');
            setNotes('');
            setSelectedImage(null);

            // Reload trainees to show the new profile immediately
            if (coachId) {
                await loadTrainees(coachId);
            }

            setCurrentView('hub');
        } catch (error) {
            console.error("Save failed:", error);
            alert(error.message || "שגיאה בשמירת המתאמן");
        } finally {
            setIsInviting(false);
        }
    };

    const handleAssignWorkout = async (exercises) => {
        if (!selectedTraineeId) {
            alert('אנא בחר מתאמן לשיבוץ');
            return;
        }
        if (!workoutDate) {
            alert('אנא בחר תאריך לאימון');
            return;
        }

        try {
            const coachId = user?.uid || user?.id || user?.userId;
            const trainee = trainees.find(t => t.id === selectedTraineeId);
            const traineeName = trainee ? trainee.name : 'Unknown';

            await trainerService.assignWorkout({
                coachId,
                traineeId: selectedTraineeId,
                date: workoutDate,
                exercises,
                name: workoutName || `אימון ל${traineeName}`
            });

            alert('האימון שובץ בהצלחה!');
            setCurrentView('hub');
            setWorkoutName('');
            setWorkoutDate('');
            setSelectedTraineeId('');

        } catch (error) {
            console.error("Failed to assign workout:", error);
            alert("שגיאה בשיבוץ האימון");
        }
    };

    const renderHeader = () => (
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                {currentView !== 'hub' ? (
                    <button onClick={() => setCurrentView('hub')} className="neu-btn text-sm flex items-center gap-2">
                        <ArrowRight size={16} /> חזרה לדאשבורד
                    </button>
                ) : (
                    <button onClick={onBack} className="neu-btn text-sm flex items-center gap-2">
                        <ArrowRight size={16} /> יציאה
                    </button>
                )}

                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-600">
                    {user?.displayName ? `שלום, ${user.displayName}` : 'שלום, מאמן'}
                </h1>
            </div>
        </div>
    );

    const renderHub = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tile A: Reports */}
            <div
                onClick={() => setCurrentView('reports')}
                className="neu-card p-8 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform cursor-pointer min-h-[200px]"
            >
                <div className="w-16 h-16 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center">
                    <BarChart2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-brand-text">דוחות ומעקב</h3>
                <p className="text-brand-muted text-center text-sm">צפה ברשימת המתאמנים והתקדמותם</p>
            </div>

            {/* Tile B: Register Trainee */}
            <div
                onClick={() => setCurrentView('register')}
                className="neu-card p-8 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform cursor-pointer min-h-[200px]"
            >
                <div className="w-16 h-16 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                    <UserPlus size={32} />
                </div>
                <h3 className="text-xl font-bold text-brand-text">הקמת מתאמן חדש</h3>
                <p className="text-brand-muted text-center text-sm">הזמן מתאמן חדש לאפליקציה</p>
            </div>

            {/* Tile C: Workout Planner */}
            <div
                onClick={() => setCurrentView('planner')}
                className="neu-card p-8 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform cursor-pointer min-h-[200px]"
            >
                <div className="w-16 h-16 rounded-full bg-brand-card border border-brand-accent/20 text-brand-accent flex items-center justify-center">
                    <Calendar size={32} />
                </div>
                <h3 className="text-xl font-bold text-brand-text">בניית תוכנית אימונים</h3>
                <p className="text-brand-muted text-center text-sm">צור וערוך תוכניות אימון</p>
            </div>

            {/* Comparison Link */}
            {comparisonUrl && (
                <a
                    href={comparisonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="md:col-span-3 neu-card p-4 flex items-center justify-center gap-2 hover:bg-brand-accent/10 transition-colors cursor-pointer text-brand-accent font-bold border-brand-accent/20"
                >
                    🌐 נתוני השוואת מתאמנים
                </a>
            )}
        </div>
    );

    const renderReports = () => (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-brand-text mb-4">מתאמנים פעילים</h2>
            {loading ? (
                <div className="text-center text-brand-muted py-8">טוען מתאמנים...</div>
            ) : trainees.length === 0 ? (
                <div className="text-center text-brand-muted py-12 bg-brand-card/50 rounded-xl border border-dashed border-brand-muted/30">
                    <User size={48} className="mx-auto mb-2 opacity-20" />
                    <p>אין לך עדיין מתאמנים.</p>
                </div>
            ) : (
                trainees.map((trainee) => (
                    <div
                        key={trainee.id}
                        onClick={() => setSelectedTrainee(trainee)}
                        className="neu-card flex justify-between items-center p-4 hover:bg-brand-accent/5 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-card border border-brand-accent/30 flex items-center justify-center text-brand-accent font-bold">
                                {trainee.name ? trainee.name[0].toUpperCase() : '?'}
                            </div>
                            <div>
                                <div className="font-bold text-brand-text">
                                    {trainee.name || 'ממתין להרשמה'}
                                </div>
                                <div className="text-xs text-brand-muted">
                                    {trainee.email || 'ללא אימייל'} | {trainee.phone || 'ללא טלפון'}
                                </div>
                            </div>
                        </div>
                        <button className="neu-btn text-xs">
                            צפה בפרופיל
                        </button>
                    </div>
                ))
            )}
        </div>
    );

    const renderRegisterForm = () => (
        <div className="max-w-2xl mx-auto neu-card p-8">
            <h2 className="text-2xl font-bold text-brand-text mb-6 flex items-center gap-2 justify-center">
                <UserPlus className="text-brand-accent" />
                רשימת מתאמן חדש
            </h2>
            <form onSubmit={handleSaveTrainee} className="space-y-6">

                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center mb-6">
                    <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full bg-brand-bg border-2 border-dashed border-brand-muted/30 flex items-center justify-center overflow-hidden hover:border-brand-accent transition-colors">
                            {selectedImage ? (
                                <img src={selectedImage} alt="Profile Preview" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-brand-muted" />
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-brand-accent text-white p-1 rounded-full shadow-lg">
                            <div className="relative">
                                <PlusIconBadge />
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImageSelect}
                        />
                    </div>
                    <span className="text-xs text-brand-muted mt-2">לחץ להעלאת תמונה</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">שם פרטי</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="neu-input w-full"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">שם משפחה</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="neu-input w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">טלפון</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="neu-input w-full"
                            placeholder="050-0000000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1">גיל</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="neu-input w-full"
                            min="1"
                            max="120"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-brand-text mb-1">אימייל</label>
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="neu-input w-full"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-brand-text mb-1">הערות</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="neu-input w-full min-h-[100px]"
                        placeholder="הערות חשובות, פציעות, מטרות..."
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isInviting}
                        className="neu-btn primary w-full flex justify-center items-center gap-2 py-3"
                    >
                        {isInviting ? 'שומר...' : 'שמור פרטי מתאמן'}
                        {!isInviting && <Mail size={18} />}
                    </button>
                </div>
            </form>
        </div>
    );

    const renderPlanner = () => (
        <div className="flex flex-col h-full animate-fade-in gap-4">
            <div className="bg-brand-card p-4 rounded-xl border border-brand-accent/10 flex flex-wrap gap-4 items-end shadow-sm z-10">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-bold text-brand-text mb-1">בחר מתאמן</label>
                    <select
                        value={selectedTraineeId}
                        onChange={(e) => {
                            setSelectedTraineeId(e.target.value);
                            setWorkoutDate(''); // Reset date when changing user
                            // Calendar now handled inside WorkoutBuilder
                        }}
                        className="neu-input w-full"
                    >
                        <option value="">בחר מרשימה...</option>
                        {trainees.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto transition-all duration-300 no-scrollbar">
                {selectedTraineeId ? (
                    <WorkoutBuilder
                        user={user}
                        mode="trainer"
                        onSave={handleAssignWorkout}
                        workoutDate={workoutDate}
                        onDateChange={setWorkoutDate}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-muted bg-brand-card/30 rounded-xl border border-dashed border-brand-muted/30">
                        <Calendar size={48} className="mb-4 opacity-20" />
                        <p className="text-lg">אנא בחר מתאמן כדי להתחיל בתכנון האימון</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl h-screen flex flex-col">
            {selectedTrainee ? (
                <TraineeDetails
                    trainee={selectedTrainee}
                    onBack={() => setSelectedTrainee(null)}
                />
            ) : (
                <>
                    {renderHeader()}
                    <div className="fade-in flex-1 overflow-auto pb-20 no-scrollbar">
                        {currentView === 'hub' && renderHub()}
                        {currentView === 'reports' && renderReports()}
                        {currentView === 'register' && renderRegisterForm()}
                        {currentView === 'planner' && renderPlanner()}
                    </div>
                </>
            )}
        </div>
    );
}

// Plus Icon Badge Component helper
const PlusIconBadge = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);
