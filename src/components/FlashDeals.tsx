import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Heart, Bolt, Camera, Menu, ShoppingBag, Store, Compass, MessageCircle, Search } from 'lucide-react';
import { getBackupProducts } from '../lib/supabase';
import { Product } from '../types';
import { Storage } from '../lib/storage';
import ProductModal from './ProductModal';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isFirestoreQuotaExceeded } from '../lib/db-sync';
import { ProductCard } from './ProductCard';

export default function FlashDeals() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({
    hours: 8,
    minutes: 42,
    seconds: 15
  });

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [searchQuery, setSearchQuery] = useState('');

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
    let unsubProd = () => {};
    
    const loadData = async () => {
      if (isFirestoreQuotaExceeded()) {
          try {
            const backup = await getBackupProducts();
            if (backup) {
              const discounted = backup.filter(p => Number(p.discount || 0) > 0 || p.is_super_sale);
              // Fallback for quota exceeded mode
              const finalProducts = discounted.length > 0 ? discounted : backup;
              setProducts(finalProducts);
              setAllProducts(backup);
              setFilteredProducts(finalProducts);
              extractCategories(finalProducts);
            }
          } catch (e) {
            console.error(e);
          }
      } else {
          try {
              unsubProd = onSnapshot(query(collection(db, 'products')), (snapshot) => {
                const prodData = snapshot.docs.map(doc => {
                  const data = doc.data() || {};
                  return {
                    id: doc.id,
                    name: data.name || '',
                    description: data.description || '',
                    price: Number(data.price || 0),
                    image: data.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
                    rating: Number(data.rating || 4.5),
                    discount: Number(data.discount || 0),
                    category: data.category || '',
                    stock: data.stock !== undefined ? Number(data.stock) : 20,
                    total_stock: data.total_stock !== undefined ? Number(data.total_stock) : 30,
                    created_at: data.created_at || new Date().toISOString(),
                    seller: data.seller || 'Store',
                    seller_id: data.seller_id || '',
                    seller_whatsapp: data.seller_whatsapp || '',
                    seller_logo: data.seller_logo || '',
                    is_super_sale: !!data.is_super_sale,
                    images: data.images || []
                  } as Product;
                });
                
                const discounted = prodData.filter(p => Number(p.discount || 0) > 0 || p.is_super_sale);
                
                setAllProducts(prodData);
                
                // Fallback: If no products have discount > 0, just show all products to avoid empty page
                const finalProducts = discounted.length > 0 ? discounted : prodData;
                
                setProducts(finalProducts);
                setFilteredProducts(finalProducts);
                extractCategories(finalProducts);
              });
          } catch (err) {
              console.warn(err);
          }
      }
      
      const savedCart = await Storage.getLarge<any[]>('pbazar_cart');
      if (savedCart) setCart(savedCart);
    };
    loadData();
    
    return () => unsubProd();
  }, []);
  
  const extractCategories = (prods: Product[]) => {
      const cats = new Set<string>();
      prods.forEach(p => {
          if (p.category) cats.add(p.category);
      });
      setCategories(['All', ...Array.from(cats)]);
  };

  useEffect(() => {
      // If searching, search through ALL products, otherwise just discounted ones
      let base = searchQuery ? allProducts : products;
      let result = base;
      
      if (activeCategory !== 'All') {
          result = result.filter(p => p.category === activeCategory);
      }
      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          result = result.filter(p => 
              p.name.toLowerCase().includes(lowerQ) || 
              (p.description || '').toLowerCase().includes(lowerQ) ||
              p.category.toLowerCase().includes(lowerQ)
          );
      }
      setFilteredProducts(result);
  }, [activeCategory, products, allProducts, searchQuery]);

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
    alert(`Added ${product.name} to cart!`);
  };

  const handleBuyNow = async (product: Product, quantity: number = 1) => {
    await handleAddToCart(product, quantity);
    navigate('/?cart=true'); 
  };

  const handleRemoveFromCart = async (productId: string) => {
    let newCart = cart.filter(item => item.product.id !== productId);
    setCart(newCart);
    await Storage.setLarge('pbazar_cart', newCart);
  };

  const formatTime = (time: number) => time.toString().padStart(2, '0');

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const superSaleProducts = filteredProducts.filter(p => p.is_super_sale);
  const regularDeals = filteredProducts.filter(p => !p.is_super_sale);

  return (
    <div className="bg-[#fff8f6] text-[#251913] font-sans selection:bg-pink-500/30 min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#fff8f6]/80 backdrop-blur-lg border-b border-white/10 shadow-sm flex justify-between items-center px-2 md:px-4 h-16 gap-2">
        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="active:scale-95 transition-transform text-[#9d4300] p-1 md:p-2"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] hidden sm:block">
            pbazar
          </span>
        </div>
        <div className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <input 
              className="bg-[#fff1eb] border-none rounded-full px-4 md:px-6 py-2 w-full focus:ring-2 focus:ring-pink-500/50 text-xs md:text-sm" 
              placeholder="Search all products..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={16} className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-[#584237]" />
          </div>
        </div>
        <div className="flex items-center shrink-0">
          <button onClick={() => navigate('/?cart=true')} className="active:scale-95 transition-transform text-[#9d4300] relative p-1">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-200/50 shadow-sm bg-white flex items-center justify-center">
              <img src="https://i.postimg.cc/h4LHK7jZ/unnamed-(14).jpg" alt="Cart" className="w-full h-full object-cover" />
            </div>
            {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold z-10">{cartItemCount}</span>
            )}
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
            {categories.map(cat => (
               <button 
                 key={cat}
                 onClick={() => setActiveCategory(cat)}
                 className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 shadow-sm border ${activeCategory === cat ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20' : 'bg-white hover:bg-[#ffeae0] text-[#584237] border-orange-500/10'}`}
               >
                 {cat}
               </button>
            ))}
          </div>
        </section>

        {/* Super Sale Section (Mobile Optimized Holder) */}
        {superSaleProducts.length > 0 && (
          <section className="px-4 md:px-8 mb-10 overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-[2.5rem] p-6 border border-white/50 shadow-xl shadow-orange-500/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                    <Bolt size={20} className="fill-current" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Super Sale</h2>
                    <p className="text-[10px] text-[#584237]/60 font-bold uppercase tracking-[0.2em]">Extreme Discounts</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-pink-500 px-3 py-1 bg-white rounded-full shadow-sm animate-pulse">UP TO 80% OFF</span>
                </div>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
                {superSaleProducts.map((product, idx) => (
                  <div key={`super-${product.id}-${idx}`} className="w-[180px] sm:w-[220px] shrink-0">
                    <ProductCard 
                      product={product}
                      onBuy={handleBuyNow}
                      onAddToCart={handleAddToCart}
                      onRemoveFromCart={handleRemoveFromCart}
                      isInCart={cart.some(item => item.product.id === product.id)}
                      onClick={() => setSelectedProduct(product)}
                      theme="warm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Deals Grid */}
        <section className="px-4 md:px-8">
          <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/50 shadow-xl shadow-pink-500/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                All Deals
                {regularDeals.length > 0 && (
                  <span className="text-[10px] font-bold text-[#584237]/40 uppercase tracking-widest">{regularDeals.length} items</span>
                )}
              </h2>
              {regularDeals.length > 5 && (
                <span className="text-xs font-bold text-pink-500">Scroll for more</span>
              )}
            </div>

            {regularDeals.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6 mb-8">
                {regularDeals.map((product, idx) => (
                   <ProductCard 
                      key={`${product.id}-${idx}`}
                      product={product}
                      onBuy={handleBuyNow}
                      onAddToCart={handleAddToCart}
                      onRemoveFromCart={handleRemoveFromCart}
                      isInCart={cart.some(item => item.product.id === product.id)}
                      onClick={() => setSelectedProduct(product)}
                      theme="warm"
                   />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-pink-500/5 rounded-full flex items-center justify-center mb-4 overflow-hidden p-4">
                  <img src="https://i.postimg.cc/h4LHK7jZ/unnamed-(14).jpg" alt="Empty" className="w-full h-full object-cover opacity-20 grayscale" />
                </div>
                <h3 className="text-lg font-bold text-[#251913]">No deals found</h3>
                <p className="text-sm text-[#584237]/60 max-w-xs mt-1">We couldn't find any deals in this category. Try searching for something else or check back later!</p>
                <button 
                  onClick={() => {setActiveCategory('All'); setSearchQuery('');}}
                  className="mt-6 px-6 py-2 bg-pink-500 text-white rounded-full text-xs font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
                >
                  View All Products
                </button>
              </div>
            )}
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
