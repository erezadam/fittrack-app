import React, { useState } from 'react';
import { storageService } from '../services/storageService';

export default function LoginScreen({ onLogin }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(''); // New State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load saved details on mount
    React.useEffect(() => {
        try {
            const savedDetails = localStorage.getItem('fittrack_last_details');
            if (savedDetails) {
                const { firstName, lastName, phone, email } = JSON.parse(savedDetails);
                setFirstName(firstName || '');
                setLastName(lastName || '');
                setPhone(phone || '');
                setEmail(email || '');
            }
        } catch (e) {
            console.error("Failed to load saved details:", e);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstName || !lastName || !phone) {
            setError('נא למלא שם ומספר טלפון');
            return;
        }

        // Basic phone validation (Israeli format mostly)
        const phoneRegex = /^05\d-?\d{7}$/;
        if (!phoneRegex.test(phone)) {
            setError('מספר טלפון לא תקין (חייב להתחיל ב-05 ולהכיל 10 ספרות)');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Save details for next time (even before login success, to remember attempt)
            localStorage.setItem('fittrack_last_details', JSON.stringify({ firstName, lastName, phone, email }));

            const user = await storageService.loginUser(firstName.trim(), lastName.trim(), phone.replace(/-/g, ''), email.trim());
            onLogin(user);
        } catch (err) {
            console.error("Login failed", err);
            setError('אירעה שגיאה בכניסה למערכת. נסה שנית.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
            <div className="bg-brand-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10">
                        <div className="text-6xl mb-4">💪</div>
                        <h1 className="text-3xl font-extrabold tracking-tight">RepUp</h1>
                        <p className="text-brand-accent mt-2 font-medium">המאמן האישי שלך</p>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8">
                    <h2 className="text-xl font-bold text-brand-text mb-6 text-center">ברוכים הבאים ל-RepUp</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-brand-text mb-1">שם פרטי</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="neu-input w-full"
                                    placeholder="ישראל"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-text mb-1">שם משפחה</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="neu-input w-full"
                                    placeholder="ישראלי"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-brand-text mb-1">טלפון נייד</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="neu-input w-full"
                                placeholder="05X-XXXXXXX"
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-brand-text mb-1">
                                אימייל <span className="text-brand-accent/80 text-xs font-normal">(מומלץ לסנכרון אימונים)</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="neu-input w-full"
                                placeholder="your@email.com"
                                dir="ltr"
                            />
                        </div>

                        {error && (
                            <div className="bg-brand-card text-red-500 p-3 rounded-xl text-sm text-center font-medium border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="neu-btn primary w-full py-4 text-lg shadow-lg mt-4"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                            ) : (
                                'התחל להתאמן 🚀'
                            )}
                        </button>
                    </form>
                </div>

                <div className="bg-brand-bg p-4 text-center text-xs text-brand-muted flex justify-between items-center">
                    <span>גרסה: שדרוג ממשק מלא - Antigravity | תאריך: 22/12/2025</span>
                    <button
                        onClick={() => {
                            setFirstName('Admin');
                            setLastName('User');
                            setPhone('054-7895818');
                        }}
                        className="text-brand-muted hover:text-brand-text transition-colors"
                        title="Dev Mode"
                    >
                        ⚡
                    </button>
                </div>
            </div>
        </div>
    );
}
