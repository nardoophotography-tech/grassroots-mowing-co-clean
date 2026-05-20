import * as React from 'react';
import { cn } from '@/lib/utils';
import { Image as ImageIcon } from 'lucide-react';

interface ImagePlaceholderProps {
  className?: string;
  seed?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  label?: string;
  id?: number;
  src?: string;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ 
  className, 
  seed = 'lawn', 
  width = 800, 
  height = 400,
  aspectRatio,
  label,
  id,
  src
}) => {
  // Use a locally consistent brand-styled placeholder instead of external services
  const imageUrl = src || '';

  return (
    <div 
      className={cn(
        "relative group overflow-hidden rounded-xl bg-ochre/10 border-2 border-dashed border-ochre/20 flex items-center justify-center transition-all duration-500 hover:border-ochre/40",
        !src && "animate-pulse",
        className
      )}
      style={{ aspectRatio }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label || "Placeholder image"}
          referrerPolicy="no-referrer"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 scale-105 group-hover:scale-100"
          )}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <ImageIcon className="h-8 w-8 text-ochre/40" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-ochre/60 uppercase tracking-widest leading-none">Asset Configuration Needed</p>
            <p className="text-[8px] text-ochre/40 font-bold uppercase tracking-tighter mt-1">Ref: {seed}</p>
          </div>
        </div>
      )}
      
      {/* Identifier Badge */}
      {id && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-deep-red text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-xl border-2 border-white animate-pulse">
            #{id}
          </div>
        </div>
      )}

      {/* Show icon/label only if no source provided */}
      {!src && (
        <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none">
          <div className="p-3 rounded-full bg-white/80 shadow-lg group-hover:scale-110 transition-transform duration-500">
            <ImageIcon className="h-6 w-6 text-ochre" />
          </div>
          {label && (
            <span className="bg-charcoal/80 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-sm">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
