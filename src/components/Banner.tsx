import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Banner as BannerType } from '../types';

export default function HeroBanner({ banners }: { banners: BannerType[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
    <div className="relative w-full aspect-[2/1] sm:aspect-[21/9] lg:aspect-[3/1] overflow-hidden rounded-2xl group shadow-sm border border-slate-200 bg-slate-50">
      <AnimatePresence mode="wait">
        <motion.div
           key={currentIndex}
           initial={{ opacity: 0, scale: 1.02 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 1 }}
           className="absolute inset-0 flex items-center justify-center bg-slate-100"
        >
          <img 
            src={currentBanner.image} 
            alt={currentBanner.title || "Promo Banner"}
            className="w-full h-full object-cover"
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
