import React from 'react';
import { ShoppingCart, Zap } from 'lucide-react';
import { Product } from '../types';
import { formatPrice } from '../lib/utils';
import { motion } from 'motion/react';

interface SuperSaleCardProps {
  product: Product;
  onBuy: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onClick: (product: Product) => void;
  couponConfig?: { isActive: boolean; minPurchase: number; discountAmount: number };
}

export default function SuperSaleCard({ product, onBuy, onAddToCart, onClick, couponConfig }: SuperSaleCardProps) {
  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - (product.discount || 0) / 100) 
    : product.price;

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-white relative group h-full flex flex-col transition-all duration-300"
    >
      {/* Hot Deal Header */}
      <div className="relative bg-gradient-to-r from-orange-600 to-red-600 p-2 sm:p-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white overflow-hidden bg-white shadow-sm shrink-0">
            <img 
              src="https://t3.ftcdn.net/jpg/02/35/26/30/360_F_235263034_miJw2igmixo7ymCqhHZ7c8wp9kaujzfM.jpg" 
              alt="Fire" 
              className="w-full h-full object-cover animate-pulse scale-110"
            />
          </div>
          <span className="text-white font-black italic tracking-tighter text-xs sm:text-sm uppercase drop-shadow-sm">HOT DEAL</span>
          <Zap className="text-yellow-300 fill-yellow-300 w-3 h-3 sm:w-4 sm:h-4" />
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col" onClick={() => onClick(product)}>
        {/* Product Image */}
        <div className="w-full h-32 sm:h-48 bg-slate-50 rounded-xl flex items-center justify-center mb-3 overflow-hidden relative cursor-pointer shadow-inner">
          <img 
            src={product.image || 'https://placehold.co/400x400/e2e8f0/64748b?text=Premium+Product'} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          {hasDiscount && (
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5 items-end">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 blur opacity-40 animate-pulse"></div>
                <div className="relative bg-red-600 text-white font-black px-2 py-1 sm:px-3 sm:py-2 rounded-xl shadow-lg border border-white flex flex-col items-center justify-center leading-none">
                  <span className="text-[8px] sm:text-[9px] opacity-90 uppercase tracking-tighter">Save</span>
                  <span className="text-sm sm:text-base">{product.discount}%</span>
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* Content */}
        <div className="text-center space-y-2 flex-1 px-1">
          <h2 className="text-sm sm:text-base font-black text-slate-800 line-clamp-1 uppercase tracking-tight leading-tight">{product.name}</h2>
          
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg sm:text-2xl font-black text-red-600 tabular-nums drop-shadow-sm">{formatPrice(discountedPrice)}</span>
            {hasDiscount && (
              <span className="text-slate-400 line-through text-[10px] sm:text-xs font-bold tabular-nums">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <ShoppingCart size={14} className="group-hover:rotate-12 transition-transform" />
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
}
