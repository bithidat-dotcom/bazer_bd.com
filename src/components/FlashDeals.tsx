import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Heart, Bolt, Camera, Menu, ShoppingBag, Store, Compass, MessageCircle } from 'lucide-react';
import { getBackupProducts } from '../lib/supabase';
import { Product } from '../types';
import { Storage } from '../lib/storage';
import ProductModal from './ProductModal';

export default function FlashDeals() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({
    hours: 8,
    minutes: 42,
    seconds: 15
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
          if (minutes < 0) {
            minutes = 59;
            hours--;
            if (hours < 0) {
              hours = 0;
              minutes = 0;
              seconds = 0;
            }
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const backup = await getBackupProducts();
        if (backup) {
          setProducts(backup.filter(p => (p.discount || 0) > 0));
        }
      } catch (e) {
        console.error(e);
      }
      
      const savedCart = await Storage.getLarge<any[]>('pbazar_cart');
      if (savedCart) setCart(savedCart);
    };
    loadData();
  }, []);

  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    let newCart = [...cart];
    const existing = newCart.find(item => item.product.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      newCart.push({ product, quantity });
    }
    setCart(newCart);
    await Storage.setLarge('pbazar_cart', newCart);
    // Simple alert for now, real app might use toast
    alert(`Added ${product.name} to cart!`);
  };

  const handleBuyNow = async (product: Product, quantity: number = 1) => {
    await handleAddToCart(product, quantity);
    navigate('/'); 
  };

  const formatTime = (time: number) => time.toString().padStart(2, '0');

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-[#fff8f6] text-[#251913] font-sans selection:bg-pink-500/30 min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#fff8f6]/80 backdrop-blur-lg border-b border-white/10 shadow-sm flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="active:scale-95 transition-transform text-[#9d4300]"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
            pbazar
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <input 
              className="bg-[#fff1eb] border-none rounded-full px-6 py-2 w-64 focus:ring-2 focus:ring-pink-500/50 text-sm" 
              placeholder="Search deals..." 
              type="text"
            />
            <Camera size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#584237]" />
          </div>
          <button className="active:scale-95 transition-transform text-[#9d4300] relative">
            <ShoppingBag size={24} />
            <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">3</span>
          </button>
        </div>
      </header>

      <main className="pt-20 pb-32 min-h-screen relative overflow-hidden">
        {/* Background Orbs */}
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-pink-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/4"></div>
        <div className="absolute bottom-1/4 left-0 -z-10 w-80 h-80 bg-orange-500/10 blur-[100px] rounded-full -translate-x-1/2"></div>
        
        {/* Flash Sale Header */}
        <section className="px-4 md:px-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/10 text-pink-500 rounded-full mb-4">
                <Bolt size={18} className="fill-current" />
                <span className="text-xs font-semibold uppercase tracking-wider">Limited Time Only</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#251913] tracking-tighter">Flash Deals</h1>
              <p className="text-[#584237] mt-2 max-w-lg">Premium products at impossible prices. Refreshing every 12 hours. Don't miss your chance.</p>
            </div>
            
            {/* Timer */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white/70 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center text-xl font-bold text-pink-500">
                  {formatTime(timeLeft.hours)}
                </div>
                <span className="text-[10px] uppercase font-bold mt-1 text-[#584237]">Hrs</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white/70 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center text-xl font-bold text-pink-500">
                  {formatTime(timeLeft.minutes)}
                </div>
                <span className="text-[10px] uppercase font-bold mt-1 text-[#584237]">Min</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white/70 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center text-xl font-bold text-pink-500">
                  {formatTime(timeLeft.seconds)}
                </div>
                <span className="text-[10px] uppercase font-bold mt-1 text-[#584237]">Sec</span>
              </div>
            </div>
          </div>
        </section>

        {/* Category Pills (Relative to Header) */}
        <section className="px-4 md:px-8 mb-8">
          <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-hide">
            <button className="px-4 py-1.5 rounded-full bg-pink-500 text-white text-xs font-bold transition-all shrink-0 shadow-md shadow-pink-500/20">All</button>
            <button className="px-4 py-1.5 rounded-full bg-white hover:bg-[#ffeae0] text-[#584237] text-xs font-medium transition-all shrink-0 shadow-sm border border-orange-500/10">Luxury</button>
            <button className="px-4 py-1.5 rounded-full bg-white hover:bg-[#ffeae0] text-[#584237] text-xs font-medium transition-all shrink-0 shadow-sm border border-orange-500/10">Tech</button>
            <button className="px-4 py-1.5 rounded-full bg-white hover:bg-[#ffeae0] text-[#584237] text-xs font-medium transition-all shrink-0 shadow-sm border border-orange-500/10">Lifestyle</button>
          </div>
        </section>

        {/* Deals Grid */}
        <section className="px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} onClick={() => setSelectedProduct(product)} className="cursor-pointer group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50">
                <div className="aspect-[4/5] relative overflow-hidden bg-[#fff1eb]">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    alt={product.name} 
                    src={product.image || product.images?.[0]}
                  />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {product.discount && product.discount > 0 && (
                      <span className="px-3 py-1 bg-pink-500 text-white rounded-full font-bold text-xs shadow-lg shadow-pink-500/20">-{product.discount}%</span>
                    )}
                    {(product.rating || 0) >= 4.5 && (
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-orange-500 rounded-full font-bold text-[10px] uppercase border border-orange-500/20">Trending</span>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); /* TODO: Like logic */ }} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#584237] hover:text-pink-500 transition-colors">
                    <Heart size={20} />
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-[#251913] mb-1 group-hover:text-pink-500 transition-colors line-clamp-1">{product.name}</h3>
                  <p className="text-[#584237] text-sm mb-4 line-clamp-1">{product.description || 'Premium Product'}</p>
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-xl font-bold text-[#251913]">৳{product.price}</span>
                    {product.discount && product.discount > 0 && (
                      <span className="text-sm line-through text-[#584237]/60 mb-1">৳{Math.round(product.price * (100 / (100 - product.discount)))}</span>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform hover:shadow-lg hover:shadow-orange-500/30">
                    <ShoppingCart size={20} />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic Offer Banner */}
        <section className="mt-16 px-4 md:px-8">
          <div className="relative w-full rounded-[40px] overflow-hidden bg-pink-500 p-8 md:p-16 flex flex-col items-center text-center">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Unlock Extra 15% Off</h2>
              <p className="text-white/80 text-lg mb-10">Subscribe to our deal alerts and never miss a drop. Exclusive codes for our community members sent directly to your inbox.</p>
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <input 
                  className="flex-1 bg-white/10 border-white/20 rounded-2xl px-6 py-4 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/50 backdrop-blur-md" 
                  placeholder="Enter your email" 
                  type="email"
                />
                <button className="px-8 py-4 bg-white text-pink-500 rounded-2xl font-bold hover:bg-[#fff8f6] transition-colors active:scale-95 transition-transform">
                  Notify Me
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>
      
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        allProducts={products}
        onProductSelect={setSelectedProduct}
        couponConfig={{ isActive: false, minPurchase: 0, discountAmount: 0 }}
      />

      {/* FAB for Support */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 rounded-full text-white shadow-[0_12px_32px_rgba(249,115,22,0.4)] flex items-center justify-center active:scale-95 transition-all z-40">
        <MessageCircle size={24} className="fill-current" />
      </button>
    </div>
  );
}
