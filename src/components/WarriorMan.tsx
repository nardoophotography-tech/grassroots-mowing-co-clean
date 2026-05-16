import * as React from 'react';
import { cn } from '@/src/lib/utils';

interface WarriorManProps {
  className?: string;
  opacity?: number;
  size?: number | string;
}

export const WarriorMan: React.FC<WarriorManProps> = ({ 
  className, 
  opacity = 1,
  size = "100%"
}) => {
  // Using the uploaded brand logo
  const displayUrl = "/logo.png";

  return (
    <div 
      className={cn("transition-opacity duration-500 flex items-center justify-center", className)}
      style={{ opacity, width: size, height: 'auto' }}
    >
      <img 
        src={displayUrl} 
        alt="" 
        className="w-full h-auto object-contain grayscale brightness-0 opacity-20"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
