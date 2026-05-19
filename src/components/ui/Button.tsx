import * as React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link';
  size?: 'default' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      default: 'bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20 hover:shadow-secondary/30 transition-all duration-300 font-bold',
      primary: 'bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20 hover:shadow-secondary/30 transition-all duration-300 font-bold',
      secondary: 'bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20 hover:shadow-secondary/30 transition-all duration-300 font-bold',
      outline: 'border-2 border-secondary bg-transparent hover:bg-secondary/5 text-secondary hover:border-secondary transition-all duration-300 font-bold',
      ghost: 'bg-transparent hover:bg-secondary/10 text-secondary hover:text-secondary transition-all duration-300 font-bold',
      danger: 'bg-danger text-white hover:bg-danger/90 shadow-lg shadow-danger/20 transition-all duration-300 font-bold',
      success: 'bg-[#1f4d3a] text-white hover:bg-opacity-90 shadow-lg transition-all duration-300 font-bold',
      link: 'bg-transparent text-secondary underline-offset-4 hover:underline font-bold',
    };

    const sizes = {
      default: 'px-6 py-3 text-xs font-black uppercase tracking-[0.1em]',
      sm: 'px-4 py-2 text-[10px] font-black uppercase tracking-widest',
      md: 'px-6 py-3 text-xs font-black uppercase tracking-[0.1em]',
      lg: 'px-10 py-4 text-sm font-black uppercase tracking-[0.2em] italic',
      icon: 'p-3',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children as React.ReactNode}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
