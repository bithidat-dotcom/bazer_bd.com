import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PopupAdProps {
  isOpen: boolean;
  onClose: () => void;
  adContent: { imageUrl: string; title: string; link?: string };
}

export default function PopupAd({ isOpen, onClose, adContent }: PopupAdProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white p-4 rounded-3xl w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute -top-3 -right-3 bg-white p-1 rounded-full shadow-lg">
          <X size={20} />
        </button>
        <img src={adContent.imageUrl} alt={adContent.title} className="w-full rounded-2xl mb-4" />
        <h3 className="font-bold text-lg mb-2">{adContent.title}</h3>
        {adContent.link && (
          <a href={adContent.link} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-orange-600 text-white font-bold py-3 rounded-xl">
            View Details
          </a>
        )}
      </div>
    </div>
  );
}
