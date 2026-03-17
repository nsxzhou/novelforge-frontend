import type { Variants } from 'framer-motion'

export const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  } as Variants,
  fadeInUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  } as Variants,
  staggerChildren: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  } as Variants,
}

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
}
