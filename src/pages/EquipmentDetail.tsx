import * as React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Pencil, Image as ImageIcon, Wrench } from 'lucide-react';
import { equipmentStore, EquipmentRecord } from '@/data/equipmentStore';
import { useAuth } from '@/contexts/AuthContext';

function toEmbed(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

export const EquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [item, setItem] = React.useState<EquipmentRecord | undefined>(() =>
    id ? equipmentStore.getById(id) : undefined
  );

  React.useEffect(() => {
    if (id) setItem(equipmentStore.getById(id));
  }, [id]);

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-black italic uppercase text-charcoal">Equipment Not Found</h1>
        <p className="mt-4 text-stone-500">No record exists for “{id}”.</p>
        <Link to="/equipment" className="inline-block mt-6 px-6 py-3 bg-deep-red text-white rounded-xl font-black uppercase text-xs tracking-widest">
          Back to Register
        </Link>
      </div>
    );
  }

  const embed = toEmbed(item.videoUrl);
  const isPlayableVideo =
    !!item.videoUrl &&
    (item.videoUrl.startsWith('data:') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(item.videoUrl));
  const publicEntries = (item.serviceHistory || []).filter((e) => e.publicVisible);

  const NoteBlock = ({ label, value }: { label: string; value: string }) =>
    value ? (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre mb-2">{label}</p>
        <p className="text-stone-700 leading-7 whitespace-pre-wrap">{value}</p>
      </div>
    ) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/equipment" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-clay hover:text-deep-red">
          <ArrowLeft className="h-4 w-4" /> Back to Register
        </Link>
      </div>

      {/* Admin control bar — only for admin users. */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 bg-charcoal rounded-2xl p-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50 self-center px-2">Admin Controls</span>
          <button onClick={() => navigate(`/admin/equipment?edit=${item.id}`)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-deep-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-deep-red/90">
            <Pencil className="h-3.5 w-3.5" /> Edit Equipment
          </button>
          <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=media`)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20">
            <ImageIcon className="h-3.5 w-3.5" /> Manage Media
          </button>
          <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=service`)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20">
            <Wrench className="h-3.5 w-3.5" /> Add Service Entry
          </button>
        </div>
      )}

      <div>
        <p className="uppercase tracking-[0.3em] text-[10px] font-black text-clay italic">
          {item.brand || 'Unbranded'} · {item.category || 'Uncategorised'}
        </p>
        <h1 className="text-4xl font-black italic uppercase mt-1 text-charcoal">{item.name}</h1>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-stone-600">
          {item.model && <span><strong>Model:</strong> {item.model}</span>}
          {item.status && <span><strong>Status:</strong> {item.status}</span>}
        </div>
      </div>

      {/* Field photo */}
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full max-h-[420px] object-cover rounded-[2rem] border border-stone-200" />
      ) : (
        <div className="h-56 rounded-[2rem] bg-stone-100 border border-stone-200 flex flex-col items-center justify-center text-stone-400 font-bold gap-3">
          <span>No field photo added yet</span>
          {isAdmin && (
            <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=media`)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-deep-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-deep-red/90">
              <ImageIcon className="h-3.5 w-3.5" /> Add Photo
            </button>
          )}
        </div>
      )}

      {/* Field video */}
      {embed ? (
        <div className="aspect-video w-full rounded-[2rem] overflow-hidden border border-stone-200">
          <iframe src={embed} title={item.name} className="w-full h-full" allowFullScreen />
        </div>
      ) : isPlayableVideo ? (
        <video src={item.videoUrl} controls className="w-full max-h-[420px] rounded-[2rem] border border-stone-200 bg-black" />
      ) : item.videoUrl ? (
        <a href={item.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-black uppercase text-xs tracking-widest">
          <Video className="h-4 w-4" /> Watch Field Review
        </a>
      ) : (
        <div className="h-40 rounded-[2rem] bg-stone-100 border border-stone-200 flex flex-col items-center justify-center text-stone-400 font-bold gap-3">
          <span>No field video added yet</span>
          {isAdmin && (
            <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=media`)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-deep-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-deep-red/90">
              <Video className="h-3.5 w-3.5" /> Add Video
            </button>
          )}
        </div>
      )}
      {item.mediaUpdatedAt ? (
        <p className="text-xs text-stone-400 -mt-3">Media updated {new Date(item.mediaUpdatedAt).toLocaleDateString()}</p>
      ) : null}

      <div className="grid md:grid-cols-2 gap-5">
        <NoteBlock label="Used For" value={item.usedFor} />
        <NoteBlock label="Mount Isa Field Notes" value={item.mountIsaNotes} />
        <NoteBlock label="Review Notes" value={item.reviewNotes} />
        <NoteBlock label="Maintenance Notes" value={item.maintenanceNotes} />
      </div>

      {/* Public Service History — only entries explicitly marked public visible. */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-2xl font-black italic uppercase text-charcoal">Service History</h2>
          {isAdmin && (
            <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=service`)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-deep-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-deep-red/90">
              <Wrench className="h-3.5 w-3.5" /> Add Service Entry
            </button>
          )}
        </div>
        {publicEntries.length === 0 ? (
          <p className="text-stone-500 italic">No public service history has been added yet.</p>
        ) : (
          <div className="space-y-3">
            {publicEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white bg-charcoal px-2 py-0.5 rounded">{entry.type}</span>
                  <span className="text-base font-black text-charcoal">{entry.title}</span>
                  <span className="text-xs text-stone-400 ml-auto">{entry.date}</span>
                </div>
                {entry.description && <p className="text-stone-700 leading-7 mt-3 whitespace-pre-wrap">{entry.description}</p>}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-stone-500">
                  {entry.performedBy && <span><strong>By:</strong> {entry.performedBy}</span>}
                  {entry.cost && <span><strong>Cost:</strong> {entry.cost}</span>}
                  {entry.odometerOrHours && <span><strong>Hours/Odo:</strong> {entry.odometerOrHours}</span>}
                  {entry.nextServiceDue && <span><strong>Next due:</strong> {entry.nextServiceDue}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentDetail;
