'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const PAGE_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};

export default function PageTransition({ children }) {
  const pathname = usePathname() || '/';
  const reduceMotion = useReducedMotion();
  const isPortalRoute =
    pathname.startsWith('/dashboard')
    || pathname.startsWith('/spoc')
    || pathname.startsWith('/trainer')
    || pathname.startsWith('/accountant')
    || pathname.startsWith('/chat');

  if (reduceMotion || isPortalRoute) {
    return children;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={PAGE_TRANSITION}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
