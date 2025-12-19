import React, { useEffect, useState } from 'react';
import { trainerService } from '../services/trainerService';
import { User, Plus, Mail } from 'lucide-react';

export default function TrainerDashboard({ user, onBack }) {
    const [trainees, setTrainees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            loadTrainees();
        }
    }, [user]);

    const loadTrainees = async () => {
        try {
            setLoading(true);
            const data = await trainerService.getTraineesForCoach(user.uid);
            setTrainees(data);
        } catch (error) {
            console.error("Failed to load trainees:", error);
            alert("שגיאה בטעינת מתאמנים");
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsInviting(true);
        try {
            // Hardcoded template ID for now as per instructions, or pass null if allowed
            const dummyTemplateId = 'template_default';
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // 1 month default

            await trainerService.inviteTrainee(inviteEmail, user.uid, dummyTemplateId, startDate, endDate);

            alert(`הוזמן בהצלחה: ${inviteEmail}`);
            setInviteEmail('');
            // Optionally reload trainees if the invite creates a shadow user immediately visible
            // loadTrainees(); 
        } catch (error) {
            console.error("Invite failed:", error);
            alert("שגיאה בשליחת הזמנה");
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="neu-btn text-sm">
                        → חזרה
                    </button>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-600">
                        המתאמנים שלי
                    </h1>
                </div>
            </div>

            {/* Invite Section */}
            <div className="neu-card mb-8 p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Mail size={20} />
                    הזמן מתאמן חדש
                </h3>
                <form onSubmit={handleInvite} className="flex gap-4">
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="אימייל המתאמן..."
                        className="neu-input flex-1"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isInviting}
                        className="neu-btn primary flex items-center gap-2"
                    >
                        {isInviting ? 'שולח...' : 'שלח הזמנה'}
                        {!isInviting && <Plus size={18} />}
                    </button>
                </form>
            </div>

            {/* Trainees List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center text-gray-500 py-8">טוען מתאמנים...</div>
                ) : trainees.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <User size={48} className="mx-auto mb-2 opacity-20" />
                        <p>אין לך עדיין מתאמנים.</p>
                        <p className="text-sm">השתמש בטופס למעלה כדי להזמין את המתאמן הראשון שלך!</p>
                    </div>
                ) : (
                    trainees.map((trainee) => (
                        <div key={trainee.id} className="neu-card flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center text-teal-600 font-bold">
                                    {trainee.name ? trainee.name[0].toUpperCase() : '?'}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800">
                                        {trainee.name || 'ממתין להרשמה'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {trainee.email || 'ללא אימייל'}
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
        </div>
    );
}
