import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

export default function AdminPage({ onBack }) {
    const [exercises, setExercises] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const data = storageService.getExercises();
        setExercises(data);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this exercise?')) {
            const updated = exercises.filter(ex => ex.id !== id);
            storageService.saveExercises(updated);
            setExercises(updated);
        }
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exercises, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "fittrack_exercises.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    storageService.saveExercises(importedData);
                    setExercises(importedData);
                    alert('Database updated successfully!');
                } else {
                    alert('Invalid JSON format. Expected an array.');
                }
            } catch (error) {
                alert('Error parsing JSON file.');
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if (window.confirm('Reset to default 30 exercises? This cannot be undone.')) {
            const defaults = storageService.resetData();
            setExercises(defaults);
        }
    };



    return (
        <div className="container">
            <div className="flex-between" style={{ marginBottom: '20px' }}>
                <button onClick={onBack} className="neu-btn">← Back</button>
                <h2 className="title" style={{ margin: 0, fontSize: '1.5rem' }}>Admin Dashboard</h2>
            </div>

            <div className="neu-card" style={{ marginBottom: '24px' }}>
                <h3>Data Management</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>

                    <button onClick={handleExport} className="neu-btn primary">⬇ Export JSON</button>
                    <label className="neu-btn primary" style={{ cursor: 'pointer' }}>
                        ⬆ Import JSON
                        <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                    </label>
                    <button onClick={handleReset} className="neu-btn danger">↻ Reset Defaults</button>
                </div>
            </div>

            <div className="neu-card">
                <h3>Current Exercises ({exercises.length})</h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {exercises.map(ex => (
                        <div key={ex.id} className="neu-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div>
                                <strong>{ex.name}</strong>
                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{ex.mainMuscle} • {ex.equipment}</div>
                            </div>
                            <button onClick={() => handleDelete(ex.id)} className="neu-btn danger" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>Delete</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
