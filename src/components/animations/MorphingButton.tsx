import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface MorphingButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  isActive?: boolean;
  disabled?: boolean;
}

export function MorphingButton({ 
  children, 
  onClick,
  className = '',
  isActive = false
}: MorphingButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        borderRadius: isActive ? '50%' : '12px',
        rotate: isActive ? 180 : 0,
      }}
      transition={{
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1]
      }}
    >
      {children}
    </motion.button>
  );
}

export function ElasticButton({ 
  children, 
  onClick,
  className = '',
  disabled = false
}: MorphingButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={className}
      disabled={disabled}
      whileHover={disabled ? undefined : { 
        scale: 1.05,
        transition: { type: 'spring', stiffness: 400, damping: 10 }
      }}
      whileTap={disabled ? undefined : { 
        scale: 0.9,
        transition: { type: 'spring', stiffness: 400, damping: 10 }
      }}
    >
      {children}
    </motion.button>
  );
}
