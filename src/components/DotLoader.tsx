import { motion } from 'motion/react';

export default function DotLoader() {
  const dots = [0, 1, 2];
  
  return (
    <div className="flex items-center justify-center gap-2 p-10">
      {dots.map((dot) => (
        <motion.div
          key={dot}
          className="w-3 h-3 bg-orange-500 rounded-full"
          animate={{
            y: [0, -15, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: dot * 0.1,
          }}
        />
      ))}
    </div>
  );
}
