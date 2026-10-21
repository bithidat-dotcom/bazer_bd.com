import React, { useState, useEffect } from 'react';
import { X, LogOut, User, Phone, MapPin, Camera, Sparkles, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { Storage } from '../lib/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  onLogout: () => void;
  user: any;
  onOpenPolicy?: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, onLogout, user }: AuthModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Sync state with current user if logged in
  useEffect(() => {
    if (user) {
      setName(user.name || user.username || '');
      setPhone(user.whatsapp_number || user.phone || user.whatsapp || '');
      setLocation(user.location || user.address || '');
      const userImg = user.image || user.profile_image_url || user.profileImage || '';
      setImage(userImg);
      setImagePreview(userImg);
    } else {
      // Check if session exists in localStorage
      try {
        const rawSession = localStorage.getItem('pbazar_customer_session');
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          if (parsed?.user) {
            setName(parsed.user.name || '');
            setPhone(parsed.user.phone || parsed.user.whatsapp_number || '');
            setLocation(parsed.user.location || '');
            const existingImg = parsed.user.image || parsed.user.profile_image_url || '';
            setImage(existingImg);
            setImagePreview(existingImg);
          }
        }
      } catch (e) {
        console.warn('Failed parsing session from storage', e);
      }
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImage(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlChange = (url: string) => {
    setImage(url);
    setImagePreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length < 5) {
      setError('Please provide a valid phone or WhatsApp number (e.g. 017xxxxxxxx)');
      return;
    }

    setLoading(true);

    try {
      // Endpoint required: POST /api/users/login
      const payload = {
        name: name.trim(),
        whatsapp_number: phone.trim(),
        phone: phone.trim(),
        location: location.trim(),
        image: image.trim()
      };

      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sign in. Please try again.');
      }

      const signedInUser = data.user;
      const sessionData = {
        user: signedInUser,
        session: data.session
      };

      // Requirement: Store returned user object and session in localStorage ('pbazar_customer_session')
      localStorage.setItem('pbazar_customer_session', JSON.stringify(sessionData));
      localStorage.setItem('customer_phone', cleanPhone);
      Storage.setSmall('pbazar_user', signedInUser);

      onAuthSuccess(signedInUser);
      onClose();
    } catch (err: any) {
      console.error('Customer login error:', err);
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileUpdates = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    setUpdateSuccess(false);

    try {
      const customerId = user.customer_id || user.id || user.phone || user.whatsapp;
      const res = await fetch(`/api/users/profile/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim(),
          address: location.trim(),
          image: image.trim(),
          profile_image_url: image.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile details');
      }

      const updatedUser = data.user;
      const sessionData = {
        user: updatedUser,
        session: JSON.parse(localStorage.getItem('pbazar_customer_session') || '{}')?.session || null
      };

      localStorage.setItem('pbazar_customer_session', JSON.stringify(sessionData));
      Storage.setSmall('pbazar_user', updatedUser);

      onAuthSuccess(updatedUser);
      setUpdateSuccess(true);
      setIsEditingProfile(false);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative border border-slate-100 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-700 z-10 cursor-pointer"
        >
          <X size={20} />
        </button>

        {user ? (
          /* My Account View */
          <div className="space-y-6 text-center">
            <div className="relative w-24 h-24 mx-auto">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                {user.image || user.profile_image_url || user.profileImage ? (
                  <img 
                    src={user.image || user.profile_image_url || user.profileImage} 
                    className="w-full h-full object-cover" 
                    alt={user.name || user.username} 
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-2xl font-black">
                    {(user.name || user.username || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 capitalize">
                  {user.name || user.username}
                </h2>
                {user.is_order_blocked && (
                  <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldAlert size={10} />
                    Suspended
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Pbazar Verified Customer
              </p>
            </div>

            {updateSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center justify-center gap-2">
                <Check size={14} /> Profile updated successfully!
              </div>
            )}

            {isEditingProfile ? (
              <div className="space-y-3 text-left bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Edit My Account</h3>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
                    placeholder="Your Name"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Delivery Address / Area</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
                    placeholder="e.g. Dhanmondi, Dhaka"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Profile Photo (URL)</label>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfileUpdates}
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-3 bg-slate-200 text-slate-700 text-xs font-black rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Phone / WhatsApp</span>
                  <span className="font-black text-slate-900">{user.whatsapp_number || user.phone || user.whatsapp || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Delivery Area</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[200px]" title={user.location || user.address}>
                    {user.location || user.address || 'Not specified'}
                  </span>
                </div>
                {user.points !== undefined && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Loyalty Points</span>
                    <span className="font-black text-blue-600">{user.points || 0} Points</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full py-3.5 bg-blue-50 text-blue-600 font-black text-xs uppercase tracking-wider rounded-2xl transition-all hover:bg-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <User size={14} />
                  Edit Profile
                </button>
              )}
              <button 
                type="button"
                onClick={() => {
                  localStorage.removeItem('pbazar_customer_session');
                  localStorage.removeItem('customer_phone');
                  Storage.removeSmall('pbazar_user');
                  onLogout();
                  onClose();
                }}
                className={`py-3.5 bg-rose-50 text-rose-600 font-black text-xs uppercase tracking-wider rounded-2xl transition-all hover:bg-rose-100 flex items-center justify-center gap-1.5 cursor-pointer ${
                  isEditingProfile ? 'col-span-2' : ''
                }`}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Sign In / Registration Form */
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="mb-5 text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-600/20 text-white">
                <Sparkles size={22} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Customer Sign In
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Enter your details to shop and track orders
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Field 1: Customer Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="e.g. Rahat Ahmed" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full p-3.5 pl-11 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-xs sm:text-sm outline-none text-slate-900 placeholder:text-slate-400" 
                    required 
                  />
                </div>
              </div>

              {/* Field 2: Phone / WhatsApp Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Phone / WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="tel" 
                    placeholder="017XXXXXXXX" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="w-full p-3.5 pl-11 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-xs sm:text-sm outline-none text-slate-900 placeholder:text-slate-400" 
                    required 
                  />
                </div>
              </div>

              {/* Field 3: Delivery Address / Area */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Delivery Address / Area
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="e.g. Dhanmondi, Dhaka" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    className="w-full p-3.5 pl-11 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-xs sm:text-sm outline-none text-slate-900 placeholder:text-slate-400" 
                  />
                </div>
              </div>

              {/* Field 4: Profile Photo */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                  <span>Profile Photo (Upload or URL)</span>
                  <span className="text-slate-400 font-normal">Optional</span>
                </label>

                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={22} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input 
                      type="url" 
                      placeholder="Paste image link or upload" 
                      value={image.startsWith('data:') ? '' : image} 
                      onChange={(e) => handleImageUrlChange(e.target.value)} 
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-[11px] font-medium outline-none focus:border-blue-600"
                    />

                    <label className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                      <Camera size={12} />
                      <span>Upload local image file</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white font-black text-xs uppercase tracking-[0.15em] py-4 rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? 'Signing In...' : 'Customer Sign In'}
              </button>

              <p className="text-[10px] text-center text-slate-400 font-medium">
                No password required. Your account is secured by your phone number.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
