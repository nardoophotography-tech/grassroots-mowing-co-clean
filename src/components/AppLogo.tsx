import React from 'react';
import { cn } from '../lib/utils';
import { useSettings } from '../hooks/useFirebase';

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
  showText = true,
}: AppLogoProps) => {
  const { settings } = useSettings();
  const [imgError, setImgError] = React.useState(false);
  const businessName = settings?.businessName || 'GrassRoots Mowing Co.';

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative flex-shrink-0 flex items-center justify-center", imageClassName)}>
        {!imgError ? (
          <img 
            src="/logo.png" 
            alt="Logo"
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
             <div className="w-5 h-5 bg-primary/40 rounded-sm rotate-45 animate-pulse" />
          </div>
        )}
      </div>
      
      {showText && (
        <div className={cn("flex flex-col -space-y-0.5", textClassName)}>
          <span className="font-black text-charcoal tracking-tighter text-sm lg:text-base leading-none uppercase">
            {businessName.split(' ')[0]}
          </span>
          <span className="font-bold text-primary text-[8px] lg:text-[10px] uppercase tracking-[0.2em] leading-none">
            {businessName.split(' ').slice(1).join(' ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default AppLogo;
