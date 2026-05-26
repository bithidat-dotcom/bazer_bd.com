import { Filter, LayoutGrid, AlertCircle, CheckCircle2, Phone, MapPin, Mail, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import HeroBanner from './components/Banner';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CheckoutModal from './components/CheckoutModal';
import WhatsappSupport from './components/WhatsappSupport';
import SidebarAds from './components/SidebarAds';
import { supabase } from './lib/supabase';
import { Banner, Product, CartItem } from './types';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [discountFilter, setDiscountFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const categories = ["Electronic", "Fashion", "Bazer", "Cloth", "Festive", "Laptop", "Mobile", "Gadget", "Robotic"];

  const [sidebarAds, setSidebarAds] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);

  // Initialize and load Ads / Admin indicator
  useEffect(() => {
    // Check URL parameters for admin shortcut
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdmin(true);
    }

    const saved = localStorage.getItem('bazar_sidebar_ads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter((ad: any) => ad.id !== 'ad-1' && ad.id !== 'ad-2' && ad.id !== 'ad-3');
        setSidebarAds(filtered);
      } catch (e) {
        setSidebarAds([]);
      }
    } else {
      setSidebarAds([]);
    }
  }, []);

  const handleFooterAdminClick = () => {
    setAdminClickCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdmin(!isAdmin);
        setSuccessMessage(!isAdmin ? "Admin view active! You can now edit and deploy customized Sidebar Ads." : "Admin view deactivated.");
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    const filtered = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchDiscount = discountFilter ? p.discount === discountFilter : true;
      const matchCategory = categoryFilter ? (
        p.name.toLowerCase().includes(categoryFilter.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(categoryFilter.toLowerCase()))
      ) : true;
      return matchSearch && matchDiscount && matchCategory;
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products, discountFilter, categoryFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: bannerData, error: bannerError } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (prodError) throw prodError;
      if (bannerError) throw bannerError;

      if (prodData) setProducts(prodData);
      if (bannerData) setBanners(bannerData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

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

    console.log("Submitting Order Data:", {
      product_id: combinedProductIds,
      product_name: combinedProductNames,
      price: totalPrice,
      customer_name,
      whatsapp,
      location,
      status: 'pending'
    });
    
    try {
      const { data, error } = await supabase.from("orders").insert([
        {
          product_id: combinedProductIds,
          product_name: combinedProductNames,
          price: totalPrice,
          customer_name,
          whatsapp,
          location,
          status: 'pending'
        }
      ]).select();

      if (error) {
        console.error("SUPABASE ERROR:", error);
        window.alert(`❌ Error: ${error.message}`);
        throw error;
      } else {
        console.log("Order Successful:", data);
        setSuccessMessage("Order Placed Successfully!");
        setCart([]); // Clear cart after successful order
        fetchData();
      }
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

  useEffect(() => {
    if (cart.length === 0 && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [cart.length, isModalOpen]);

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
    if (cart.length > 0) {
      setIsModalOpen(true);
    } else {
      window.alert("Your cart is empty!");
    }
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar 
        onSearch={setSearchQuery} 
        cartCount={cartItemCount} 
        onCartClick={handleOpenCart} 
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        discountFilter={discountFilter}
        onDiscountFilter={setDiscountFilter}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 pb-24">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Left Column: Ads Sidebar (Dynamically rendered only if Admin is drafting ads or there are active ads to show) */}
          {(sidebarAds.length > 0 || isAdmin) && (
            <aside className="w-full md:w-64 shrink-0 sticky md:top-24">
              <div className="w-full glass bg-white/70 border border-slate-200/60 rounded-3xl p-4 shadow-sm backdrop-blur-md">
                <SidebarAds ads={sidebarAds} setAds={setSidebarAds} isAdmin={isAdmin} />
              </div>
            </aside>
          )}

          {/* Right Column: Hero Banner + Products */}
          <div className="flex-1 flex flex-col gap-8 min-w-0 w-full">
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
          </div>
        </div>
      </main>

      <footer className="glass border-t border-slate-200 mt-12 mb-0 relative z-40 bg-white/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
          
          {/* Top Row: Service information with elegant cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 border-b border-slate-200/60 pb-10">
            
            {/* Call Center Support Card */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/50">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                <Phone size={22} className="stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">Support</span>
                <span className="text-xl font-black text-slate-800 font-display mt-0.5 select-all">16793</span>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5 font-sans">9 AM - 8 PM</span>
              </div>
            </div>

            {/* Store Locator Card */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/50 hover:border-slate-300 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-105 transition-transform">
                <MapPin size={22} className="stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono">Place</span>
                <span className="text-sm font-bold text-slate-800 font-display mt-0.5">Store Locator</span>
                <a href="#" className="text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 mt-1 tracking-wider inline-flex items-center gap-1">
                  Find Our Stores
                </a>
              </div>
            </div>

            {/* Stay Connected Card */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/50">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
                <Building2 size={22} className="stroke-[2]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono font-bold">Stay Connected</span>
                <span className="text-xs font-bold text-slate-800 tracking-tight mt-0.5">Bazar_bds.com</span>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold mt-1 select-all" title="Head Office: Navana Zohura Square, Dhaka 1000, Bangladesh">
                  Head Office: Navana Zohura Square, Dhaka 1000, Bangladesh
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="text-slate-400 font-bold uppercase tracking-wider font-mono">Email:</span>
                  <a href="mailto:support@bazarbds.com" className="font-bold text-orange-600 hover:underline select-all">
                    support@bazarbds.com
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Middle Row: Links Columns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 font-mono border-b pb-2 border-slate-100">About Us</h4>
              <nav className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                <a href="#" className="hover:text-orange-600 transition-colors">About Us</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Affiliate Program</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Career</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Blog</a>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 font-mono border-b pb-2 border-slate-100">Terms & Policy</h4>
              <nav className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                <a href="#" className="hover:text-orange-600 transition-colors">EMI Terms</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Terms and Conditions</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Refund and Return Policy</a>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 font-mono border-b pb-2 border-slate-100">Services</h4>
              <nav className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                <a href="#" className="hover:text-orange-600 transition-colors">Online Delivery</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Bazar Point Policy</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-orange-600 transition-colors">Brands</a>
              </nav>
            </div>

            <div className="flex flex-col gap-3 col-span-2 sm:col-span-1">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 font-mono border-b pb-2 border-slate-100">Hotline Services</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Our customer center operates from 9 AM to 8 PM daily to provide authentic support. Feel free to contact us with any questions or order assistance.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-md shadow-green-400 blink"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Agents Online</span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright and Live Statistics */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-200/70 pt-6 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <div className="flex flex-col gap-1 items-center sm:items-start text-center sm:text-left">
              <span 
                onClick={handleFooterAdminClick}
                className="text-slate-800 text-xs text-opacity-100 cursor-pointer select-none hover:text-orange-500 transition-colors"
                title="Admin Panel Gateway"
              >
                © 2206 Bazar_bds.com — Trusted Online Shop in Bangladesh {isAdmin && "⭐ (Admin View Active)"}
              </span>
              <span className="text-slate-400 normal-case tracking-normal font-semibold">
                Bazar_bds — Premium Quality Goods & Fast Delivery. {isAdmin && <span className="text-orange-500 font-bold ml-1">Admin view active: You can manage Sidebar advertisement loops from the Ads panel.</span>}
              </span>
            </div>
            
            <div className="flex gap-4 items-center shrink-0">
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-full text-slate-500">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full blink"></span> 
                32 Live Sales
              </span>
              <a href="#" className="hover:text-orange-500 transition-colors">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-orange-500 transition-colors">Terms</a>
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
        
        /* Focus Mode Requested Injectors */
        div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) {
          font-size: 1px;
          line-height: 15px;
        }
        div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) {
          margin-left: 1px;
          margin-right: 1px;
          padding-left: 2px;
          padding-top: 0px;
          padding-bottom: 5px;
          padding-right: 2px;
        }
      `}</style>
      
      <CheckoutModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cartItems={cart}
        onSubmit={submitOrder}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
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

      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-2xl shadow-green-500/20 border border-green-100"
          >
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{successMessage}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">We will contact you via WhatsApp shortly.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <WhatsappSupport />
    </div>
  );
}
