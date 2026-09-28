import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { ChevronLeft, User, Award, Camera, MapPin, Save, LogOut, Lock, Phone } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(localStorage.getItem('customer_phone') || '');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) return;

    // Load profile
    const userRef = doc(db, 'users', phone);
    getDoc(userRef).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setEditName(data.name || data.username || '');
        setEditAddress(data.address || '');
        // Sync local storage profile
        Storage.setSmall('pbazar_user', data);
      }
    });

    // Load orders
    const qOrders = query(collection(db, 'orders'), where('whatsapp', '==', phone));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubOrders();
  }, [phone]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userDocRef = doc(db, 'users', phone);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists() || !userDoc.data()?.password) {
          setError("User not found or password not set. Please register in the home page.");
          setLoading(false);
          return;
      }
      
      const userData = userDoc.data();
      if (userData?.password !== password) {
          setError("Incorrect password");
          setLoading(false);
          return;
      }

      localStorage.setItem('customer_phone', phone);
      Storage.setSmall('pbazar_user', userData);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_phone');
    Storage.removeSmall('pbazar_user');
    window.location.reload();
  };

  const handleSaveDetails = async () => {
    if (!phone) return;
    const userRef = doc(db, 'users', phone);
    try {
      await updateDoc(userRef, {
        name: editName,
        address: editAddress
      });
      const updated = { ...profile, name: editName, address: editAddress };
      setProfile(updated);
      Storage.setSmall('pbazar_user', updated);
      setIsEditing(false);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !phone) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const storageRef = ref(storage, `profile_images/${phone}`);
    
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const userRef = doc(db, 'users', phone);
      await updateDoc(userRef, { profile_image_url: url });
      
      const updated = { ...profile, profile_image_url: url };
      setProfile(updated);
      Storage.setSmall('pbazar_user', updated);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!localStorage.getItem('customer_phone')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
              <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Profile Access</h1>
            <p className="text-slate-500 font-medium mt-2">Sign in to manage your gourmet account.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-bold text-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all" 
                  placeholder="01XXXXXXXXX" 
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secret Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-bold text-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all tracking-widest" 
                  placeholder="••••••••" 
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-tight text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
             <button 
               onClick={() => navigate('/')} 
               className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 transition-colors"
             >
               Go Back Home
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-900 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Gourmet Profile</h1>
        <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 active:scale-95 transition-all shadow-sm">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
          
          <div className="relative mx-auto mb-6 w-32 h-32">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100">
                {profile?.profile_image_url ? (
                    <img src={profile.profile_image_url} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                      <User size={64} />
                    </div>
                )}
              </div>
              <label className="absolute bottom-1 right-1 bg-blue-600 text-white p-2.5 rounded-full cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all">
                  <Camera size={18} />
                  <input type="file" className="hidden" onChange={handleImageUpload} disabled={uploading} accept="image/*" />
              </label>
              {uploading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">{profile?.name || profile?.username || 'Gourmet Lover'}</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{phone}</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                <Award size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Loyalty Points</span>
              </div>
              <p className="text-2xl font-black text-blue-900">{profile?.points || 0}</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
              <div className="flex items-center justify-center gap-2 text-emerald-600 mb-1">
                <Save size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Orders</span>
              </div>
              <p className="text-2xl font-black text-emerald-900">{orders.length}</p>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buyer Details</h3>
            <button 
              onClick={() => isEditing ? handleSaveDetails() : setIsEditing(true)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${isEditing ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'}`}
            >
              {isEditing ? <><Save size={14} /> Save</> : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all" 
                  placeholder="Enter your name"
                />
              ) : (
                <p className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-slate-700 border border-transparent">{profile?.name || profile?.username || 'Not set'}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Address</label>
              {isEditing ? (
                <textarea 
                  value={editAddress} 
                  onChange={e => setEditAddress(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all min-h-[100px] resize-none" 
                  placeholder="Enter your full address"
                />
              ) : (
                <div className="px-4 py-3 bg-slate-50/50 rounded-xl font-bold text-slate-700 border border-transparent flex gap-3">
                  <MapPin size={18} className="text-slate-300 shrink-0 mt-0.5" />
                  <p className="text-sm">{profile?.address || 'No address saved'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Recent Orders</h3>
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(o => (
                <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                      <Award size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{o.price || o.total} ৳</p>
                      <p className="text-[10px] font-bold text-slate-400">{new Date(o.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      o.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {o.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center">
              <Award size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No orders yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
