import * as React from 'react';
import { Camera, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface EditableImageProps {
  src: string;
  thumbnailSrc?: string;
  label?: string;
  className?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  onUpload?: (url: string) => void; // Keep for prop compatibility but redirect
}

export const EditableImage: React.FC<EditableImageProps> = ({
  src,
  thumbnailSrc,
  label,
  className,
  aspectRatio,
  width,
  height
}) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = React.useState(false);

  const handleImageClick = () => {
    if (isAdmin) {
      navigate('/admin/assets');
    }
  };

  return (
    <div 
      className={cn(
        "relative group overflow-hidden rounded-xl bg-charcoal/5 border border-border flex items-center justify-center transition-all",
        isAdmin && "cursor-pointer hover:ring-2 hover:ring-primary/50",
        className
      )}
      style={{ aspectRatio, width, height }}
      onClick={handleImageClick}
    >
      {/* Thumbnail placeholder */}
      {thumbnailSrc && !isLoaded && (
        <img 
          src={thumbnailSrc} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-50"
          aria-hidden="true"
        />
      )}

      {src ? (
        <img
          src={src}
          alt={label || "Site image"}
          width={width}
          height={height}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          referrerPolicy="no-referrer"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105",
            !isLoaded && thumbnailSrc ? "opacity-0" : "opacity-100"
          )}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
          <Camera className="h-8 w-8 text-ochre opacity-20" />
          <p className="text-[10px] font-black text-ochre/40 uppercase tracking-widest">Asset Required</p>
        </div>
      )}

      {/* Loading state indicator */}
      {!isLoaded && !thumbnailSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-charcoal/5">
           <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {isAdmin && (
        <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 z-20">
          <div className="bg-white p-3 rounded-full shadow-premium text-primary transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75">
            <Camera className="h-6 w-6" />
          </div>
          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-primary/80 px-4 py-2 rounded-full transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-150">
            Open Asset Portfolio
          </span>
        </div>
      )}

      {/* Visual Indicator for Admins only */}
      {isAdmin && (
        <div className="absolute top-4 right-4 bg-primary text-white p-1.5 rounded-lg shadow-premium opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-white/20">
          <ExternalLink className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
