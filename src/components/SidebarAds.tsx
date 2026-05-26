import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Video, 
  Image as ImageIcon,
  Check,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export interface SidebarAdItem {
  id: string;
  type: 'image' | 'video';
  mediaUrl: string;
  tag?: string;
  tagColor?: string; // e.g. bg-orange-500, bg-teal-500, bg-blue-500
  title: string;
  description: string;
  linkUrl?: string;
}

interface SidebarAdsProps {
  ads: SidebarAdItem[];
  setAds: (ads: SidebarAdItem[]) => void;
  isAdmin: boolean;
}

export default function SidebarAds({ ads, setAds, isAdmin }: SidebarAdsProps) {
  const [showManager, setShowManager] = useState(false);
  const [isMutedMap, setIsMutedMap] = useState<Record<string, boolean>>({});
  
  // New Ad form state
  const [adType, setAdType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [tag, setTag] = useState('');
  const [tagColor, setTagColor] = useState('bg-orange-500');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Auto display manager if admin enters with no ads
  useEffect(() => {
    if (isAdmin && ads.length === 0) {
      setShowManager(true);
    }
  }, [isAdmin, ads.length]);

  const saveAds = (updatedAds: SidebarAdItem[]) => {
    setAds(updatedAds);
    localStorage.setItem('bazar_sidebar_ads', JSON.stringify(updatedAds));
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear ads?')) {
      saveAds([]);
    }
  };

  const handleDelete = (id: string) => {
    const updated = ads.filter(ad => ad.id !== id);
    saveAds(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Delete all active ads?')) {
      saveAds([]);
    }
  };

  const handleAddAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl || !title || !description) {
      window.alert('Please fill out Media URL, Title, and Description.');
      return;
    }

    const newAd: SidebarAdItem = {
      id: `ad-${Date.now()}`,
      type: adType,
      mediaUrl,
      tag: tag || undefined,
      tagColor,
      title,
      description
    };

    const updated = [...ads, newAd];
    saveAds(updated);

    // Reset form
    setMediaUrl('');
    setTag('');
    setTitle('');
    setDescription('');
    setTagColor('bg-orange-500');
  };

  const toggleMute = (id: string) => {
    setIsMutedMap(prev => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header with Settings Access - Only rendered for Administrators */}
      <div className="flex items-center justify-between border-b pb-2 border-slate-100 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-mono">Sponsored</span>
          {ads.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowManager(!showManager)}
            className="text-orange-600 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-orange-50 hover:bg-orange-500 px-2.5 py-1 rounded-md border border-orange-200/60 shadow-sm cursor-pointer select-none"
            title="Manage Ads System"
          >
            <Settings size={10} className={showManager ? "rotate-45 transition-transform" : "transition-transform"} />
            Admin Panel
          </button>
        )}
      </div>

      {/* Ads Container list or Admin Empty state */}
      <div className="flex flex-col gap-5">
        <AnimatePresence mode="popLayout">
          {ads.length > 0 ? (
            ads.map((ad) => {
              const muted = isMutedMap[ad.id] ?? true;
              return (
                <motion.div
                  key={ad.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative group overflow-hidden rounded-2xl bg-slate-950 aspect-[3/4] flex flex-col justify-end p-4 border border-slate-200/50 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                >
                  {ad.type === 'video' ? (
                    <div className="absolute inset-0 w-full h-full">
                      <video
                        src={ad.mediaUrl}
                        autoPlay
                        loop
                        muted={muted}
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:scale-105 transition-transform duration-500"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleMute(ad.id);
                        }}
                        className="absolute top-3 right-3 z-30 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full p-1.5 text-white shadow transition-all active:scale-95"
                        title={muted ? "Unmute Sidebar Ad" : "Mute Sidebar Ad"}
                      >
                        {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      </button>
                    </div>
                  ) : (
                    <img 
                      src={ad.mediaUrl} 
                      alt={ad.title} 
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  {/* Bottom Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 pointer-events-none"></div>
                  
                  <div className="relative z-20 text-white">
                    {ad.tag && (
                      <span className={`text-[8px] font-black ${ad.tagColor || 'bg-orange-500'} text-white px-2 py-0.5 rounded tracking-widest uppercase mb-1.5 inline-block z-10`}>
                        {ad.tag}
                      </span>
                    )}
                    <h4 className="font-bold text-xs font-display text-white mb-0.5 group-hover:text-orange-400 transition-colors">
                      {ad.title}
                    </h4>
                    <p className="text-[9px] text-slate-300 leading-normal font-sans">
                      {ad.description}
                    </p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            /* Empty state ONLY shown if Admin needs guidance. Unprivileged users won't see this because outer layout hides the sidebar */
            isAdmin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-white border border-dashed border-slate-200 rounded-3xl py-12 px-4 flex flex-col items-center justify-center text-center shadow-sm aspect-[3/5] relative min-h-[350px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white to-slate-50/20 rounded-3xl -z-10" />
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-300 mb-4 animate-pulse">
                  <Sparkles size={20} />
                </div>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest font-mono">
                  Ad Area Deployed
                </p>
                <p className="text-slate-400 text-[9px] mt-2 max-w-[150px] leading-relaxed mx-auto">
                  Pruned and empty for guests. Click "Admin Panel" above to register custom ads.
                </p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Ads Manager Panel/Drawer inside the layout - Admin access only */}
      <AnimatePresence>
        {isAdmin && showManager && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-5 border border-slate-200 p-4 flex flex-col gap-4 mt-2 rounded-2xl"
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">⚙️ Ads Manager</span>
              <button 
                onClick={() => setShowManager(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Close
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 justify-between">
              <button
                onClick={handleReset}
                type="button"
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 justify-center flex-1 transition-all cursor-pointer"
              >
                <RotateCcw size={10} />
                Clear All
              </button>
            </div>

            {/* Existing Ads List inside manager */}
            {ads.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Active Ad Spots:</span>
                {ads.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-slate-400 font-semibold md:font-bold">#{index + 1}</span>
                      {item.type === 'video' ? <Video size={10} className="text-slate-500" /> : <ImageIcon size={10} className="text-slate-500" />}
                      <span className="font-bold text-slate-700 truncate max-w-[120px]">{item.title}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-55"
                      title="Delete this Spot"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Custom Ad Form */}
            <form onSubmit={handleAddAd} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b pb-1">Create Ad Placement</span>
              
              {/* Type selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdType('image');
                    setMediaUrl('');
                  }}
                  className={`flex-1 py-1 rounded text-[9px] font-bold uppercase tracking-wider border flex items-center justify-center gap-1 cursor-pointer ${
                    adType === 'image' 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ImageIcon size={10} />
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdType('video');
                    setMediaUrl('https://assets.mixkit.co/videos/preview/mixkit-online-shopping-on-a-smartphone-37651-large.mp4');
                  }}
                  className={`flex-1 py-1 rounded text-[9px] font-bold uppercase tracking-wider border flex items-center justify-center gap-1 cursor-pointer ${
                    adType === 'video' 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Video size={10} />
                  Video Ad
                </button>
              </div>

              {/* Tag Selection */}
              <div className="flex gap-1 items-center">
                <input
                  type="text"
                  placeholder="Tag (e.g. Premium Selection)"
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[10px] rounded p-1.5 flex-1 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
                <select
                  value={tagColor}
                  onChange={e => setTagColor(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[9px] rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                >
                  <option value="bg-orange-500">Orange</option>
                  <option value="bg-teal-500">Teal</option>
                  <option value="bg-indigo-600">Indigo</option>
                  <option value="bg-blue-500">Blue</option>
                </select>
              </div>

              {/* Title and Description */}
              <input
                type="text"
                placeholder="Ad Spot Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[10px] rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                required
              />

              <input
                type="text"
                placeholder="Description / Promo text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[10px] rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
                required
              />

              {/* Media URL */}
              <input
                type="url"
                placeholder={adType === 'video' ? "Video MP4 URL (direct file)" : "Image Unsplash/Web URL"}
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-[10px] rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400 font-mono text-[9px]"
                required
              />

              <button
                type="submit"
                className="w-full bg-slate-900 text-white rounded-md py-1.5 text-[10px] font-bold hover:bg-slate-800 transition-colors uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={11} />
                Publish Ad
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
