import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ShoppingBag, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  Minus, 
  Star, 
  Heart, 
  Clock, 
  Utensils, 
  Pizza, 
  IceCream, 
  Coffee, 
  Flame, 
  Check, 
  MapPin, 
  ClipboardList, 
  AlertTriangle, 
  WifiOff, 
  X, 
  ShoppingCart, 
  User, 
  ArrowRight,
  Trash2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, getDocs } from 'firebase/firestore';
import { db, db2 } from '../lib/firebase';
import { Product } from '../types';

const fallbackFoods: any[] = [];

interface CafeCartItem {
  id: string; // product.id + size + sorted add-ons names
  product: Product;
  quantity: number;
  size: 'Small' | 'Medium' | 'Large';
  addOns: { name: string; price: number }[];
  singlePrice: number; // base price + size modifier + add-ons
}

export default function DrinkCafe() {
  const navigate = useNavigate();
  
  // Real-time products from database
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI Tab & Navigation States
  const [activeTab, setActiveTab] = useState<'home' | 'like' | 'order'>('home');
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [serverStatus, setServerStatus] = useState<'online' | 'fallback' | 'offline'>('online');
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Cart / Basket States
  const [cart, setCart] = useState<CafeCartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced Filter & Sort States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  
  // Temporary Filter selections (applied on Apply)
  const [tempFilterCategory, setTempFilterCategory] = useState('All');
  const [tempMinPrice, setTempMinPrice] = useState<number>(0);
  const [tempMaxPrice, setTempMaxPrice] = useState<number>(1000);
  const [tempMinRating, setTempMinRating] = useState<number>(0);
  const [tempDietary, setTempDietary] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [tempOnlyInStock, setTempOnlyInStock] = useState<boolean>(false);
  const [tempOnlyDiscounted, setTempOnlyDiscounted] = useState<boolean>(false);

  // Active filter states in use
  const [filterCategory, setFilterCategory] = useState('All');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [minRating, setMinRating] = useState<number>(0);
  const [dietary, setDietary] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('popular');

  // Food Customization Modal States
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<'Small' | 'Medium' | 'Large'>('Small');
  const [selectedAddOns, setSelectedAddOns] = useState<{ name: string; price: number }[]>([]);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Dynamic success banner toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Load data from real Firestore database on load
  useEffect(() => {
    setLoading(true);
    
    // Listen directly to the speedy second products collection in real-time
    const qProducts2 = query(collection(db2, 'products'), orderBy('created_at', 'desc'));
    const unsubProducts = onSnapshot(qProducts2, (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
      
      const nonFoodCategories = [
        "electronics", "fashion", "clothing", "shoes", "bags", "phones", "laptops", "gadgets", "home", "furniture", "books", "beauty", "cosmetics", "accessories", "jewelry", "watches", "sports", "fitness", "automotive", "toys"
      ];
      
      let foodsList = prodData.filter((p: any) => 
        p.category && !nonFoodCategories.includes(p.category.toLowerCase().trim())
      );
      
      if (foodsList.length > 0) {
        setProducts(foodsList);
        setServerStatus('online');
        setLoading(false);
      } else {
        // If the 2nd fast database is empty or still initializing, fall back to the primary database
        console.log("Second database empty or initializing; connecting primary database...");
        const qProducts1 = query(collection(db, 'products'), orderBy('created_at', 'desc'));
        const unsubBackup = onSnapshot(qProducts1, (snapshot1) => {
          const prodData1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
          const foodsListBackup = prodData1.filter((p: any) => 
            p.category && !nonFoodCategories.includes(p.category.toLowerCase().trim())
          );
          if (foodsListBackup.length > 0) {
            setProducts(foodsListBackup);
            setServerStatus('online');
          } else {
            setProducts(fallbackFoods as any);
            setServerStatus('fallback');
          }
          setLoading(false);
        }, (err) => {
          setProducts(fallbackFoods as any);
          setServerStatus('fallback');
          setLoading(false);
        });
        return () => unsubBackup();
      }
    }, (err) => {
      console.error("Firestore real-time food loading issue on db2:", err);
      // Fallback to local server fetch as secondary option
      fetchLocalFoods();
    });

    // Listen to cafe_orders in Firestore
    const qOrders = query(collection(db, 'cafe_orders'), orderBy('created_at', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const ordData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordData);
    }, (err) => {
      console.log('cafe_orders Firestore tracking issue:', err);
    });

    // Load checkout parameters
    const savedPhone = localStorage.getItem('customer_phone');
    if (savedPhone) setCustomerPhone(savedPhone);

    const savedName = localStorage.getItem('customer_name');
    if (savedName) setCustomerName(savedName);

    const savedAddress = localStorage.getItem('customer_address');
    if (savedAddress) setCustomerAddress(savedAddress);

    // Load liked items
    const savedLikes = localStorage.getItem('cafe_likes');
    if (savedLikes) setLikedIds(JSON.parse(savedLikes));

    // Load cart with safe format migration
    const savedCart = localStorage.getItem('cafe_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const migrated = parsed.map((item: any) => {
          if (!item.id) {
            return {
              id: `${item.product.id}-Small-`,
              product: item.product,
              quantity: item.quantity,
              size: 'Small',
              addOns: [],
              singlePrice: item.product.price
            };
          }
          return item;
        });
        setCart(migrated);
      } catch (e) {
        console.error("Cart retrieval parsing issue:", e);
      }
    }

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, []);

  // Fetch local foods as a secure server-side API fallback
  const fetchLocalFoods = async () => {
    try {
      const res = await fetch('/api/foods');
      if (res.ok) {
        const data = await res.json();
        if (data.foods && data.foods.length > 0) {
          setProducts(data.foods);
          setServerStatus('online');
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.log("Local API endpoint offline fallback:", e);
    }
    // Final offline fallback
    setProducts(fallbackFoods as any);
    setServerStatus('offline');
    setLoading(false);
  };

  // Determine dynamic list of categories from products loaded
  useEffect(() => {
    const categoriesFromDb = Array.from(new Set(
      products.map(p => p.category?.trim()).filter(Boolean)
    )) as string[];

    const desiredOrder = [
      "Burger", "Pizza", "Chicken", "Biryani", "Rice", "Fast Food", "Snacks", "Desserts", "Drinks", "Coffee", "Combo"
    ];

    const finalCategories = ["All"];
    desiredOrder.forEach(scat => {
      if (categoriesFromDb.some(c => c.toLowerCase() === scat.toLowerCase())) {
        finalCategories.push(scat);
      }
    });

    categoriesFromDb.forEach(c => {
      if (!finalCategories.some(m => m.toLowerCase() === c.toLowerCase())) {
        finalCategories.push(c);
      }
    });

    setDbCategories(finalCategories);
  }, [products]);

  // Veg vs Non-Veg dynamic keywords parsing
  const isVegProduct = (product: Product) => {
    const text = `${product.name} ${product.description || ''}`.toLowerCase();
    const nonVegKeywords = ['chicken', 'beef', 'mutton', 'meat', 'fish', 'pork', 'burger', 'pepperoni', 'sausage', 'salami', 'wings', 'prawn', 'shrimp', 'lamb'];
    return !nonVegKeywords.some(keyword => text.includes(keyword));
  };

  // 2. React Filter and Search Logic
  useEffect(() => {
    let result = products;

    // Filter by Tab (Home vs Favorites)
    if (activeTab === 'like') {
      result = result.filter(p => likedIds.includes(p.id));
    } else if (activeTab === 'home') {
      if (filterCategory !== 'All') {
        result = result.filter(p => p.category?.toLowerCase() === filterCategory.toLowerCase());
      }
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Price checks
    result = result.filter(p => {
      const actualPrice = p.discount ? p.price * (1 - p.discount/100) : p.price;
      return actualPrice >= minPrice && actualPrice <= maxPrice;
    });

    // Rating checks
    if (minRating > 0) {
      result = result.filter(p => (p.rating || 4.5) >= minRating);
    }

    // Vegetarian / Non-vegetarian checks
    if (dietary === 'veg') {
      result = result.filter(p => isVegProduct(p));
    } else if (dietary === 'non-veg') {
      result = result.filter(p => !isVegProduct(p));
    }

    // Availability checks
    if (onlyInStock) {
      result = result.filter(p => p.stock === undefined || p.stock > 0);
    }

    // Only Discounted checks
    if (onlyDiscounted) {
      result = result.filter(p => p.discount !== undefined && p.discount > 0);
    }

    // Dynamic sorting logic
    const sorted = [...result];
    if (sortOption === 'popular') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortOption === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === 'price_asc') {
      sorted.sort((a, b) => {
        const pA = a.discount ? a.price * (1 - a.discount/100) : a.price;
        const pB = b.discount ? b.price * (1 - b.discount/100) : b.price;
        return pA - pB;
      });
    } else if (sortOption === 'price_desc') {
      sorted.sort((a, b) => {
        const pA = a.discount ? a.price * (1 - a.discount/100) : a.price;
        const pB = b.discount ? b.price * (1 - b.discount/100) : b.price;
        return pB - pA;
      });
    } else if (sortOption === 'rating') {
      sorted.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
    } else if (sortOption === 'discount') {
      sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    }

    setFilteredProducts(sorted);
  }, [products, activeTab, likedIds, filterCategory, searchQuery, minPrice, maxPrice, minRating, dietary, onlyInStock, onlyDiscounted, sortOption]);

  // Handle Like/Favorite toggle
  const toggleLike = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('cafe_likes', JSON.stringify(next));
      return next;
    });
  };

  // Trigger food modal for dynamic configuration
  const openCustomizationModal = (product: Product) => {
    setCustomizingProduct(product);
    setSelectedSize('Small');
    setSelectedAddOns([]);
    setModalQuantity(1);
    setAddedAnimation(false);
  };

  // Add customized food options into cart state
  const addCustomFoodToCart = () => {
    if (!customizingProduct) return;
    
    const basePrice = customizingProduct.discount 
      ? customizingProduct.price * (1 - customizingProduct.discount/100) 
      : customizingProduct.price;
      
    const isDrink = ['drinks', 'coffee', 'beverages', 'beverage', 'cafe'].includes(customizingProduct.category?.toLowerCase() || '');
    const sizeModifier = isDrink ? (selectedSize === 'Medium' ? 50 : selectedSize === 'Large' ? 100 : 0) : 0;
    const addOnsTotal = selectedAddOns.reduce((sum, item) => sum + item.price, 0);
    const singlePrice = basePrice + sizeModifier + addOnsTotal;

    const addOnsKey = selectedAddOns.map(a => a.name).sort().join(',');
    const itemUniqueId = `${customizingProduct.id}-${selectedSize}-${addOnsKey}`;

    const newCartItem: CafeCartItem = {
      id: itemUniqueId,
      product: customizingProduct,
      quantity: modalQuantity,
      size: selectedSize,
      addOns: selectedAddOns,
      singlePrice
    };

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.id === itemUniqueId);
      let updated;
      if (existingIdx > -1) {
        updated = [...prev];
        updated[existingIdx].quantity += modalQuantity;
      } else {
        updated = [...prev, newCartItem];
      }
      localStorage.setItem('cafe_cart', JSON.stringify(updated));
      return updated;
    });

    setAddedAnimation(true);
    setToastMessage(`Added ${customizingProduct.name} (${selectedSize}) to cart ✓`);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setCustomizingProduct(null);
    }, 1500);
  };

  // Quick addition with standard small settings directly from card
  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock === 0) return;

    const basePrice = product.discount ? product.price * (1 - product.discount/100) : product.price;
    const itemUniqueId = `${product.id}-Small-`;

    const quickItem: CafeCartItem = {
      id: itemUniqueId,
      product,
      quantity: 1,
      size: 'Small',
      addOns: [],
      singlePrice: basePrice
    };

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.id === itemUniqueId);
      let updated;
      if (existingIdx > -1) {
        updated = [...prev];
        updated[existingIdx].quantity += 1;
      } else {
        updated = [...prev, quickItem];
      }
      localStorage.setItem('cafe_cart', JSON.stringify(updated));
      return updated;
    });

    setToastMessage(`Added ${product.name} to cart ✓`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Modify cart quantity from the cart slide view
  const updateCartItemQty = (itemId: string, delta: number) => {
    setCart(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      if (index === -1) return prev;
      
      let updated = [...prev];
      const newQty = updated[index].quantity + delta;
      
      if (newQty <= 0) {
        updated = updated.filter(item => item.id !== itemId);
      } else {
        updated[index].quantity = newQty;
      }
      
      localStorage.setItem('cafe_cart', JSON.stringify(updated));
      return updated;
    });
  };

  // Remove completely from checkout basket
  const removeCartItem = (itemId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.id !== itemId);
      localStorage.setItem('cafe_cart', JSON.stringify(updated));
      return updated;
    });
  };

  // Place order logic persisting data directly to the Firestore collection `cafe_orders`
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress || cart.length === 0) return;

    setIsSubmitting(true);
    localStorage.setItem('customer_name', customerName);
    localStorage.setItem('customer_phone', customerPhone);
    localStorage.setItem('customer_address', customerAddress);

    try {
      const deliveryCharge = 60;
      const subtotal = cart.reduce((sum, item) => sum + (item.singlePrice * item.quantity), 0);
      const totalAmount = subtotal + deliveryCharge;

      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        size: item.size,
        add_ons: item.addOns.map(a => a.name),
        price: item.singlePrice,
        image: item.product.image
      }));

      const newOrderPayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: orderItems,
        total: totalAmount,
        status: 'Pending Confirmation',
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'cafe_orders'), newOrderPayload);
      
      // Notify Admin Backend of new Order
      try {
        await fetch('/api/notify/order-placed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: docRef.id,
            customerName,
            whatsapp: customerPhone,
            items: cart,
            totalAmount,
            location: customerAddress
          })
        });
      } catch (notifyErr) {
        console.warn("Backend order notification failed:", notifyErr);
      }

      setOrderSuccess(docRef.id);
      setCart([]);
      localStorage.removeItem('cafe_cart');
      setShowCartDrawer(false);
      setIsSubmitting(false);
      setActiveTab('order');
    } catch (err) {
      console.error('Error submitting order to cafe_orders:', err);
      setIsSubmitting(false);
    }
  };

  // Cart financial summary variables
  const subtotalAmount = cart.reduce((sum, item) => sum + (item.singlePrice * item.quantity), 0);
  const deliveryFee = subtotalAmount > 0 ? 60 : 0;
  
  // Calculate savings from active database discounts
  const totalSavings = cart.reduce((sum, item) => {
    const originalPrice = item.product.price;
    const sizeModifier = item.size === 'Medium' ? 50 : item.size === 'Large' ? 100 : 0;
    const addOnsTotal = item.addOns.reduce((s, a) => s + a.price, 0);
    const originalWithModifiers = originalPrice + sizeModifier + addOnsTotal;
    
    return sum + ((originalWithModifiers - item.singlePrice) * item.quantity);
  }, 0);

  const grandTotalAmount = subtotalAmount + deliveryFee;
  const totalCartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Filter orders tied directly to the phone number profile in real-time
  const myOrdersList = orders.filter(o => customerPhone && o.customer_phone === customerPhone);

  // Toggle add-on in customization view
  const toggleAddOn = (addOn: { name: string; price: number }) => {
    setSelectedAddOns(prev => 
      prev.some(a => a.name === addOn.name)
        ? prev.filter(a => a.name !== addOn.name)
        : [...prev, addOn]
    );
  };

  // Apply filters from bottom sheet
  const handleApplyFilters = () => {
    setFilterCategory(tempFilterCategory);
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setMinRating(tempMinRating);
    setDietary(tempDietary);
    setOnlyInStock(tempOnlyInStock);
    setOnlyDiscounted(tempOnlyDiscounted);
    setShowFilterModal(false);
  };

  // Reset filters to default state
  const handleResetFilters = () => {
    setTempFilterCategory('All');
    setTempMinPrice(0);
    setTempMaxPrice(1000);
    setTempMinRating(0);
    setTempDietary('all');
    setTempOnlyInStock(false);
    setTempOnlyDiscounted(false);

    setFilterCategory('All');
    setMinPrice(0);
    setMaxPrice(1000);
    setMinRating(0);
    setDietary('all');
    setOnlyInStock(false);
    setOnlyDiscounted(false);
    setShowFilterModal(false);
  };

  // Pre-filter products for the Featured Section (e.g. rating >= 4.7 or explicitly discounted)
  const featuredFoods = products
    .filter(p => (p.rating || 4.5) >= 4.7 || (p.discount && p.discount > 0))
    .slice(0, 4);

  return (
    <div className="bg-[#FAF9F6] min-h-screen text-[#1A301E] pb-32 font-sans relative antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* 1. Live Server Status Banner */}
      <div className="hidden bg-emerald-50/70 border-b border-emerald-100/50 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-800 backdrop-blur-md">
        <div className="flex items-center gap-2" id="server-status-pill">
          {serverStatus === 'online' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Food Database Connected</span>
            </>
          ) : serverStatus === 'fallback' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Offline Cache loaded (Dynamic Local fallback)</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-rose-500" />
              <span>API Offline (Displaying Fallback Specialty Inventory)</span>
            </>
          )}
        </div>
        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-700/60 hidden sm:inline">Drink Cafe Kitchen Gateway</span>
      </div>

      {/* 2. Header with Back Button and Cart Action */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#FAF9F6]/10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            id="back-home-btn"
            onClick={() => navigate('/')}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-emerald-800 shadow-sm active:scale-95 transition-all"
            title="Back to marketplace"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-emerald-950 uppercase">Drink Cafe</h1>
            <p className="text-[10px] font-bold text-emerald-600/70 tracking-widest uppercase">Gourmet Food Page</p>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center gap-1 bg-white border border-slate-100 p-1 rounded-2xl">
          <button 
            id="tab-home"
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'home' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Menu
          </button>
          <button 
            id="tab-favorites"
            onClick={() => setActiveTab('like')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'like' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Likes
          </button>
          <button 
            id="tab-orders"
            onClick={() => setActiveTab('order')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'order' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Orders
          </button>
        </div>

        {/* Checkout basket indicator button */}
        <button 
          id="cart-drawer-btn"
          onClick={() => setShowCartDrawer(true)}
          className="w-11 h-11 rounded-2xl bg-emerald-800 hover:bg-emerald-900 flex items-center justify-center text-white shadow-lg shadow-emerald-800/10 active:scale-95 transition-all relative"
          title="Open basket drawer"
        >
          <ShoppingBag size={20} />
          {totalCartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] font-black text-white animate-scale-in">
              {totalCartItemCount}
            </span>
          )}
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-6" id="main-content-flow">
        
        {/* Order queue live tracking tab */}
        {activeTab === 'order' ? (
          <div className="max-w-2xl mx-auto py-6">
            <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm mb-6" id="order-tracker-form">
              <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2 mb-2">
                <ClipboardList size={22} className="text-emerald-700" /> Live Tracker
              </h2>
              <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
                Registered Profile: <span className="text-emerald-700 font-black ml-1">{customerPhone || 'None Specified'}</span>
              </p>
              
              {!customerPhone && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Save Phone Number to track status:</label>
                  <div className="flex gap-2">
                    <input 
                      id="customer-verify-phone"
                      type="text" 
                      placeholder="e.g. 017xxxxxxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-800/20"
                    />
                    <button 
                      id="save-phone-pref-btn"
                      onClick={() => localStorage.setItem('customer_phone', customerPhone)}
                      className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-black text-sm transition-colors active:scale-95"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </div>

            {myOrdersList.length > 0 ? (
              <div className="space-y-4" id="order-track-cards">
                {myOrdersList.map((ord, idx) => (
                  <motion.div 
                    key={ord.id || idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full tracking-wider border border-emerald-100/50">
                          ID: {ord.id.slice(0, 8).toUpperCase()}
                        </span>
                        <p className="text-xs font-bold text-slate-400 mt-2">
                          {new Date(ord.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-950">{ord.total} ৳</span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 mt-1 justify-end">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          {ord.status}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {ord.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm font-bold text-slate-600">
                          <span>
                            {item.product_name || item.name} 
                            {item.size && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-1 font-bold">{item.size}</span>}
                            {item.add_ons && item.add_ons.length > 0 && <span className="text-[10px] text-slate-400 block">+ {item.add_ons.join(', ')}</span>}
                          </span>
                          <span className="text-slate-800 font-black">{item.price ? item.price * (item.quantity || 1) : ord.total} ৳</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-500 flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-700 shrink-0" />
                      <span>Delivery Address: {ord.customer_address || ord.location}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
                <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-black text-emerald-950">Active queue is empty</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Live orders linked to verified phone will track here.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Top Title Section */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black text-emerald-950 tracking-tight uppercase" id="food-title-h2">
                  {filterCategory === 'All' ? 'FOOD Specials' : filterCategory}
                </h2>
                <p className="text-slate-500 text-sm font-semibold mt-1">
                  {filterCategory === 'All' ? 'Delicious food, made fresh for you.' : `Freshly prepared gourmet ${filterCategory.toLowerCase()} selections.`}
                </p>
              </div>

              {/* 3. Search and Filter Bar Row */}
              <div className="flex items-center gap-2 w-full md:max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    id="food-search-query-input"
                    type="text" 
                    placeholder="Search Burger, Pizza, Chicken..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200/80 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-800/20 shadow-3xs"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button 
                  id="filter-trigger-modal-btn"
                  onClick={() => setShowFilterModal(true)}
                  className="px-4 py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-3xs hover:bg-slate-50 active:scale-95 transition-all gap-1.5 text-xs font-black uppercase"
                  title="Filter options"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* 4. Horizontal Categories Selector */}
            <section className="mb-8 overflow-hidden relative">
              <div 
                className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth" 
                id="horizontal-category-scroller"
              >
                {dbCategories.map((cat, idx) => {
                  const isActive = filterCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={idx}
                      id={`category-item-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-5 py-3 rounded-2xl font-black text-xs shrink-0 active:scale-98 transition-all uppercase tracking-wider ${
                        isActive 
                          ? 'bg-emerald-800 text-white shadow-md shadow-emerald-800/10' 
                          : 'bg-white text-slate-600 border border-slate-200/50 hover:bg-slate-50'
                      }`}
                    >
                      {cat === 'All' ? '🍽️ All Foods' : cat}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5. Featured Food Section */}
            {activeTab === 'home' && !searchQuery && filterCategory === 'All' && featuredFoods.length > 0 && (
              <section className="mb-10" id="featured-food-section">
                <h3 className="text-lg font-black uppercase tracking-wider text-emerald-950 mb-4 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-600 fill-emerald-600" /> Chef's Specialties
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="featured-grid">
                  {featuredFoods.map((p) => {
                    const actualPrice = p.discount ? p.price * (1 - p.discount/100) : p.price;
                    const hasDiscount = p.discount !== undefined && p.discount > 0;
                    return (
                      <div 
                        key={p.id}
                        id={`featured-card-${p.id}`}
                        onClick={() => openCustomizationModal(p)}
                        className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row cursor-pointer group"
                      >
                        <div className="w-full sm:w-2/5 h-48 sm:h-auto relative overflow-hidden bg-slate-100 shrink-0">
                          <img 
                            src={p.image} 
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          {hasDiscount && (
                            <span className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                              {p.discount}% OFF
                            </span>
                          )}
                          {p.spicy_level && p.spicy_level !== 'none' && (
                            <span className="absolute top-4 right-4 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                              🌶️ {p.spicy_level.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        <div className="p-6 flex flex-col justify-between flex-1">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{p.category}</span>
                              <div className="flex items-center gap-1">
                                <Star size={12} className="fill-amber-500 text-amber-500" />
                                <span className="text-xs font-black text-slate-800">{p.rating || 4.7}</span>
                              </div>
                            </div>
                            
                            <h4 className="text-lg font-black text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">{p.name}</h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed mb-4">{p.description || 'Gourmet cafe specialty item curated fresh from our kitchen.'}</p>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-black text-slate-950">{actualPrice} ৳</span>
                              {hasDiscount && (
                                <span className="text-xs text-slate-400 line-through">{p.price} ৳</span>
                              )}
                            </div>

                            <button
                              id={`add-featured-${p.id}`}
                              onClick={(e) => { e.stopPropagation(); openCustomizationModal(p); }}
                              className="px-4 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-800 hover:text-white rounded-xl font-black text-xs transition-all flex items-center gap-1 active:scale-95"
                            >
                              <Plus size={14} />
                              <span>Customise</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 6. Dynamic Responsive Food Grid */}
            <section id="menu-food-grid-section">
              <h3 className="text-lg font-black uppercase tracking-wider text-emerald-950 mb-4" id="main-menu-grid-title">
                {activeTab === 'like' ? '❤️ Saved Cravings' : `${filterCategory} Specialties`}
              </h3>

              {loading ? (
                // SKELETON LOADING
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="skeletons-container">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div key={n} className="bg-white rounded-[2.5rem] border border-slate-100 p-4 space-y-4 shadow-3xs animate-pulse">
                      <div className="w-full h-44 bg-slate-100 rounded-[2rem]" />
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-slate-100 rounded w-1/3" />
                        <div className="h-8 bg-slate-100 rounded-full w-10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div 
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" 
                  id="food-grid-container"
                >
                  {filteredProducts.map((product) => {
                    const actualPrice = product.discount ? product.price * (1 - product.discount/100) : product.price;
                    const hasDiscount = product.discount !== undefined && product.discount > 0;
                    const isLiked = likedIds.includes(product.id);
                    const isSoldOut = product.stock === 0;

                    return (
                      <motion.div
                        key={product.id}
                        id={`product-card-${product.id}`}
                        onClick={() => openCustomizationModal(product)}
                        className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-3xs hover:shadow-sm hover:border-slate-200/50 transition-all duration-300 flex flex-col justify-between cursor-pointer group relative"
                        whileHover={{ y: -4 }}
                      >
                        {/* Heart Favorite Like Switch */}
                        <button 
                          id={`like-toggle-${product.id}`}
                          onClick={(e) => toggleLike(product.id, e)}
                          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                          <Heart size={16} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                        </button>

                        <div className="relative h-44 w-full bg-slate-50 overflow-hidden">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none"
                            onContextMenu={(e) => e.preventDefault()}
                          />
                          {hasDiscount && (
                            <span className="absolute top-4 left-4 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                              {product.discount}% OFF
                            </span>
                          )}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-3xs flex items-center justify-center">
                              <span className="bg-rose-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider shadow-md">
                                Sold Out
                              </span>
                            </div>
                          )}
                          {product.spicy_level && product.spicy_level !== 'none' && (
                            <span className="absolute bottom-3 left-4 bg-rose-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              🌶️ {product.spicy_level.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {/* Text Block */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                {product.category || 'Specialty'}
                              </span>
                              <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                                <Star size={10} className="fill-amber-500 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-700">{product.rating || 4.8}</span>
                              </div>
                            </div>
                            
                            <h4 className="font-black text-sm text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug line-clamp-1">
                              {product.name}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {product.description || 'Artisan specialty prepared with fresh ingredients.'}
                            </p>
                          </div>

                          {/* Price & Trigger Controls */}
                          <div className="flex items-center justify-between pt-3.5 border-t border-slate-100/50">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Price</p>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-base font-black text-[#1A301E]">
                                  {actualPrice} ৳
                                </span>
                                {hasDiscount && (
                                  <span className="text-[10px] text-slate-400 line-through">
                                    {product.price} ৳
                                  </span>
                                )}
                              </div>
                            </div>

                            <button 
                              id={`quick-add-${product.id}`}
                              onClick={(e) => handleQuickAdd(product, e)}
                              disabled={isSoldOut}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                isSoldOut 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                  : 'bg-emerald-50 hover:bg-emerald-800 text-emerald-800 hover:text-white active:scale-95 shadow-3xs'
                              }`}
                              title={isSoldOut ? "Item Sold Out" : "Add standard version to cart"}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
                  <Utensils className="mx-auto text-slate-300 mb-4" size={48} />
                  <h3 className="text-lg font-black text-emerald-950">No food specials match</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Try adjusting your filters or query</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* 7. CUSTOM FOOD DETAILS AND CUSTOMIZATION MODAL (Bottom sheet style) */}
      <AnimatePresence>
        {customizingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-3xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setCustomizingProduct(null)} />

            <motion.div 
              id="food-detail-modal-card"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 relative z-10 max-h-[92vh] flex flex-col focus:outline-none"
            >
              
              {/* Close Button Trigger */}
              <button 
                id="close-customise-modal"
                onClick={() => setCustomizingProduct(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                <X size={16} />
              </button>

              {/* Parallax Product Image Scroll Area */}
              <div className="relative h-64 w-full shrink-0 bg-slate-150">
                <img 
                  src={customizingProduct.image} 
                  alt={customizingProduct.name}
                  className="w-full h-full object-cover select-none"
                  onContextMenu={(e) => e.preventDefault()}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                
                {/* Visual Category & Name Tag overlay */}
                <div className="absolute bottom-5 left-6 text-white text-left pr-12">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md backdrop-blur-md">{customizingProduct.category}</span>
                  <h3 className="text-3xl font-black tracking-tight mt-1 leading-tight">{customizingProduct.name}</h3>
                </div>

                {/* Spicy level badge on image */}
                {customizingProduct.spicy_level && customizingProduct.spicy_level !== 'none' && (
                  <div className="absolute top-4 left-4 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-md uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    🌶️ {customizingProduct.spicy_level.replace('_', ' ')}
                  </div>
                )}

                {/* Discount tag if there is a discount */}
                {customizingProduct.discount !== undefined && customizingProduct.discount > 0 && (
                  <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-lg uppercase tracking-wider border border-white/20">
                    {customizingProduct.discount}% OFF
                  </div>
                )}
              </div>

              {/* Scrollable details and customization checkboxes */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-left">
                
                {/* Description & Preparation details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="fill-amber-500 text-amber-500" />
                      <span className="text-slate-800 font-black">{customizingProduct.rating || 4.8}</span>
                      <span className="text-slate-400">(245 Reviews)</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-emerald-700" />
                      <span>Prep time: 10-15 Mins</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    {customizingProduct.description || 'Gourmet cafe specialty carefully prepared fresh on request. Seasoned beautifully with our house premium ingredients.'}
                  </p>

                  {/* Highlights section to make it look highly updated and premium */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F9F5] rounded-xl border border-emerald-50 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      🥦 100% Fresh
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      ⏱️ Made to Order
                    </div>
                  </div>
                </div>

                {/* SIZE SELECTOR GROUP - Render ONLY if the item belongs to a Drinks category */}
                {['drinks', 'coffee', 'beverages', 'beverage', 'cafe'].includes(customizingProduct.category?.toLowerCase() || '') ? (
                  <div className="space-y-3 bg-slate-50 p-4.5 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">Select Cup Size</span>
                        <span className="text-[10px] text-slate-400 font-bold">Standard or custom sized servings</span>
                      </div>
                      <span className="text-[9px] bg-emerald-800/10 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-black tracking-widest">Required</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { name: 'Small', label: 'S', modifier: 0, desc: 'Regular Size' },
                        { name: 'Medium', label: 'M', modifier: 50, desc: 'Medium (+৳50)' },
                        { name: 'Large', label: 'L', modifier: 100, desc: 'Large (+৳100)' }
                      ].map((sz, i) => {
                        const baseItemPrice = customizingProduct.discount 
                          ? customizingProduct.price * (1 - customizingProduct.discount/100) 
                          : customizingProduct.price;
                        const sizePrice = baseItemPrice + sz.modifier;
                        const isSelected = selectedSize === sz.name;

                        return (
                          <button
                            key={i}
                            id={`size-selector-${sz.name.toLowerCase()}`}
                            onClick={() => setSelectedSize(sz.name as any)}
                            className={`p-3 rounded-2xl border-2 text-center transition-all ${
                              isSelected 
                                ? 'border-emerald-800 bg-emerald-50/50 text-emerald-950 scale-[1.01] font-black shadow-3xs' 
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-500'
                            }`}
                          >
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-950">{sz.label}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{sz.name}</p>
                            <p className="text-xs font-black mt-1 text-emerald-800">{sizePrice} ৳</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* ADD-ONS SELECTOR GROUP */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-950">Add Extra Delights</span>
                    <span className="text-[10px] text-slate-400 font-bold">Optional</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3" id="addons-grid-container">
                    {[
                      { name: 'Extra Cheese', price: 30 },
                      { name: 'Extra Chicken', price: 60 },
                      { name: 'Extra Sauce', price: 20 },
                      { name: 'Extra Fries', price: 50 }
                    ].map((addon, i) => {
                      const isChecked = selectedAddOns.some(a => a.name === addon.name);
                      return (
                        <button
                          key={i}
                          id={`addon-toggle-${addon.name.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => toggleAddOn(addon)}
                          className={`p-3 rounded-2xl border flex items-center justify-between text-left transition-all ${
                            isChecked 
                              ? 'border-emerald-800 bg-emerald-50/30 text-emerald-950 font-black' 
                              : 'border-slate-150 hover:border-slate-200 bg-slate-50/50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-emerald-800 border-emerald-800 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check size={12} strokeWidth={3} />}
                            </span>
                            <span className="text-xs font-bold">{addon.name}</span>
                          </div>
                          <span className="text-xs font-black text-emerald-800 shrink-0">+৳{addon.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* QUANTITY CONTROL & LIVE TOTAL PRICE CARD */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Select Quantity</span>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
                      <button 
                        id="qty-modal-decrement"
                        onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm transition-all cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-black text-slate-800">{modalQuantity}</span>
                      <button 
                        id="qty-modal-increment"
                        onClick={() => setModalQuantity(prev => prev + 1)}
                        className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Estimated Total</span>
                    <span className="text-2xl font-black text-emerald-950" id="live-estimated-total-text">
                      {(() => {
                        const baseItemPrice = customizingProduct.discount 
                          ? customizingProduct.price * (1 - customizingProduct.discount/100) 
                          : customizingProduct.price;
                        const isDrink = ['drinks', 'coffee', 'beverages', 'beverage', 'cafe'].includes(customizingProduct.category?.toLowerCase() || '');
                        const sizeModifier = isDrink ? (selectedSize === 'Medium' ? 50 : selectedSize === 'Large' ? 100 : 0) : 0;
                        const addOnsTotal = selectedAddOns.reduce((sum, item) => sum + item.price, 0);
                        return (baseItemPrice + sizeModifier + addOnsTotal) * modalQuantity;
                      })()} ৳
                    </span>
                  </div>
                </div>

              </div>

              {/* Bottom Action Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                <button 
                  id="add-customised-to-cart-action-btn"
                  onClick={addCustomFoodToCart}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  {addedAnimation ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Added to cart ✓</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={18} />
                      <span>Add to Cart Basket</span>
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. BASKET DRAWER / BASKET CHECKOUT PANEL */}
      <AnimatePresence>
        {showCartDrawer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-3xs flex justify-end" id="basket-drawer-outer">
            
            {/* Backdrop close */}
            <div className="absolute inset-0" onClick={() => setShowCartDrawer(false)} />

            <motion.div 
              id="basket-drawer-card"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "tween", duration: 0.3 }}
              className="bg-white w-full max-w-md h-full shadow-2xl relative z-10 flex flex-col focus:outline-none"
            >
              
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 text-left">
                <div>
                  <h3 className="text-xl font-black text-emerald-950 uppercase tracking-tight">Cart Basket</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">Order Review & Details</p>
                </div>
                <button 
                  id="close-basket-drawer"
                  onClick={() => setShowCartDrawer(false)}
                  className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Basket list content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                {cart.length > 0 ? (
                  <div className="space-y-4" id="basket-items-list">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Itemized Breakdown</p>
                    {cart.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-start justify-between bg-slate-50/70 p-4 rounded-2xl border border-slate-150/50 relative group"
                        id={`cart-item-${item.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                            <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                          </div>
                          
                          <div>
                            <h5 className="font-black text-sm text-slate-900 leading-snug line-clamp-1">{item.product.name}</h5>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[9px] font-black bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                                {item.size}
                              </span>
                              {item.addOns.map((a, i) => (
                                <span key={i} className="text-[9px] font-bold text-slate-400">
                                  + {a.name}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs font-black text-emerald-800 mt-2">{item.singlePrice} ৳</p>
                          </div>
                        </div>

                        {/* Quantity and Delete row */}
                        <div className="flex flex-col items-end justify-between h-full min-h-[56px] shrink-0">
                          <button 
                            id={`remove-cart-item-${item.id}`}
                            onClick={() => removeCartItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>

                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                            <button 
                              id={`qty-decrement-${item.id}`}
                              onClick={() => updateCartItemQty(item.id, -1)}
                              className="w-6 h-6 rounded bg-slate-50 text-slate-500 flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                            <button 
                              id={`qty-increment-${item.id}`}
                              onClick={() => updateCartItemQty(item.id, 1)}
                              className="w-6 h-6 rounded bg-slate-50 text-slate-500 flex items-center justify-center font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Financial Summary panel */}
                    <div className="pt-4 border-t border-slate-100 space-y-2 text-xs font-bold text-slate-500" id="basket-totals-card">
                      <div className="flex items-center justify-between">
                        <span>Original Subtotal</span>
                        <span>{subtotalAmount + totalSavings} ৳</span>
                      </div>
                      {totalSavings > 0 && (
                        <div className="flex items-center justify-between text-emerald-600 font-black">
                          <span>Database Discount Savings</span>
                          <span>- {totalSavings} ৳</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>Delivery Fee</span>
                        <span>{deliveryFee} ৳</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50 font-black text-base text-slate-900">
                        <span>Grand Total</span>
                        <span>{grandTotalAmount} ৳</span>
                      </div>
                    </div>

                    {/* Delivery Form parameters */}
                    <form onSubmit={handlePlaceOrder} className="space-y-4 pt-4 border-t border-slate-100 text-left" id="checkout-form">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Delivery Instructions</p>
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Recipient Name</label>
                        <input 
                          id="customer-name-field"
                          type="text" 
                          required
                          placeholder="e.g. Karim Rahman"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-800/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">WhatsApp Mobile (Tied to order queue)</label>
                        <input 
                          id="customer-phone-field"
                          type="text" 
                          required
                          placeholder="e.g. 017xxxxxxxx"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-800/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Shipping Address</label>
                        <textarea 
                          id="customer-address-field"
                          required
                          rows={2}
                          placeholder="Provide street address, floor or landmark details..."
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-800/20 resize-none"
                        />
                      </div>

                      <button 
                        id="place-order-submit-btn"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-800/15 transition-all flex items-center justify-center gap-2 active:scale-98"
                      >
                        {isSubmitting ? 'Securing kitchen queue...' : `Place Gourmet Order (${grandTotalAmount} ৳)`}
                      </button>
                    </form>

                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <ShoppingBag className="mx-auto text-slate-300 mb-4 animate-bounce" size={48} />
                    <h4 className="font-black text-slate-800 text-base">Your basket is empty</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Choose some delicious cravings from the menu page to order.</p>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. ADVANCED MULTI-OPTIONS FILTER BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {showFilterModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-3xs flex items-end justify-center">
            
            {/* Backdrop close */}
            <div className="absolute inset-0" onClick={() => setShowFilterModal(false)} />

            <motion.div 
              id="filter-modal-card"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 text-left relative z-10 max-h-[85vh] overflow-y-auto space-y-6 flex flex-col focus:outline-none"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div>
                  <h4 className="text-lg font-black text-emerald-950 uppercase tracking-tight">Sort & Filter</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Customise your appetite</p>
                </div>
                <button 
                  id="close-filters-btn"
                  onClick={() => setShowFilterModal(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6 overflow-y-auto pr-1">
                
                {/* SORT OPTIONS */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sort Catalog By</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'popular', label: '⭐ Popular' },
                      { value: 'newest', label: '🆕 New Arrivals' },
                      { value: 'price_asc', label: '৳ Price: Low → High' },
                      { value: 'price_desc', label: '৳ Price: High → Low' },
                      { value: 'rating', label: '★ Highest Rated' },
                      { value: 'discount', label: '🏷️ Best Deals' }
                    ].map((sort) => {
                      const isSel = sortOption === sort.value;
                      return (
                        <button
                          key={sort.value}
                          id={`sort-option-btn-${sort.value}`}
                          onClick={() => setSortOption(sort.value)}
                          className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                            isSel 
                              ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {sort.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CATEGORIES SELECTION */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Category Selection</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dbCategories.map((cat, idx) => {
                      const isSel = tempFilterCategory === cat;
                      return (
                        <button
                          key={idx}
                          id={`temp-cat-btn-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => setTempFilterCategory(cat)}
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                            isSel 
                              ? 'bg-emerald-800 text-white border-emerald-800' 
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DIETARY LABELS */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dietary Preferences</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'all', label: '🍳 All Items' },
                      { val: 'veg', label: '🌿 Vegetarian' },
                      { val: 'non-veg', label: '🍖 Non-Veg' }
                    ].map((pref) => {
                      const isSel = tempDietary === pref.val;
                      return (
                        <button
                          key={pref.val}
                          id={`dietary-pref-btn-${pref.val}`}
                          onClick={() => setTempDietary(pref.val as any)}
                          className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                            isSel 
                              ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {pref.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PRICE RANGE INPUTS */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Price Budget Limits (৳)</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Min Price</span>
                      <input 
                        id="filter-min-price-input"
                        type="number" 
                        value={tempMinPrice}
                        onChange={(e) => setTempMinPrice(Number(e.target.value))}
                        className="w-full bg-transparent font-black text-slate-800 text-xs mt-1 outline-none"
                      />
                    </div>
                    <span className="text-slate-400 font-black">to</span>
                    <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Max Price</span>
                      <input 
                        id="filter-max-price-input"
                        type="number" 
                        value={tempMaxPrice}
                        onChange={(e) => setTempMaxPrice(Number(e.target.value))}
                        className="w-full bg-transparent font-black text-slate-800 text-xs mt-1 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* MINIMUM RATING */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Minimum Review Rating</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 3, 4, 4.5].map((stars) => {
                      const isSel = tempMinRating === stars;
                      return (
                        <button
                          key={stars}
                          id={`rating-star-btn-${stars}`}
                          onClick={() => setTempMinRating(stars)}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-black transition-all ${
                            isSel 
                              ? 'bg-emerald-800 text-white border-emerald-800' 
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {stars === 0 ? 'Any ⭐' : `${stars}★ & above`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SPECIAL STATE TOGGLES */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer" id="label-only-stock">
                    <input 
                      id="only-stock-checkbox"
                      type="checkbox" 
                      checked={tempOnlyInStock}
                      onChange={(e) => setTempOnlyInStock(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800/25"
                    />
                    <span className="text-xs font-bold text-slate-700">In Stock Only</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer" id="label-only-discounted">
                    <input 
                      id="only-discounted-checkbox"
                      type="checkbox" 
                      checked={tempOnlyDiscounted}
                      onChange={(e) => setTempOnlyDiscounted(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800/25"
                    />
                    <span className="text-xs font-bold text-slate-700">Active Deals Only</span>
                  </label>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button 
                  id="reset-filters-btn"
                  onClick={handleResetFilters}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-black text-xs text-slate-700 uppercase tracking-wider active:scale-95 transition-all"
                >
                  Reset
                </button>
                <button 
                  id="apply-filters-btn"
                  onClick={handleApplyFilters}
                  className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 rounded-xl font-black text-xs text-white uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-emerald-800/10"
                >
                  Apply Filters
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. SUCCESS CONFIRMATION BANNER / TOAST */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            id="success-toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A301E] text-emerald-50 px-6 py-4.5 rounded-full flex items-center gap-3.5 shadow-2xl border border-emerald-800/30"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md">
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="text-xs font-black uppercase tracking-wider font-sans whitespace-nowrap">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
