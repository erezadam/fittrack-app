import React, { useState } from 'react';

export default function ImageGalleryModal({ isOpen, onClose, images = [], title }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!isOpen) return null;

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-brand-card rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden relative flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-brand-card z-10">
                    <h3 className="font-bold text-brand-text text-lg">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {images.length > 0 ? (
                        <>
                            <img
                                src={images[currentIndex]}
                                alt={`${title} ${currentIndex + 1}`}
                                className="max-w-full max-h-[70vh] object-contain"
                            />

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 backdrop-blur-md transition-all"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 backdrop-blur-md transition-all"
                                    >
                                        ›
                                    </button>

                                    {/* Dots */}
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                                        {images.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-125' : 'bg-white/40'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="text-white/50">אין תמונות להצגה</div>
                    )}
                </div>
            </div>
        </div>
    );
}
