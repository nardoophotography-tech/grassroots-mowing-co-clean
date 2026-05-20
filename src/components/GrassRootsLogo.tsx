import * as React from 'react';
import { cn } from '@/lib/utils';
import AppLogo from './AppLogo';

interface GrassRootsLogoProps {
  className?: string;
  showText?: boolean;
}

export const GrassRootsLogo: React.FC<GrassRootsLogoProps> = ({ 
  className,
  showText = false
}) => {
  return (
    <AppLogo 
      className={className} 
      showText={showText}
    />
  );
};
