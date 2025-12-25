import React from 'react';

export default function VideoModal({ isOpen, onClose, videoUrl, title }) {
    if (!isOpen || !videoUrl) return null;

    // Helper to get embed URL
    const getEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        try {
            // Handle standard youtube.com/watch?v=XYZ
            if (url.includes('youtube.com/watch')) {
                const videoId = new URLSearchParams(new URL(url).search).get('v');
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            }
            // Handle youtu.be/XYZ
            if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1].split('?')[0];
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            }
            // Handle already embedded or other links (best effort)
            return url;
        } catch (e) {
            return url;
        }
    };

    const embedUrl = getEmbedUrl(videoUrl);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                width: '100%',
                maxWidth: '800px',
                background: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#1a202c',
                    color: 'white'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title || 'Instructional Video'}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0 8px'
                        }}
                    >
                        &times;
                    </button>
                </div>

                {/* Video Container (Aspect Ratio 16:9) */}
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                        src={embedUrl}
                        title={title}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none'
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    );
}
