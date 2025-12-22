import React, { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { storageService } from '../services/storageService';
import { db, storage } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { WORKOUT_TYPES } from '../data/initialData';

import { seedMissingExercises } from '../utils/fixData';
// import { importExercises } from '../utils/importHands';

const AdminSection = ({ id, title, icon, color, children, isOpen, onToggle }) => (
    <div className={`neu-card mb-8 border-t-4 border-${color}-500 transition-all duration-300`}>
        <div
            className="flex justify-between items-center cursor-pointer py-2"
            onClick={() => onToggle(id)}
        >
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 select-none">
                <span className={`text-${color}-500`}>{icon}</span> {title}
            </h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                {isOpen ? <ChevronUp /> : <ChevronDown />}
            </button>
        </div>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
            {children}
        </div>
    </div>
);

export default function AdminPage({ user, onBack }) {
    if (!user || !user.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">אין לך הרשאה לצפות בדף זה</h2>
                <p className="text-gray-500 mb-6">דף זה מיועד למנהלי מערכת בלבד.</p>
                <button onClick={onBack} className="neu-btn primary">
                    חזור לדף הבית
                </button>
            </div>
        );
    }

    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'exercises' | 'muscles'
    const [exercises, setExercises] = useState([]);
    const [muscles, setMuscles] = useState({});
    const [loading, setLoading] = useState(true);

    // Collapsible Sections State
    const [openSections, setOpenSections] = useState({
        userManagement: false,
        dataIngestion: false,
        reports: false,
        maintenance: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Toast State
    const [toast, setToast] = useState({ message: '', type: '', visible: false });

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // User Management State
    const [users, setUsers] = useState([]);
    const [userFilters, setUserFilters] = useState({ firstName: '', lastName: '', phone: '' });

    useEffect(() => {
        // Real-time Users Listener
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
        }, (error) => {
            console.error("Error fetching users:", error);
        });

        return () => unsubscribeUsers();
    }, []);

    // Filter Users Logic
    const filteredUsers = users.filter(u => {
        const fName = userFilters.firstName.trim().toLowerCase();
        const lName = userFilters.lastName.trim().toLowerCase();
        const ph = userFilters.phone.trim().replace(/-/g, '');

        if (!fName && !lName && !ph) return true;

        const matchFirst = fName && (u.firstName || '').toLowerCase().includes(fName);
        const matchLast = lName && (u.lastName || '').toLowerCase().includes(lName);
        const matchPhone = ph && (u.phone || '').replace(/-/g, '').includes(ph);

        return matchFirst || matchLast || matchPhone;
    });

    const handleRoleChange = async (userId, newRole) => {
        console.log(`Updating role for userId: ${userId} to ${newRole}`);
        if (!userId) {
            console.error("Invalid userId for role update");
            showToast('שגיאה: מזהה משתמש חסר', 'error');
            return;
        }
        try {
            await storageService.updateUserRole(userId, newRole);
            showToast(`הרשאה עודכנה ל-${newRole}`, 'success');
        } catch (error) {
            console.error("Role update failed:", error);
            showToast(`שגיאה בעדכון הרשאה: ${error.message}`, 'error');
        }
    };

    const handleDeleteUser = async (user) => {
        const confirmMsg = `האם אתה בטוח שברצונך למחוק את ${user.firstName} ${user.lastName}?`;
        if (window.confirm(confirmMsg)) {
            console.log(`Attempting to delete user: ${user.id}`);
            if (!user.id) {
                console.error("Invalid userId for delete");
                showToast('שגיאה: מזהה משתמש חסר', 'error');
                return;
            }
            try {
                await storageService.deleteUser(user.id);
                showToast('משתמש נמחק בהצלחה', 'success');
            } catch (error) {
                console.error("Delete error details:", error);
                showToast(`שגיאה במחיקת משתמש: ${error.message}`, 'error');
            }
        }
    };

    // Exercise Form State
    const [editingExercise, setEditingExercise] = useState(null); // null = new, object = editing
    const [exForm, setExForm] = useState({ name: '', nameEn: '', mainMuscle: '', subMuscle: '', equipment: '', position: '', trackingType: 'weight', video_url: '', imageUrls: [] });

    // Muscle Form State
    const [editingMuscleKey, setEditingMuscleKey] = useState(null); // null = new, string = editing key
    const [muscleForm, setMuscleForm] = useState({ key: '', label: '', icon: '', subMuscles: [] });
    const [muscleIconFile, setMuscleIconFile] = useState(null);
    const [newSubMuscle, setNewSubMuscle] = useState('');
    const [tempImageUrl, setTempImageUrl] = useState('');

    // Filter State
    const [filterMainMuscle, setFilterMainMuscle] = useState('');
    const [filterSubMuscle, setFilterSubMuscle] = useState('');

    // System Config State
    const [isDevMode, setIsDevMode] = useState(false);

    useEffect(() => {
        loadData();
        loadSystemConfig();
    }, []);

    const loadSystemConfig = async () => {
        try {
            const config = await storageService.getSystemConfig();
            setIsDevMode(config?.devMode || false);
        } catch (error) {
            console.error("Failed to load system config:", error);
        }
    };

    const runSyncFilters = async (silent = false) => {
        try {
            const allExercises = await storageService.getExercises();
            const currentMuscles = await storageService.getMuscles(); // Fetch fresh muscles
            const muscleMap = {};

            // 1. Collect sub-muscles from exercises
            allExercises.forEach(ex => {
                if (!ex.mainMuscle || !ex.subMuscle) return;

                // Normalize main muscle key
                let muscleKey = Object.keys(currentMuscles).find(k => k === ex.mainMuscle || currentMuscles[k].label === ex.mainMuscle);

                if (!muscleKey) {
                    console.warn(`Unknown muscle group: ${ex.mainMuscle}`);
                    return;
                }

                if (!muscleMap[muscleKey]) {
                    muscleMap[muscleKey] = new Set();
                }
                muscleMap[muscleKey].add(ex.subMuscle.trim());
            });

            // 2. Update muscles object
            const updatedMuscles = { ...currentMuscles };
            let updatesCount = 0;

            // First, reset ALL sub-muscles to empty to ensure we don't keep stale data
            Object.keys(updatedMuscles).forEach(key => {
                updatedMuscles[key] = { ...updatedMuscles[key], subMuscles: [] };
            });

            // Now populate with found sub-muscles
            for (const [key, subMuscleSet] of Object.entries(muscleMap)) {
                if (updatedMuscles[key]) {
                    const newSubMuscles = Array.from(subMuscleSet).sort();
                    updatedMuscles[key] = { ...updatedMuscles[key], subMuscles: newSubMuscles };

                    // We always save because we reset everything first, so likely it changed if it had data before
                    // But to be efficient, we could check against original, but let's just save to be safe and consistent.
                    await storageService.saveMuscle(key, updatedMuscles[key]);
                    updatesCount++;
                    console.log(`Updated ${key}:`, newSubMuscles);
                }
            }

            // Save any that were reset to empty but didn't get new ones (cleaned up)
            for (const key of Object.keys(updatedMuscles)) {
                if (!muscleMap[key] && currentMuscles[key]?.subMuscles?.length > 0) {
                    await storageService.saveMuscle(key, updatedMuscles[key]);
                    updatesCount++;
                    console.log(`Cleared ${key}`);
                }
            }

            setMuscles(updatedMuscles);
            if (!silent) {
                alert(`סנכרון הושלם! עודכנו ${updatesCount} קבוצות שרירים.`);
            }
            return updatesCount;
        } catch (error) {
            console.error("Error syncing filters:", error);
            if (!silent) alert("שגיאה בסנכרון המסננים");
            throw error;
        }
    };

    const handleSyncFilters = async () => {
        if (!window.confirm('פעולה זו תסרוק את כל התרגילים ותעדכן את רשימת תתי-השרירים במסננים בהתאם לנתונים הקיימים. להמשיך?')) return;

        setLoading(true);
        try {
            await runSyncFilters();
        } finally {
            setLoading(false);
        }
    };





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
            setExForm({ name: '', nameEn: '', mainMuscle: '', subMuscle: '', equipment: '', position: '', trackingType: 'weight', video_url: '', imageUrls: [] });
        } catch (error) {
            console.error("Failed to save exercise", error);
            alert("שגיאה בשמירת תרגיל");
        } finally {
            setLoading(false);
        }
    };

    const handleEditExercise = (ex) => {
        setEditingExercise(ex);
        setExForm({ name: ex.name, nameEn: ex.nameEn || '', mainMuscle: ex.mainMuscle, subMuscle: ex.subMuscle || '', equipment: ex.equipment || '', position: ex.position || '', trackingType: ex.trackingType || 'weight', video_url: ex.video_url || '', imageUrls: ex.imageUrls || [] });
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

    // --- Actions ---

    const handleExportCSV = () => {
        const csvContent = [
            '\uFEFFID,Hebrew Name,English Name,Main Muscle,Sub Muscle,Equipment,Position,Video URL,Image 1,Image 2,Image 3', // Header
            ...exercises.map(ex => {
                const clean = (str) => `"${(str || '').replace(/"/g, '""')}"`;
                const img1 = ex.imageUrls?.[0] || '';
                const img2 = ex.imageUrls?.[1] || '';
                const img3 = ex.imageUrls?.[2] || '';
                return `${clean(ex.id)},${clean(ex.name)},${clean(ex.nameEn)},${clean(muscles[ex.mainMuscle]?.label || ex.mainMuscle)},${clean(ex.subMuscle)},${clean(ex.equipment)},${clean(ex.position)},${clean(ex.video_url)},${clean(img1)},${clean(img2)},${clean(img3)}`;
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `exercises_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

            // Helper to parse CSV line respecting quotes
            const parseCSVLine = (line) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i + 1] === '"') {
                            current += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const headers = parseCSVLine(lines[0].trim());

            // Dynamic Column Mapping
            const colMap = {};
            headers.forEach((h, index) => {
                const header = h.replace(/^"|"$/g, '').trim(); // Clean quotes
                if (header.includes('התרגיל בעברית') || header === 'Hebrew Name' || header === 'Name') colMap['name'] = index;
                if (header.includes('שם התרגיל באנגלית') || header === 'English Name' || header === 'NameEn') colMap['nameEn'] = index;
                if (header.includes('שריר ראשי') || header === 'Main Muscle') colMap['mainMuscle'] = index;
                if (header.includes('תת שריר') || header === 'Sub Muscle') colMap['subMuscle'] = index;
                if (header.includes('סוג הציוד') || header === 'Equipment') colMap['equipment'] = index;
                if (header.includes('מנח') || header === 'Position') colMap['position'] = index;
                if (header.includes('Video') || header.includes('וידאו')) colMap['video_url'] = index;
                if (header.includes('לינק תמונה 1') || header === 'Image 1') colMap['img1'] = index;
                if (header.includes('לינק תמונה 2') || header === 'Image 2') colMap['img2'] = index;
                if (header.includes('לינק תמונה 3') || header === 'Image 3') colMap['img3'] = index;
            });

            // Fallback for old format (no headers or specific legacy structure)
            // If we didn't find 'name' or 'mainMuscle' via headers, assume legacy position-based
            const useLegacy = !Object.keys(colMap).includes('name') && !Object.keys(colMap).includes('mainMuscle');

            const newExercises = [];
            let skipped = 0;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = parseCSVLine(line);

                let name, nameEn, mainMuscle, subMuscle, workoutType, position = '', video_url = '', img1 = '', img2 = '', img3 = '';

                if (useLegacy) {
                    // Legacy logic (ID, Name, NameEn, Main, Sub, Eq, Video, Img1...)
                    // Assuming standard export order: ID(0), Name(1), NameEn(2), Main(3), Sub(4), Eq(5), Video(6), Img1(7)...
                    if (values.length >= 6) {
                        name = values[1];
                        nameEn = values[2];
                        mainMuscle = values[3];
                        subMuscle = values[4];
                        workoutType = values[5];
                        if (values.length >= 7) video_url = values[6];
                        if (values.length >= 8) img1 = values[7];
                        if (values.length >= 9) img2 = values[8];
                        if (values.length >= 10) img3 = values[9];
                    }
                } else {
                    // Dynamic logic
                    name = colMap['name'] !== undefined ? values[colMap['name']] : '';
                    nameEn = colMap['nameEn'] !== undefined ? values[colMap['nameEn']] : '';
                    mainMuscle = colMap['mainMuscle'] !== undefined ? values[colMap['mainMuscle']] : '';
                    subMuscle = colMap['subMuscle'] !== undefined ? values[colMap['subMuscle']] : '';
                    workoutType = colMap['equipment'] !== undefined ? values[colMap['equipment']] : '';
                    position = colMap['position'] !== undefined ? values[colMap['position']] : '';
                    video_url = colMap['video_url'] !== undefined ? values[colMap['video_url']] : '';
                    img1 = colMap['img1'] !== undefined ? values[colMap['img1']] : '';
                    img2 = colMap['img2'] !== undefined ? values[colMap['img2']] : '';
                    img3 = colMap['img3'] !== undefined ? values[colMap['img3']] : '';
                }

                // Clean values
                const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
                name = clean(name);
                nameEn = clean(nameEn);
                mainMuscle = clean(mainMuscle);
                subMuscle = clean(subMuscle);
                workoutType = clean(workoutType);
                position = clean(position);
                video_url = clean(video_url);
                img1 = clean(img1);
                img2 = clean(img2);
                img3 = clean(img3);

                // Basic validation
                if (!name || !mainMuscle) {
                    skipped++;
                    continue;
                }

                // Reverse lookup for Main Muscle (Label -> Key)
                const muscleEntry = Object.entries(muscles).find(([key, val]) => val.label === mainMuscle || key === mainMuscle);
                if (muscleEntry) mainMuscle = muscleEntry[0];

                // Normalize Equipment
                const typeMapping = {
                    'Machine': 'מכשירים', 'Free Weight': 'משקולות חופשיות', 'Barbell': 'משקולות חופשיות',
                    'Dumbbells': 'משקולות חופשיות', 'Cables': 'כבלים', 'Bodyweight': 'משקל גוף',
                    'מכונה': 'מכשירים', 'משקולות': 'משקולות חופשיות', 'כבל': 'כבלים', 'משקל גוף': 'משקל גוף'
                };
                let finalType = typeMapping[workoutType] || workoutType;
                if (!WORKOUT_TYPES.includes(finalType) && !Object.values(typeMapping).includes(finalType)) finalType = 'משקולות חופשיות';

                // Process Image URLs: If it's a filename, prepend the GitHub repo base URL
                const GITHUB_BASE = 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/';
                const processUrl = (url) => {
                    if (!url) return null;
                    const clean = url.replace(/^"|"$/g, '').trim();
                    if (!clean) return null;
                    if (clean.startsWith('http') || clean.startsWith('data:')) return clean;
                    // It's likely a filename
                    return `${GITHUB_BASE}${clean}`;
                };

                const imageUrls = [img1, img2, img3].map(processUrl).filter(Boolean);

                newExercises.push({
                    name,
                    nameEn,
                    mainMuscle,
                    subMuscle,
                    equipment: finalType,
                    position,
                    video_url,
                    imageUrls
                });
            }

            if (newExercises.length > 0) {
                setLoading(true);
                try {
                    await storageService.saveExercisesBatch(newExercises);
                    const updatedEx = await storageService.getExercises();
                    setExercises(updatedEx);
                    alert(`נוספו בהצלחה ${newExercises.length} תרגילים. (${skipped} נדלגו)\n\nמבצע סנכרון מסננים...`);

                    // Auto-sync filters
                    await runSyncFilters(true);
                    alert('הייבוא והסנכרון הושלמו בהצלחה!');
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
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Toast Notification */}
            {toast.visible && (
                <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <button type="button" onClick={onBack} className="neu-btn text-sm">
                    ← חזרה
                </button>
                <h2 className="text-2xl font-bold text-gray-800">לוח בקרה למנהל</h2>
            </div>

            {/* User Management Card (Collapsible) */}
            <AdminSection
                id="userManagement"
                title="ניהול משתמשים והרשאות"
                icon="👥"
                color="indigo"
                isOpen={openSections.userManagement}
                onToggle={toggleSection}
            >
                {/* Search Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">חיפוש לפי שם פרטי</label>
                        <input
                            type="text"
                            className="neu-input w-full"
                            placeholder="הקלד שם פרטי..."
                            value={userFilters.firstName}
                            onChange={(e) => setUserFilters({ ...userFilters, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">חיפוש לפי שם משפחה</label>
                        <input
                            type="text"
                            className="neu-input w-full"
                            placeholder="הקלד שם משפחה..."
                            value={userFilters.lastName}
                            onChange={(e) => setUserFilters({ ...userFilters, lastName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">חיפוש לפי נייד</label>
                        <input
                            type="text"
                            className="neu-input w-full"
                            placeholder="הקלד מס' טלפון..."
                            value={userFilters.phone}
                            onChange={(e) => setUserFilters({ ...userFilters, phone: e.target.value })}
                            dir="ltr"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto bg-gray-50 rounded-xl border border-gray-100 max-h-[400px] overflow-y-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-bold">שם מלא</th>
                                <th className="p-4 font-bold">טלפון</th>
                                <th className="p-4 font-bold">הרשאה</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-white transition-colors">
                                    <td className="p-4 font-medium text-gray-800">
                                        {u.firstName} {u.lastName}
                                        {u.email && <div className="text-xs text-gray-400 font-normal">{u.email}</div>}
                                    </td>
                                    <td className="p-4 text-gray-600" dir="ltr">{u.phone}</td>
                                    <td className="p-4 flex items-center gap-2">
                                        <select
                                            className={`neu-input py-1 px-2 text-sm ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : (u.role === 'trainer' ? 'bg-teal-50 text-teal-700 border-teal-200' : '')}`}
                                            value={u.role || 'trainee'}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                        >
                                            <option value="trainee">מתאמן</option>
                                            <option value="trainer">מאמן</option>
                                            <option value="admin">מנהל</option>
                                        </select>
                                        <button
                                            onClick={() => handleDeleteUser(u)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="מחק משתמש"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-400 italic">
                                        לא נמצאו משתמשים התואמים לחיפוש.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="text-xs text-gray-400 mt-2 px-2">
                    מוצגים {filteredUsers.length} משתמשים (מתוך {users.length})
                </div>
            </AdminSection>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

                {/* Zone A: Data Ingestion */}
                <AdminSection
                    id="dataIngestion"
                    title="ייבוא והוספת תוכן"
                    icon="📥"
                    color="green"
                    isOpen={openSections.dataIngestion}
                    onToggle={toggleSection}
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <label className="w-full neu-btn bg-white text-gray-700 border-gray-200 hover:bg-gray-100 mb-1 cursor-pointer block text-center">
                                טען קובץ CSV
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <p className="text-xs text-gray-500">ייבוא תרגילים מקובץ חיצוני לפי התבנית.</p>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <button onClick={seedMissingExercises} className="w-full neu-btn bg-white text-gray-700 border-gray-200 hover:bg-gray-100 mb-1">
                                טען תרגילים חסרים
                            </button>
                            <p className="text-xs text-gray-500">משלים תרגילים בסיסיים אם הם חסרים במערכת.</p>
                        </div>
                    </div>
                </AdminSection>

                {/* Zone B: Reports & Export */}
                <AdminSection
                    id="reports"
                    title="דוחות ובקרה (בטוח לשימוש)"
                    icon="📊"
                    color="blue"
                    isOpen={openSections.reports}
                    onToggle={toggleSection}
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <button onClick={handleSyncFilters} className="neu-btn text-sm bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
                                🔄 סנכרן מסננים
                            </button>
                            <button onClick={handleExportCSV} className="w-full neu-btn bg-white text-blue-700 border-blue-200 hover:bg-blue-100 mb-1 mt-1">
                                הורד דוח תרגילים (CSV)
                            </button>
                            <p className="text-xs text-gray-500">מוריד קובץ אקסל המכיל את כל התרגילים במערכת, כולל בדיקה האם יש להם תמונה.</p>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <a href="/exercises_template_v3.csv" download className="w-full neu-btn bg-white text-gray-700 border-gray-200 hover:bg-gray-100 mb-1 block text-center">
                                הורד תבנית CSV
                            </a>
                            <p className="text-xs text-gray-500">תבנית ריקה לייבוא תרגילים חדשים.</p>
                        </div>
                    </div>
                </AdminSection>

                {/* Zone C: Maintenance & Danger Zone */}
                <AdminSection
                    id="maintenance"
                    title="תחזוקת מערכת (זהירות!)"
                    icon="⚠️"
                    color="red"
                    isOpen={openSections.maintenance}
                    onToggle={toggleSection}
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <button onClick={handleRestoreDefaults} className="w-full neu-btn bg-white text-orange-700 border-orange-200 hover:bg-orange-100 mb-1">
                                שחזר שרירי ברירת מחדל
                            </button>
                            <p className="text-xs text-gray-500">מאפס את הגדרות השרירים (אייקונים ושמות) לברירת המחדל. לא מוחק תרגילים.</p>
                            <p className="text-xs text-gray-500">מריץ סקריפט לתיקון שמות שרירים מאנגלית לעברית. להפעיל רק אם תרגילים נעלמו.</p>
                        </div>

                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                            <button
                                onClick={async () => {
                                    if (window.confirm('האם אתה בטוח? פעולה זו תמחק את כל התרגילים!')) {
                                        setLoading(true);
                                        await storageService.deleteAllExercises();
                                        setExercises([]);
                                        setLoading(false);
                                        alert('נמחק בהצלחה');
                                    }
                                }}
                                className="w-full neu-btn bg-white text-red-700 border-red-200 hover:bg-red-100 mb-1"
                            >
                                מחק כל התרגילים
                            </button>
                            <p className="text-xs text-gray-500">פעולה בלתי הפיכה. מוחק את כל התרגילים ממסד הנתונים.</p>
                        </div>

                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <button
                                onClick={async () => {
                                    const newMode = !isDevMode;
                                    setLoading(true);
                                    try {
                                        await storageService.saveSystemConfig({ devMode: newMode });
                                        setIsDevMode(newMode);
                                        alert(newMode ? 'מצב פיתוח הופעל! הכניסה הבאה תהיה אוטומטית לכולם.' : 'מצב פיתוח בוטל.');
                                    } catch (error) {
                                        console.error("Failed to toggle dev mode:", error);
                                        alert("שגיאה בשינוי מצב פיתוח");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="w-full neu-btn bg-white text-purple-700 border-purple-200 hover:bg-purple-100 mb-1"
                            >
                                {isDevMode ? 'בטל מצב פיתוח (Auto Login)' : 'הפעל מצב פיתוח (Auto Login)'}
                            </button>
                            <p className="text-xs text-gray-500">מאפשר כניסה אוטומטית ללא מסך לוג-אין (גלובלי).</p>
                        </div>
                    </div>
                </AdminSection>
            </div>

            {/* Legacy Management Section (Collapsible or below) */}
            <div className="neu-card">
                <h3 className="text-xl font-bold text-gray-800 mb-6">ניהול שוטף</h3>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('exercises')}
                        className={`neu-btn flex-1 ${activeTab === 'exercises' || activeTab === 'dashboard' ? 'primary' : ''}`}
                    >
                        רשימת תרגילים
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('muscles')}
                        className={`neu-btn flex-1 ${activeTab === 'muscles' ? 'primary' : ''}`}
                    >
                        ניהול שרירים
                    </button>
                </div>

                {/* Content based on tab - simplified for this view, keeping existing logic if user clicks tabs */}
                {/* For brevity, I'm keeping the list view here but hiding the complex forms unless needed, or just showing the list. */}
                {/* Let's show the list as it's useful. */}

                {activeTab === 'exercises' || activeTab === 'dashboard' ? (
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
                                <input
                                    className="neu-input"
                                    placeholder="שם התרגיל באנגלית (אופציונלי)"
                                    value={exForm.nameEn}
                                    onChange={e => setExForm({ ...exForm, nameEn: e.target.value })}
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
                                    placeholder="מנח (למשל: עמידה, ישיבה, שכיבה)"
                                    value={exForm.position}
                                    onChange={e => setExForm({ ...exForm, position: e.target.value })}
                                />
                                <select
                                    className="neu-input"
                                    value={exForm.trackingType || 'weight'}
                                    onChange={e => setExForm({ ...exForm, trackingType: e.target.value })}
                                >
                                    <option value="weight">משקל (ק״ג)</option>
                                    <option value="time">זמן (שניות)</option>
                                </select>
                                <input
                                    className="neu-input"
                                    placeholder="קישור לוידאו (YouTube)"
                                    value={exForm.video_url}
                                    onChange={e => setExForm({ ...exForm, video_url: e.target.value })}
                                />

                                {/* Image Upload Section */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">תמונות (אופציונלי):</label>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <label className="neu-btn text-xs cursor-pointer bg-white border border-gray-200 hover:bg-gray-50">
                                            📷 העלה קבצים
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const files = Array.from(e.target.files);
                                                    if (files.length === 0) return;

                                                    setLoading(true);
                                                    try {
                                                        const newUrls = [];
                                                        for (const file of files) {
                                                            const storageRef = ref(storage, `exercises/${file.name}_${Date.now()}`);
                                                            await uploadBytes(storageRef, file);
                                                            const url = await getDownloadURL(storageRef);
                                                            newUrls.push(url);
                                                        }
                                                        setExForm(prev => ({
                                                            ...prev,
                                                            imageUrls: [...(prev.imageUrls || []), ...newUrls]
                                                        }));
                                                    } catch (error) {
                                                        console.error("Failed to upload images", error);
                                                        alert("שגיאה בהעלאת תמונות");
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                            />
                                        </label>

                                        {/* Manual URL Input */}
                                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                            <input
                                                className="neu-input text-xs py-1"
                                                placeholder="או הדבק לינק לתמונה (GitHub וכו')"
                                                value={tempImageUrl}
                                                onChange={e => setTempImageUrl(e.target.value)}
                                                onKeyPress={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (tempImageUrl) {
                                                            setExForm(prev => ({
                                                                ...prev,
                                                                imageUrls: [...(prev.imageUrls || []), tempImageUrl]
                                                            }));
                                                            setTempImageUrl('');
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (tempImageUrl) {
                                                        setExForm(prev => ({
                                                            ...prev,
                                                            imageUrls: [...(prev.imageUrls || []), tempImageUrl]
                                                        }));
                                                        setTempImageUrl('');
                                                    }
                                                }}
                                                className="neu-btn text-xs px-3 py-1"
                                                disabled={!tempImageUrl}
                                            >
                                                הוסף
                                            </button>
                                        </div>
                                    </div>

                                    {/* Image Preview List */}
                                    {exForm.imageUrls && exForm.imageUrls.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {exForm.imageUrls.map((url, idx) => (
                                                <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setExForm(prev => ({
                                                            ...prev,
                                                            imageUrls: prev.imageUrls.filter((_, i) => i !== idx)
                                                        }))}
                                                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button type="button" onClick={handleSaveExercise} className="neu-btn primary flex-1">
                                        {editingExercise ? 'שמור שינויים' : 'הוסף תרגיל'}
                                    </button>
                                    {editingExercise && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingExercise(null); setExForm({ name: '', nameEn: '', mainMuscle: '', subMuscle: '', equipment: '', video_url: '', imageUrls: [] }); }}
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
        </div>
    );
}
