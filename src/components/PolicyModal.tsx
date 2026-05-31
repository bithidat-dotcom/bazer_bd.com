import { ShieldCheck, Info, X, Clock, Database, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PolicyModal({ isOpen, onClose }: PolicyModalProps) {
  const policies = [
    {
      icon: Database,
      title: "Data Persistence Guarantee",
      text: "All customer data, orders, and registrations are stored in a secure, permanent Firestore database. We commit to zero data deletion policies for active accounts."
    },
    {
      icon: Globe,
      title: "Lifetime Service Promise",
      text: "This platform is built for longevity. We guarantee that the service will remain accessible and operational without arbitrary shutdowns or project terminations."
    },
    {
      icon: Clock,
      title: "Real-time Integrity",
      text: "Our systems utilize real-time synchronization to ensure that inventory, status updates, and support messages are never lost or delayed."
    },
    {
      icon: ShieldCheck,
      title: "Security & Privacy",
      text: "We implement advanced encryption and security rules to protect your personal information. Your data will never be sold or shared with third parties."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full h-[90vh] sm:h-auto sm:max-w-2xl bg-white sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-950 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-8">
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                   <X size={24} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                   <ShieldCheck size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">System Policy</h2>
              </div>
              <p className="text-slate-400 text-sm font-medium">Official Service Guarantees & Persistence Commitments</p>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {policies.map((p, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-900">
                       <p.icon size={20} />
                    </div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-xs">{p.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{p.text}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-6 rounded-3xl bg-orange-50 border border-orange-100 flex items-start gap-4">
                 <Info className="text-orange-600 shrink-0 mt-0.5" size={20} />
                 <div>
                    <h4 className="text-xs font-black text-orange-900 uppercase mb-1">Persistence Notice</h4>
                    <p className="text-[11px] text-orange-800 leading-relaxed font-semibold">
                       This project is configured with redundant cloud backups and strict security rules that prohibit unauthorized deletion of core system data. We are committed to maintaining this shop's availability 24/7.
                    </p>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button 
                 onClick={onClose}
                 className="px-8 py-3 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
               >
                 I Understand
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
