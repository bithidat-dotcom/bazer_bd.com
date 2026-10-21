import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ShoppingBag, Search, SlidersHorizontal, Plus, Star, Heart, Flame, User
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, db2 } from '../lib/firebase';
import { Product } from '../types';
import { isFirestoreQuotaExceeded } from '../lib/db-sync';

export default function FoodPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    let unsubProducts = () => {};

    const loadFoods = async () => {
      try {
        const res = await fetch('/api/foods').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.foods && Array.isArray(data.foods) && data.foods.length > 0) {
            setProducts(data.foods);
            setFilteredProducts(data.foods);
            setLoading(false);
            return;
          }
        }
      } catch (e) {}

      // If not quota exceeded, try live db2
      if (!isFirestoreQuotaExceeded()) {
        try {
          const qProducts2 = query(collection(db2, 'products'), orderBy('created_at', 'desc'));
          unsubProducts = onSnapshot(qProducts2, (snapshot) => {
            const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            const foodsList = prodData.filter((p: any) => 
              p.category?.toLowerCase().trim() === 'food'
            );
            setProducts(foodsList);
            setFilteredProducts(foodsList);
            setLoading(false);
          }, (err) => {
            console.warn("Firestore foods query switched to offline:", err.message);
            setLoading(false);
          });
        } catch (e) {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadFoods();
    return () => unsubProducts();
  }, []);

  // Filter based on search
  useEffect(() => {
    let result = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );
    }
    setFilteredProducts(result);
  }, [products, searchQuery]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 pb-20 font-sans">
      {/* Blue Header */}
      <header className="sticky top-0 z-40 bg-blue-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <button onClick={() => navigate('/')} className="p-2 bg-blue-800 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-widest">Food Menu</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="p-2 bg-blue-800 rounded-full">
            <User size={20} />
          </button>
          <button onClick={() => navigate('/checkout')} className="p-2 bg-blue-800 rounded-full">
            <ShoppingBag size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
          <input 
            type="text" 
            placeholder="Search food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-3xl border border-blue-100 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Food List */}
        {loading ? (
          <p>Loading delicious food...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(p => (
              <motion.div 
                key={p.id}
                className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <img src={p.image} alt={p.name} className="w-full h-48 object-cover" />
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-black text-blue-950">{p.name}</h3>
                    {p.spicy_level && p.spicy_level !== 'none' && (
                      <span className="flex items-center gap-1 text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                        <Flame size={12} /> {p.spicy_level}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-4">{p.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-blue-800">{p.price} ৳</span>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">Add</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
