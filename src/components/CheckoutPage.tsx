import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { ChevronLeft, ShoppingBag, MapPin, Phone, User, CheckCircle2, AlertCircle, Sparkles, CreditCard, Minus, Plus, Trash2 } from 'lucide-react';
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
  const [bkashTrxId, setBkashTrxId] = useState('');

  const phone = localStorage.getItem('customer_phone') || '';

  useEffect(() => {
    const loadData = async () => {
      const savedCart = await Storage.getAny<CartItem[]>('pbazar_cart');
      if (savedCart && Array.isArray(savedCart)) setCart(savedCart);
      
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

  const updateQuantity = async (productId: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];
    setCart(newCart);
    await Storage.setLarge('pbazar_cart', newCart);
    Storage.setSmall('pbazar_cart', newCart);
  };

  const removeItem = async (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    setCart(newCart);
    await Storage.setLarge('pbazar_cart', newCart);
    Storage.setSmall('pbazar_cart', newCart);
  };

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

  const [successOrderId, setSuccessOrderId] = useState<string>('');
  const [lastOrderedSellerWhatsapp, setLastOrderedSellerWhatsapp] = useState<string>('');

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim() || !whatsapp.trim() || !address.trim() || !bkashTrxId.trim()) {
      setError("Please fill in all buyer details and enter bKash Transaction ID (৳170 Advance to 01337892800).");
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
      const effectivePhone = (phone || formattedWhatsapp || '').trim();

      const orderData = {
        product_id: combinedProductIds,
        product_name: combinedProductNames,
        quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
        price: total,
        original_price: subtotal,
        coupon_discount: discount,
        customer_name: customerName.trim(),
        customer_username: effectivePhone,
        whatsapp: formattedWhatsapp,
        location: address.trim(),
        bkash_trx_id: bkashTrxId.trim(),
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

      // Decrement real stock and increment order count
      for (const item of cart) {
        if (item.product.id) {
          try {
            const productRef = doc(db, "products", item.product.id);
            const currentCount = (item.product.order_count || 0) + item.quantity;
            
            const updateData: any = {
              stock: increment(-item.quantity),
              order_count: increment(item.quantity)
            };

            // Auto-promote to Super Sale if orders > 3
            if (currentCount >= 3 && !item.product.is_super_sale) {
              updateData.is_super_sale = true;
              updateData.super_sale_at = new Date().toISOString();
            }

            await updateDoc(productRef, updateData);
          } catch (stockErr) {
            console.error("Failed to update product stock:", stockErr);
          }
        }
      }

      // Loyalty Update: -5 points if coupon used, +1 point per item purchased if not
      if (effectivePhone) {
        try {
          const userRef = doc(db, 'users', effectivePhone);
          const pointsEarned = cart.reduce((acc, item) => acc + item.quantity, 0);
          const pointsChange = useCoupon ? -5 : pointsEarned;
          
          await setDoc(userRef, { 
            points: increment(pointsChange),
            name: customerName.trim(),
            address: address.trim(),
            whatsapp: effectivePhone
          }, { merge: true });

          // Ensure customer_phone is recorded in localStorage for profile persistence
          if (!localStorage.getItem('customer_phone')) {
            localStorage.setItem('customer_phone', effectivePhone);
          }
        } catch (loyaltyErr) {
          console.error("Failed to update loyalty points:", loyaltyErr);
        }
      }

      // Track order id for realtime notification
      Storage.setSmall('customer_whatsapp', formattedWhatsapp);
      const savedIds = Storage.getSmall<string[]>('tracked_order_ids') || [];
      if (!savedIds.includes(docRef.id)) {
        savedIds.push(docRef.id);
        Storage.setSmall('tracked_order_ids', savedIds);
      }

      const firstSellerWhatsapp = cart.find(i => i.product.seller_whatsapp)?.product.seller_whatsapp || '';
      setLastOrderedSellerWhatsapp(firstSellerWhatsapp);

      // Clear cart
      await Storage.removeLarge('pbazar_cart');
      Storage.setSmall('pbazar_cart', []);
      setCart([]);
      setSuccessOrderId(docRef.id);
      setSuccess(true);

    } catch (err: any) {
      setError(err.message || "Failed to process order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const waLink = lastOrderedSellerWhatsapp 
      ? `https://wa.me/${lastOrderedSellerWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I just placed an order on Pbazar (ID: #${successOrderId.substring(0, 8).toUpperCase()}). Total: ৳${total}. My TrxID is ${bkashTrxId}. Please confirm!`)}`
      : 'https://wa.me/8801716807465';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto text-emerald-500 shadow-xl shadow-emerald-500/10">
            <CheckCircle2 size={48} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              Payment Submitted
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Order Placed!</h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm">
              Your order has been recorded. Order ID: <span className="font-mono font-bold text-slate-800">#{successOrderId.substring(0, 8).toUpperCase()}</span>
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Paid</span>
              <span className="font-black text-slate-900">{total} ৳</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">bKash TrxID</span>
              <span className="font-mono font-bold text-pink-600">{bkashTrxId}</span>
            </div>
            {useCoupon && (
              <div className="flex justify-between text-emerald-600">
                <span className="font-bold uppercase tracking-wider text-[10px]">Loyalty Coupon</span>
                <span className="font-bold">Applied (-350 ৳)</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 block"
            >
              <Phone size={16} />
              Confirm with Seller on WhatsApp
            </a>

            <button 
              onClick={() => navigate('/profile')} 
              className="w-full py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl font-black uppercase tracking-wider text-xs transition-all active:scale-95"
            >
              View Order in Profile
            </button>

            <button 
              onClick={() => navigate('/')} 
              className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-[10px] transition-colors"
            >
              Back to Home Storefront
            </button>
          </div>
        </div>
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

      <main className="max-w-xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Order Summary */}
        <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ShoppingBag size={14} className="text-blue-600" />
              Order Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </h2>
            {cart.length > 0 && (
              <button 
                onClick={() => navigate('/')} 
                className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-wider"
              >
                + Add More
              </button>
            )}
          </div>

          {cart.length > 0 ? (
            <div className="space-y-3 mb-6">
              {cart.map((item) => {
                 const hasDiscount = item.product.discount && item.product.discount > 0;
                 const unitPrice = hasDiscount 
                   ? item.product.price * (1 - (item.product.discount || 0) / 100) 
                   : item.product.price;
                 return (
                  <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100/80 shadow-xs">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white overflow-hidden shrink-0 border border-slate-200/60">
                      <img 
                        src={item.product.image} 
                        alt={item.product.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-[10px] font-black text-blue-600 mt-0.5">{(unitPrice * item.quantity).toFixed(0)} ৳ ({item.quantity}x)</p>
                      {item.product.seller && (
                        <p className="text-[9px] text-slate-400 font-medium truncate">Seller: {item.product.seller}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-all active:scale-95"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-all active:scale-95"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                 );
              })}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 mb-6 space-y-3">
              <ShoppingBag size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Your cart is currently empty</p>
              <button 
                onClick={() => navigate('/')} 
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all active:scale-95"
              >
                Browse Products
              </button>
            </div>
          )}

          {cart.length > 0 && (
            <>
              <div className="h-px bg-slate-100 my-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(0)} ৳</span>
                </div>
                {useCoupon && (
                  <div className="flex justify-between text-xs font-bold text-emerald-600">
                    <span>Coupon Applied</span>
                    <span>-{discount.toFixed(0)} ৳</span>
                  </div>
                )}
                <div className="flex justify-between text-base sm:text-lg font-black text-slate-900 pt-1">
                  <span>Total</span>
                  <span>{total.toFixed(0)} ৳</span>
                </div>
              </div>
            </>
          )}
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

        {/* bKash Advance Payment Section (170 BDT) - STRICTLY MANDATORY */}
        <div className="bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 text-white rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl shadow-pink-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-10 -mt-10"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-md shrink-0 border border-pink-200">
                <img 
                  src="https://i.postimg.cc/8cjDDQjx/1701670291b-Kash-App-Logo-PNG.png" 
                  alt="bKash" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-200">Mandatory Payment</p>
                <p className="text-sm font-black tracking-tight">bKash Advance ৳170 Required</p>
              </div>
            </div>
            <span className="bg-white text-pink-700 font-black text-[9px] px-3.5 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
              Required
            </span>
          </div>

          <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs space-y-1">
            <p className="font-semibold text-pink-50">Send <span className="font-black text-white underline">৳170</span> to bKash Personal:</p>
            <p className="font-mono font-black text-base tracking-wider text-white">01337892800 <span className="text-[10px] font-normal text-pink-200">(Cash Out / Send Money)</span></p>
            <p className="text-[10px] text-pink-100 italic pt-0.5">* Without bKash ৳170 advance to 01337892800, orders cannot be processed.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-pink-200 ml-1">bKash Transaction ID (TrxID) *</label>
            <input
              type="text"
              required
              value={bkashTrxId}
              onChange={(e) => setBkashTrxId(e.target.value)}
              placeholder="Enter TrxID (e.g. 9G87H65F43)"
              className="w-full bg-white text-slate-900 border-2 border-white/40 rounded-2xl px-5 py-4 text-xs font-black placeholder:text-slate-400 focus:outline-none focus:border-white shadow-inner"
            />
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
