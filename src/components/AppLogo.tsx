import React from 'react';
import { cn } from '../lib/utils';
import { useSettings } from '../hooks/useFirebase';
import { useLatestAsset } from '../hooks/useAssets';

interface AppLogoProps {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

const AppLogo = ({ 
  className, 
  imageClassName, 
  textClassName, 
  showText = false,
}: AppLogoProps) => {
  const { settings } = useSettings();
  const { asset: logoAsset } = useLatestAsset('logo');
  const [imgError, setImgError] = React.useState(false);
  const businessName = settings?.businessName || 'GRASSROOTS MOWING CO.';
  const nameParts = businessName.split(' ');
  const firstPart = nameParts[0] || 'GRASSROOTS';
  const restPart = nameParts.slice(1).join(' ') || 'MOWING CO.';

  const showBrandingText = showText;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className={cn("relative flex-shrink-0 flex items-center justify-center", imageClassName)}>
        {!imgError ? (
          <img 
            src={logoAsset?.url || "/logo.png"} 
            alt="Logo"
            className="h-16 sm:h-20 w-auto object-contain"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
             <div className="w-5 h-5 bg-primary/40 rounded-sm rotate-45 animate-pulse" />
          </div>
        )}
      </div>
      
      {showBrandingText && (
        <div className={cn("flex flex-col -space-y-1.5", textClassName)}>
          <span className="font-black text-secondary tracking-tighter text-xl lg:text-3xl leading-none uppercase italic">
            {firstPart}
          </span>
          <span className="font-black text-primary text-[10px] lg:text-[14px] uppercase tracking-[0.35em] leading-none italic mt-0.5">
            {restPart}
          </span>
        </div>
      )}
    </div>
  );
};

export default AppLogo;
