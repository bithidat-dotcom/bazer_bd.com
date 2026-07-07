import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { X, LogOut, User, Phone, Calendar, FileText } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const userDocRef = doc(db, 'register_people', whatsapp);
      const userDoc = await getDoc(userDocRef);
      
      if (isRegister) {
          if (userDoc.exists()) {
              setError("User already exists with this WhatsApp number");
              return;
          }
          const userData = {
            whatsapp,
            password,
            username: username || whatsapp,
            profileImage: '',
            location: '',
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, userData);
          onAuthSuccess(userData);
          onClose();
      } else {
          if (!userDoc.exists()) {
              setError("User not found");
              return;
          }
          const userData = userDoc.data();
          if (userData.password !== password) {
              setError("Incorrect password");
              return;
          }
          onAuthSuccess(userData);
          onClose();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative border border-slate-100 overflow-hidden">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
        >
          <X size={20} />
        </button>

        {user ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
                <User size={32} className="text-slate-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Your Profile</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer Account</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">WhatsApp</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{user.whatsapp}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Member Since</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                onClose();
                onOpenPolicy && onOpenPolicy();
              }}
              className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-700 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-slate-100 flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              Policies & Terms
            </button>

            <button 
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-4 bg-red-50 text-red-600 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-red-100 flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Logout from Account
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">
                {isRegister ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {isRegister ? 'Join the pbazar community' : 'Login to your account'}
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
                      className="w-full p-4 pl-12 rounded-2xl border border-slate-200 focus:border-slate-900 focus:ring-0 transition-colors font-bold text-sm" 
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="01XXXXXXXXX" 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)} 
                    className="w-full p-4 pl-12 rounded-2xl border border-slate-200 focus:border-slate-900 focus:ring-0 transition-colors font-bold text-sm" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:border-slate-900 focus:ring-0 transition-colors font-bold tracking-widest text-sm" 
                  required 
                />
              </div>

              {error && (
                <p className="text-red-500 text-[10px] font-black uppercase tracking-tight text-center bg-red-50 py-2 rounded-lg border border-red-100">
                  {error}
                </p>
              )}

              <button 
                type="submit" 
                className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-black transition-all transform active:scale-95"
              >
                {isRegister ? 'Register Now' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <button 
                onClick={() => setIsRegister(!isRegister)} 
                className="text-xs text-orange-600 font-black uppercase tracking-widest hover:text-orange-700 transition-colors"
              >
                {isRegister ? 'Already have an account? Login' : 'Need an account? Register Here'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
