import { Filter, LayoutGrid, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import HeroBanner from './components/Banner';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CheckoutModal from './components/CheckoutModal';
import TrackingModal from './components/TrackingModal';
import WhatsappSupport from './components/WhatsappSupport';
import BottomNav from './components/BottomNav';
import CategoryScroller from './components/CategoryScroller';
import AuthModal, { UserProfile } from './components/AuthModal';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, addDoc } from 'firebase/firestore';
import { Banner, Product, CartItem } from './types';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [discountFilter, setDiscountFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const categories = ["Electronic", "Fashion", "Bazer", "Cloth", "Festive", "Laptop", "Mobile", "Gadget", "Robotic"];

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    let unsubProd = () => {};
    let unsubBanner = () => {};

    try {
      unsubProd = onSnapshot(query(collection(db, 'products')), (snapshot) => {
        const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        prodData.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setProducts(prodData);
        setLoading(false);
      }, (error) => {
        console.error('Firebase product error', error);
        setError(error.message);
        setLoading(false);
      });

      unsubBanner = onSnapshot(query(collection(db, 'banners')), (snapshot) => {
        const bannerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
        bannerData.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setBanners(bannerData);
      }, (error) => {
        console.error('Firebase banner error', error);
      });
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load store data');
      setLoading(false);
    }

    return () => {
      unsubProd();
      unsubBanner();
    };
  }, []);

  const fetchData = async () => {
    setError(null);
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  useEffect(() => {
    const filtered = products.filter(p => {
      const pName = p.name || '';
      const pDesc = p.description || '';
      const matchSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pDesc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiscount = discountFilter ? p.discount === discountFilter : true;
      const matchCategory = categoryFilter ? (
        pName.toLowerCase().includes(categoryFilter.toLowerCase()) || 
        pDesc.toLowerCase().includes(categoryFilter.toLowerCase())
      ) : true;
      return matchSearch && matchDiscount && matchCategory;
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products, discountFilter, categoryFilter]);



  async function submitOrder(customer_name: string, whatsapp: string, location: string): Promise<void> {
    if (cart.length === 0) return;

    const combinedProductNames = cart
      .map(item => `${item.quantity}x ${item.product.name}`)
      .join('\n');
      
    const combinedProductIds = cart.map(item => item.product.id).join(', ');
    
    const totalPrice = cart.reduce((sum, item) => {
      const hasDiscount = item.product.discount && item.product.discount > 0;
      const price = hasDiscount 
        ? item.product.price * (1 - (item.product.discount || 0) / 100) 
        : item.product.price;
      return sum + price * item.quantity;
    }, 0);

    let formattedWhatsapp = whatsapp.trim().replace(/\s+/g, '');
    if (formattedWhatsapp.startsWith('01')) {
      formattedWhatsapp = '+88' + formattedWhatsapp;
    } else if (formattedWhatsapp.startsWith('8801')) {
      formattedWhatsapp = '+' + formattedWhatsapp;
    }

    console.log("Submitting Order Data:", {
      product_id: combinedProductIds,
      product_name: combinedProductNames,
      price: totalPrice,
      customer_name,
      whatsapp: formattedWhatsapp,
      location,
      status: 'pending'
    });
    
    try {
      await addDoc(collection(db, "orders"), {
        product_id: combinedProductIds,
        product_name: combinedProductNames,
        price: totalPrice,
        customer_name,
        customer_username: user ? user.username : null,
        customer_image: user ? user.profileImage : null,
        whatsapp: formattedWhatsapp,
        location,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      console.log("Order Successful");
      setSuccessMessage("Order Placed Successfully!");
      setCart([]); // Clear cart after successful order
      
      // Auto-hide success message
      setTimeout(() => setSuccessMessage(""), 6000);
    } catch (err: any) {
      console.error("INSERT FAILED:", err);
      if (!err.message?.includes('alert')) {
        window.alert(`❌ Submission Failed: ${err.message || 'Unknown error'}`);
      }
      throw err;
    }
  }

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
  };

  const handleBuyNow = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });
    setIsModalOpen(true);
  };



  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleOpenCart = () => {
    setIsModalOpen(true);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar 
        onSearch={setSearchQuery} 
        cartCount={cartItemCount} 
        onCartClick={handleOpenCart} 
        onTrackOrderClick={() => setIsTrackingOpen(true)}
        onLoginClick={() => setIsAuthOpen(true)}
        onLogoutClick={() => {
          localStorage.removeItem('user');
          setUser(null);
        }}
        onEditProfileClick={() => setIsAuthOpen(true)}
        user={user}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        discountFilter={discountFilter}
        onDiscountFilter={setDiscountFilter}
        products={products}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 space-y-12 pb-24">
        <HeroBanner banners={banners} />
        
        <section>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="aspect-[3/4] glass animate-pulse rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20 glass rounded-2xl border border-dashed border-red-200">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500 text-sm font-bold">{error}</p>
              <button 
                onClick={fetchData}
                className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
              {filteredProducts.map((product) => (
                <div key={product.id}>
                  <ProductCard 
                    product={product} 
                    onBuy={handleBuyNow} 
                    onAddToCart={handleAddToCart}
                    onClick={setSelectedProduct}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 glass rounded-[2.5rem] border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold tracking-tight">No products found matching your search.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="hidden md:block glass border-t border-slate-200 mt-12 mb-0 relative z-40 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-6 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-slate-800 text-xs text-opacity-100">© 2024 Bazar_bds.com — Trusted Online Shop in Bangladesh</span>
              <span className="text-slate-400 normal-case tracking-normal">Company Info: Premium Quality Goods & Fast Delivery.</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 items-center justify-between border-t border-slate-200 pt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-900 rounded-full shadow-lg shadow-black/50 blink"></div> 
              Orders Live (32 New)
            </span>
            <div className="flex gap-6 items-center">
              <a href="#" className="hover:text-black transition-colors">Instagram: @quats.co</a>
              <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-black transition-colors">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
      
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .blink { animation: blink 2s infinite; }
      `}</style>
      
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={setUser}
        initialUser={user}
      />

      <TrackingModal 
        isOpen={isTrackingOpen} 
        onClose={() => setIsTrackingOpen(false)} 
        user={user}
      />

      <CheckoutModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cartItems={cart}
        onSubmit={submitOrder}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        user={user}
      />

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        allProducts={products}
        onProductSelect={setSelectedProduct}
      />

      <WhatsappSupport />

      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%', scale: 0.8 }}
            className="fixed top-0 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm text-left font-sans animate-in fade-in"
          >
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 flex items-center gap-4 overflow-hidden relative">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              >
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight">{alertMessage}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-tight">Explore our products and find great deals!</p>
              </div>
              <button 
                onClick={() => setAlertMessage(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors self-start cursor-pointer"
              >
                <X size={16} className="text-slate-500" />
              </button>

              {/* Progress bar */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-orange-400"
              />
            </div>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%', scale: 0.8 }}
            className="fixed top-0 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 flex items-center gap-4 overflow-hidden relative text-left">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              >
                <CheckCircle2 className="w-6 h-6" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight">Order Placed Successfully!</p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-tight">We will contact you via WhatsApp shortly.</p>
              </div>
              <button 
                onClick={() => setSuccessMessage("")}
                className="p-2 hover:bg-white/10 rounded-full transition-colors self-start"
              >
                <X size={16} className="text-slate-500" />
              </button>

              {/* Progress bar for auto-hide */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-white/30"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <BottomNav 
        onHomeClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onProfileClick={() => setIsAuthOpen(true)}
        onOrdersClick={() => setIsTrackingOpen(true)}
        onCartClick={handleOpenCart}
        onSupportClick={() => window.open('https://wa.me/8801716807465', '_blank', 'noopener,noreferrer')}
        cartCount={cartItemCount}
        user={user}
      />
    </div>
  );
}
