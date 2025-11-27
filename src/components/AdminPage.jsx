import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { WORKOUT_TYPES } from '../data/initialData';

export default function AdminPage({ onBack }) {
    const [activeTab, setActiveTab] = useState('exercises'); // 'exercises' | 'muscles'
    const [exercises, setExercises] = useState([]);
    const [muscles, setMuscles] = useState({});

    // Exercise Form State
    const [editingExercise, setEditingExercise] = useState(null); // null = new, object = editing
    const [exForm, setExForm] = useState({ name: '', mainMuscle: '', subMuscle: '', equipment: '' });

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

    const loadData = () => {
        setExercises(storageService.getExercises());
        setMuscles(storageService.getMuscles());
    };

    // --- Exercise Logic ---

    const handleSaveExercise = () => {
        if (!exForm.name || !exForm.mainMuscle || !exForm.equipment) {
            alert('Name, Main Muscle, and Workout Type are required');
            return;
        }

        let updatedExercises;
        if (editingExercise) {
            updatedExercises = exercises.map(ex => ex.id === editingExercise.id ? { ...ex, ...exForm } : ex);
        } else {
            const newEx = { id: Date.now().toString(), ...exForm };
            updatedExercises = [...exercises, newEx];
        }

        storageService.saveExercises(updatedExercises);
        setExercises(updatedExercises);
        setEditingExercise(null);
        setExForm({ name: '', mainMuscle: '', subMuscle: '', equipment: '' });
    };

    const handleEditExercise = (ex) => {
        setEditingExercise(ex);
        setExForm({ name: ex.name, mainMuscle: ex.mainMuscle, subMuscle: ex.subMuscle || '', equipment: ex.equipment || '' });
        window.scrollTo(0, 0); // Scroll to top to see the form
    };

    const handleDeleteExercise = (id) => {
        if (window.confirm('Delete this exercise?')) {
            const updated = exercises.filter(ex => ex.id !== id);
            storageService.saveExercises(updated);
            setExercises(updated);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
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

                const [name, mainMuscle, subMuscle, workoutType] = values.map(v => v.trim());

                // Validation
                // 1. Check if mainMuscle exists (by key or label?) Let's assume Key for now as per template.
                // If user puts Hebrew label, we might want to map it back to Key.
                // Let's try to find the key if they provided a label.
                let muscleKey = mainMuscle;
                if (!muscles[muscleKey]) {
                    // Try to find by label
                    const foundKey = Object.keys(muscles).find(k => muscles[k].label === mainMuscle);
                    if (foundKey) muscleKey = foundKey;
                    else {
                        console.warn(`Muscle not found: ${mainMuscle}`);
                        // Optional: Create it? No, safer to skip or default.
                        // Let's skip for safety.
                        skipped++;
                        continue;
                    }
                }

                // 2. Validate Workout Type
                // If it's English (e.g. 'Machine'), map to Hebrew if possible, or just take it if it matches.
                // Our WORKOUT_TYPES are Hebrew.
                // Simple mapping for common English terms to our Hebrew types:
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
                    // If not in our list and not mapped, maybe default to Free Weight or skip?
                    // Let's keep it but it might not show in dropdown correctly.
                    // Or better, default to 'משקולות חופשיות' if unknown.
                    finalType = 'משקולות חופשיות';
                }

                newExercises.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name,
                    mainMuscle: muscleKey,
                    subMuscle,
                    equipment: finalType
                });
            }

            if (newExercises.length > 0) {
                const updated = [...exercises, ...newExercises];
                storageService.saveExercises(updated);
                setExercises(updated);
                alert(`נוספו בהצלחה ${newExercises.length} תרגילים. (${skipped} נדלגו)`);
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

    const handleSaveMuscle = () => {
        if (!muscleForm.key || !muscleForm.label) {
            alert('Key (English) and Label (Hebrew) are required');
            return;
        }

        const updatedMuscles = { ...muscles };

        // If renaming key (creating new key, deleting old), handle that
        if (editingMuscleKey && editingMuscleKey !== muscleForm.key) {
            delete updatedMuscles[editingMuscleKey];
        }

        updatedMuscles[muscleForm.key] = {
            label: muscleForm.label,
            icon: muscleForm.icon,
            subMuscles: muscleForm.subMuscles
        };

        storageService.saveMuscles(updatedMuscles);
        setMuscles(updatedMuscles);
        setEditingMuscleKey(null);
        setMuscleForm({ key: '', label: '', icon: '', subMuscles: [] });
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
                                {WORKOUT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={handleSaveExercise} className="neu-btn primary" style={{ flex: 1 }}>
                                    {editingExercise ? 'שמור שינויים' : 'הוסף תרגיל'}
                                </button>
                                {editingExercise && (
                                    <button type="button" onClick={() => { setEditingExercise(null); setExForm({ name: '', mainMuscle: '', subMuscle: '', equipment: '' }); }} className="neu-btn">
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
