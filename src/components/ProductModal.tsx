import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart, Plus, Minus, Star, Heart, CheckCircle, MessagesSquare, User2 } from 'lucide-react';
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
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart, onBuyNow, allProducts = [], onProductSelect }: ProductModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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
          if (dbReviews.length > 0) {
            setReviews(dbReviews);
          } else {
            // fallback
            const fallbackReviews: Review[] = [
              {
                id: 'mock-1',
                userName: 'Tanvir Rahman',
                rating: 5,
                comment: 'Highly recommended! The quality is premium and delivery was exceptionally fast in Dhaka.',
                createdAt: '2 days ago'
              },
              {
                id: 'mock-2',
                userName: 'Sultana Begum',
                rating: 4,
                comment: 'Very good product, exactly as described. Worth the price!',
                createdAt: '1 week ago'
              }
            ];
            setReviews(fallbackReviews);
          }
        }
      };
      fetchReviews();

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
    ? ((product.reviewCount || 12) + reviews.filter(r => !r.id.startsWith('mock-')).length)
    : (product.reviewCount || 12);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white"
          />
          
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="w-full h-full bg-white relative flex flex-col md:flex-row overflow-hidden overflow-y-auto"
          >
            <button 
              onClick={onClose}
              className="fixed top-4 left-4 z-20 w-10 h-10 flex items-center justify-center bg-white/85 backdrop-blur rounded-full text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
              aria-label="Back to store"
            >
              <ArrowLeft size={24} />
            </button>

            {/* Image Gallery Column with support for gesture slide */}
            <div className="w-full md:w-1/2 bg-slate-50 relative flex flex-col min-h-[55vh] md:min-h-full">
              <div 
                className="relative flex-1 flex items-center justify-center p-8 group cursor-grab active:cursor-grabbing select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                 {hasDiscount && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-tighter shadow-sm z-10">
                        {product.discount}% OFF
                    </div>
                 )}

                 {/* Tap heart overlay to like/favorite */}
                 <button
                    onClick={toggleLike}
                    className="absolute top-4 right-16 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:scale-110 active:scale-95 shadow-md transition-all"
                    title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
                 >
                    <Heart size={20} className={`transition-transform duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
                 </button>

                 <AnimatePresence mode="wait">
                    <motion.img 
                        key={currentImageIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                        src={allImages[currentImageIndex]} 
                        alt={product.name}
                        className="w-full h-full object-contain max-h-[60vh] pointer-events-none"
                    />
                 </AnimatePresence>

                 {/* slide indicator info */}
                 <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-950/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full pointer-events-none sm:opacity-0 group-hover:opacity-100 transition-opacity">
                   {currentImageIndex + 1} / {allImages.length}
                 </div>

                 {/* Visual dots indicators */}
                 {allImages.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-slate-900/10 backdrop-blur-xs px-3 py-1.5 rounded-full">
                      {allImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${currentImageIndex === idx ? 'bg-orange-600 w-4' : 'bg-slate-400/60'}`}
                          title={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                 )}

                 {allImages.length > 1 && (
                    <>
                        <button 
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg text-slate-700 hover:text-slate-900 md:opacity-0 md:group-hover:opacity-100 transition-all hover:scale-105"
                            aria-label="Previous image"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg text-slate-700 hover:text-slate-900 md:opacity-0 md:group-hover:opacity-100 transition-all hover:scale-105"
                            aria-label="Next image"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                 )}
              </div>
              
              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="h-24 bg-white border-t border-slate-100 p-2 flex gap-2 overflow-x-auto no-scrollbar">
                    {allImages.map((img, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-orange-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover bg-slate-50" />
                        </button>
                    ))}
                </div>
              )}
            </div>

            {/* Content Column */}
            <div className="w-full md:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col pt-10 md:pt-16 overflow-y-auto">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                    Product Details
                </span>
                <div className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full">
                  <Star size={14} className="fill-orange-500 text-orange-500" />
                  <span className="text-xs font-bold text-orange-700">
                    {dynamicAvgRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-orange-600/70 ml-1">
                    ({dynamicReviewCount} reviews)
                  </span>
                </div>
                {(likesCount > 0 || isLiked) && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <Heart size={12} className={`transition-all ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                    {likesCount || (isLiked ? 1 : 0)} {likesCount === 1 ? 'Like' : 'Likes'}
                  </span>
                )}
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-slate-900 mb-4 leading-tight">
                {product.name}
              </h2>
              
              <div className="flex items-end gap-3 mb-8">
                <span className="text-4xl font-bold text-orange-600 tracking-tight">
                    {formatPrice(discountedPrice)}
                </span>
                {hasDiscount && (
                    <span className="text-xl text-slate-400 line-through mb-1.5">
                        {formatPrice(product.price)}
                    </span>
                )}
              </div>
              
              <div className="prose prose-slate mb-10 max-w-none text-slate-600 text-base md:text-lg">
                <p className="whitespace-pre-line leading-relaxed">{product.description || "No description available for this product."}</p>
              </div>
              
              <div className="mb-12">
                  <div className="flex flex-col gap-6">
                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between border-2 border-slate-200 rounded-2xl p-2 bg-slate-50 lg:w-1/2">
                          <button 
                              onClick={() => updateQuantity(-1)}
                              className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white text-slate-600 transition-colors shadow-sm"
                              aria-label="Decrease quantity"
                          >
                              <Minus size={20} />
                          </button>
                          <span className="font-bold text-slate-800 text-xl w-12 text-center">{quantity}</span>
                          <button 
                              onClick={() => updateQuantity(1)}
                              className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white text-slate-600 transition-colors shadow-sm"
                              aria-label="Increase quantity"
                          >
                              <Plus size={20} />
                          </button>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-4 relative">
                          <button 
                            onClick={() => {
                                onAddToCart(product, quantity);
                                onClose();
                            }}
                            className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-600 border-2 border-orange-200 font-bold py-4 px-6 rounded-2xl transition-colors flex items-center justify-center gap-3 text-lg"
                          >
                            <ShoppingCart size={22} />
                            Add to Cart
                          </button>
                          <button 
                            onClick={() => {
                                onBuyNow(product, quantity);
                                onClose();
                            }}
                            className="flex-1 bg-slate-900 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center shadow-xl shadow-orange-500/0 hover:shadow-orange-500/20 active:scale-[0.98] text-lg"
                          >
                            Buy Now
                          </button>
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rating</label>
                      <div className="flex items-center gap-1 bg-white p-2 rounded-xl border border-slate-200 inline-flex">
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
                              className={`transition-colors ${starValue <= newRating ? 'fill-orange-500 text-orange-500' : 'text-slate-200'}`} 
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-slate-600 px-2">({newRating}/5)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">Your Feedback / Comment</label>
                      <textarea
                        required
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tell us about the product quality, features, delivery experience..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-bold hover:bg-orange-600 transition-colors shadow-md disabled:bg-slate-400"
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
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 text-orange-600 shrink-0">
                              <User2 size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{r.userName}</p>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    size={12} 
                                    className={i < r.rating ? 'fill-orange-500 text-orange-500' : 'text-slate-200'} 
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

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
