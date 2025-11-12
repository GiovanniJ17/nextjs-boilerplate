import { Variants } from 'framer-motion';

// Easing functions
export const easing = {
  smooth: [0.6, -0.05, 0.01, 0.99] as const,
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
  softSpring: { type: 'spring' as const, stiffness: 100, damping: 20 },
};

// Fade animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3, ease: easing.smooth }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: easing.smooth }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: easing.smooth }
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.2 }
  }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: easing.smooth }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: easing.smooth }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2 }
  }
};

// Scale animations
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: easing.smooth }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

export const scaleInSpring: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: easing.spring
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

// Slide animations
export const slideInLeft: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: easing.smooth }
  },
  exit: { 
    x: -100, 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

export const slideInRight: Variants = {
  hidden: { x: 100, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: easing.smooth }
  },
  exit: { 
    x: 100, 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// Stagger children animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Accordion/Collapse animations
export const collapse: Variants = {
  hidden: { 
    height: 0, 
    opacity: 0,
    overflow: 'hidden'
  },
  visible: { 
    height: 'auto', 
    opacity: 1,
    transition: { 
      height: { duration: 0.3, ease: easing.smooth },
      opacity: { duration: 0.2, delay: 0.1 }
    }
  },
  exit: { 
    height: 0, 
    opacity: 0,
    transition: { 
      height: { duration: 0.3, ease: easing.smooth },
      opacity: { duration: 0.2 }
    }
  }
};

// Button hover/tap animations
export const buttonTap = {
  scale: 0.95,
  transition: { duration: 0.1 }
};

export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

// Card animations
export const cardHover = {
  y: -4,
  boxShadow: '0 10px 30px -15px rgba(0, 0, 0, 0.2)',
  transition: { duration: 0.2 }
};

// Page transition animations
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: easing.smooth,
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 }
  }
};

// Notification/Toast animations
export const toastSlideIn: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  exit: { 
    x: 400, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Loading animations
export const pulse: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const spin: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// Filter toggle animations
export const filterExpand: Variants = {
  hidden: { 
    height: 0, 
    opacity: 0,
    marginTop: 0,
  },
  visible: { 
    height: 'auto', 
    opacity: 1,
    marginTop: 16,
    transition: { 
      duration: 0.3, 
      ease: easing.smooth 
    }
  }
};
