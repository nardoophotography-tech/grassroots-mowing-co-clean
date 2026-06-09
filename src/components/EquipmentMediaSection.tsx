import * as React from 'react';
import { toast } from 'react-hot-toast';
import { Camera, Video, Upload, X, CircleDot, Square, ImageIcon, Film } from 'lucide-react';

// ---------------------------------------------------------------------------
// EQUIPMENT MEDIA — PHOTOS & VIDEOS IN ACTION
// Self-contained media editor used inside the Equipment Manager edit form.
// Reads/writes image + video data (data URLs) on the in-memory form state;
// the parent persists them to the store when "Save Changes" is clicked.
// ---------------------------------------------------------------------------

export interface MediaValue {
  imageUrl: string;
  videoUrl: string;
  imageFileName: string;
  videoFileName: string;
}

interface Props {
  value: MediaValue;
  onChange: (patch: Partial<MediaValue>) => void;
}

// Rough guard so we don't try to stuff an enormous video into localStorage.
const MAX_VIDEO_BYTES = 4 * 1024 * 1024; // ~4MB of binary (~5.3MB base64)
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const EquipmentMediaSection: React.FC<Props> = ({ value, onChange }) => {
  // ----- live camera / recording state -----
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);
  const videoElRef = React.useRef<HTMLVideoElement | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);

  const recordingSupported =
    typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined';

  const stopStream = React.useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
  }, []);

  // Always stop the camera when the component unmounts.
  React.useEffect(() => () => stopStream(), [stopStream]);

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCameraOpen(true);
      // Attach after render so the <video> element exists.
      setTimeout(() => {
        if (videoElRef.current) {
          videoElRef.current.srcObject = stream;
          videoElRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      toast.error('Could not access camera: ' + (err?.message || 'permission denied'));
    }
  };

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
  };

  const captureStill = () => {
    const v = videoElRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onChange({ imageUrl: dataUrl, imageFileName: `camera-${Date.now()}.jpg` });
    toast.success('Photo captured.');
  };

  const startRecording = () => {
    if (!recordingSupported || !streamRef.current) {
      toast.error('Video recording is not supported in this browser.');
      return;
    }
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current);
    } catch {
      toast.error('Video recording is not supported in this browser.');
      return;
    }
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      if (blob.size > MAX_VIDEO_BYTES) {
        toast.error(
          `Recorded video is too large (${(blob.size / 1048576).toFixed(1)}MB) for local storage. Keep clips short (<4MB) or paste a hosted video URL instead.`
        );
        return;
      }
      const dataUrl = await fileToDataUrl(new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' }));
      onChange({ videoUrl: dataUrl, videoFileName: `recording-${Date.now()}.webm` });
      toast.success('Recording saved to preview. Click Save Changes to persist.');
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  // ----- file uploads -----
  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Image is too large (${(file.size / 1048576).toFixed(1)}MB). Use an image under 3MB.`);
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    onChange({ imageUrl: dataUrl, imageFileName: file.name });
    toast.success('Photo added to preview.');
  };

  const onVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please choose a video file.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(
        `Video is too large (${(file.size / 1048576).toFixed(1)}MB) for local browser storage. Keep it under 4MB or paste a hosted video URL below.`
      );
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    onChange({ videoUrl: dataUrl, videoFileName: file.name });
    toast.success('Video added to preview.');
  };

  const inputCls = 'w-full h-10 rounded-lg border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none';

  return (
    <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8 mt-6">
      <h2 className="text-xl font-black italic uppercase text-charcoal flex items-center gap-2">
        <Camera className="h-5 w-5 text-deep-red" /> Equipment Media — Photos &amp; Videos in Action
      </h2>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 font-bold">
        Temporary browser storage — Firebase Storage upgrade required for live production.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* ---------- PHOTO ---------- */}
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-clay">Photo</p>
          <div className="h-56 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center overflow-hidden">
            {value.imageUrl ? (
              <img src={value.imageUrl} alt="Equipment" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-stone-400">
                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-bold">No equipment photo added yet</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-deep-red text-white font-black uppercase text-[11px] tracking-widest hover:bg-deep-red/90 cursor-pointer">
              <Upload className="h-4 w-4" /> Upload Photo
              <input type="file" accept="image/*" onChange={onPhotoFile} className="hidden" />
            </label>
            <button type="button" onClick={openCamera} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 font-black uppercase text-[11px] tracking-widest hover:bg-stone-100">
              <Camera className="h-4 w-4" /> Open Camera
            </button>
            {value.imageUrl && (
              <button type="button" onClick={() => onChange({ imageUrl: '', imageFileName: '' })} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 text-deep-red font-black uppercase text-[11px] tracking-widest hover:bg-red-50">
                <X className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-clay">…or paste an image URL</label>
            <input value={value.imageUrl.startsWith('data:') ? '' : value.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value, imageFileName: '' })} placeholder="https://..." className={inputCls} />
          </div>
        </div>

        {/* ---------- VIDEO ---------- */}
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-clay">Video</p>
          <div className="h-56 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex items-center justify-center overflow-hidden">
            {value.videoUrl ? (
              value.videoUrl.startsWith('data:') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(value.videoUrl) ? (
                <video src={value.videoUrl} controls className="w-full h-full object-contain bg-black" />
              ) : (
                <a href={value.videoUrl} target="_blank" rel="noreferrer" className="text-deep-red font-bold underline px-4 text-center text-sm">
                  Open linked video
                </a>
              )
            ) : (
              <div className="text-center text-stone-400">
                <Film className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-bold">No equipment video added yet</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-deep-red text-white font-black uppercase text-[11px] tracking-widest hover:bg-deep-red/90 cursor-pointer">
              <Upload className="h-4 w-4" /> Upload Video
              <input type="file" accept="video/*" onChange={onVideoFile} className="hidden" />
            </label>
            {!cameraOpen && (
              <button type="button" onClick={openCamera} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 font-black uppercase text-[11px] tracking-widest hover:bg-stone-100">
                <Video className="h-4 w-4" /> Open Camera to Record
              </button>
            )}
            {value.videoUrl && (
              <button type="button" onClick={() => onChange({ videoUrl: '', videoFileName: '' })} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 text-deep-red font-black uppercase text-[11px] tracking-widest hover:bg-red-50">
                <X className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-clay">…or paste a video URL (YouTube / hosted)</label>
            <input value={value.videoUrl.startsWith('data:') ? '' : value.videoUrl} onChange={(e) => onChange({ videoUrl: e.target.value, videoFileName: '' })} placeholder="https://youtube.com/... or https://.../clip.mp4" className={inputCls} />
          </div>
        </div>
      </div>

      {/* ---------- LIVE CAMERA PANEL ---------- */}
      {cameraOpen && (
        <div className="mt-6 border border-stone-200 rounded-2xl p-5 bg-stone-900">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-white">Live Camera</p>
            <button type="button" onClick={closeCamera} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/20">
              <X className="h-4 w-4" /> Close Camera
            </button>
          </div>
          <video ref={videoElRef} muted playsInline className="w-full max-h-[360px] rounded-xl bg-black" />
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={captureStill} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-charcoal font-black uppercase text-[11px] tracking-widest hover:bg-stone-200">
              <Camera className="h-4 w-4" /> Capture Still Photo
            </button>
            {recordingSupported ? (
              recording ? (
                <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-deep-red text-white font-black uppercase text-[11px] tracking-widest animate-pulse">
                  <Square className="h-4 w-4" /> Stop Recording
                </button>
              ) : (
                <button type="button" onClick={startRecording} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-black uppercase text-[11px] tracking-widest hover:bg-red-700">
                  <CircleDot className="h-4 w-4" /> Start Recording
                </button>
              )
            ) : (
              <span className="text-amber-300 text-xs font-bold self-center">Video recording is not supported in this browser.</span>
            )}
          </div>
        </div>
      )}

      {/* ---------- EQUIPMENT IN ACTION GALLERY ---------- */}
      <div className="mt-8 border-t border-stone-200 pt-6">
        <h3 className="text-lg font-black italic uppercase text-charcoal mb-4">Equipment in Action</h3>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="h-44 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden">
              {value.imageUrl ? (
                <img src={value.imageUrl} alt="Saved equipment" className="w-full h-full object-cover" />
              ) : (
                <span className="text-stone-400 text-sm font-bold">No field photo added yet</span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-2">{value.imageFileName || (value.imageUrl ? 'Linked image' : '—')}</p>
          </div>
          <div>
            <div className="h-44 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden">
              {value.videoUrl ? (
                value.videoUrl.startsWith('data:') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(value.videoUrl) ? (
                  <video src={value.videoUrl} controls className="w-full h-full object-contain bg-black" />
                ) : (
                  <a href={value.videoUrl} target="_blank" rel="noreferrer" className="text-deep-red font-bold underline text-sm">Open linked video</a>
                )
              ) : (
                <span className="text-stone-400 text-sm font-bold">No field video added yet</span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-2">{value.videoFileName || (value.videoUrl ? 'Linked video' : '—')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentMediaSection;
