import type { Transition, Variants } from 'framer-motion'

export const transitions = {
  spring: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  springGentle: { type: 'spring', stiffness: 300, damping: 25 } as Transition,
  ease: { type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.2 } as Transition,
  easeSlow: { type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.35 } as Transition,
}

export const variants = {
  fadeInUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  } as Variants,
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  } as Variants,
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  } as Variants,
  slideInRight: {
    hidden: { opacity: 0, x: 16 },
    visible: { opacity: 1, x: 0 },
  } as Variants,
  slideInLeft: {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  } as Variants,
  staggerChildren: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  } as Variants,
  staggerChildrenSlow: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  } as Variants,
  collapse: {
    open: { height: 'auto', opacity: 1 },
    closed: { height: 0, opacity: 0, overflow: 'hidden' },
  } as Variants,
}

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: transitions.ease,
}
