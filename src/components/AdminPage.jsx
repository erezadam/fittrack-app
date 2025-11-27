import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { WORKOUT_TYPES } from '../data/initialData';

export default function AdminPage({ onBack }) {
    const [activeTab, setActiveTab] = useState('exercises'); // 'exercises' | 'muscles'
    const [exercises, setExercises] = useState([]);
    const [muscles, setMuscles] = useState({});
    const [loading, setLoading] = useState(true);

    // Exercise Form State
    const [editingExercise, setEditingExercise] = useState(null); // null = new, object = editing
    const [exForm, setExForm] = useState({ name: '', mainMuscle: '', subMuscle: '', equipment: '', video_url: '' });

    // Muscle Form State
    const [editingMuscleKey, setEditingMuscleKey] = useState(null); // null = new, string = editing key
    const [muscleForm, setMuscleForm] = useState({ key: '', label: '', icon: '', subMuscles: [] });
    const [newSubMuscle, setNewSubMuscle] = useState('');

    // Filter State
    const [filterMainMuscle, setFilterMainMuscle] = useState('');
    const [filterSubMuscle, setFilterSubMuscle] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [exData, muscleData] = await Promise.all([
                storageService.getExercises(),
                storageService.getMuscles()
            ]);
            setExercises(exData);
            setMuscles(muscleData);
        } catch (error) {
            console.error("Failed to load data", error);
            alert("שגיאה בטעינת נתונים");
        } finally {
            setLoading(false);
        }
    };

    // --- Exercise Logic ---

    const handleSaveExercise = async () => {
        if (!exForm.name || !exForm.mainMuscle || !exForm.equipment) {
            alert('Name, Main Muscle, and Workout Type are required');
            return;
        }

        setLoading(true);
        try {
            if (editingExercise) {
                const updatedEx = { ...editingExercise, ...exForm };
                await storageService.updateExercise(updatedEx);
                setExercises(exercises.map(ex => ex.id === editingExercise.id ? updatedEx : ex));
            } else {
                const newEx = { ...exForm };
                const savedEx = await storageService.addExercise(newEx);
                setExercises([...exercises, savedEx]);
            }
            setEditingExercise(null);
            setExForm({ name: '', mainMuscle: '', subMuscle: '', equipment: '', video_url: '' });
        } catch (error) {
            console.error("Failed to save exercise", error);
            alert("שגיאה בשמירת תרגיל");
        } finally {
            setLoading(false);
        }
    };

    const handleEditExercise = (ex) => {
        setEditingExercise(ex);
        setExForm({ name: ex.name, mainMuscle: ex.mainMuscle, subMuscle: ex.subMuscle || '', equipment: ex.equipment || '', video_url: ex.video_url || '' });
        window.scrollTo(0, 0); // Scroll to top to see the form
    };

    const handleDeleteExercise = async (id) => {
        if (window.confirm('Delete this exercise?')) {
            setLoading(true);
            try {
                await storageService.deleteExercise(id);
                setExercises(exercises.filter(ex => ex.id !== id));
            } catch (error) {
                console.error("Failed to delete exercise", error);
                alert("שגיאה במחיקת תרגיל");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const lines = content.split('\n');
            if (lines.length < 2) {
                alert('קובץ ריק או לא תקין');
                return;
            }

            const headers = lines[0].trim().split(',');
            // Expected: name,mainMuscle,subMuscle,workoutType

            const newExercises = [];
            let skipped = 0;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',');
                if (values.length < 4) {
                    skipped++;
                    continue;
                }

                const [name, mainMuscle, subMuscle, workoutType, video_url] = values.map(v => v.trim());

                // Validation
                let muscleKey = mainMuscle;
                if (!muscles[muscleKey]) {
                    const foundKey = Object.keys(muscles).find(k => muscles[k].label === mainMuscle);
                    if (foundKey) muscleKey = foundKey;
                    else {
                        skipped++;
                        continue;
                    }
                }

                // Type Mapping
                const typeMapping = {
                    'Machine': 'מכשירים',
                    'Free Weight': 'משקולות חופשיות',
                    'Barbell': 'משקולות חופשיות',
                    'Dumbbells': 'משקולות חופשיות',
                    'Cables': 'כבלים',
                    'Cable': 'כבלים',
                    'Bodyweight': 'משקל גוף'
                };

                let finalType = workoutType;
                if (typeMapping[workoutType]) finalType = typeMapping[workoutType];
                else if (!WORKOUT_TYPES.includes(workoutType)) {
                    finalType = 'משקולות חופשיות';
                }

                newExercises.push({
                    name,
                    mainMuscle: muscleKey,
                    subMuscle,
                    equipment: finalType,
                    video_url: video_url || ''
                });
            }

            if (newExercises.length > 0) {
                setLoading(true);
                try {
                    await storageService.saveExercisesBatch(newExercises);
                    // Reload to get IDs
                    const updatedEx = await storageService.getExercises();
                    setExercises(updatedEx);
                    alert(`נוספו בהצלחה ${newExercises.length} תרגילים. (${skipped} נדלגו)`);
                } catch (error) {
                    console.error("Failed to batch save", error);
                    alert("שגיאה בייבוא תרגילים");
                } finally {
                    setLoading(false);
                }
            } else {
                alert('לא נמצאו תרגילים תקינים לייבוא.');
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    // Filtered Exercises
    const filteredExercises = exercises.filter(ex => {
        if (filterMainMuscle && ex.mainMuscle !== filterMainMuscle) return false;
        if (filterSubMuscle && ex.subMuscle !== filterSubMuscle) return false;
        return true;
    });

    // --- Muscle Logic ---

    const handleSaveMuscle = async () => {
        if (!muscleForm.key || !muscleForm.label) {
            alert('Key (English) and Label (Hebrew) are required');
            return;
        }

        setLoading(true);
        try {
            const updatedMuscles = { ...muscles };

            // Note: Renaming key is hard in Firestore (need to create new doc and delete old).
            // For now, let's assume we are just updating data for the key, or creating new if key doesn't exist.
            // If user changes key, it's effectively a new muscle.

            const muscleData = {
                label: muscleForm.label,
                icon: muscleForm.icon,
                subMuscles: muscleForm.subMuscles
            };

            await storageService.saveMuscle(muscleForm.key, muscleData);

            updatedMuscles[muscleForm.key] = muscleData;
            setMuscles(updatedMuscles);

            setEditingMuscleKey(null);
            setMuscleForm({ key: '', label: '', icon: '', subMuscles: [] });
        } catch (error) {
            console.error("Failed to save muscle", error);
            alert("שגיאה בשמירת שריר");
        } finally {
            setLoading(false);
        }
    };

    const handleEditMuscle = (key) => {
        setEditingMuscleKey(key);
        const m = muscles[key];
        setMuscleForm({ key: key, label: m.label, icon: m.icon, subMuscles: m.subMuscles || [] });
    };

    const handleAddSubMuscle = () => {
        if (newSubMuscle && !muscleForm.subMuscles.includes(newSubMuscle)) {
            setMuscleForm({ ...muscleForm, subMuscles: [...muscleForm.subMuscles, newSubMuscle] });
            setNewSubMuscle('');
        }
    };

    const handleRemoveSubMuscle = (sub) => {
        setMuscleForm({ ...muscleForm, subMuscles: muscleForm.subMuscles.filter(s => s !== sub) });
    };

    // --- Renderers ---

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px' }}>טוען נתונים...</div>;
    }

    return (
        <div className="container">
            {/* ... (Header and Tabs) ... */}
            <div className="flex-between" style={{ marginBottom: '20px' }}>
                <button type="button" onClick={onBack} className="neu-btn">← חזרה</button>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <h2 className="title" style={{ margin: 0, fontSize: '1.5rem' }}>ניהול מערכת</h2>
                </div>
            </div>

            {/* Import/Export Actions */}
            <div className="neu-card" style={{ marginBottom: '20px', padding: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>פעולות מהירות:</span>
                <a href="/exercises_template.csv" download className="neu-btn" style={{ textDecoration: 'none', fontSize: '0.8rem' }}>
                    📥 הורד תבנית CSV
                </a>
                <label className="neu-btn primary" style={{ cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    📤 טען תרגילים מ-CSV
                    <input
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                </label>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('exercises')}
                    className={`neu-btn ${activeTab === 'exercises' ? 'primary' : ''}`}
                    style={{ flex: 1 }}
                >
                    תרגילים
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('muscles')}
                    className={`neu-btn ${activeTab === 'muscles' ? 'primary' : ''}`}
                    style={{ flex: 1 }}
                >
                    שרירים
                </button>
            </div>

            {/* Content */}
            {activeTab === 'exercises' ? (
                <div>
                    {/* Add/Edit Form */}
                    <div className="neu-card" style={{ marginBottom: '24px' }}>
                        {/* ... (Form content same as before) ... */}
                        <h3>{editingExercise ? 'עריכת תרגיל' : 'הוספת תרגיל חדש'}</h3>
                        <div className="flex-col">
                            <input
                                className="neu-input"
                                placeholder="שם התרגיל"
                                value={exForm.name}
                                onChange={e => setExForm({ ...exForm, name: e.target.value })}
                            />
                            <div className="grid-cols-2">
                                <select
                                    className="neu-input"
                                    value={exForm.mainMuscle}
                                    onChange={e => setExForm({ ...exForm, mainMuscle: e.target.value, subMuscle: '' })}
                                >
                                    <option value="">בחר שריר ראשי...</option>
                                    {Object.keys(muscles).map(k => (
                                        <option key={k} value={k}>{muscles[k].label}</option>
                                    ))}
                                </select>
                                <select
                                    className="neu-input"
                                    value={exForm.subMuscle}
                                    onChange={e => setExForm({ ...exForm, subMuscle: e.target.value })}
                                    disabled={!exForm.mainMuscle}
                                >
                                    <option value="">בחר תת-שריר...</option>
                                    {exForm.mainMuscle && muscles[exForm.mainMuscle]?.subMuscles?.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                            <select
                                className="neu-input"
                                value={exForm.equipment}
                                onChange={e => setExForm({ ...exForm, equipment: e.target.value })}
                            >
                                <option value="">בחר סוג אימון...</option>
                                <option value="משקולות חופשיות">משקולות חופשיות</option>
                                <option value="מכשירים">מכשירים</option>
                                <option value="כבלים">כבלים</option>
                                <option value="משקל גוף">משקל גוף</option>
                            </select>
                            <input
                                className="neu-input"
                                placeholder="קישור לוידאו (YouTube)"
                                value={exForm.video_url}
                                onChange={e => setExForm({ ...exForm, video_url: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={handleSaveExercise} className="neu-btn primary" style={{ flex: 1 }}>
                                    {editingExercise ? 'שמור שינויים' : 'הוסף תרגיל'}
                                </button>
                                {editingExercise && (
                                    <button type="button" onClick={() => { setEditingExercise(null); setExForm({ name: '', mainMuscle: '', subMuscle: '', equipment: '', video_url: '' }); }} className="neu-btn">
                                        ביטול
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* List with Filters */}
                    <div className="neu-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>רשימת תרגילים ({filteredExercises.length})</h3>
                        </div>

                        {/* Filters */}
                        <div className="grid-cols-2" style={{ marginBottom: '16px', gap: '10px' }}>
                            <select
                                className="neu-input"
                                value={filterMainMuscle}
                                onChange={e => { setFilterMainMuscle(e.target.value); setFilterSubMuscle(''); }}
                                style={{ fontSize: '0.9rem', padding: '8px' }}
                            >
                                <option value="">כל השרירים</option>
                                {Object.keys(muscles).map(k => (
                                    <option key={k} value={k}>{muscles[k].label}</option>
                                ))}
                            </select>
                            <select
                                className="neu-input"
                                value={filterSubMuscle}
                                onChange={e => setFilterSubMuscle(e.target.value)}
                                disabled={!filterMainMuscle}
                                style={{ fontSize: '0.9rem', padding: '8px' }}
                            >
                                <option value="">כל תתי-השרירים</option>
                                {filterMainMuscle && muscles[filterMainMuscle]?.subMuscles?.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {filteredExercises.map(ex => (
                                <div key={ex.id} className="neu-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.05)' }}>
                                    <div>
                                        <strong>{ex.name}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                                            {muscles[ex.mainMuscle]?.label || ex.mainMuscle} • {ex.subMuscle} • {ex.equipment}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" onClick={() => handleEditExercise(ex)} className="neu-btn" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>ערוך</button>
                                        <button type="button" onClick={() => handleDeleteExercise(ex.id)} className="neu-btn danger" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>מחק</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    {/* Muscle Form */}
                    <div className="neu-card" style={{ marginBottom: '24px' }}>
                        <h3>{editingMuscleKey ? 'עריכת שריר' : 'הוספת שריר חדש'}</h3>
                        <div className="flex-col">
                            <div className="grid-cols-2">
                                <input
                                    className="neu-input"
                                    placeholder="מפתח באנגלית (למשל: Chest)"
                                    value={muscleForm.key}
                                    onChange={e => setMuscleForm({ ...muscleForm, key: e.target.value })}
                                    disabled={!!editingMuscleKey} // Prevent changing key when editing for simplicity
                                />
                                <input
                                    className="neu-input"
                                    placeholder="תווית בעברית (למשל: חזה)"
                                    value={muscleForm.label}
                                    onChange={e => setMuscleForm({ ...muscleForm, label: e.target.value })}
                                />
                            </div>
                            <input
                                className="neu-input"
                                placeholder="אייקון (למשל: 💪)"
                                value={muscleForm.icon}
                                onChange={e => setMuscleForm({ ...muscleForm, icon: e.target.value })}
                            />

                            {/* Sub Muscles Manager */}
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '8px' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>תתי שרירים:</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
                                    {muscleForm.subMuscles.map(sub => (
                                        <span key={sub} style={{ background: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #ddd' }}>
                                            {sub}
                                            <button type="button" onClick={() => handleRemoveSubMuscle(sub)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red', fontWeight: 'bold' }}>×</button>
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        className="neu-input"
                                        placeholder="הוסף תת-שריר..."
                                        value={newSubMuscle}
                                        onChange={e => setNewSubMuscle(e.target.value)}
                                        style={{ padding: '8px' }}
                                    />
                                    <button type="button" onClick={handleAddSubMuscle} className="neu-btn" style={{ padding: '8px 16px' }}>+</button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={handleSaveMuscle} className="neu-btn primary" style={{ flex: 1 }}>
                                    {editingMuscleKey ? 'שמור שינויים' : 'הוסף שריר'}
                                </button>
                                {editingMuscleKey && (
                                    <button type="button" onClick={() => { setEditingMuscleKey(null); setMuscleForm({ key: '', label: '', icon: '', subMuscles: [] }); }} className="neu-btn">
                                        ביטול
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Muscles List */}
                    <div className="grid-cols-2">
                        {Object.keys(muscles).map(key => (
                            <div key={key} className="neu-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem' }}>{muscles[key].icon}</div>
                                    <div style={{ fontWeight: 'bold' }}>{muscles[key].label}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#718096' }}>{key}</div>
                                </div>
                                <button type="button" onClick={() => handleEditMuscle(key)} className="neu-btn" style={{ fontSize: '0.8rem' }}>ערוך</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
