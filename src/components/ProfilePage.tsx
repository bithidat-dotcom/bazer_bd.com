import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { ChevronLeft, User, Award, Camera } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(localStorage.getItem('customer_phone') || '');
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!phone) return;

    // Load profile
    const userRef = doc(db, 'users', phone);
    getDoc(userRef).then(docSnap => {
      if (docSnap.exists()) setProfile(docSnap.data());
      else setProfile({ points: 0, profile_image_url: '' });
    });

    // Load orders
    const qOrders = query(collection(db, 'cafe_orders'), where('customer_phone', '==', phone));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubOrders();
  }, [phone]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('customer_phone', phone);
    window.location.reload();
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
      
      setProfile({ ...profile, profile_image_url: url });
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!phone) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-black mb-4">Login with Phone</h1>
        <form onSubmit={handleLogin}>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="border p-2 w-full mb-4" placeholder="Phone Number" />
          <button type="submit" className="bg-blue-600 text-white p-2 w-full rounded">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <button onClick={() => navigate('/')} className="mb-4"><ChevronLeft /></button>
      <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 text-center">
        <div className="relative mx-auto mb-4 w-24 h-24">
            {profile?.profile_image_url ? (
                <img src={profile.profile_image_url} className="w-24 h-24 rounded-full object-cover" />
            ) : (
                <User size={64} className="mx-auto bg-slate-100 p-2 rounded-full w-24 h-24" />
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer">
                <Camera size={16} />
                <input type="file" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
        </div>
        <h2 className="text-xl font-black">{phone}</h2>
        <div className="flex justify-center items-center gap-2 mt-4 bg-blue-50 p-3 rounded-xl text-blue-800 font-black">
          <Award /> {profile?.points || 0} Points
        </div>
      </div>
      <h3 className="text-lg font-black mb-4">Order History</h3>
      {orders.map(o => (
        <div key={o.id} className="bg-white p-4 rounded-xl mb-2 border">
          {new Date(o.created_at).toLocaleDateString()} - {o.total} ৳ - {o.status}
        </div>
      ))}
    </div>
  );
}
