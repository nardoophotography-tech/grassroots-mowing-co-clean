import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ExternalLink, Database, Wrench } from 'lucide-react';
import {
  equipmentStore,
  useEquipment,
  EquipmentRecord,
  ServiceHistoryEntry,
  SERVICE_TYPES,
  publicServiceCount,
  StorageQuotaError,
} from '@/data/equipmentStore';
import { EquipmentMediaSection } from '@/components/EquipmentMediaSection';

type FormState = Omit<EquipmentRecord, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY: FormState = {
  name: '',
  brand: '',
  model: '',
  category: '',
  status: 'In Service',
  usedFor: '',
  mountIsaNotes: '',
  reviewNotes: '',
  maintenanceNotes: '',
  imageUrl: '',
  videoUrl: '',
  imageFileName: '',
  videoFileName: '',
  mediaUpdatedAt: null,
  serviceHistory: [],
};

const EMPTY_SERVICE: Omit<ServiceHistoryEntry, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  type: 'Service',
  title: '',
  description: '',
  cost: '',
  performedBy: '',
  odometerOrHours: '',
  nextServiceDue: '',
  publicVisible: true,
};

// ---------------------------------------------------------------------------
// Service History Log — sits below the main equipment details. Operates
// directly on the saved equipment record via the store (immediate persist).
// ---------------------------------------------------------------------------
const ServiceHistoryLog: React.FC<{ equipmentId: string; autoOpenAdd?: boolean }> = ({ equipmentId, autoOpenAdd }) => {
  const items = useEquipment();
  const record = items.find((r) => r.id === equipmentId);
  const entries = record?.serviceHistory || [];

  const [draft, setDraft] = React.useState<Omit<ServiceHistoryEntry, 'id'>>(EMPTY_SERVICE);
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  // Open the add form automatically when arriving via ?section=service.
  React.useEffect(() => {
    if (autoOpenAdd) {
      setDraft(EMPTY_SERVICE);
      setEditingEntryId(null);
      setOpen(true);
    }
  }, [autoOpenAdd]);

  const reset = () => {
    setDraft(EMPTY_SERVICE);
    setEditingEntryId(null);
    setOpen(false);
  };

  const set = (k: keyof Omit<ServiceHistoryEntry, 'id'>, v: string | boolean) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const startAdd = () => {
    setDraft(EMPTY_SERVICE);
    setEditingEntryId(null);
    setOpen(true);
  };

  const startEdit = (entry: ServiceHistoryEntry) => {
    const { id, ...rest } = entry;
    setDraft(rest);
    setEditingEntryId(id);
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      toast.error('Service entry needs a title.');
      return;
    }
    if (editingEntryId) {
      equipmentStore.updateServiceEntry(equipmentId, editingEntryId, draft);
      toast.success('Service entry updated.');
    } else {
      equipmentStore.addServiceEntry(equipmentId, draft);
      toast.success('Service entry added.');
    }
    reset();
  };

  const del = (entry: ServiceHistoryEntry) => {
    if (window.confirm(`Delete service entry "${entry.title}"?`)) {
      equipmentStore.removeServiceEntry(equipmentId, entry.id);
      toast.success('Service entry deleted.');
      if (editingEntryId === entry.id) reset();
    }
  };

  const togglePublic = (entry: ServiceHistoryEntry) =>
    equipmentStore.updateServiceEntry(equipmentId, entry.id, { publicVisible: !entry.publicVisible });

  const fieldCls = 'w-full h-10 rounded-lg border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none';

  return (
    <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-black italic uppercase text-charcoal flex items-center gap-2">
          <Wrench className="h-5 w-5 text-deep-red" /> Service History Log
        </h2>
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-deep-red text-white font-black uppercase text-[11px] tracking-widest hover:bg-deep-red/90"
        >
          <Plus className="h-4 w-4" /> Add Service Entry
        </button>
      </div>

      {open && (
        <form onSubmit={save} className="mt-5 border border-stone-200 rounded-2xl p-5 space-y-4 bg-stone-50">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Date</label>
              <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Service Type</label>
              <select value={draft.type} onChange={(e) => set('type', e.target.value)} className={fieldCls}>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Title</label>
              <input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 50-hour service" className={fieldCls} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Description</label>
              <textarea value={draft.description} onChange={(e) => set('description', e.target.value)} className="w-full min-h-[70px] rounded-lg border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-deep-red outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Cost</label>
              <input value={draft.cost} onChange={(e) => set('cost', e.target.value)} placeholder="e.g. $180" className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Performed By</label>
              <input value={draft.performedBy} onChange={(e) => set('performedBy', e.target.value)} placeholder="e.g. David / Mower Shop" className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Machine Hours / Odometer</label>
              <input value={draft.odometerOrHours} onChange={(e) => set('odometerOrHours', e.target.value)} placeholder="e.g. 52h" className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-clay">Next Service Due</label>
              <input value={draft.nextServiceDue} onChange={(e) => set('nextServiceDue', e.target.value)} placeholder="e.g. 100h or 2026-09-01" className={fieldCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={draft.publicVisible} onChange={(e) => set('publicVisible', e.target.checked)} className="h-4 w-4 accent-deep-red" />
            <span className="text-xs font-black uppercase tracking-widest text-charcoal">Public visible</span>
          </label>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-deep-red text-white font-black uppercase text-[11px] tracking-widest hover:bg-deep-red/90">
              Save Service Entry
            </button>
            <button type="button" onClick={reset} className="px-5 py-2.5 rounded-xl border border-stone-300 font-black uppercase text-[11px] tracking-widest hover:bg-stone-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-stone-400 italic">No service entries yet.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="border border-stone-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-charcoal px-2 py-0.5 rounded">{entry.type}</span>
                <span className="text-sm font-black text-charcoal">{entry.title}</span>
                <span
                  className={
                    'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ' +
                    (entry.publicVisible ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-500')
                  }
                >
                  {entry.publicVisible ? 'Public' : 'Private'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {entry.date}
                {entry.performedBy ? ` · ${entry.performedBy}` : ''}
                {entry.cost ? ` · ${entry.cost}` : ''}
                {entry.odometerOrHours ? ` · ${entry.odometerOrHours}` : ''}
                {entry.nextServiceDue ? ` · next: ${entry.nextServiceDue}` : ''}
              </p>
              {entry.description && <p className="text-sm text-stone-700 mt-2 whitespace-pre-wrap">{entry.description}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => togglePublic(entry)} className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[10px] font-black uppercase tracking-widest" title="Toggle public visibility">
                {entry.publicVisible ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => startEdit(entry)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" title="Edit"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(entry)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-deep-red" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EquipmentManager: React.FC = () => {
  const items = useEquipment();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY);

  // Deep-link support: /admin/equipment?edit=<id>&section=media|service
  const mediaRef = React.useRef<HTMLDivElement | null>(null);
  const serviceRef = React.useRef<HTMLDivElement | null>(null);
  const [highlight, setHighlight] = React.useState<'media' | 'service' | null>(null);
  const appliedDeepLink = React.useRef<string>('');

  const startAdd = () => {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (rec: EquipmentRecord) => {
    const { id, createdAt, updatedAt, ...rest } = rec;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  // React to ?edit / ?section query params — auto-select item, open the form,
  // and scroll to / highlight the requested section.
  React.useEffect(() => {
    const editId = searchParams.get('edit');
    const section = searchParams.get('section');
    if (!editId) return;
    const key = `${editId}|${section || ''}`;
    if (appliedDeepLink.current === key) return;
    const rec = items.find((r) => r.id === editId);
    if (!rec) return; // store not ready or unknown id
    appliedDeepLink.current = key;
    startEdit(rec);
    if (section === 'media' || section === 'service') {
      setHighlight(section);
      window.setTimeout(() => {
        const el = section === 'media' ? mediaRef.current : serviceRef.current;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      window.setTimeout(() => setHighlight(null), 3500);
    } else {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  }, [items, searchParams]);

  const handleChange = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Media section edits the in-memory form; we stamp mediaUpdatedAt on save.
  const handleMediaChange = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Equipment name is required.');
      return;
    }

    // Detect whether media changed vs the saved record so we can timestamp it.
    const original = editingId ? items.find((r) => r.id === editingId) : undefined;
    const mediaChanged =
      !original ||
      original.imageUrl !== form.imageUrl ||
      original.videoUrl !== form.videoUrl;
    const payload: FormState = {
      ...form,
      mediaUpdatedAt:
        form.imageUrl || form.videoUrl
          ? mediaChanged
            ? Date.now()
            : form.mediaUpdatedAt
          : null,
    };

    try {
      if (editingId) {
        equipmentStore.update(editingId, payload);
        toast.success('Equipment updated.');
        setShowForm(false);
        navigate(`/equipment/${editingId}`);
      } else {
        const rec = equipmentStore.add(payload);
        toast.success('Equipment added.');
        setShowForm(false);
        navigate(`/equipment/${rec.id}`);
      }
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        toast.error(
          'Could not save — media is too large for local browser storage. Remove or shrink the video/photo, or paste a hosted URL instead.'
        );
      } else {
        toast.error('Save failed: ' + ((err as any)?.message || 'unknown error'));
      }
    }
  };

  const handleDelete = (rec: EquipmentRecord) => {
    if (window.confirm(`Delete "${rec.name}"? This cannot be undone.`)) {
      equipmentStore.remove(rec.id);
      toast.success('Equipment deleted.');
      if (editingId === rec.id) {
        setShowForm(false);
        setEditingId(null);
      }
    }
  };

  const field = (
    label: string,
    key: keyof FormState,
    opts: { textarea?: boolean; placeholder?: string } = {}
  ) => (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-clay">{label}</label>
      {opts.textarea ? (
        <textarea
          value={form[key]}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={opts.placeholder}
          className="w-full min-h-[80px] rounded-xl border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-deep-red outline-none"
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={opts.placeholder}
          className="w-full h-11 rounded-xl border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="uppercase tracking-[0.3em] text-[10px] font-black text-clay italic">Admin · Equipment</p>
          <h1 className="text-4xl font-black italic uppercase mt-1 text-charcoal">Equipment Manager</h1>
        </div>
        <div className="flex gap-3">
          <Link
            to="/equipment"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-stone-300 font-black uppercase text-xs tracking-widest hover:bg-stone-100"
          >
            <ExternalLink className="h-4 w-4" /> View Public Register
          </Link>
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-deep-red text-white font-black uppercase text-xs tracking-widest hover:bg-deep-red/90"
          >
            <Plus className="h-4 w-4" /> Add Equipment
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
        <Database className="h-4 w-4 flex-shrink-0" />
        <p className="text-xs font-bold">
          Temporary local browser storage — Firebase upgrade required. Records are saved in this browser only.
        </p>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black italic uppercase text-charcoal">
              {editingId ? 'Edit Equipment' : 'New Equipment'}
            </h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-stone-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {field('Name', 'name', { placeholder: 'e.g. Bushranger Spartan 54"' })}
            {field('Brand', 'brand', { placeholder: 'e.g. Bushranger' })}
            {field('Model', 'model', { placeholder: 'e.g. Spartan Shield 54 inch' })}
            {field('Category', 'category', { placeholder: 'e.g. Mowing' })}
            {field('Status', 'status', { placeholder: 'e.g. In Service' })}
          </div>
          {field('Used For', 'usedFor', { textarea: true })}
          {field('Mount Isa Field Notes', 'mountIsaNotes', { textarea: true })}
          {field('Review Notes', 'reviewNotes', { textarea: true })}
          {field('Maintenance Notes', 'maintenanceNotes', { textarea: true })}

          {/* EQUIPMENT MEDIA — photos & videos in action */}
          <div
            ref={mediaRef}
            className={
              highlight === 'media'
                ? 'rounded-[2rem] ring-4 ring-deep-red ring-offset-2 transition-all'
                : 'transition-all'
            }
          >
            <EquipmentMediaSection
              value={{
                imageUrl: form.imageUrl,
                videoUrl: form.videoUrl,
                imageFileName: form.imageFileName,
                videoFileName: form.videoFileName,
              }}
              onChange={handleMediaChange}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-deep-red text-white font-black uppercase text-xs tracking-widest hover:bg-deep-red/90"
            >
              {editingId ? 'Save Changes' : 'Save & Open'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-3 rounded-xl border border-stone-300 font-black uppercase text-xs tracking-widest hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Service History Log sits below the main equipment details. */}
      {editingId && (
        <div
          ref={serviceRef}
          className={
            highlight === 'service'
              ? 'rounded-[2rem] ring-4 ring-deep-red ring-offset-2 transition-all'
              : 'transition-all'
          }
        >
          <ServiceHistoryLog equipmentId={editingId} autoOpenAdd={highlight === 'service'} />
        </div>
      )}
      {showForm && !editingId && (
        <p className="text-xs text-stone-500 italic">
          Save this new equipment item first — the Service History Log will appear once it exists.
        </p>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-6 flex flex-col">
            <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre">
              {item.brand || 'Unbranded'} · {item.category || 'Uncategorised'}
            </p>
            <h3 className="text-xl font-black italic mt-1 text-charcoal">{item.name}</h3>
            <p className="text-sm text-stone-500 mt-1">Model: {item.model || '—'}</p>
            <p className="text-xs font-bold text-forest mt-2 uppercase tracking-widest">{item.status || 'Unknown'}</p>
            <p className="text-[11px] text-stone-500 mt-2">
              Service entries: {(item.serviceHistory || []).length} · Public: {publicServiceCount(item)}
            </p>
            <div className="flex gap-2 mt-5 pt-4 border-t border-stone-100">
              <Link
                to={`/equipment/${item.id}`}
                className="flex-1 text-center px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-black uppercase tracking-widest"
              >
                View
              </Link>
              <button
                onClick={() => startEdit(item)}
                className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-deep-red"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-stone-200 rounded-[2rem]">
            <p className="font-serif text-lg text-stone-400">No equipment yet. Click “Add Equipment” to create the first record.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentManager;
