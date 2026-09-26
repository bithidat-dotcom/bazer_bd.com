import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronLeft } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<any[]>([]);
  const [points, setPoints] = useState(0);
  const [useCoupon, setUseCoupon] = useState(false);
  const phone = localStorage.getItem('customer_phone') || '';

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cafe_cart') || '[]');
    setCart(savedCart);
    
    if (phone) {
      getDoc(doc(db, 'users', phone)).then(snap => {
        if (snap.exists()) setPoints(snap.data().points || 0);
      });
    }
  }, [phone]);

  const subtotal = cart.reduce((sum, item) => sum + (item.singlePrice * item.quantity), 0);
  const total = useCoupon && points >= 5 && subtotal <= 350 ? 0 : subtotal;

  const handleProceed = async () => {
    // Loyalty Logic
    if (useCoupon && points >= 5) {
      const userRef = doc(db, 'users', phone);
      await updateDoc(userRef, { points: points - 5 });
    }
    
    // Add logic to save order... (omitted for brevity)
    navigate('/');
  };

  return (
    <div className="bg-white min-h-screen p-6">
      <button onClick={() => navigate(-1)} className="mb-4"><ChevronLeft /></button>
      <h1 className="text-2xl font-black mb-6">Checkout</h1>
      <div className="mb-6">Total: {subtotal} ৳</div>
      
      {points >= 5 && subtotal <= 350 && (
        <label className="flex items-center gap-2 mb-6">
          <input type="checkbox" checked={useCoupon} onChange={() => setUseCoupon(!useCoupon)} />
          Apply 350 Taka Coupon (You have {points} points)
        </label>
      )}

      <div className="text-xl font-black mb-6">Final Total: {total} ৳</div>
      <button onClick={handleProceed} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Proceed to Pay</button>
    </div>
  );
}
