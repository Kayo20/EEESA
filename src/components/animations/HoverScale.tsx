import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
  rotate?: number;
}

export function HoverScale({ 
  children, 
  className = '',
  scale = 1.05,
  rotate = 0
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ 
        scale,
        rotate,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <motion.div
      whileHover={{ 
        y: -8,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HoverGlow({ 
  children, 
  className = '',
  color = 'rgba(99, 102, 241, 0.4)'
}: { 
  children: ReactNode; 
  className?: string;
  color?: string;
}) {
  return (
    <motion.div
      whileHover={{ 
        boxShadow: `0 0 30px ${color}`,
        transition: { duration: 0.3 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
