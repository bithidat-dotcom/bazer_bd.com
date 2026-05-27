import { motion } from 'motion/react';

interface CategoryScrollerProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
}

export default function CategoryScroller({ categories, selectedCategory, onSelect }: CategoryScrollerProps) {
  return (
    <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 sticky top-[72px] z-40 bg-white/80 backdrop-blur-md">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelect(null)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
          selectedCategory === null 
            ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
            : 'bg-white text-slate-500 border-slate-100'
        }`}
      >
        All
      </motion.button>
      {categories.map((cat) => (
        <motion.button
          key={cat}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(cat)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
            selectedCategory === cat 
              ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-black/20' 
              : 'bg-white text-slate-500 border-slate-100'
          }`}
        >
          {cat}
        </motion.button>
      ))}
    </div>
  );
}
