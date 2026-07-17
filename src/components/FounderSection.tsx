import React from 'react';
import { motion } from 'motion/react';
import { Facebook, Instagram, Code2, Award, ExternalLink } from 'lucide-react';

export const FounderSection: React.FC = () => {
  return (
    <section className="px-4 md:px-8 py-16 mb-20">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/50 shadow-2xl shadow-slate-200/50 p-8 md:p-12"
        >
          {/* Background Accents */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Founder Image */}
            <div className="relative shrink-0">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-40 h-40 md:w-56 md:h-56 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white relative z-10"
              >
                <img 
                  src="https://res.cloudinary.com/df7jfonrv/image/upload/f_auto,q_auto/WhatsApp_Image_2026-04-18_at_10.46.42_PM_atc2qo" 
                  alt="Prangon Datta" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
              {/* Badge */}
              <div className="absolute -bottom-4 -right-4 z-20 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2">
                <Award className="text-orange-500" size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Founder</span>
              </div>
            </div>

            {/* Founder Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Code2 className="text-orange-500" size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Class 9 Programmer</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Prangon Datta</h2>
              <p className="text-slate-500 text-sm md:text-lg leading-relaxed mb-8">
                The visionary behind pbazar. As a Class 9 student and passionate programmer, Prangon is dedicated to redefining the digital shopping experience through cutting-edge technology and user-centric design.
              </p>

              {/* Social Links */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a 
                  href="https://www.facebook.com/profile.php?id=61588813119080" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold"
                >
                  <Facebook size={18} />
                  Facebook
                  <ExternalLink size={14} className="opacity-50" />
                </a>
                <a 
                  href="https://www.instagram.com/prangon_45/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold"
                >
                  <Instagram size={18} />
                  Instagram
                  <ExternalLink size={14} className="opacity-50" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
