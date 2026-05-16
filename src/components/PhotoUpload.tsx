import * as React from 'react';
import { Camera, X, ImageIcon, Loader2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { toast } from 'react-hot-toast';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  jobId: string;
  buttonId?: string;
  folder?: string;
}

interface UploadingFile {
  id: string;
  progress: number;
}

export const PhotoUpload = ({ photos, onChange, maxPhotos = 10, jobId, buttonId, folder = 'general' }: PhotoUploadProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);
    const newUploadingFiles: UploadingFile[] = [];

    const uploadPromises = fileList.map(async (file: File) => {
      if (photos.length + newUploadingFiles.length >= maxPhotos) {
        toast.error(`Maximum of ${maxPhotos} photos allowed.`);
        return null;
      }

      const fileId = Math.random().toString(36).substring(7);
      const storageRef = ref(storage, `jobs/${jobId}/${folder}/${Date.now()}-${file.name}`);
      
      setUploadingFiles((prev) => [...prev, { id: fileId, progress: 0 }]);

      return new Promise<string | null>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
            );
          },
          (error) => {
            console.error("Photo upload failed:", error);
            setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
            toast.error(`Failed to upload ${file.name}`);
            resolve(null);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
            resolve(downloadURL);
          }
        );
      });
    });

    const urls = await Promise.all(uploadPromises);
    const validUrls = urls.filter((url): url is string => url !== null);
    
    if (validUrls.length > 0) {
      onChange([...photos, ...validUrls]);
      toast.success('Photo uploaded successfully');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-ochre/10 shadow-sm">
            <img src={photo} alt={`Job photo ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 p-1.5 bg-deep-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {uploadingFiles.map((file) => (
          <div key={file.id} className="aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-ochre/5 bg-ochre/5 relative overflow-hidden">
            <Loader2 className="h-6 w-6 text-ochre animate-spin" />
            <div className="absolute bottom-0 left-0 h-1 bg-ochre transition-all duration-300" style={{ width: `${file.progress}%` }} />
            <span className="text-[8px] font-bold text-ochre/70 uppercase tracking-widest">{Math.round(file.progress)}%</span>
          </div>
        ))}
        
        {photos.length + uploadingFiles.length < maxPhotos && (
          <button
            id={buttonId}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ochre/20 hover:border-ochre/40 hover:bg-ochre/5 transition-all text-ochre/40 hover:text-ochre/60"
          >
            <Camera className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Add Photo</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
      />
      
      {photos.length === 0 && uploadingFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-ochre/10 rounded-xl bg-ochre/5 text-ochre/30">
          <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
          <p className="font-bold uppercase tracking-widest text-[10px]">No photos uploaded yet</p>
        </div>
      )}
    </div>
  );
};
