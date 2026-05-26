import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { Banner as BannerType } from '../types';
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_BANNERS: BannerType[] = [
  {
    id: "demo-v1",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&auto=format&fit=crop&q=80",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-online-shopping-on-a-smartphone-37651-large.mp4",
    title: "Exclusive Video Offer: Up to 50% Choice Products!",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-v2",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80",
    title: "Explore the New Arrivals of This Season",
    created_at: new Date().toISOString()
  },
  {
    id: "demo-v3",
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&auto=format&fit=crop&q=80",
    video_url: "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b5e20ee2ee4bc09ed6d3df600&profile_id=139&oauth2_token_id=57447761",
    title: "Premium Tech Gadgets & Lifestyle Accessories",
    created_at: new Date().toISOString()
  }
];

export default function HeroBanner({ banners: propBanners }: { banners: BannerType[] }) {
  const banners = propBanners && propBanners.length > 0 ? propBanners : DEFAULT_BANNERS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeBanner = banners[currentIndex];
  // Determine if it has video
  const hasVideo = !!activeBanner?.video_url || activeBanner?.image?.endsWith('.mp4') || activeBanner?.image?.endsWith('.webm');
  const videoSrc = activeBanner?.video_url || activeBanner?.image;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (banners.length <= 1) return;

    // If current banner has a video, disable auto transition timer.
    // Transition will happen when the video ends via onEnded callback.
    if (hasVideo) {
      return; 
    }

    // Static slide auto-advance timer set to a longer delay (12 seconds)
    const timer = setInterval(() => {
      nextSlide();
    }, 12000);

    return () => clearInterval(timer);
  }, [currentIndex, banners.length, hasVideo]);

  // Handle video autoplay state resetting
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(err => {
        console.log("Autoplay context loading was restricted by user activity settings:", err);
      });
    }
  }, [currentIndex]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  if (banners.length === 0) {
    return (
      <div className="w-full h-40 sm:h-64 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-medium">
        Loading latest offers...
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[3/1] overflow-hidden rounded-2xl group shadow-sm border border-white bg-white">
      <AnimatePresence mode="wait">
        <motion.div
           key={currentIndex}
           initial={{ opacity: 0, scale: 1.01 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 1 }}
           className="absolute inset-0 flex items-center justify-center"
        >
          {hasVideo ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                src={videoSrc}
                autoPlay
                muted={isMuted}
                playsInline
                onEnded={nextSlide}
                className="w-full h-full object-cover select-none"
              />
              <button
                onClick={toggleMute}
                className="absolute right-4 bottom-14 z-40 bg-black/60 hover:bg-black/85 backdrop-blur text-white px-3 py-2 rounded-full border border-white/20 shadow-md transition-all active:scale-95 flex items-center gap-1.5 pointer-events-auto"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                  {isMuted ? "Sound Off" : "Sound On"}
                </span>
              </button>
            </div>
          ) : (
            <img 
              src={activeBanner.image} 
              alt={activeBanner.title || "Promo Banner"}
              className="w-full h-full object-contain sm:object-cover select-none pointer-events-none"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Manual slide controllers */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/30 hover:bg-black/60 border border-white/10 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 pointer-events-auto shadow"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/30 hover:bg-black/60 border border-white/10 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 pointer-events-auto shadow"
            aria-label="Next Slide"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <div className="absolute inset-0 z-20 flex flex-col justify-end sm:justify-center p-4 sm:p-12 pointer-events-none">
        <AnimatePresence mode="wait">
          {activeBanner.title && (
            <motion.div 
              key={currentIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white/80 backdrop-blur-md rounded-2xl p-5 sm:p-8 max-w-sm sm:max-w-md shadow-xl border border-white/50 pointer-events-auto"
            >
              <h1 className="text-xl sm:text-4xl font-display font-bold leading-tight mb-2 sm:mb-4 text-slate-900">
                {activeBanner.title}
              </h1>
              {hasVideo && (
                <div className="flex items-center gap-1.5 text-[10px] text-orange-600 font-bold uppercase tracking-wider mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping" />
                  Playing Video Offer
                </div>
              )}
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
            <button 
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 pointer-events-auto ${
                idx === currentIndex 
                  ? 'bg-orange-500 w-8' 
                  : 'bg-white/50 w-2 hover:bg-white/80'
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
