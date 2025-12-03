import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function GlassCard({ 
  children, 
  className, 
  hover = true,
  animate = true,
  ...props 
}) {
  const Component = animate ? motion.div : 'div';
  
  return (
    <Component
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-white/70 backdrop-blur-xl",
        "border border-white/20",
        "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
        hover && "transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] hover:bg-white/80",
        className
      )}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, ease: "easeOut" }}
      {...props}
    >
      {children}
    </Component>
  );
}

export function GlassCardHeader({ children, className }) {
  return (
    <div className={cn("px-6 py-5 border-b border-gray-100/50", className)}>
      {children}
    </div>
  );
}

export function GlassCardContent({ children, className }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}

export function GlassCardFooter({ children, className }) {
  return (
    <div className={cn("px-6 py-4 border-t border-gray-100/50 bg-gray-50/30", className)}>
      {children}
    </div>
  );
}