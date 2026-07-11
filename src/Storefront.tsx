import { Filter, LayoutGrid, AlertCircle, CheckCircle2, X, Utensils, Shirt, Cpu, Bot, Laptop, Dumbbell, ShoppingCart, Scissors, User2, Sparkles, Tv, Volume, Volume1, Volume2, VolumeX, Zap, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import HeroBanner from './components/Banner';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CheckoutModal from './components/CheckoutModal';
import TrackingModal from './components/TrackingModal';
import WhatsappSupport from './components/WhatsappSupport';
import BottomNav from './components/BottomNav';
import CategoryScroller from './components/CategoryScroller';
import SellerModal from './components/SellerModal';
import ScrollButton from './components/ScrollButton';
import PolicyModal from './components/PolicyModal';
import AuthModal from './components/AuthModal';
import DotLoader from './components/DotLoader';
import PopupAd from './components/PopupAd';
import SuperSaleCard from './components/SuperSaleCard';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, addDoc, where, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { Banner, Product, CartItem, Seller } from './types';
import { getSellers, isFirestoreQuotaExceeded, setFirestoreQuotaExceeded } from './lib/db-sync';
import { formatWhatsappNumber } from './lib/utils';
import { Storage } from './lib/storage';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  
  useEffect(() => {
    const loadCart = async () => {
      const savedCart = await Storage.getLarge<CartItem[]>('pbazar_cart');
      if (savedCart && Array.isArray(savedCart)) {
        setCart(savedCart);
      }
    };
    loadCart();
  }, []);

  useEffect(() => {
    const saveCart = async () => {
      if (cart.length > 0) {
        await Storage.setLarge('pbazar_cart', cart);
      }
    };
    saveCart();
  }, [cart]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearchActive(true);
      setIsSearchLoading(true);
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        setIsSearchLoading(false);
      }, 2000);
    } else {
      setIsSearchActive(false);
      setIsSearchLoading(false);
    }
  };

  const [discountFilter, setDiscountFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<{min: number, max: number} | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [couponConfig, setCouponConfig] = useState<{ isActive: boolean; minPurchase: number; discountAmount: number }>({ isActive: false, minPurchase: 100, discountAmount: 10 });
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState({ imageUrl: '', title: '', link: '' });

  useEffect(() => {
    const fetchAd = async () => {
        // Cache ad for 1 hour to save reads
        const cachedAd = await Storage.getLarge<any>('cached_ad');
        const lastAdFetch = await Storage.getLarge<number>('last_ad_fetch') || 0;
        
        if (cachedAd && Date.now() - lastAdFetch < 60 * 60 * 1000) {
            setPopupContent(cachedAd);
            setShowPopup(true);
            return;
        }

        if (isFirestoreQuotaExceeded()) return;

        try {
            const adDoc = await getDoc(doc(db, 'settings', 'ad'));
            if (adDoc.exists()) {
                const data = adDoc.data() as any;
                setPopupContent(data);
                setShowPopup(true);
                await Storage.setLarge('cached_ad', data);
                await Storage.setLarge('last_ad_fetch', Date.now());
            }
        } catch (err: any) {
            if (err.code === 'resource-exhausted' || err.message?.includes('quota')) {
                setFirestoreQuotaExceeded(true);
            }
        }
    }
    fetchAd();
  }, []);

  useEffect(() => {
      const savedUser = Storage.getSmall<any>('pbazar_user');
      if (savedUser) setUser(savedUser);
  }, []);
  
  const handleAuthSuccess = (userData: any) => {
      setUser(userData);
      Storage.setSmall('pbazar_user', userData);
  };
  
  const handleLogout = () => {
      setUser(null);
      Storage.removeSmall('pbazar_user');
  };

  useEffect(() => {
    // Listener for settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'coupon'), (snapshot) => {
      if (snapshot.exists()) {
        setCouponConfig(snapshot.data() as any);
      }
    }, (error: any) => {
      console.error("Settings snapshot error:", error);
      if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
        setFirestoreQuotaExceeded(true);
      }
    });

    return () => {
        unsubscribeSettings();
    };
  }, []);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cartNotification, setCartNotification] = useState<{productName: string} | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [superSaleProducts, setSuperSaleProducts] = useState<Product[]>([]);

  // Deep Linking: Auto-open product from URL parameter ?p=ID
  useEffect(() => {
    if (products.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('p');
      if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
          setSelectedProduct(product);
          // Remove the parameter from URL without refreshing to keep it clean
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
  }, [products]);

  const categories = [
    { name: 'All', icon: LayoutGrid },
    { name: 'Food', icon: Utensils },
    { name: 'Fashion', icon: Shirt },
    { name: 'Electronics', icon: Tv },
    { name: 'Beauty', icon: Sparkles },
    { name: 'Gadget', icon: Cpu },
    { name: 'Robotic', icon: Bot },
    { name: 'PC', icon: Laptop },
    { name: 'Cloth', icon: Scissors },
    { name: 'Sports', icon: Dumbbell },
    { name: 'Grocery', icon: ShoppingCart },
  ];

  useEffect(() => {
    // Cleanup: Remove old "hide" functionality data to restore all products
    Storage.removeSmall('hidden_products');
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    let unsubProd = () => {};
    let unsubBanner = () => {};

    const loadFallbacks = async () => {
      const savedProducts = await Storage.getLarge<Product[]>('cached_products');
      const savedBanners = await Storage.getLarge<Banner[]>('cached_banners');
      const savedSellers = await Storage.getLarge<Seller[]>('cached_sellers');
      if (savedProducts) setProducts(savedProducts);
      if (savedBanners) setBanners(savedBanners);
      if (savedSellers) setSellers(savedSellers);
      setLoading(false);
    };

    if (isFirestoreQuotaExceeded()) {
      loadFallbacks();
      return;
    }

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
            images: data.images || [],
            flashSaleEnd: data.flashSaleEnd || null,
            seller: data.seller || '',
            seller_whatsapp: data.seller_whatsapp || '',
            seller_logo: data.seller_logo || '',
            is_new: data.is_new !== undefined ? !!data.is_new : true,
            is_super_sale: !!data.is_super_sale,
            super_sale_at: data.super_sale_at || null,
            order_count: Number(data.order_count || 0)
          } as Product;
        });
        prodData.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setProducts(prodData);
        
        // Filter Super Sale Products: Strictly marked by admin
        const superSale = prodData.filter(p => p.is_super_sale);
        setSuperSaleProducts(superSale);

        // Recommended: High rating or high order count
        const recommended = prodData.filter(p => (p.rating || 0) >= 4.8 || (p.order_count || 0) >= 5).slice(0, 8);
        setRecommendedProducts(recommended);

        Storage.setLarge('cached_products', prodData);
        setLoading(false);
      }, (error: any) => {
        if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
          setFirestoreQuotaExceeded(true);
          loadFallbacks();
        } else {
          console.error('Firebase product error', error);
          setError(error.message);
          setLoading(false);
        }
      });

      unsubBanner = onSnapshot(query(collection(db, 'banners')), (snapshot) => {
        const bannerData = snapshot.docs.map(doc => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            title: data.title || '',
            image: data.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
            created_at: data.created_at || new Date().toISOString()
          } as Banner;
        });
        bannerData.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setBanners(bannerData);
        Storage.setLarge('cached_banners', bannerData);
      }, (error: any) => {
        if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
          setFirestoreQuotaExceeded(true);
          loadFallbacks();
        } else {
          console.error('Firebase banner error', error);
        }
      });

      // Fetch sellers
      const fetchSellers = async () => {
        try {
          const data = await getSellers();
          if (data && data.length > 0) {
            setSellers(data);
            Storage.setLarge('cached_sellers', data);
          }
        } catch (err) {
          console.warn('Silent seller fetch error:', err);
        }
      };
      fetchSellers();
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

  // Real-time mobile push notifications for status updates
  useEffect(() => {
    const savedWhatsapp = Storage.getSmall<string>('customer_whatsapp');
    const usernameKey = null;

    if (!savedWhatsapp && !usernameKey) return;

    const lastStatuses: Record<string, string> = {};

    const triggerNotification = (title: string, body: string) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Mobile Alert details locked or ungranted:', title);
        return;
      }
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
        audio.play().catch(e => console.log('Audio playback delayed:', e));
      } catch (e) {}

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: 'https://i.postimg.cc/KvqR53hq/download-(1).png',
            badge: 'https://i.postimg.cc/KvqR53hq/download-(1).png',
            vibrate: [200, 100, 200]
          } as any);
        });
      } else {
        new Notification(title, {
          body,
          icon: 'https://i.postimg.cc/KvqR53hq/download-(1).png'
        });
      }
    };

    const processSnapshot = (docs: any[]) => {
      docs.forEach(doc => {
        const orderId = doc.id;
        const data = doc.data();
        const status = data.status;
        const name = data.product_name || 'Your order';

        if (lastStatuses[orderId] !== undefined) {
          if (lastStatuses[orderId] !== status) {
            // State transitioned! Broadcast Notification
            if (status === 'confirmed') {
              triggerNotification(
                'Order Confirmed! 🎉',
                `Thank you! Your order for ${name.split('\n')[0]} has been confirmed.`
              );
            } else if (status === 'packing') {
              triggerNotification(
                'Order Packing! 📦',
                `Great news! We are currently packing your products for ${name.split('\n')[0]}.`
              );
            } else if (status === 'shipping') {
              triggerNotification(
                'Out for Delivery! 🚚',
                `Your package has been shipped and is out for delivery!`
              );
            } else if (status === 'completed') {
              triggerNotification(
                'Order Completed! ✅',
                `We hope you loved your items! Thank you for buying from pbazar.`
              );
            }
          }
        }
        // Save state status
        lastStatuses[orderId] = status;
      });
    };

    let unsubWhatsapp = () => {};
    let unsubUsername = () => {};

    if (savedWhatsapp) {
      const qW = query(collection(db, 'orders'), where('whatsapp', '==', savedWhatsapp));
      unsubWhatsapp = onSnapshot(qW, (snapshot) => {
        processSnapshot(snapshot.docs);
      }, (error: any) => {
        if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
            setFirestoreQuotaExceeded(true);
        } else {
            console.error('Order notification error (Whatsapp):', error.message);
        }
      });
    }

    if (usernameKey) {
      const qU = query(collection(db, 'orders'), where('customer_username', '==', usernameKey));
      unsubUsername = onSnapshot(qU, (snapshot) => {
        processSnapshot(snapshot.docs);
      }, (error: any) => {
        if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
            setFirestoreQuotaExceeded(true);
        } else {
            console.error('Order notification error (Username):', error.message);
        }
      });
    }

    return () => {
      unsubWhatsapp();
      unsubUsername();
    };
  }, []);

  useEffect(() => {
    const filtered = products.filter(p => {
      const pName = p.name || '';
      const pDesc = p.description || '';
      const matchSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pDesc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiscount = discountFilter ? p.discount === discountFilter : true;
      const matchCategory = categoryFilter ? (
        String(p.category || '').toLowerCase() === categoryFilter.toLowerCase()
      ) : true;
      
      const price = p.discount ? p.price * (1 - p.discount/100) : p.price;
      const matchPrice = priceFilter ? (price >= priceFilter.min && price <= priceFilter.max) : true;
      
      return matchSearch && matchDiscount && matchCategory && matchPrice;
    });

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      const priceA = a.discount ? a.price * (1 - a.discount/100) : a.price;
      const priceB = b.discount ? b.price * (1 - b.discount/100) : b.price;
      
      if (sortBy === 'price-low') return priceA - priceB;
      if (sortBy === 'price-high') return priceB - priceA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    setFilteredProducts(sorted);

    // Calculate Recommendations (For You Section)
    const calculateRecommendations = () => {
      // Super Sale (Filter for products promoted within the last 24 hours)
      const sale = products.filter(p => {
        if (!p.is_super_sale) return false;
        if (!p.super_sale_at) return true; // Legacy manual ones stay
        
        const saleTime = new Date(p.super_sale_at).getTime();
        const now = new Date().getTime();
        return (now - saleTime) < (24 * 60 * 60 * 1000); // 24 hours
      });
      setSuperSaleProducts(sale);

      const favIds = Storage.getSmall<string[]>('favorites') || [];
      
      const likedProducts = products.filter(p => favIds.includes(p.id));
      const likedCategories = Array.from(new Set(likedProducts.map(p => p.category)));
      
      let recs: Product[] = [];
      
      if (likedCategories.length > 0) {
        // Diversified Algorithm: 
        // 60% from liked categories, 40% discovery (top rated/new from others)
        const inCat = products.filter(p => 
          likedCategories.includes(p.category) && 
          !favIds.includes(p.id)
        ).sort(() => 0.5 - Math.random());
        
        const outCat = products.filter(p => 
          !likedCategories.includes(p.category) && 
          !favIds.includes(p.id)
        ).sort((a, b) => (b.rating || 0) - (a.rating || 0));

        recs = [...inCat.slice(0, 6), ...outCat.slice(0, 6)];
      } else {
        // If no favorites yet, show top rated categories diversity
        recs = products
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 10);
      }
      
      // Final shuffle for fresh feel
      setRecommendedProducts(recs.sort(() => 0.5 - Math.random()));
    };

    calculateRecommendations();
    
    // Add event listener for favorite updates to refresh recommendations
    const handleFavUpdate = () => calculateRecommendations();
    window.addEventListener('favorites-updated', handleFavUpdate);
    return () => window.removeEventListener('favorites-updated', handleFavUpdate);
  }, [searchQuery, products, discountFilter, categoryFilter, sortBy]);



  const handleLogoClick = () => {
    setSearchQuery('');
    setCategoryFilter(null);
    setDiscountFilter(null);
    setPriceFilter(null);
    setIsSearchActive(false);
    setIsSearchLoading(false);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };

  async function submitOrder(customer_name: string, whatsapp: string, location: string, area: string, postCode: string): Promise<string | undefined> {
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

    let coupon_discount = 0;
    if (couponConfig?.isActive) {
      cart.forEach(item => {
        const hasDiscount = item.product.discount && item.product.discount > 0;
        const unitPrice = hasDiscount 
          ? item.product.price * (1 - (item.product.discount || 0) / 100) 
          : item.product.price;
          
        if (unitPrice >= couponConfig.minPurchase) {
          coupon_discount += couponConfig.discountAmount * item.quantity;
        }
      });
    }
    const finalPrice = Math.max(0, totalPrice - coupon_discount);

    const formattedWhatsapp = formatWhatsappNumber(whatsapp);

    console.log("Submitting Order Data:", {
      product_id: combinedProductIds,
      product_name: combinedProductNames,
      price: finalPrice,
      original_price: totalPrice,
      coupon_discount,
      customer_name,
      whatsapp: formattedWhatsapp,
      location,
      area,
      post_code: postCode,
      status: 'pending'
    });
    
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        product_id: combinedProductIds,
        product_name: combinedProductNames,
        quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
        price: finalPrice,
        seller: cart.map(item => item.product.seller).filter(Boolean).join(', '),
        seller_id: cart.map(item => item.product.seller_id).filter(Boolean).join(', '),
        original_price: totalPrice,
        coupon_discount,
        customer_name,
        customer_username: user ? user.whatsapp : null,
        customer_uid: null,
        customer_image: null,
        whatsapp: formattedWhatsapp,
        whatsapp_number: formattedWhatsapp, // For Admin Table View Sync
        location,
        area,
        post_code: postCode,
        status: 'pending',
        created_at: new Date().toISOString(),
        seller_ids: Array.from(new Set(cart.map(item => item.product.seller_id).filter(Boolean))),
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
            quantity: item.quantity,
            seller: item.product.seller || '',
            seller_id: item.product.seller_id || '',
            seller_whatsapp: item.product.seller_whatsapp || ''
          };
        })
      });

      // Trigger notification for admin and sellers
      try {
        await fetch('/api/notify/order-placed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: docRef.id,
            customerName: customer_name,
            whatsapp: formattedWhatsapp,
            location: `${location}, ${area}${postCode ? ` (${postCode})` : ''}`,
            items: cart.map(item => ({
               product: {
                 name: item.product.name,
                 seller: item.product.seller,
                 seller_id: item.product.seller_id,
                 seller_whatsapp: item.product.seller_whatsapp
               }
            })),
            totalAmount: finalPrice
          })
        });
      } catch (notifyErr) {
        console.error("Failed to notify admin/seller:", notifyErr);
      }

      // Track coordinates for immediate client status notifications
      Storage.setSmall('customer_whatsapp', formattedWhatsapp);
      const savedIds = Storage.getSmall<string[]>('tracked_order_ids') || [];
      if (!savedIds.includes(docRef.id)) {
        savedIds.push(docRef.id);
        Storage.setSmall('tracked_order_ids', savedIds);
      }

      // Decrement real stock and increment order count for auto-promotion
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
            console.log(`Updated product ${item.product.name}: stock -${item.quantity}, orders +${item.quantity}`);
          } catch (stockErr) {
            console.error("Failed to update product data", stockErr);
          }
        }
      }

      console.log("Order Successful");
      setSuccessMessage("Order Placed Successfully!");
      setCart([]); // Clear cart after successful order
      
      // Auto-hide success message
      setTimeout(() => setSuccessMessage(""), 6000);
      return docRef.id;
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
    
    // Add feedback for cart update
    setCartNotification({ productName: product.name });
    setTimeout(() => setCartNotification(null), 3000);
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

  const cartItemCount = (Array.isArray(cart)) ? cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar 
        onSearch={handleSearch} 
        cartCount={cartItemCount} 
        onCartClick={handleOpenCart} 
        onTrackOrderClick={() => setIsTrackingOpen(true)}
        onLoginClick={() => setIsAuthOpen(true)}
        onLogoutClick={handleLogout}
        onEditProfileClick={() => setIsAuthOpen(true)}
        onLogoClick={handleLogoClick}
        user={user ? { username: user.whatsapp || 'User', email: user.whatsapp || '' } : null}
        categories={categories.map(c => c.name)}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        discountFilter={discountFilter}
        onDiscountFilter={setDiscountFilter}
        priceFilter={priceFilter}
        onPriceFilter={setPriceFilter}
        products={products}
      />

      {error ? (
        <div className="flex flex-col items-center justify-center py-40 px-6 space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="text-center space-y-6 max-w-xl mx-auto">
              <h1 className="text-2xl sm:text-4xl font-black text-slate-800 leading-tight tracking-tighter uppercase italic">
                {isFirestoreQuotaExceeded() ? "Daily Server Limit Reached" : "We are experiencing technical issues"}
              </h1>
              <div className="flex justify-center">
                 <Bot size={120} className="text-orange-500 animate-bounce" />
              </div>
              
              {isFirestoreQuotaExceeded() ? (
                <div className="space-y-4">
                  <p className="text-slate-500 text-sm font-medium">
                    The database has reached its daily free usage limit. Data may not update in real-time. 
                    The quota will reset automatically in approximately 24 hours.
                  </p>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                    Project ID: genial-inn-2h7sp
                  </p>
                  <a 
                    href="https://console.firebase.google.com/project/genial-inn-2h7sp/firestore/databases/ai-studio-478d8860-d347-4002-b696-209c0bb25c2e/data?openUpgradeDialog=true"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-orange-600 font-bold text-xs underline hover:text-orange-700"
                  >
                    View & Upgrade Quota in Firebase Console
                  </a>
                </div>
              ) : (
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Maintenance in progress</p>
              )}

              <button 
                onClick={() => window.location.reload()}
                className="mt-4 bg-slate-900 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:shadow-2xl hover:shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2 mx-auto"
              >
                Retry Connection
              </button>
           </div>
        </div>
      ) : (
        <>
          <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 space-y-12 pb-24 scroll-smooth">
          {isSearchActive ? (
            <div className="flex flex-col space-y-6 animate-in fade-in">
               <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Search Results</h2>
                  <span className="text-sm font-medium text-slate-500">for "{searchQuery}"</span>
               </div>
               
               {isSearchLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                     <DotLoader />
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Searching...</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-8">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <div key={product.id}>
                          <ProductCard 
                            product={product} 
                            onBuy={handleBuyNow} 
                            onAddToCart={handleAddToCart}
                            onClick={setSelectedProduct}
                            couponConfig={couponConfig}
                            isSearchVariant={true}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-32 glass rounded-[2.5rem] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Filter className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold tracking-tight">No products found matching your search.</p>
                      </div>
                    )}
                  </div>
               )}
            </div>
          ) : (
             <>
        <section className="mb-10 px-4 md:px-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch">
             <div className="rounded-[2rem] md:rounded-r-none overflow-hidden shadow-sm border border-slate-100">
               <HeroBanner banners={banners} startIndex={0} />
             </div>
             <div className="hidden md:block rounded-[2rem] md:rounded-l-none overflow-hidden shadow-sm border border-slate-100 border-l-0">
               <HeroBanner banners={banners} startIndex={1} />
             </div>
           </div>
        </section>
        {/* Super Sale Section at top - "Product in banner state" */}
        {superSaleProducts.length > 0 && !categoryFilter && !searchQuery && (
          <section className="mb-14 relative overflow-hidden -mx-4 px-4 sm:-mx-8 sm:px-8 py-10 bg-gradient-to-br from-orange-500/5 to-red-600/5 border-y border-orange-100">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200/20 blur-[100px] -z-10 rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-200/20 blur-[100px] -z-10 rounded-full"></div>
            
            <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto px-4 sm:px-0">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/40 border-2 border-white">
                    <Zap className="text-white fill-white" size={24} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Super Sale</h2>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] animate-pulse">Limited Hot Deals • Active Now</p>
                 </div>
               </div>
               <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Swipe for more</span>
                  <div className="w-10 h-0.5 bg-slate-200 rounded-full"></div>
               </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hidden max-w-7xl mx-auto px-4 sm:px-0">
              {superSaleProducts.map(product => (
                <div key={product.id} className="w-[140px] sm:w-[220px] shrink-0">
                  <SuperSaleCard 
                    product={product} 
                    onBuy={handleBuyNow} 
                    onAddToCart={handleAddToCart}
                    onClick={setSelectedProduct}
                    couponConfig={couponConfig}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* AI Finder */}
        <div className="mb-6 hidden">
          <div className="relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🤖 AI Finder: What are you looking for today? (e.g., 'fresh food', 'fashion')"
              className="w-full pl-4 pr-4 py-4 rounded-full border-2 border-orange-200 focus:border-orange-500 outline-none text-sm font-medium shadow-sm transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 font-bold text-xs bg-orange-100 px-3 py-1 rounded-full">AI Active</div>
          </div>
        </div>

        {/* Category Buttons */}
        <div className="-mx-4 px-4 sm:-mx-8 sm:px-8 flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hidden">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setCategoryFilter(cat.name === 'All' ? null : cat.name)}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 shadow-sm transition-all text-slate-800 min-w-[70px] ${categoryFilter === cat.name || (categoryFilter === null && cat.name === 'All') ? 'border-orange-500 bg-orange-50' : 'bg-white border-slate-200 hover:border-orange-300'}`}
            >
              <cat.icon size={24} className={categoryFilter === cat.name || (categoryFilter === null && cat.name === 'All') ? 'text-orange-600' : 'text-orange-500'} />
              <span className="text-[10px] font-bold whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Quick Filters Row */}
        <div className="-mx-4 px-4 sm:-mx-8 sm:px-8 flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hidden items-center">
            <div className="text-[10px] font-black uppercase text-slate-400 shrink-0">
               {filteredProducts.length} Items Found
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl shrink-0 overflow-x-auto scrollbar-hidden">
                <button 
                  onClick={() => setSortBy('newest')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${sortBy === 'newest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >Newest</button>
                <button 
                   onClick={() => setSortBy('price-low')}
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${sortBy === 'price-low' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >Price ↓</button>
                <button 
                   onClick={() => setSortBy('price-high')}
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${sortBy === 'price-high' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >Price ↑</button>
            </div>

            <div className="flex gap-2 shrink-0 overflow-x-auto scrollbar-hidden pb-1">
                {[
                    {label: "Under 500 ৳", min: 0, max: 500},
                    {label: "500 - 1000 ৳", min: 500, max: 1000},
                    {label: "1000 - 5000 ৳", min: 1000, max: 5000},
                    {label: "Above 5000 ৳", min: 5000, max: 999999999}
                ].map(price => (
                    <button
                      key={price.label}
                      onClick={() => setPriceFilter(priceFilter?.label === price.label ? null : price as any)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold border-2 transition-all whitespace-nowrap ${priceFilter?.label === price.label ? 'border-orange-500 bg-orange-50 text-orange-600' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                        {price.label}
                    </button>
                ))}
            </div>
            
            {(priceFilter || sortBy !== 'newest') && (
                <button 
                  onClick={() => {setPriceFilter(null); setSortBy('newest');}}
                  className="px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-600 shrink-0"
                >Clear All</button>
            )}
        </div>


        {/* Recommended For You Section */}
        {recommendedProducts.length > 0 && !categoryFilter && !searchQuery && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="text-orange-600" size={18} />
                 </div>
                 <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recommended For You</h2>
               </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hidden -mx-4 px-4 sm:-mx-8 sm:px-8">
              {recommendedProducts.map(product => (
                <div key={product.id} className="w-[180px] sm:w-[220px] lg:w-[260px] shrink-0">
                  <ProductCard 
                    product={product} 
                    onBuy={handleBuyNow} 
                    onAddToCart={handleAddToCart}
                    onClick={setSelectedProduct}
                    couponConfig={couponConfig}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Sellers Section */}
        {sellers.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-5">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <User2 className="text-orange-600" size={18} />
                 </div>
                 <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Top Sellers</h2>
               </div>
            </div>
             <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hidden -mx-4 px-4 sm:-mx-8 sm:px-8">
               {sellers.filter(s => s.is_top !== false).map(seller => (
                 <button
                   key={seller.id}
                   onClick={() => setSelectedSeller(seller)}
                   className="flex flex-col items-center gap-2 group shrink-0 relative"
                 >
                   <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-white border border-slate-200 shadow-sm overflow-hidden p-2 group-hover:border-orange-500 group-hover:shadow-lg group-hover:shadow-orange-500/10 transition-all active:scale-95 relative flex items-center justify-center">
                      {seller.logo ? (
                        <img src={seller.logo} alt={seller.name} className="w-full h-full object-contain rounded-[1.75rem]" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                           <User2 size={36} />
                        </div>
                      )}
                      {/* Verified Badge */}
                      {seller.is_verified && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 border-2 border-white text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-20">
                          <CheckCircle2 size={12} className="stroke-[4]" />
                        </div>
                      )}
                   </div>
                   <div className="flex items-center gap-1 max-w-[80px]">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest truncate">{seller.name}</span>
                      {seller.is_verified && (
                        <CheckCircle2 size={10} className="text-blue-500 shrink-0" />
                      )}
                   </div>
                 </button>
               ))}
            </div>
          </section>
        )}
        
        <section>
          {loading ? (
             <DotLoader />
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-8">
              {filteredProducts.map((product) => (
                <div key={product.id}>
                  <ProductCard 
                    product={product} 
                    onBuy={handleBuyNow} 
                    onAddToCart={handleAddToCart}
                    onClick={setSelectedProduct}
                    couponConfig={couponConfig}
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
             </>
          )}
      </main>

      <footer className="hidden md:block glass border-t border-slate-200 mt-12 mb-0 relative z-40 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-6">
          <div className="flex flex-wrap items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-6 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-slate-800 text-xs text-opacity-100">© 2026 pbazar — Trusted Online Shop in Bangladesh</span>
              <span className="text-slate-400 normal-case tracking-normal">Company Info: Premium Quality Goods & Fast Delivery.</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-8 items-center justify-between border-t border-slate-200 pt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-900 rounded-full shadow-lg shadow-black/50 blink"></div> 
              Orders Live ({Array.isArray(products) ? (products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0) > 0 ? products.length * 2 + 5 : products.length) : 0} Active)
            </span>
            <div className="flex gap-6 items-center flex-wrap">
              <a href="https://admin4565.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:bg-orange-600 hover:text-white text-orange-600 transition-colors uppercase tracking-widest bg-orange-50/70 border border-orange-200/50 px-3 py-1.5 rounded-xl font-black text-[9px] flex items-center gap-1.5 shadow-sm active:scale-95">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></span>
                Become a Seller
              </a>
              <a href="#" className="hover:text-black transition-colors">Instagram: @pbazar.bd</a>
              <button onClick={() => setIsPolicyOpen(true)} className="hover:text-black transition-colors uppercase tracking-widest cursor-pointer">Official Policy</button>
              <button onClick={() => setIsPolicyOpen(true)} className="hover:text-black transition-colors uppercase tracking-widest cursor-pointer">Privacy Policy</button>
              <button onClick={() => setIsPolicyOpen(true)} className="hover:text-black transition-colors uppercase tracking-widest cursor-pointer">Terms & Conditions</button>
            </div>
          </div>
        </div>
      </footer>
        </>
      )}
      
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .blink { animation: blink 2s infinite; }
      `}</style>
      

      <TrackingModal 
        isOpen={isTrackingOpen} 
        onClose={() => setIsTrackingOpen(false)} 
        user={user ? { username: user.whatsapp || 'User', email: user.whatsapp || '' } : null}
        products={products}
      />

      <CheckoutModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cartItems={cart}
        onSubmit={submitOrder}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        user={null}
        couponConfig={couponConfig}
      />

      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        allProducts={products}
        onProductSelect={setSelectedProduct}
        sellers={sellers}
        onSellerSelect={setSelectedSeller}
        couponConfig={couponConfig}
      />

      <SellerModal
        seller={selectedSeller}
        isOpen={!!selectedSeller}
        onClose={() => setSelectedSeller(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onProductClick={setSelectedProduct}
      />

      <PolicyModal 
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        user={user}
        onOpenPolicy={() => setIsPolicyOpen(true)}
      />

      <ScrollButton />

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

        {cartNotification && (
          <motion.div
            key="cart-notification"
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%', scale: 0.8 }}
            className="fixed top-0 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-sm pointer-events-none"
          >
            <div className="bg-orange-600 text-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(249,115,22,0.4)] border border-orange-500 flex items-center gap-4 overflow-hidden relative text-left pointer-events-auto">
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center shrink-0 border border-white/30"
              >
                <ShoppingBag className="w-5 h-5" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-widest opacity-70">Added to Cart</p>
                <p className="text-sm font-bold tracking-tight truncate mt-0.5">{cartNotification.productName}</p>
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-white" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <PopupAd 
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        adContent={popupContent}
      />
      
      <BottomNav 
        onHomeClick={() => {
          handleLogoClick();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
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
