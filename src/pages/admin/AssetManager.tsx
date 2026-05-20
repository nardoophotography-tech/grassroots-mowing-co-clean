import React, { useState, useEffect, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Camera, 
  Plus, 
  Filter, 
  CheckCircle2, 
  XCircle,
  GripVertical,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { assetService } from '../../services/assetService';
import { AppAsset } from '../../types';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

import { useAssets } from '../../hooks/useAssets';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';

const CATEGORIES: { label: string; value: AppAsset['type'] }[] = [
  { label: 'Branding (Logos)', value: 'logo' },
  { label: 'Website Heroes', value: 'hero' },
  { label: 'Infographics', value: 'branding' },
  { label: 'Brand Videos', value: 'gallery' },
  { label: 'Page Banners', value: 'banner' },
  { label: 'Service Visuals', value: 'service' },
  { label: 'Job Progress (Before)', value: 'job_before' },
  { label: 'Job Progress (After)', value: 'job_after' },
  { label: 'Property Archives', value: 'property' },
  { label: 'Issue Reports', value: 'report' },
];

export const AssetManager: React.FC = () => {
  const [activeType, setActiveType] = useState<AppAsset['type']>('logo');
  const { assets, loading } = useAssets(activeType, true);
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    if (!user) return;
    setUploading(true);
    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        await assetService.uploadAsset(file, activeType);
        await auditService.log(
          { uid: user.uid, email: user.email || 'unknown' },
          'ASSET_UPLOAD',
          `Uploaded ${file.name} to ${activeType}`
        );
      }
      toast.success(`Successfully uploaded ${fileArray.length} assets`);
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleDelete = async (asset: AppAsset) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this asset?')) return;
    await assetService.deleteAsset(asset);
    await auditService.log(
      { uid: user.uid, email: user.email || 'unknown' },
      'ASSET_DELETE',
      `Deleted asset ${asset.id} (${asset.type})`
    );
    toast.success("Asset deleted");
  };

  const toggleStatus = async (asset: AppAsset) => {
    if (!user) return;
    const newStatus = !asset.active;
    await assetService.updateAsset(asset.id, { active: newStatus });
    await auditService.log(
      { uid: user.uid, email: user.email || 'unknown' },
      'ASSET_UPDATE',
      `Toggled status of ${asset.id} to ${newStatus ? 'active' : 'inactive'}`
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      toast.error("Camera access denied");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setUploading(true);
        await assetService.uploadAsset(file, activeType);
        setUploading(false);
        setCameraActive(false);
        toast.success("Photo captured and uploaded");
        
        // Stop stream
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
      }
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-deep-red">Asset Portfolio Configuration</h1>
          <p className="text-sm text-charcoal/60 font-medium">Control the visual identity and documentation assets of the Agency.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={startCamera}
            className="flex-1 md:flex-none bg-ochre hover:bg-ochre/90 text-white h-12 rounded-xl flex items-center justify-center gap-2"
          >
            <Camera className="h-4 w-4" />
            <span className="md:hidden lg:inline">Live Capture</span>
          </Button>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 md:flex-none bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 flex items-center justify-center gap-2"
          >
            {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="md:hidden lg:inline">Browser Files</span>
          </Button>
          <input 
            type="file" 
            multiple 
            accept="image/*,video/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
        </div>
      </header>

      {/* Drag & Drop Main Zone */}
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        animate={{ 
          scale: isDragging ? 0.98 : 1,
          borderColor: isDragging ? 'rgb(141, 39, 44)' : 'rgba(212, 163, 115, 0.2)' 
        }}
        className={cn(
          "relative border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer overflow-hidden",
          isDragging ? "bg-deep-red/5" : "bg-ochre/5 hover:bg-ochre/10",
          uploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <AnimatePresence>
          {uploading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center"
            >
              <RefreshCw className="h-10 w-10 text-deep-red animate-spin mb-4" />
              <p className="text-xs font-black text-deep-red uppercase tracking-widest animate-pulse">Syncing to Cloud Storage...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="h-20 w-20 rounded-full bg-white shadow-lg flex items-center justify-center text-deep-red">
            <Upload className={cn("h-8 w-8 transition-transform", isDragging && "scale-125")} />
          </div>
          <div>
            <h2 className="text-xl font-serif text-charcoal">Drag and Drop Images Here</h2>
            <p className="text-sm text-charcoal/40 font-medium mt-1 uppercase tracking-widest text-[10px]">Or click to browse device storage</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter border-ochre/30 text-ochre">JPG / PNG</Badge>
            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter border-ochre/30 text-ochre">MP4</Badge>
            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter border-ochre/30 text-ochre">MOV</Badge>
            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter border-ochre/30 text-ochre">WEBP</Badge>
          </div>
        </div>
      </motion.div>

      {/* Camera UI Overlay */}
      <AnimatePresence>
        {cameraActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <video ref={videoRef} autoPlay playsInline className="max-h-[70vh] rounded-2xl shadow-2xl bg-slate-900" />
            <div className="mt-8 flex gap-4">
              <Button 
                variant="outline" 
                className="text-white border-white/20 hover:bg-white/10 h-14 rounded-full px-8"
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach(t => t.stop());
                  setCameraActive(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="bg-white text-black hover:bg-slate-200 h-14 rounded-full px-12 font-black uppercase tracking-widest"
                onClick={capturePhoto}
              >
                Capture Asset
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-ochre/60 pl-2 mb-4">Asset Categories</p>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveType(cat.value)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                activeType === cat.value 
                  ? 'bg-deep-red text-white shadow-lg' 
                  : 'text-charcoal hover:bg-ochre/10'
              }`}
            >
              <span className="text-sm font-bold uppercase tracking-wide">{cat.label}</span>
              {activeType === cat.value && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="lg:col-span-3">
          <Card className="border-ochre/10 shadow-xl overflow-hidden rounded-2xl">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-serif text-deep-red flex items-center gap-3">
                <ImageIcon className="h-6 w-6" />
                {CATEGORIES.find(c => c.value === activeType)?.label} Portfolio
              </CardTitle>
              <Badge variant="outline" className="bg-white/50 border-ochre/20 text-ochre px-4 py-1">
                {assets.length} Active Items
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-ochre/40">
                  <RefreshCw className="h-10 w-10 animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Hydrating Assets...</p>
                </div>
              ) : assets.length > 0 ? (
                <Reorder.Group 
                  axis="y" 
                  values={assets} 
                  onReorder={(newOrder) => {
                    // Update sortOrder for all in background
                    newOrder.forEach((a, i) => {
                      if (a.sortOrder !== i) {
                        assetService.updateAsset(a.id, { sortOrder: i });
                      }
                    });
                  }}
                  className="space-y-4"
                >
                  {assets.map((asset) => (
                    <Reorder.Item 
                      key={asset.id} 
                      value={asset}
                      className="group bg-white p-3 rounded-2xl border border-ochre/10 hover:border-ochre/30 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-ochre/20 group-hover:text-ochre/50 transition-colors">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-ochre/5 border border-ochre/10 flex-shrink-0">
                          {asset.url.match(/\.(mp4|webm|ogg|mov)$|^data:video/i) ? (
                            <video 
                              src={asset.url} 
                              className="w-full h-full object-cover"
                              muted
                              onMouseOver={e => (e.target as HTMLVideoElement).play()}
                              onMouseOut={e => (e.target as HTMLVideoElement).pause()}
                            />
                          ) : (
                            <img 
                              src={asset.url} 
                              alt={asset.fileName} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <input 
                            type="text"
                            defaultValue={asset.category}
                            onBlur={(e) => assetService.updateAsset(asset.id, { category: e.target.value })}
                            className="text-xs font-black text-charcoal bg-transparent border-b border-transparent hover:border-ochre/20 focus:border-ochre focus:outline-none w-full"
                            placeholder="Add tag (e.g. town_block)"
                          />
                          <p className="text-[9px] text-charcoal/40 font-bold uppercase tracking-tighter mt-1">
                            Uploaded {new Date(asset.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStatus(asset)}
                            className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
                              asset.active 
                                ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100' 
                                : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                            }`}
                          >
                            {asset.active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </button>
                          
                          <button
                            onClick={() => window.open(asset.url, '_blank')}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-ochre/5 text-ochre border border-ochre/10 hover:bg-ochre/10 transition-all"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(asset)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-deep-red border border-red-100 hover:bg-red-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-ochre/10 rounded-2xl bg-ochre/5">
                  <ImageIcon className="h-12 w-12 text-ochre/20 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-ochre/40">Repository is Empty</p>
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-deep-red font-black text-[10px] uppercase tracking-widest"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Start Upload
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssetManager;
