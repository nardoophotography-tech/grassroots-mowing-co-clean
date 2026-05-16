import * as React from 'react';
import { cn } from '@/src/lib/utils';

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('w-full', className)}
    {...props}
  />
));
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex h-12 items-center justify-center rounded-2xl bg-border/30 p-1.5 text-clay shadow-inner',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ className, active, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-2 text-xs font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      active
        ? 'bg-white text-primary shadow-premium scale-[1.02]'
        : 'hover:text-charcoal hover:bg-white/50',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { active?: boolean }
>(({ className, active, ...props }, ref) => {
  if (!active) return null;
  return (
    <div
      ref={ref}
      className={cn(
        'mt-4 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 animate-in fade-in slide-in-from-bottom-2 duration-300',
        className
      )}
      {...props}
    />
  );
});
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
