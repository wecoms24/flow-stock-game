import type { Variants, Transition } from 'motion/react'

/* ── Shared Transitions ── */

export const springBounce: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
}

export const easeOut: Transition = {
  duration: 0.15,
  ease: [0, 0, 0.2, 1],
}

export const easeInOut: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
}

/* ── Window Animations ── */

export const windowVariants: Variants = {
  hidden: {
    scale: 0.92,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: [0, 0, 0.2, 1],
    },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: [0.4, 0, 1, 1],
    },
  },
  minimized: {
    scale: 0.1,
    opacity: 0,
    y: 200,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
}

/* ── Toast Animations ── */

export const toastVariants: Variants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
}

/* ── Fade Animations ── */

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

/* ── Slide Animations ── */

export const slideInUpVariants: Variants = {
  hidden: {
    y: 20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    y: -10,
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

/* ── Scale Animations ── */

export const scaleInVariants: Variants = {
  hidden: {
    scale: 0.8,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    transition: { duration: 0.1 },
  },
}

/* ── Card Flip ── */

export const cardFlipVariants: Variants = {
  faceDown: {
    rotateY: 180,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  faceUp: {
    rotateY: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
}

/* ── Stagger Children ── */

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItemVariants: Variants = {
  hidden: {
    y: 20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}
