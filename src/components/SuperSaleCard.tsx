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
      whileHover={{ y: -8 }}
      className="max-w-sm w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-white relative group h-full flex flex-col transition-all duration-500"
    >
      {/* Hot Deal Header */}
      <div className="relative bg-gradient-to-r from-orange-600 to-red-600 p-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white shadow-lg">
            <img 
              src="https://t3.ftcdn.net/jpg/02/35/26/30/360_F_235263034_miJw2igmixo7ymCqhHZ7c8wp9kaujzfM.jpg" 
              alt="Fire" 
              className="w-full h-full object-cover animate-pulse scale-110"
            />
          </div>
          <span className="text-white font-black italic tracking-tighter text-xl uppercase drop-shadow-md">HOT DEAL</span>
          <Zap className="text-yellow-300 fill-yellow-300 animate-bounce" size={20} />
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col" onClick={() => onClick(product)}>
        {/* Product Image */}
        <div className="w-full h-64 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 overflow-hidden relative cursor-pointer shadow-inner">
          <img 
            src={product.image || 'https://placehold.co/400x400/e2e8f0/64748b?text=Premium+Product'} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          {hasDiscount && (
            <div className="absolute top-4 right-4 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 blur-lg opacity-40 animate-pulse"></div>
                <div className="relative bg-red-600 text-white text-[12px] font-black px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex flex-col items-center justify-center leading-none">
                  <span className="text-[10px] opacity-80 uppercase tracking-tighter">Save</span>
                  <span>{product.discount}%</span>
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* Content */}
        <div className="text-center space-y-3 flex-1 px-2">
          <h2 className="text-2xl font-black text-slate-800 line-clamp-1 uppercase tracking-tight leading-none">{product.name}</h2>
          
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-black text-red-600 tabular-nums drop-shadow-sm">{formatPrice(discountedPrice)}</span>
            {hasDiscount && (
              <span className="text-slate-400 line-through text-base font-bold tabular-nums">{formatPrice(product.price)}</span>
            )}
          </div>
          
          <p className="text-slate-500 text-sm font-medium leading-relaxed px-2 line-clamp-2">
            {product.description || 'Premium quality product with limited seasonal offer. Don\'t miss out! Special Super Sale edition available for a limited time.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-lg uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-xl shadow-orange-500/30 transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"
          >
            <ShoppingCart size={22} className="group-hover:rotate-12 transition-transform" />
            Add to Cart
          </button>
        </div>
      </div>
    </motion.div>
  );
}
