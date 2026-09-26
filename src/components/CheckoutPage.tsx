import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { ChevronLeft, ShoppingBag, MapPin, Phone, User, CheckCircle2, AlertCircle, Sparkles, CreditCard } from 'lucide-react';
import { CartItem } from '../types';
import { formatWhatsappNumber } from '../lib/utils';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [points, setPoints] = useState(0);
  const [useCoupon, setUseCoupon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');

  const phone = localStorage.getItem('customer_phone') || '';

  useEffect(() => {
    const loadData = async () => {
      const savedCart = await Storage.getLarge<CartItem[]>('pbazar_cart');
      if (savedCart) setCart(savedCart);
      
      if (phone) {
        setWhatsapp(phone);
        const userRef = doc(db, 'users', phone);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setPoints(data.points || 0);
          setCustomerName(data.name || data.username || '');
          setAddress(data.address || '');
        }
      }
    };
    loadData();
  }, [phone]);

  const subtotal = cart.reduce((sum, item) => {
    const hasDiscount = item.product.discount && item.product.discount > 0;
    const price = hasDiscount 
      ? item.product.price * (1 - (item.product.discount || 0) / 100) 
      : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  // Coupon Logic: 5 points = 350 taka discount for orders <= 350
  const isCouponEligible = points >= 5 && subtotal <= 350;
  const discount = useCoupon && isCouponEligible ? subtotal : 0;
  const total = Math.max(0, subtotal - discount);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!customerName || !whatsapp || !address) {
      setError("Please fill in all buyer details.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const combinedProductNames = cart
        .map(item => `${item.quantity}x ${item.product.name}`)
        .join('\n');
        
      const combinedProductIds = cart.map(item => item.product.id).join(', ');
      const formattedWhatsapp = formatWhatsappNumber(whatsapp);

      const orderData = {
        product_id: combinedProductIds,
        product_name: combinedProductNames,
        quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
        price: total,
        original_price: subtotal,
        coupon_discount: discount,
        customer_name: customerName,
        customer_username: phone,
        whatsapp: formattedWhatsapp,
        location: address,
        status: 'pending',
        created_at: new Date().toISOString(),
        items: cart.map(item => {
          const hasDiscount = item.product.discount && item.product.discount > 0;
          const finalPrice = hasDiscount 
            ? item.product.price * (1 - (item.product.discount || 0) / 100) 
            : item.product.price;
          return {
            product_id: item.product.id,
            name: item.product.name,
            image: item.product.image || '',
            price: finalPrice,
            quantity: item.quantity
          };
        })
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);

      // Loyalty Update: -5 points if coupon used, +1 point per product if not
      const userRef = doc(db, 'users', phone);
      const pointsChange = useCoupon ? -5 : cart.reduce((acc, item) => acc + item.quantity, 0);
      await updateDoc(userRef, { 
        points: increment(pointsChange),
        name: customerName,
        address: address
      });

      // Clear cart
      await Storage.removeLarge('pbazar_cart');
      setCart([]);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-500 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 size={64} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Order Success!</h1>
        <p className="text-slate-500 font-medium mb-8">Thank you for your purchase. Redirecting you home...</p>
        <button onClick={() => navigate('/')} className="px-10 py-4 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-900 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest">Secure Checkout</h1>
        <div className="w-10 h-10" />
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-6">
        {/* Order Summary */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <ShoppingBag size={14} className="text-blue-600" />
            Order Summary
          </h2>
          <div className="space-y-4 mb-6">
            {cart.map((item, idx) => {
               const hasDiscount = item.product.discount && item.product.discount > 0;
               const finalPrice = hasDiscount 
                 ? item.product.price * (1 - (item.product.discount || 0) / 100) 
                 : item.product.price;
               return (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-blue-600">{item.quantity}x</span>
                    <span className="font-bold text-slate-700 truncate max-w-[200px]">{item.product.name}</span>
                  </div>
                  <span className="font-black text-slate-900">{finalPrice * item.quantity} ৳</span>
                </div>
               );
            })}
          </div>
          <div className="h-px bg-slate-100 my-6" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-slate-500">
              <span>Subtotal</span>
              <span>{subtotal} ৳</span>
            </div>
            {useCoupon && (
              <div className="flex justify-between text-sm font-bold text-emerald-600">
                <span>Coupon Applied</span>
                <span>-{discount} ৳</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-black text-slate-900 pt-2">
              <span>Total</span>
              <span>{total} ৳</span>
            </div>
          </div>
        </div>

        {/* Loyalty Section */}
        {isCouponEligible && (
          <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl shadow-blue-600/20 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-10 -mt-10"></div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tight leading-none">Loyalty Reward</h3>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">You have {points} points</p>
                </div>
              </div>
              <p className="text-xs font-medium text-blue-50">Redeem 5 points for a FREE order (up to 350 ৳)!</p>
              <label className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl cursor-pointer hover:bg-white/20 transition-all border border-white/10">
                <input 
                  type="checkbox" 
                  checked={useCoupon} 
                  onChange={() => setUseCoupon(!useCoupon)}
                  className="w-5 h-5 rounded-md accent-white border-white/30"
                />
                <span className="text-sm font-black uppercase tracking-widest">Apply 350 ৳ Coupon</span>
              </label>
            </div>
          </div>
        )}

        {/* Delivery Details */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
            <MapPin size={14} className="text-blue-600" />
            Buyer & Delivery Details
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all" 
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp / Phone</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="text" 
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all" 
                  placeholder="01XXXXXXXXX"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Address</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-5 text-slate-300" />
                <textarea 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/10 transition-all min-h-[120px] resize-none" 
                  placeholder="Street, Area, City, Post Code"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-tight text-center flex items-center justify-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button 
          onClick={handlePlaceOrder}
          disabled={loading || cart.length === 0}
          className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[2rem] shadow-2xl shadow-slate-900/20 hover:bg-black transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <CreditCard size={18} />
          {loading ? 'Processing Order...' : `Confirm Order — ${total} ৳`}
        </button>
        
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Cash on Delivery Available
        </p>
      </main>
    </div>
  );
}
