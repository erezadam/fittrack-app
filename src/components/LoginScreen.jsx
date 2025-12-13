import React, { useState } from 'react';
import { storageService } from '../services/storageService';

export default function LoginScreen({ onLogin }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstName || !lastName || !phone) {
            setError('נא למלא את כל השדות');
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
            const user = await storageService.loginUser(firstName.trim(), lastName.trim(), phone.replace(/-/g, ''));
            onLogin(user);
        } catch (err) {
            console.error("Login failed", err);
            setError('אירעה שגיאה בכניסה למערכת. נסה שנית.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10">
                        <div className="text-6xl mb-4">💪</div>
                        <h1 className="text-3xl font-extrabold tracking-tight">FitTrack</h1>
                        <p className="text-teal-100 mt-2 font-medium">המאמן האישי שלך</p>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">כניסה למערכת</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">שם פרטי</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="neu-input"
                                placeholder="למשל: ישראל"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">שם משפחה</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="neu-input"
                                placeholder="למשל: ישראלי"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">טלפון נייד</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="neu-input"
                                placeholder="05X-XXXXXXX"
                                dir="ltr"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center font-medium border border-red-100">
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

                <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
                    גרסה 1.0.0 | כל הזכויות שמורות
                </div>
            </div>
        </div>
    );
}
