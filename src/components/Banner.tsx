import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Banner as BannerType } from '../types';
import DotLoader from './DotLoader';

export default function HeroBanner({ banners }: { banners: BannerType[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const imgRef = React.useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    // When index changes, ensure it starts as not loaded
    setLoadingStates(prev => ({...prev, [currentIndex]: false}));

    // If already complete, set to loaded
    if (imgRef.current && imgRef.current.complete) {
      setLoadingStates(prev => ({...prev, [currentIndex]: true}));
    }
  }, [currentIndex]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <div className="w-full h-40 sm:h-64 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-medium">
        Loading latest offers...
      </div>
    );
  }

  const currentBanner = banners[currentIndex] || banners[0];
  if (!currentBanner) return null;

  return (
    <div className="relative w-full aspect-[3/2] sm:aspect-[21/9] lg:aspect-[3/1] overflow-hidden rounded-3xl group">
      <AnimatePresence mode="wait">
        <motion.div
           key={currentIndex}
           initial={{ x: '100%' }}
           animate={{ x: 0 }}
           exit={{ x: '-100%' }}
           transition={{ type: 'spring', stiffness: 100, damping: 20 }}
           className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          {/* Main image - fully visible and centered */}
          {!loadingStates[currentIndex] && (
            <DotLoader />
          )}

          <img 
            ref={imgRef}
            src={currentBanner.image} 
            alt={currentBanner.title || "Promo Banner"}
            onLoad={() => setLoadingStates(prev => ({...prev, [currentIndex]: true}))}
            className={`relative z-10 w-full h-full object-contain transition-opacity duration-500 ${loadingStates[currentIndex] ? 'opacity-100' : 'opacity-0'}`}
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Text overlay removed as requested */}

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-30 flex gap-2 justify-center pointer-events-none">
          {banners.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'bg-slate-800 w-6' 
                  : 'bg-slate-300 w-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
