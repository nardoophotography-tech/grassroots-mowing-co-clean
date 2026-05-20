import * as React from 'react';
import { cn } from '@/lib/utils';

interface GrassRootsGuardianProps {
  className?: string;
  opacity?: number;
  size?: number | string;
  variant?: 'watermark' | 'spotlight' | 'original' | 'roots';
}

/**
 * GrassRootsGuardian: A modern representation inspired by the artwork of SunRock
 * and the natural landscapes of the country.
 * 
 * Symbolism:
 * - Central Figure: Hard work, care for the land, family.
 * - Roots: Connection to land, community, and growth.
 * - Spirals: The cyclical nature of growth and connection.
 */
export const GrassRootsGuardian: React.FC<GrassRootsGuardianProps> = ({ 
  className, 
  opacity = 1,
  size = "100%",
  variant = 'watermark'
}) => {
  // Using the uploaded brand logo which contains the Guardian and Roots
  const displayUrl = "/logo.png";

  const getVariantClasses = () => {
    switch (variant) {
      case 'watermark': return "grayscale brightness-0 opacity-10";
      case 'spotlight': return "grayscale opacity-20 brightness-0 contrast-125";
      case 'original': return "opacity-100";
      case 'roots': return "sepia-[.5] brightness-75 contrast-125 opacity-40";
      default: return "grayscale brightness-0 opacity-10";
    }
  };

  return (
    <div 
      className={cn("transition-all duration-700 flex items-center justify-center", className)}
      style={{ opacity: variant === 'original' ? 1 : opacity, width: size, height: 'auto' }}
    >
      <img 
        src={displayUrl} 
        alt="GrassRoots Guardian - Rooted in Country"
        className={cn("w-full h-auto object-contain", getVariantClasses())}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
