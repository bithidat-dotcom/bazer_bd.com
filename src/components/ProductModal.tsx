import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Seller } from '../types';
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart, Plus, Minus, Star, Heart, CheckCircle, MessagesSquare, User2, Cpu, Clock, ShieldAlert, X, Maximize2, Phone, Facebook, Instagram } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import ProductCard from './ProductCard';
import { getProductLikesState, toggleProductLike, getProductReviews, saveProductReview } from '../lib/db-sync';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  allProducts?: Product[];
  onProductSelect?: (product: Product) => void;
  sellers?: Seller[];
  onSellerSelect?: (seller: Seller) => void;
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart, onBuyNow, allProducts = [], onProductSelect, sellers = [], onSellerSelect }: ProductModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [sellerData, setSellerData] = useState<{ logo?: string; whatsapp?: string } | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [deliveryDistrict, setDeliveryDistrict] = useState<'bhola' | 'other'>('bhola');
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!product || !product.discount || Number(product.discount) <= 0) {
      setTimeLeft(null);
      return;
    }

    const durationHrs = Number(product.discountTimelineHours) || 24;
    let targetTimeMs: number;
    
    // Priority: Real Flash Sale End Date from Admin
    if (product.flashSaleEnd) {
      try {
        const parsedDate = new Date(product.flashSaleEnd);
        if (!isNaN(parsedDate.getTime())) {
          targetTimeMs = parsedDate.getTime();
        } else {
          // Fallback manual parser for "MM/DD/YYYY HH:MM AM/PM"
          const regex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i;
          const match = product.flashSaleEnd.match(regex);
          if (match) {
            let [_, month, day, year, hours, minutes, ampm] = match;
            let hrs = parseInt(hours);
            if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
            if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
            const manualDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hrs, parseInt(minutes), 0);
            targetTimeMs = manualDate.getTime();
          } else {
             targetTimeMs = 0; // Invalid format
          }
        }
      } catch (e) {
        targetTimeMs = 0;
      }
    } else {
      // Dynamic Loop logic
      let createdTime = product.created_at ? new Date(product.created_at).getTime() : NaN;
      
      if (isNaN(createdTime)) {
        targetTimeMs = Date.now() + durationHrs * 60 * 60 * 1000;
      } else {
        const expiryTime = createdTime + durationHrs * 60 * 60 * 1000;
        if (expiryTime > Date.now()) {
          targetTimeMs = expiryTime;
        } else {
          const now = new Date();
          const cycle = durationHrs * 60 * 60 * 1000;
          const timePassedSinceCreated = now.getTime() - createdTime;
          const remainingInCycle = cycle - (timePassedSinceCreated % cycle);
          targetTimeMs = now.getTime() + remainingInCycle;
        }
      }
    }

    if (isNaN(targetTimeMs) || targetTimeMs <= 0) {
      targetTimeMs = Date.now() + durationHrs * 60 * 60 * 1000;
    }

    // Set initial layout
    const initialDiff = targetTimeMs - Date.now();
    if (initialDiff > 0) {
      setTimeLeft({
        hours: Math.floor(initialDiff / (1000 * 60 * 60)),
        minutes: Math.floor((initialDiff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((initialDiff % (1000 * 60)) / 1000)
      });
    } else {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
    }

    const interval = setInterval(() => {
      const diff = targetTimeMs - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [product]);

  const getEstimatedDates = (minDays: number, maxDays: number) => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + minDays);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxDays);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' };
    return `${minDate.toLocaleDateString('en-US', options)} - ${maxDate.toLocaleDateString('en-US', options)}`;
  };

  // Review State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setQuantity(1);
    setReviewSuccess(false);
    setNewUserName('');
    setNewComment('');
    setNewRating(5);
    
    if (product) {
      let active = true;
      
      const fetchLikes = async () => {
        const state = await getProductLikesState(product.id);
        if (active) {
          setIsLiked(state.userLiked);
          setLikesCount(state.totalLikes);
        }
      };
      fetchLikes();

      const fetchReviews = async () => {
        const dbReviews = await getProductReviews(product.id);
        if (active) {
          setReviews(dbReviews || []);
        }
      };
      fetchReviews();

      const fetchSellerFallback = async () => {
        if (!product.seller_whatsapp && product.seller) {
          const { getSellerInfoByName } = await import('../lib/db-sync');
          const info = await getSellerInfoByName(product.seller);
          if (active && info) {
            setSellerData({
              logo: info.logo || info.seller_logo,
              whatsapp: info.whatsapp || info.seller_whatsapp
            });
          }
        } else {
          setSellerData(null);
        }
      };
      fetchSellerFallback();

      return () => {
        active = false;
      };
    }
  }, [product]);

  // Listen to external favorite updates
  useEffect(() => {
    if (!product) return;
    let active = true;
    const checkFavorite = async () => {
      const state = await getProductLikesState(product.id);
      if (active) {
        setIsLiked(state.userLiked);
        setLikesCount(state.totalLikes);
      }
    };
    checkFavorite();

    window.addEventListener('favorites-updated', checkFavorite);
    return () => {
      active = false;
      window.removeEventListener('favorites-updated', checkFavorite);
    };
  }, [product]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!product) return null;

  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - (product.discount || 0) / 100) 
    : product.price;

  // Combine main image and additional images if they exist
  const allImages = [product.image];
  if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => {
          if (img && img !== product.image) {
              allImages.push(img);
          }
      });
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const updateQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  // Touch Swipe Handlers for Product Image Slide
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX - touchEndX;

    if (swipeDistance > 55) {
      nextImage(); // Swipe left -> Next image
    } else if (swipeDistance < -55) {
      prevImage(); // Swipe right -> Previous image
    }
    setTouchStartX(null);
  };

  // Like/Favorite toggle handler
  const toggleLike = async () => {
    // Optimistic state updates
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));

    const nextState = await toggleProductLike(product.id);
    setIsLiked(nextState.userLiked);
    setLikesCount(nextState.totalLikes);
  };

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newComment.trim()) return;

    setIsSubmitting(true);

    const saved = await saveProductReview(product.id, newUserName.trim(), newRating, newComment.trim());

    // Fetch dynamic reviews to refresh
    const dbReviews = await getProductReviews(product.id);
    setReviews(dbReviews);

    // Trigger review update event for ProductCard and other views to recalculate average stars
    window.dispatchEvent(new Event(`reviews-updated-${product.id}`));

    setNewUserName('');
    setNewComment('');
    setNewRating(5);
    setIsSubmitting(false);
    setReviewSuccess(true);

    setTimeout(() => {
      setReviewSuccess(false);
    }, 4000);
  };

  // Calculate dynamic average rating based on original default and user-added ones
  const dynamicAvgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length)
    : (product.rating || 4.8);
    
  const dynamicReviewCount = reviews.length > 0 
    ? ((product.reviewCount || 0) + reviews.filter(r => !r.id.startsWith('mock-')).length)
    : (product.reviewCount || 0);

  // Prevent image actions
  const preventImageActions = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] w-screen h-screen overflow-hidden bg-white">
          {/* Global Lightbox Backdrop */}
          <AnimatePresence>
            {isImageZoomed && zoomedImageUrl && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/98 flex items-center justify-center overflow-hidden touch-none"
                onClick={() => setIsImageZoomed(false)}
              >
                {/* Control Panel */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-[250]">
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 self-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomScale(prev => Math.min(prev + 0.5, 4));
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomScale(prev => Math.max(prev - 0.5, 1));
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
                    >
                      <Minus size={20} />
                    </button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomScale(1);
                      }}
                      className="px-3 h-10 flex items-center justify-center rounded-full text-[10px] font-black text-white hover:bg-white/10 transition-colors uppercase tracking-widest"
                    >
                      Reset
                    </button>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 text-white bg-white/10 flex items-center justify-center rounded-full hover:bg-white/20 backdrop-blur-md border border-white/10 shadow-xl"
                    onClick={() => setIsImageZoomed(false)}
                  >
                    <X size={24} />
                  </motion.button>
                </div>

                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: zoomScale, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  drag={zoomScale > 1}
                  dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                  dragElastic={0.1}
                  onWheel={(e) => {
                    const delta = e.deltaY;
                    if (delta < 0) {
                      setZoomScale(prev => Math.min(prev + 0.1, 4));
                    } else {
                      setZoomScale(prev => Math.max(prev - 0.1, 1));
                    }
                  }}
                  className={`relative max-w-full max-h-full flex items-center justify-center ${zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-out'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img 
                    src={zoomedImageUrl} 
                    alt="Zoomed product view" 
                    className="max-w-full max-h-screen object-contain pointer-events-none select-none drop-shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                    onContextMenu={preventImageActions}
                    onDragStart={preventImageActions}
                  />
                </motion.div>
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-2.5 rounded-full text-white/50 text-[10px] font-black uppercase tracking-[0.2em] pointer-events-none border border-white/5 shadow-2xl flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><Maximize2 size={12} /> Pinch / Scroll / Drag to details</span>
                  <div className="w-px h-3 bg-white/20" />
                  <span className="text-white">Zoom: {Math.round(zoomScale * 100)}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", bounce: 0, duration: 0.38 }}
            className="w-full h-full bg-white relative flex flex-col md:flex-row overflow-y-auto md:overflow-hidden focus:outline-none"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 z-45 w-10 h-10 flex items-center justify-center bg-white/95 backdrop-blur rounded-full text-slate-700 hover:text-slate-950 border border-slate-200 hover:bg-slate-50 transition-colors shadow-md cursor-pointer"
              aria-label="Back to store"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Image Gallery Column with support for gesture slide */}
            <div className="w-full md:w-1/2 bg-slate-50 relative flex flex-col shrink-0 md:h-full min-h-[50vh] md:min-h-0">
              <div 
                className="relative flex-1 flex items-center justify-center p-6 md:p-12 group cursor-grab active:cursor-grabbing select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                 {hasDiscount && (
                    <div className="absolute top-4 right-4 bg-red-600 backdrop-blur-md text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-tight shadow-lg z-10">
                        {product.discount}% OFF SALE
                    </div>
                 )}

                 <AnimatePresence mode="wait">
                    <motion.img 
                        key={currentImageIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                        src={allImages[currentImageIndex]} 
                        alt={product.name}
                        onClick={() => {
                          setZoomedImageUrl(allImages[currentImageIndex]);
                          setZoomScale(1);
                          setIsImageZoomed(true);
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        className="w-full h-full object-contain max-h-[45vh] md:max-h-[60vh] cursor-zoom-in pointer-events-auto rounded-lg"
                    />
                 </AnimatePresence>

                 {/* pinch/click to zoom hint */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md text-white p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none scale-0 group-hover:scale-100 duration-300">
                   <Maximize2 size={32} />
                 </div>

                 {/* slide indicator info */}
                 <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-950/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full pointer-events-none sm:opacity-0 group-hover:opacity-100 transition-opacity">
                   {currentImageIndex + 1} / {allImages.length}
                 </div>

                 {/* Visual dots indicators */}
                 {allImages.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-slate-900/10 backdrop-blur-xs px-3 py-1.5 rounded-full">
                      {allImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all cursor-pointer ${currentImageIndex === idx ? 'bg-slate-900 w-3.5 sm:w-4' : 'bg-slate-400/60'}`}
                          title={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                 )}

                 {allImages.length > 1 && (
                    <>
                        <button 
                            type="button"
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center shadow-md text-slate-700 hover:text-slate-900 md:opacity-0 md:group-hover:opacity-100 transition-all hover:scale-105 cursor-pointer"
                            aria-label="Previous image"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button 
                            type="button"
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center shadow-md text-slate-700 hover:text-slate-900 md:opacity-0 md:group-hover:opacity-100 transition-all hover:scale-105 cursor-pointer"
                            aria-label="Next image"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </>
                 )}
              </div>
              
              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="hidden md:flex h-24 bg-white border-t border-slate-100 p-2 gap-2 overflow-x-auto no-scrollbar justify-center">
                    {allImages.map((img, idx) => (
                        <button 
                            key={idx}
                            type="button"
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${currentImageIndex === idx ? 'border-slate-900 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover bg-slate-50" />
                        </button>
                    ))}
                </div>
              )}
            </div>

            {/* Content Column */}
            <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-12 lg:p-16 flex flex-col pt-6 md:pt-16 md:overflow-y-auto md:h-full md:scroll-smooth">
              <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    Product Details
                </span>
                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 shadow-3xs">
                  <Star size={13} className="fill-amber-500 text-amber-500" />
                  <span className="text-xs font-black text-amber-600">
                    {dynamicAvgRating.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold ml-1">
                    ({dynamicReviewCount} reviews)
                  </span>
                </div>
                {(likesCount > 0 || isLiked) && (
                  <span className="text-[10px] sm:text-xs font-black text-rose-600 bg-rose-50 border border-rose-100/50 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Heart size={12} className="fill-rose-500 text-rose-500" />
                    {likesCount || (isLiked ? 1 : 0)} {likesCount === 1 ? 'Like' : 'Likes'}
                  </span>
                )}
              </div>
              
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-black text-slate-900 leading-tight">
                  {product.name}
                </h2>
                <button
                  type="button"
                  onClick={toggleLike}
                  className={`p-2.5 rounded-2xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isLiked 
                      ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-xs' 
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-rose-500 hover:bg-rose-50'
                  }`}
                  title={isLiked ? "Unlike product" : "Like product"}
                >
                  <Heart size={20} className={`${isLiked ? 'fill-rose-500' : ''}`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-end gap-3">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                      {formatPrice(discountedPrice)}
                  </span>
                  {hasDiscount && (
                      <span className="text-base sm:text-lg text-slate-400 line-through mb-1">
                          {formatPrice(product.price)}
                      </span>
                  )}
                </div>

                {/* Seller Info side of price */}
                {(product.seller || product.seller_whatsapp || sellerData?.whatsapp) && (
                  <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-2xl p-2 pr-4 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {(product.seller_logo || sellerData?.logo) ? (
                        <img src={product.seller_logo || sellerData?.logo} alt={product.seller} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User2 size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Seller</p>
                      <p className="text-[10px] font-black text-slate-900 truncate max-w-[80px] sm:max-w-[120px]">{product.seller || 'Verified Store'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Discount Real-time Ticking Timer Counter Block */}
              {hasDiscount && timeLeft && (
                <div className="mb-5 bg-amber-50/80 backdrop-blur-md border border-amber-200 rounded-2xl p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="p-1 sm:p-1.5 bg-amber-500 text-white rounded-lg shrink-0">
                        <Clock className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-black text-amber-950 uppercase tracking-wider leading-none">Flash Sale Offer Active</p>
                        <p className="text-[8px] sm:text-[10px] text-amber-700 font-bold mt-1 leading-tight">
                          Ends at {product.flashSaleEnd ? (
                            (() => {
                              try {
                                const parts = product.flashSaleEnd.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
                                if (parts) return `${parts[1]}:${parts[2]} ${parts[3].toUpperCase()}`;
                                const d = new Date(product.flashSaleEnd);
                                if (!isNaN(d.getTime())) {
                                  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                }
                                return product.flashSaleEnd;
                              } catch (e) { return 'soon'; }
                            })()
                          ) : 'countdown expiry'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[11px] sm:text-sm shrink-0">
                      <div className="bg-amber-500 text-white rounded-lg px-2 py-1 font-bold min-w-[24px] sm:min-w-[32px] text-center shadow-sm">
                        {((val: any) => {
                          if (val === undefined || val === null || isNaN(val)) return '00';
                          return String(val).padStart(2, '0');
                        })(timeLeft.hours)}
                      </div>
                      <span className="text-amber-600 font-black animate-pulse">:</span>
                      <div className="bg-amber-500 text-white rounded-lg px-2 py-1 font-bold min-w-[24px] sm:min-w-[32px] text-center shadow-sm">
                        {((val: any) => {
                          if (val === undefined || val === null || isNaN(val)) return '00';
                          return String(val).padStart(2, '0');
                        })(timeLeft.minutes)}
                      </div>
                      <span className="text-amber-600 font-black animate-pulse">:</span>
                      <div className="bg-amber-500 text-white rounded-lg px-2 py-1 font-bold min-w-[24px] sm:min-w-[32px] text-center shadow-sm">
                        {((val: any) => {
                          if (val === undefined || val === null || isNaN(val)) return '00';
                          return String(val).padStart(2, '0');
                        })(timeLeft.seconds)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Product Stock Indicator */}
              <div className="mb-5">
                {product.stock !== undefined ? (
                  product.stock >= 0 ? (
                    <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black shadow-sm border backdrop-blur-md ${
                      (product.stock || 0) <= 5 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${(product.stock || 0) <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      Available Stock: <span className="text-sm">{product.stock ?? 0}</span> Pcs {(product.stock || 0) <= 5 ? '(Low Stock!)' : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-rose-50 border border-rose-200 text-rose-700 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      Available Stock: <span className="text-sm">0</span> Pcs (Out of Stock)
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Stock: Ready for Dispatch
                  </span>
                )}
              </div>
              
              {/* Highlight block for the details section text */}
              {/* Real-time Inventory Tracker */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`px-4 py-1.5 rounded-xl border flex flex-col ${
                  (product.stock ?? 20) <= 5 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black ${
                      (product.stock ?? 20) <= 5 ? 'text-rose-600' : 'text-slate-900'
                    }`}>
                      {product.stock ?? 20}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Pcs</span>
                  </div>
                </div>
                
                {/* Visual stock bar */}
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (((product.stock ?? 20)) / (product.total_stock || 30)) * 100)}%` }}
                    className={`h-full transition-all duration-1000 ${
                      (product.stock ?? 20) <= 5 ? 'bg-rose-500' : 'bg-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Product Highlights Section */}
              <div className="bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 mb-6 text-left shadow-sm animate-fade-in">
                <span className="block text-[10px] uppercase font-black tracking-wider text-black mb-1.5 font-display">Highlights & Features</span>
                <p className="whitespace-pre-line leading-relaxed text-sm text-slate-800 font-extrabold font-sans">
                  {product.description?.split(/(\d+GB|\d+HZ|Snapdragon\s+\d+\w*|RAM\d+GB|Battery\s+\d+mAh|Refresh\s+Rate|Processor)/gi).map((part, i) => {
                    const isMatch = /^\d+GB|^\d+HZ|^Snapdragon|^RAM|^Battery|^Refresh|^Processor/i.test(part);
                    const valLower = part.toLowerCase();
                    const isMatch2 = valLower.includes('ram8gb') || 
                                     valLower.includes('120hz') || 
                                     valLower.includes('snapdragon 8ilight');

                    if (isMatch || isMatch2) {
                      return <strong key={i} className="font-black text-slate-900 border-b-2 border-orange-500/30">{part}</strong>;
                    }
                    return part;
                  }) || "No description available for this product."}
                </p>
              </div>

              {/* Technical Specifications Sheet */}
              {(product.ram || product.storage || product.screen_hz || product.battery || product.watt_amp) && (
                <div id="product-tech-specs" className="bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl p-4 mb-8 shadow-sm">
                  <div className="flex items-center gap-1.5 text-black mb-3">
                    <Cpu size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Device Tech Specs</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {product.ram && (
                      <div className="bg-white/60 p-2.5 rounded-xl border border-white/30 shadow-3xs">
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Memory/RAM</p>
                        <p className="text-black font-black mt-0.5">{product.ram}</p>
                      </div>
                    )}
                    {product.storage && (
                      <div className="bg-white/60 p-2.5 rounded-xl border border-white/30 shadow-3xs">
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Storage Capacity</p>
                        <p className="text-black font-black mt-0.5">{product.storage}</p>
                      </div>
                    )}
                    {product.screen_hz && (
                      <div className="bg-white/60 p-2.5 rounded-xl border border-white/30 shadow-3xs">
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Display rate</p>
                        <p className="text-black font-black mt-0.5">{product.screen_hz}</p>
                      </div>
                    )}
                    {product.battery && (
                      <div className="bg-white/60 p-2.5 rounded-xl border border-white/30 shadow-3xs">
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Battery Power</p>
                        <p className="text-black font-black mt-0.5">{product.battery}</p>
                      </div>
                    )}
                    {product.watt_amp && (
                      <div className="bg-white/60 p-2.5 rounded-xl border border-white/30 shadow-3xs col-span-2">
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Charging / Watt / Amp</p>
                        <p className="text-black font-black mt-0.5">{product.watt_amp}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Encrypted network layers operate securely in the background */}

              {/* Delivery Estimation Card */}
              <div id="delivery-estimation-card" className="bg-amber-50/50 rounded-2xl p-4 sm:p-5 border border-amber-200 mb-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-amber-500 text-white rounded-xl shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-black text-amber-950 uppercase tracking-tight">Delivery Estimation</p>
                      <p className="text-[10px] text-amber-700 font-bold leading-none mt-0.5">Select area for real-time timeline</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button 
                    type="button"
                    onClick={() => setDeliveryDistrict('bhola')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      deliveryDistrict === 'bhola'
                        ? 'border-amber-500 bg-amber-500 text-white font-black shadow-lg scale-[1.02]'
                        : 'border-amber-200 bg-white text-amber-900 hover:border-amber-400 font-bold'
                    }`}
                  >
                    <p className={`text-[9px] font-black uppercase tracking-wider ${deliveryDistrict === 'bhola' ? 'text-amber-100' : 'text-amber-500'}`}>Local Area</p>
                    <p className="text-sm mt-0.5">Bhola</p>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setDeliveryDistrict('other')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      deliveryDistrict === 'other'
                        ? 'border-amber-500 bg-amber-500 text-white font-black shadow-lg scale-[1.02]'
                        : 'border-amber-200 bg-white text-amber-900 hover:border-amber-400 font-bold'
                    }`}
                  >
                    <p className={`text-[9px] font-black uppercase tracking-wider ${deliveryDistrict === 'other' ? 'text-amber-100' : 'text-amber-500'}`}>Remote Area</p>
                    <p className="text-sm mt-0.5">Other Dist.</p>
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider">Estimated Arrival</p>
                    <p className="text-lg font-black text-amber-950 mt-0.5">
                      {deliveryDistrict === 'bhola' ? '1 - 2 Days' : '3 - 5 Days'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      Est: {deliveryDistrict === 'bhola' ? getEstimatedDates(1, 2) : getEstimatedDates(3, 5)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-2 rounded-full uppercase tracking-wider shadow-sm transition-colors ${
                    deliveryDistrict === 'bhola' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {deliveryDistrict === 'bhola' ? '⚡ Priority' : 'Standard'}
                  </span>
                </div>
              </div>
              
              {/* Seller Information */}
              {(product.seller || product.seller_whatsapp || sellerData?.whatsapp) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                        const sellerObj = sellers.find(s => s.name === product.seller);
                        if (sellerObj && onSellerSelect) {
                            onSellerSelect(sellerObj);
                        }
                    }}
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden">
                      {(product.seller_logo || sellerData?.logo) ? (
                        <img src={product.seller_logo || sellerData?.logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User2 size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 group-hover:text-orange-500 transition-colors">Product Seller</p>
                      <p className="text-sm font-black text-slate-900 group-hover:text-orange-500 transition-colors">{product.seller || 'Verified Seller'}</p>
                    </div>
                  </div>
                  
                  {/* Social Icons for Seller */}
                  <div className="flex items-center gap-2">
                    {(() => {
                        const sellerObj = sellers.find(s => s.name === product.seller);
                        if (!sellerObj) return null;
                        
                        return (
                            <>
                                {sellerObj.tiktok && sellerObj.tiktok.trim() !== '' && sellerObj.tiktok.toLowerCase().includes('tiktok.com') && (
                                    <a href={sellerObj.tiktok} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-black">
                                       <img src="https://sf-static.tiktokcdn.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png" className="w-4 h-4 object-contain" alt="TikTok" />
                                    </a>
                                )}
                                {sellerObj.facebook && sellerObj.facebook.trim() !== '' && (sellerObj.facebook.toLowerCase().includes('facebook.com') || sellerObj.facebook.toLowerCase().includes('fb.com') || sellerObj.facebook.toLowerCase().includes('fb.me')) && (
                                    <a href={sellerObj.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-black">
                                       <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm0F2xlq4BO9-4boQ1D9oGwXTiYfW5KcUvew&s" className="w-4 h-4 object-contain" alt="Facebook" />
                                    </a>
                                )}
                                {sellerObj.instagram && sellerObj.instagram.trim() !== '' && sellerObj.instagram.toLowerCase().includes('instagram.com') && (
                                    <a href={sellerObj.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-black">
                                       <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/250px-Instagram_logo_2016.svg.png" className="w-4 h-4 object-contain" alt="Instagram" />
                                    </a>
                                )}
                            </>
                        )
                    })()}
                    {(product.seller_whatsapp || sellerData?.whatsapp) && (
                        <button 
                          onClick={() => {
                            const whatsapp = product.seller_whatsapp || sellerData?.whatsapp || '';
                            const message = encodeURIComponent(`Hi, I want to buy "${product.name}" for ${formatPrice(discountedPrice)}. Is it available?`);
                            window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
                          }}
                          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center"
                        >
                          <Phone size={14} />
                          Contact
                        </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-12">
                  <div className="flex flex-col gap-6 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:bg-white/95 max-md:backdrop-blur-md max-md:p-4 max-md:border-t max-md:border-slate-200 max-md:shadow-[0_-10px_25px_rgba(0,0,0,0.08)] max-md:z-50 max-md:pb-6">
                      <div className="flex flex-col gap-4">
                          {/* Action Buttons (Quantity selected within the cart checkout block instead) */}
                          <div className="flex gap-3 w-full">
                              <button 
                                id="add-to-cart-action-btn"
                                disabled={product.stock !== undefined && product.stock <= 0}
                                onClick={() => {
                                    onAddToCart(product, 1);
                                    onClose();
                                }}
                                className={`flex-1 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                                  product.stock !== undefined && product.stock <= 0
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 cursor-pointer'
                                }`}
                              >
                                <ShoppingCart size={18} />
                                <span className="whitespace-nowrap">Add to Cart</span>
                              </button>
                               <button 
                                id="buy-now-action-btn"
                                disabled={product.stock !== undefined && product.stock <= 0}
                                onClick={() => {
                                    onBuyNow(product, 1);
                                    onClose();
                                }}
                                className={`flex-1 font-black py-4 px-4 rounded-xl transition-all flex items-center justify-center text-sm sm:text-base tracking-tight uppercase ${
                                  product.stock !== undefined && product.stock <= 0
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/20 active:scale-[0.98] cursor-pointer'
                                }`}
                              >
                                Buy Now
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* REAL REVIEW FEEDBACK SECTION */}
              <div className="border-t border-slate-200 pt-10 mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <MessagesSquare className="text-slate-800" size={24} />
                  <h3 className="text-xl font-bold text-slate-900">Customer Reviews & Ratings</h3>
                </div>

                {/* Submitting New Review Form */}
                <form onSubmit={handleReviewSubmit} className="bg-slate-50 rounded-2xl p-5 md:p-6 mb-8 border border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm mb-4">Write a Verified Review</h4>
                  
                  {reviewSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-xs font-semibold flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Thank you! Your real review has been saved successfully.
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Your Name</label>
                      <input 
                        type="text" 
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Arif Hossain" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rating</label>
                      <div className="flex items-center gap-1 bg-white p-2 rounded-xl border border-slate-200 inline-flex shadow-sm">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <button
                            key={starValue}
                            type="button"
                            onClick={() => setNewRating(starValue)}
                            className="p-1 hover:scale-110 active:scale-95 transition-transform"
                            title={`Rate ${starValue} Stars`}
                          >
                            <Star 
                              size={22} 
                              className={`transition-colors ${starValue <= newRating ? 'fill-slate-900 text-slate-900' : 'text-slate-200'}`} 
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-slate-600 px-2">({newRating}/5)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">Review</label>
                      <textarea
                        required
                        rows={2}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tell us what you think..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 text-white rounded-xl py-4 text-sm font-bold hover:bg-black transition-colors shadow-md disabled:bg-slate-400"
                    >
                      {isSubmitting ? 'Saving Review...' : 'Submit Real Review'}
                    </button>
                  </div>
                </form>

                {/* List of Reviews */}
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      Be the first to review this product!
                    </div>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600 shrink-0">
                              <User2 size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{r.userName}</p>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    size={12} 
                                    className={i < r.rating ? 'fill-slate-900 text-slate-900' : 'text-slate-200'} 
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
                            {r.createdAt}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm pl-10 whitespace-pre-line leading-relaxed">
                          {r.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recommended Products */}
              {allProducts && allProducts.length > 1 && (
                <div className="mt-auto border-t border-slate-100 pt-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 font-display">Recommended Products</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {allProducts
                      .filter(p => p.id !== product.id)
                      .slice(0, 3)
                      .map((recommendedProduct) => (
                        <div key={recommendedProduct.id} className="h-full">
                          <ProductCard 
                            product={recommendedProduct} 
                            onBuy={(p: Product) => onBuyNow(p, 1)}
                            onClick={(p: Product) => onProductSelect && onProductSelect(p)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Mobile spacer to prevent sticky bottom buttons covering content */}
              <div className="h-28 md:hidden shrink-0" />

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
