import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { X, LogOut, User, Phone, Lock, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  onLogout: () => void;
  user: any;
  onOpenPolicy?: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, onLogout, user, onOpenPolicy }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use 'users' collection consistently
      const userDocRef = doc(db, 'users', whatsapp);
      const userDoc = await getDoc(userDocRef);
      
      if (isRegister) {
          if (userDoc.exists() && userDoc.data()?.password) {
              setError("User already exists with this number");
              setLoading(false);
              return;
          }
          const userData = {
            whatsapp,
            password,
            username: username || whatsapp,
            profile_image_url: '',
            address: '',
            points: 0,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, userData, { merge: true });
          onAuthSuccess(userData);
          localStorage.setItem('customer_phone', whatsapp);
          onClose();
      } else {
          if (!userDoc.exists() || !userDoc.data()?.password) {
              setError("User not found or no password set");
              setLoading(false);
              return;
          }
          const userData = userDoc.data();
          if (userData?.password !== password) {
              setError("Incorrect password");
              setLoading(false);
              return;
          }
          onAuthSuccess(userData);
          localStorage.setItem('customer_phone', whatsapp);
          onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative border border-slate-100 overflow-hidden">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 z-10"
        >
          <X size={20} />
        </button>

        {user ? (
          <div className="space-y-6 text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto border-2 border-white shadow-xl overflow-hidden">
              {user.profile_image_url || user.profileImage ? (
                <img src={user.profile_image_url || user.profileImage} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <User size={40} className="text-blue-500" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Hello, {user.username}!</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Premium Customer</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full py-4 bg-rose-50 text-rose-600 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-rose-100 flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-8 text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
                <Sparkles size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">
                {isRegister ? 'Join Pbazar' : 'Welcome Back'}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {isRegister ? 'Create your gourmet account' : 'Sign in to your account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-600 focus:ring-0 transition-all font-bold text-sm outline-none" 
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone / WhatsApp</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="01XXXXXXXXX" 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)} 
                    className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-600 focus:ring-0 transition-all font-bold text-sm outline-none" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-600 focus:ring-0 transition-all font-bold tracking-widest text-sm outline-none" 
                    required 
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-tight text-center animate-shake">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isRegister ? 'Register Now' : 'Sign In')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => setIsRegister(!isRegister)} 
                className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                {isRegister ? 'Already have an account? Sign In' : 'New here? Create an Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
