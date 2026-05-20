import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
  className?: string;
  children?: React.ReactNode;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'border-transparent bg-secondary text-white hover:bg-secondary/90 shadow-sm',
    outline: 'border-border text-charcoal bg-transparent hover:bg-clay/5',
    destructive: 'border-transparent bg-secondary text-white hover:bg-secondary/90',
    success: 'border-transparent bg-primary text-white hover:bg-primary/90',
    warning: 'border-transparent bg-ochre text-white hover:bg-ochre/90',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
