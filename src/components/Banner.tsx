import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Banner as BannerType } from '../types';

export default function HeroBanner({ banners }: { banners: BannerType[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <div className="w-full h-40 sm:h-64 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-medium">
        Loading latest offers...
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[3/1] overflow-hidden rounded-2xl group shadow-sm border border-slate-200 bg-slate-50">
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
            src={banners[currentIndex].image} 
            alt={banners[currentIndex].title || "Promo Banner"}
            className="w-full h-full object-contain sm:object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 z-20 flex flex-col justify-end sm:justify-center p-4 sm:p-12 pointer-events-none">
        <AnimatePresence mode="wait">
          {banners[currentIndex].title && (
            <motion.div 
              key={currentIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white/80 backdrop-blur-md rounded-2xl p-5 sm:p-8 max-w-sm sm:max-w-md shadow-xl border border-white/50 pointer-events-auto"
            >
              <h1 className="text-xl sm:text-4xl font-display font-bold leading-tight mb-2 sm:mb-4 text-slate-900">
                {banners[currentIndex].title}
              </h1>
              <button
                className="w-max px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm shadow-md"
              >
                Explore Now
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
