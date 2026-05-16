import * as React from 'react';
import { cn } from '@/src/lib/utils';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-11 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-charcoal ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-sm appearance-none',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
