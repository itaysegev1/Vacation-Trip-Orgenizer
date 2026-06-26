import { motion } from 'motion/react';
import { pageVariants } from '../lib/motionVariants';

/**
 * Wraps a page so it dissolves out / blooms in on navigation.
 * Used inside <AnimatePresence mode="wait"> in App.jsx.
 */
export default function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
