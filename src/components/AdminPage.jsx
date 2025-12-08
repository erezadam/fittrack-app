import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    const [muscleIconFile, setMuscleIconFile] = useState(null);
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
            // Check if Hebrew headers
            const isHebrew = headers[0].includes('שם התרגיל');

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

                let [name, mainMuscle, subMuscle, workoutType, video_url] = values.map(v => v.trim());

                // Hebrew Mapping Logic
                if (isHebrew) {
                    // Map Muscle (Hebrew Label -> English Key)
                    const muscleEntry = Object.entries(muscles).find(([key, val]) => val.label === mainMuscle);
                    if (muscleEntry) {
                        mainMuscle = muscleEntry[0]; // Use the English key (e.g., 'Chest')
                    } else {
                        // Try to find by key if user put English key in Hebrew CSV? Unlikely but possible.
                        if (!muscles[mainMuscle]) {
                            skipped++;
                            continue;
                        }
                    }

                    // Map Equipment (Hebrew -> Hebrew/English Key)
                    // In our app, equipment is stored as Hebrew string (e.g. 'משקולות חופשיות')
                    // So if the user wrote 'משקולות חופשיות', it's fine.
                    // But if they wrote 'משקולות', we might want to map it.
                    const equipmentMapping = {
                        'משקולות': 'משקולות חופשיות',
                        'משקולת': 'משקולות חופשיות',
                        'מכונה': 'מכשירים',
                        'כבל': 'כבלים'
                    };
                    if (equipmentMapping[workoutType]) {
                        workoutType = equipmentMapping[workoutType];
                    }
                } else {
                    // English CSV Logic (existing)
                    let muscleKey = mainMuscle;
                    if (!muscles[muscleKey]) {
                        const foundKey = Object.keys(muscles).find(k => muscles[k].label === mainMuscle);
                        if (foundKey) muscleKey = foundKey;
                        else {
                            skipped++;
                            continue;
                        }
                    }
                    mainMuscle = muscleKey;
                }

                // Common Type Mapping (English -> Hebrew) - kept for backward compatibility or mixed usage
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
                    // If it's not a valid type, default or skip? 
                    // Let's default to Free Weight if unknown, or keep as is if it matches Hebrew.
                    if (!Object.values(typeMapping).includes(workoutType)) {
                        finalType = 'משקולות חופשיות';
                    }
                }

                newExercises.push({
                    name,
                    mainMuscle,
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
            let iconUrl = muscleForm.icon;

            if (muscleIconFile) {
                const storageRef = ref(storage, `icons/muscles/${muscleIconFile.name}_${Date.now()}`);
                await uploadBytes(storageRef, muscleIconFile);
                iconUrl = await getDownloadURL(storageRef);
            }

            const updatedMuscles = { ...muscles };

            // Note: Renaming key is hard in Firestore (need to create new doc and delete old).
            // For now, let's assume we are just updating data for the key, or creating new if key doesn't exist.
            // If user changes key, it's effectively a new muscle.

            const muscleData = {
                label: muscleForm.label,
                icon: iconUrl,
                subMuscles: muscleForm.subMuscles
            };

            await storageService.saveMuscle(muscleForm.key, muscleData);

            updatedMuscles[muscleForm.key] = muscleData;
            setMuscles(updatedMuscles);

            setEditingMuscleKey(null);
            setMuscleForm({ key: '', label: '', icon: '', subMuscles: [] });
            setMuscleIconFile(null);
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
        setMuscleIconFile(null);
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

    const handleRestoreDefaults = async () => {
        if (!window.confirm('האם אתה בטוח? פעולה זו תוסיף את כל שרירי ברירת המחדל למערכת (לא תמחק קיימים, אבל תדרוס אם המפתח זהה).')) {
            return;
        }
        setLoading(true);
        try {
            const { initialMuscles } = await import('../data/initialData');
            await storageService.saveMusclesBatch(initialMuscles);
            // Reload
            const updatedMuscles = await storageService.getMuscles();
            setMuscles(updatedMuscles);
            alert('שרירי ברירת המחדל שוחזרו בהצלחה!');
        } catch (error) {
            console.error("Failed to restore defaults", error);
            alert("שגיאה בשחזור נתונים");
        } finally {
            setLoading(false);
        }
    };

    // --- Renderers ---

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <button type="button" onClick={onBack} className="neu-btn text-sm">
                    ← חזרה
                </button>
                <h2 className="text-2xl font-bold text-gray-800">ניהול מערכת</h2>
            </div>

            {/* Import/Export Actions */}
            <div className="neu-card mb-8 flex flex-wrap gap-4 items-center">
                <span className="font-bold text-sm text-gray-600">פעולות מהירות:</span>
                <a
                    href="/exercises_template_he.csv"
                    download="exercises_template_he.csv"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neu-btn text-xs"
                >
                    📥 הורד תבנית CSV
                </a>
                <label className="neu-btn primary text-xs cursor-pointer">
                    📤 טען תרגילים
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>
                <button onClick={handleRestoreDefaults} className="neu-btn text-xs">
                    🔄 שחזר ברירת מחדל
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    type="button"
                    onClick={() => setActiveTab('exercises')}
                    className={`neu-btn flex-1 ${activeTab === 'exercises' ? 'primary' : ''}`}
                >
                    תרגילים
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('muscles')}
                    className={`neu-btn flex-1 ${activeTab === 'muscles' ? 'primary' : ''}`}
                >
                    שרירים
                </button>
            </div>

            {/* Content */}
            {activeTab === 'exercises' ? (
                <div className="space-y-8 animate-fade-in">
                    {/* Add/Edit Form */}
                    <div className="neu-card">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">
                            {editingExercise ? 'עריכת תרגיל' : 'הוספת תרגיל חדש'}
                        </h3>
                        <div className="space-y-4">
                            <input
                                className="neu-input"
                                placeholder="שם התרגיל"
                                value={exForm.name}
                                onChange={e => setExForm({ ...exForm, name: e.target.value })}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="flex gap-4">
                                <button type="button" onClick={handleSaveExercise} className="neu-btn primary flex-1">
                                    {editingExercise ? 'שמור שינויים' : 'הוסף תרגיל'}
                                </button>
                                {editingExercise && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingExercise(null); setExForm({ name: '', mainMuscle: '', subMuscle: '', equipment: '', video_url: '' }); }}
                                        className="neu-btn"
                                    >
                                        ביטול
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* List with Filters */}
                    <div className="neu-card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">רשימת תרגילים ({filteredExercises.length})</h3>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <select
                                className="neu-input text-sm py-2"
                                value={filterMainMuscle}
                                onChange={e => { setFilterMainMuscle(e.target.value); setFilterSubMuscle(''); }}
                            >
                                <option value="">כל השרירים</option>
                                {Object.keys(muscles).map(k => (
                                    <option key={k} value={k}>{muscles[k].label}</option>
                                ))}
                            </select>
                            <select
                                className="neu-input text-sm py-2"
                                value={filterSubMuscle}
                                onChange={e => setFilterSubMuscle(e.target.value)}
                                disabled={!filterMainMuscle}
                            >
                                <option value="">כל תתי-השרירים</option>
                                {filterMainMuscle && muscles[filterMainMuscle]?.subMuscles?.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {filteredExercises.map(ex => (
                                <div key={ex.id} className="bg-white rounded-xl p-4 flex justify-between items-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="font-bold text-gray-800">{ex.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {muscles[ex.mainMuscle]?.label || ex.mainMuscle} • {ex.subMuscle} • {ex.equipment}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => handleEditExercise(ex)} className="text-teal-600 hover:bg-teal-50 p-2 rounded-lg transition-colors text-sm font-medium">ערוך</button>
                                        <button type="button" onClick={() => handleDeleteExercise(ex.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-medium">מחק</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    {/* Muscle Form */}
                    <div className="neu-card">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">
                            {editingMuscleKey ? 'עריכת שריר' : 'הוספת שריר חדש'}
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    className="neu-input"
                                    placeholder="מפתח באנגלית (למשל: Chest)"
                                    value={muscleForm.key}
                                    onChange={e => setMuscleForm({ ...muscleForm, key: e.target.value })}
                                    disabled={!!editingMuscleKey}
                                />
                                <input
                                    className="neu-input"
                                    placeholder="תווית בעברית (למשל: חזה)"
                                    value={muscleForm.label}
                                    onChange={e => setMuscleForm({ ...muscleForm, label: e.target.value })}
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-sm font-bold text-gray-700 mb-2">אייקון (קובץ תמונה או אימוג'י):</label>
                                <div className="flex flex-wrap gap-4 items-center">
                                    <input
                                        type="file"
                                        accept="image/png, image/svg+xml, image/jpeg"
                                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                        onChange={e => setMuscleIconFile(e.target.files[0])}
                                    />
                                    <span className="text-sm text-gray-400">או</span>
                                    <input
                                        className="neu-input w-32"
                                        placeholder="אימוג'י"
                                        value={muscleForm.icon}
                                        onChange={e => setMuscleForm({ ...muscleForm, icon: e.target.value })}
                                    />
                                </div>
                                {muscleForm.icon && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        נוכחי: {muscleForm.icon.startsWith('http') ? 'תמונה מותאמת' : muscleForm.icon}
                                    </div>
                                )}
                            </div>

                            {/* Sub Muscles Manager */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-sm font-bold text-gray-700 mb-2">תתי שרירים:</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {muscleForm.subMuscles.map(sub => (
                                        <span key={sub} className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200 flex items-center gap-2 shadow-sm">
                                            {sub}
                                            <button type="button" onClick={() => handleRemoveSubMuscle(sub)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        className="neu-input"
                                        placeholder="הוסף תת-שריר..."
                                        value={newSubMuscle}
                                        onChange={e => setNewSubMuscle(e.target.value)}
                                    />
                                    <button type="button" onClick={handleAddSubMuscle} className="neu-btn px-6">+</button>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={handleSaveMuscle} className="neu-btn primary flex-1">
                                    {editingMuscleKey ? 'שמור שינויים' : 'הוסף שריר'}
                                </button>
                                {editingMuscleKey && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingMuscleKey(null); setMuscleForm({ key: '', label: '', icon: '', subMuscles: [] }); setMuscleIconFile(null); }}
                                        className="neu-btn"
                                    >
                                        ביטול
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Muscles List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.keys(muscles).map(key => (
                            <div key={key} className="neu-card flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="text-3xl w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full">
                                        {muscles[key].icon && muscles[key].icon.startsWith('http') ? (
                                            <img
                                                src={muscles[key].icon}
                                                alt={muscles[key].label}
                                                className="w-8 h-8 object-contain"
                                            />
                                        ) : (
                                            muscles[key].icon
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{muscles[key].label}</div>
                                        <div className="text-xs text-gray-500">{key}</div>
                                    </div>
                                </div>
                                <button type="button" onClick={() => handleEditMuscle(key)} className="neu-btn text-xs px-3 py-2">ערוך</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
