import * as React from 'react';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage';
import { storage } from '@/src/firebase';
import { Camera, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';

interface EditableImageProps {
  src: string;
  onUpload: (newUrl: string) => Promise<void>;
  label?: string;
  className?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

export const EditableImage: React.FC<EditableImageProps> = ({
  src,
  onUpload,
  label,
  className,
  aspectRatio,
  width,
  height
}) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    if (isAdmin && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      toast.error('Only PNG files allowed');
      return;
    }

    try {
      setUploading(true);
      
      const path = label ? `assets/${label.toLowerCase().replace(/\s+/g, '-')}.png` : `assets/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await onUpload(downloadURL);
      toast.success('Asset synchronized successfully');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={cn(
        "relative group overflow-hidden rounded-xl bg-charcoal/5 border border-border flex items-center justify-center transition-all cursor-pointer",
        isAdmin && "hover:ring-2 hover:ring-primary/50",
        className
      )}
      style={{ aspectRatio, width, height }}
      onClick={handleImageClick}
    >
      <img
        src={src}
        alt={label || "Site image"}
        width={width}
        height={height}
        referrerPolicy="no-referrer"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-all duration-500",
          uploading && "opacity-50 blur-sm scale-110"
        )}
      />

      {isAdmin && (
        <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 z-20">
          <div className="bg-white p-3 rounded-full shadow-premium text-primary transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75">
            {uploading ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </div>
          <span className="text-white text-[10px] font-black uppercase tracking-widest bg-primary/80 px-4 py-2 rounded-full transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-150">
            {uploading ? 'Processing Architecture...' : 'Replace Static Asset'}
          </span>
        </div>
      )}

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Uploading...</span>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/png"
        onChange={handleUpload}
        className="hidden"
      />
      
      {/* Visual Indicator for Admins only */}
      {isAdmin && !uploading && (
        <div className="absolute top-4 right-4 bg-primary text-white p-1.5 rounded-lg shadow-premium opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-white/20">
          <Upload className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
