import { ShoppingCart, Star, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { formatPrice } from '../lib/utils';
import { Product } from '../types';
import { getProductLikesState, toggleProductLike, getProductReviews } from '../lib/db-sync';

export default function ProductCard({ product, onBuy, onAddToCart, onClick }: { product: Product; onBuy: (product: Product) => void, onAddToCart?: (product: Product) => void, onClick?: (product: Product) => void }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const fetchLikes = async () => {
      const state = await getProductLikesState(product.id);
      if (active) {
        setIsLiked(state.userLiked);
        setLikesCount(state.totalLikes);
      }
    };
    fetchLikes();

    window.addEventListener('favorites-updated', fetchLikes);
    return () => {
      active = false;
      window.removeEventListener('favorites-updated', fetchLikes);
    };
  }, [product.id]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI updates
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);

    const nextState = await toggleProductLike(product.id);
    setIsLiked(nextState.userLiked);
    setLikesCount(nextState.totalLikes);
  };

  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - (product.discount || 0) / 100) 
    : product.price;

  // Let's get real rating dynamically calculated from server-side database reviews
  const [avgRating, setAvgRating] = useState(product.rating || 4.8);
  const [count, setCount] = useState(product.reviewCount || 12);

  useEffect(() => {
    let active = true;
    const handleReviewsUpdate = async () => {
      const reviews = await getProductReviews(product.id);
      if (!active) return;
      if (reviews.length > 0) {
        const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        setAvgRating(sum / reviews.length);
        setCount((product.reviewCount || 12) + reviews.filter((r: any) => !r.id.startsWith('mock-')).length);
      } else {
        setAvgRating(product.rating || 4.8);
        setCount(product.reviewCount || 12);
      }
    };
    handleReviewsUpdate();

    const eventName = `reviews-updated-${product.id}`;
    window.addEventListener(eventName, handleReviewsUpdate);
    return () => {
      active = false;
      window.removeEventListener(eventName, handleReviewsUpdate);
    };
  }, [product.id, product.rating, product.reviewCount]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group glass-card rounded-xl flex flex-col p-2 relative overflow-hidden h-full"
    >
      <div 
        className="cursor-pointer"
        onClick={() => onClick && onClick(product)}
      >
        <div className="relative h-32 sm:h-40 rounded-lg bg-slate-50 overflow-hidden mb-2 p-2">
          {/* Like/Favorite floating button */}
          <button
            onClick={toggleLike}
            className="absolute top-2 right-2 z-20 px-2 h-8 rounded-full bg-white/90 backdrop-blur border border-slate-100 flex items-center justify-center gap-1 text-slate-500 hover:text-red-500 hover:scale-105 active:scale-95 shadow-sm transition-all"
            title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Heart size={13} className={`transition-transform duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400'}`} />
            {likesCount > 0 && <span className="text-[10px] font-bold text-slate-600 font-mono">{likesCount}</span>}
          </button>

          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
          />
          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm z-10">
              {product.discount}% OFF
            </div>
          )}
        </div>
        
        <div className="px-1 flex flex-col flex-1">
          <h3 className="text-[11px] sm:text-xs font-bold text-slate-900 line-clamp-1 mb-0.5">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mb-1">
            <Star size={10} className="fill-orange-500 text-orange-500" />
            <span className="text-[10px] font-bold text-slate-700">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-[9px] text-slate-400">
              ({count})
            </span>
          </div>
          <p className="text-[10px] text-slate-500 line-clamp-1 mb-2 h-4 hidden sm:block">
            {product.description}
          </p>
        </div>
      </div>
              <div className="px-1 flex flex-col mt-auto gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {hasDiscount && (
                <span className="text-[8px] text-slate-400 line-through leading-none">
                  {formatPrice(product.price)}
                </span>
              )}
              <span className="text-xs sm:text-sm font-bold text-orange-600 font-display">
                {formatPrice(discountedPrice)}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            <button 
              onClick={() => onAddToCart && onAddToCart(product)}
              className="flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded-md transition-all active:scale-95 text-[10px] font-bold shadow-sm"
            >
              Add to Cart
            </button>
            <button 
              onClick={() => onBuy(product)}
              className="flex items-center justify-center bg-slate-900 text-white hover:bg-orange-600 px-2 py-1.5 rounded-md transition-all active:scale-95 text-[10px] font-bold shadow-sm"
            >
              Buy Now
            </button>
          </div>
        </div>
    </motion.div>
  );
}
