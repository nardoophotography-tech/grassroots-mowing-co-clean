import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Film, Plus, X, Save, ChevronDown, ChevronUp, Edit3,
  CheckCircle2, Clock, Archive, Calendar, Tag, Send, Eye, Trash2,
  Globe, Mail, MessageSquare, Building2, FileText, Star, Image as ImageIcon,
  AlertCircle, Users, Zap, ArrowRight, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

/* ─────────────────────────── Types ─────────────────────────── */

type MediaType = 'photo' | 'video' | 'social_post' | 'partner_promo' | 'community_update' | 'before_after';
type MediaProject = 'project_156' | 'grassroots';
type MediaStatus = 'captured' | 'editing' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived';
type Platform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'website' | 'email' | 'sms' | 'partner_page' | 'other';

interface MediaItem {
  id: string;
  title: string;
  mediaType: MediaType;
  project: MediaProject;
  partnerName: string;
  description: string;
  platformTargets: Platform[];
  status: MediaStatus;
  editInstructions: string;
  captionDraft: string;
  hashtags: string;
  callToAction: string;
  approvalNotes: string;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────── Constants ─────────────────────────── */

const STATUS_ORDER: MediaStatus[] = ['captured', 'editing', 'review', 'approved', 'scheduled', 'published', 'archived'];

const STATUS_CONFIG: Record<MediaStatus, { label: string; color: string; badge: string; icon: React.ElementType }> = {
  captured:  { label: 'Captured',         color: 'bg-slate-500',   badge: 'bg-slate-100 text-slate-700',   icon: Camera },
  editing:   { label: 'Editing',           color: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-800',   icon: Edit3 },
  review:    { label: 'Ready for Review',  color: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-800',     icon: Eye },
  approved:  { label: 'Approved',          color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  scheduled: { label: 'Scheduled',         color: 'bg-violet-500',  badge: 'bg-violet-100 text-violet-800', icon: Calendar },
  published: { label: 'Published',         color: 'bg-primary',     badge: 'bg-primary/10 text-primary',    icon: Send },
  archived:  { label: 'Archived',          color: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600',     icon: Archive },
};

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  photo:            'Photo',
  video:            'Video',
  social_post:      'Social Post',
  partner_promo:    'Partner Promo',
  community_update: 'Community Update',
  before_after:     'Before & After',
};

const PROJECT_LABELS: Record<MediaProject, string> = {
  project_156: 'Project #156',
  grassroots:  'GrassRoots Mowing Co',
};

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook:     'Facebook',
  instagram:    'Instagram',
  tiktok:       'TikTok',
  youtube:      'YouTube',
  website:      'Website',
  email:        'Email',
  sms:          'SMS',
  partner_page: 'Partner Page',
  other:        'Other',
};

const PLATFORM_LIST: Platform[] = ['facebook', 'instagram', 'tiktok', 'youtube', 'website', 'email', 'sms', 'partner_page', 'other'];

const STORAGE_KEY = 'grassroots_media_items';

/* ─────────────────────────── Helpers ─────────────────────────── */

const newId = () => `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const loadItems = (): MediaItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveItems = (items: MediaItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const emptyForm = (): Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  mediaType: 'photo',
  project: 'grassroots',
  partnerName: '',
  description: '',
  platformTargets: [],
  status: 'captured',
  editInstructions: '',
  captionDraft: '',
  hashtags: '',
  callToAction: '',
  approvalNotes: '',
  publishDate: '',
});

const nextStatus = (s: MediaStatus): MediaStatus | null => {
  const idx = STATUS_ORDER.indexOf(s);
  if (idx === -1 || idx >= STATUS_ORDER.length - 2) return null; // don't auto-advance to archived
  return STATUS_ORDER[idx + 1];
};

/* ─────────────────────────── Sub-components ─────────────────────────── */

const StatusBadge = ({ status }: { status: MediaStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest', cfg.badge)}>
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

const PlatformTag = ({ p }: { p: Platform }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
    {PLATFORM_LABELS[p]}
  </span>
);

/* ─────────────────────────── Item Card ─────────────────────────── */

const MediaCard = ({
  item,
  onEdit,
  onDelete,
  onAdvance,
  onStatusChange,
}: {
  item: MediaItem;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onAdvance: (id: string) => void;
  onStatusChange: (id: string, status: MediaStatus) => void;
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);
  const cfg = STATUS_CONFIG[item.status];
  const next = nextStatus(item.status);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Coloured status strip */}
      <div className={cn('h-1', cfg.color)} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-clay/60">
                {MEDIA_TYPE_LABELS[item.mediaType]}
              </span>
              <span className="text-[9px] text-clay/40">•</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                {PROJECT_LABELS[item.project]}
              </span>
              {item.partnerName && (
                <>
                  <span className="text-[9px] text-clay/40">•</span>
                  <span className="text-[9px] font-bold text-secondary uppercase">{item.partnerName}</span>
                </>
              )}
            </div>
            <h3 className="text-sm font-black text-charcoal uppercase italic tracking-tight leading-tight truncate">
              {item.title || 'Untitled Item'}
            </h3>
            {item.description && (
              <p className="text-xs text-clay/70 mt-1 line-clamp-2 font-medium">{item.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-clay/50 hover:text-charcoal transition-colors"
              title="Edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-clay/50 hover:text-charcoal transition-colors"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Status + platforms */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <StatusBadge status={item.status} />
          {item.platformTargets.map(p => <PlatformTag key={p} p={p} />)}
          {item.publishDate && (
            <span className="text-[9px] text-clay/50 font-medium ml-auto">
              📅 {item.publishDate}
            </span>
          )}
        </div>

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                {item.editInstructions && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-clay/50 mb-1">Edit Instructions</p>
                    <p className="text-xs font-medium text-charcoal leading-relaxed">{item.editInstructions}</p>
                  </div>
                )}
                {item.captionDraft && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-clay/50 mb-1">Caption Draft</p>
                    <p className="text-xs font-medium text-charcoal leading-relaxed italic bg-slate-50 px-3 py-2 rounded-lg border border-border/30">
                      {item.captionDraft}
                    </p>
                  </div>
                )}
                {item.hashtags && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-clay/50 mb-1">Hashtags</p>
                    <p className="text-xs font-medium text-primary leading-relaxed">{item.hashtags}</p>
                  </div>
                )}
                {item.callToAction && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-clay/50 mb-1">Call to Action</p>
                    <p className="text-xs font-medium text-charcoal">{item.callToAction}</p>
                  </div>
                )}
                {item.approvalNotes && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-clay/50 mb-1">Approval Notes</p>
                    <p className="text-xs font-medium text-secondary leading-relaxed">{item.approvalNotes}</p>
                  </div>
                )}
                <p className="text-[8px] text-clay/30 font-medium">
                  Created {new Date(item.createdAt).toLocaleDateString()} · Updated {new Date(item.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          {next && (
            <button
              onClick={() => onAdvance(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              <ArrowRight className="h-3 w-3" />
              {STATUS_CONFIG[next].label}
            </button>
          )}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowStatusMenu(m => !m)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-clay/60 hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              Status
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-border z-20 py-1 min-w-[160px]">
                {STATUS_ORDER.map(s => (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(item.id, s); setShowStatusMenu(false); }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-colors',
                      item.status === s ? 'text-primary' : 'text-clay'
                    )}
                  >
                    {item.status === s && <CheckCircle2 className="h-3 w-3 text-primary" />}
                    {item.status !== s && <span className="w-3" />}
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { onDelete(item.id); setShowStatusMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-danger flex items-center gap-2 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── Form Modal ─────────────────────────── */

const MediaForm = ({
  item,
  onSave,
  onClose,
}: {
  item: Partial<MediaItem> | null;
  onSave: (data: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = React.useState<Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>>(
    item ? {
      title: item.title ?? '',
      mediaType: item.mediaType ?? 'photo',
      project: item.project ?? 'grassroots',
      partnerName: item.partnerName ?? '',
      description: item.description ?? '',
      platformTargets: item.platformTargets ?? [],
      status: item.status ?? 'captured',
      editInstructions: item.editInstructions ?? '',
      captionDraft: item.captionDraft ?? '',
      hashtags: item.hashtags ?? '',
      callToAction: item.callToAction ?? '',
      approvalNotes: item.approvalNotes ?? '',
      publishDate: item.publishDate ?? '',
    } : emptyForm()
  );

  const togglePlatform = (p: Platform) => {
    setForm(f => ({
      ...f,
      platformTargets: f.platformTargets.includes(p)
        ? f.platformTargets.filter(x => x !== p)
        : [...f.platformTargets, p],
    }));
  };

  const set = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-charcoal rounded-t-3xl sm:rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest italic">
                {item?.id ? 'Edit Media Item' : 'New Media Item'}
              </h2>
              <p className="text-[10px] text-white/50 font-medium">Media Control Centre — Planning only</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title + Type row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Title *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Before/After — Jones St Job"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Media Type</label>
              <select
                value={form.mediaType}
                onChange={e => set('mediaType', e.target.value as MediaType)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {Object.entries(MEDIA_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Project + Partner row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Project</label>
              <select
                value={form.project}
                onChange={e => set('project', e.target.value as MediaProject)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="grassroots">GrassRoots Mowing Co</option>
                <option value="project_156">Project #156</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Partner Name (optional)</label>
              <input
                value={form.partnerName}
                onChange={e => set('partnerName', e.target.value)}
                placeholder="e.g. Mount Isa Rotary"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What is this media about?"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Platform targets */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-2">Platform Targets</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_LIST.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors',
                    form.platformTargets.includes(p)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-clay border-border hover:border-primary hover:text-primary'
                  )}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Status + Publish date */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as MediaStatus)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Publish Date (optional)</label>
              <input
                type="date"
                value={form.publishDate}
                onChange={e => set('publishDate', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Editing Notes section */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200/60 p-4 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5" />
              Editing & Caption Notes
            </p>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Edit Instructions</label>
              <textarea
                value={form.editInstructions}
                onChange={e => set('editInstructions', e.target.value)}
                placeholder="What needs to be done to this media?"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Caption Draft</label>
              <textarea
                value={form.captionDraft}
                onChange={e => set('captionDraft', e.target.value)}
                placeholder="Write the caption for this post..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Hashtags</label>
                <input
                  value={form.hashtags}
                  onChange={e => set('hashtags', e.target.value)}
                  placeholder="#grassroots #mountisa"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Call to Action</label>
                <input
                  value={form.callToAction}
                  onChange={e => set('callToAction', e.target.value)}
                  placeholder="e.g. Book now via link in bio"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-clay mb-1">Approval Notes</label>
              <input
                value={form.approvalNotes}
                onChange={e => set('approvalNotes', e.target.value)}
                placeholder="Any notes for approval stage"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-medium bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-3 bg-slate-50 rounded-b-3xl">
          <Button onClick={onClose} variant="ghost" className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.title.trim()) return;
              onSave(form);
            }}
            className="flex-1 sm:flex-none bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-xs"
          >
            <Save className="h-4 w-4 mr-2" />
            {item?.id ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

/* ─────────────────────────── Main Page ─────────────────────────── */

export const MediaCentre: React.FC = () => {
  const [items, setItems] = React.useState<MediaItem[]>(loadItems);
  const [showForm, setShowForm] = React.useState(false);
  const [editItem, setEditItem] = React.useState<MediaItem | null>(null);
  const [collapsedStatuses, setCollapsedStatuses] = React.useState<Set<MediaStatus>>(new Set(['archived']));
  const [filterProject, setFilterProject] = React.useState<MediaProject | 'all'>('all');

  const persist = (updated: MediaItem[]) => {
    setItems(updated);
    saveItems(updated);
  };

  const handleSave = (data: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editItem) {
      persist(items.map(i => i.id === editItem.id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i));
    } else {
      const now = new Date().toISOString();
      persist([...items, { ...data, id: newId(), createdAt: now, updatedAt: now }]);
    }
    setEditItem(null);
    setShowForm(false);
  };

  const handleAdvance = (id: string) => {
    persist(items.map(i => {
      if (i.id !== id) return i;
      const next = nextStatus(i.status);
      return next ? { ...i, status: next, updatedAt: new Date().toISOString() } : i;
    }));
  };

  const handleStatusChange = (id: string, status: MediaStatus) => {
    persist(items.map(i => i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i));
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this media item?')) return;
    persist(items.filter(i => i.id !== id));
  };

  const handleEdit = (item: MediaItem) => {
    setEditItem(item);
    setShowForm(true);
  };

  const toggleCollapse = (s: MediaStatus) => {
    setCollapsedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const filteredItems = filterProject === 'all'
    ? items
    : items.filter(i => i.project === filterProject);

  const byStatus = (s: MediaStatus) => filteredItems.filter(i => i.status === s);

  const partnerItems = filteredItems.filter(i => i.mediaType === 'partner_promo');
  const storyItems = filteredItems.filter(i => i.project === 'project_156' || i.mediaType === 'community_update' || i.mediaType === 'before_after');

  const totalPublished = items.filter(i => i.status === 'published').length;
  const totalApproved = items.filter(i => i.status === 'approved').length;
  const totalReview = items.filter(i => i.status === 'review').length;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-charcoal uppercase italic tracking-tight leading-none">
                Media Control Centre
              </h1>
              <p className="text-xs text-clay/60 font-medium mt-0.5">
                Photography · Video · Social · Project #156 — Planning only. No auto-posting.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-14">
            <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-amber-200">
              ⚠ Planning Mode — Not connected to social platforms
            </span>
          </div>
        </div>
        <Button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-xs h-11"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Media Item
        </Button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: items.length, color: 'text-charcoal', bg: 'bg-white' },
          { label: 'Needs Review', value: totalReview, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Approved', value: totalApproved, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Published', value: totalPublished, color: 'text-primary', bg: 'bg-primary/5' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn('rounded-2xl border border-border px-4 py-3', bg)}>
            <p className={cn('text-2xl font-black', color)}>{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-clay/60 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter row ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-clay/50 mr-1">Project:</span>
        {(['all', 'grassroots', 'project_156'] as const).map(p => (
          <button
            key={p}
            onClick={() => setFilterProject(p)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors',
              filterProject === p
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-clay border-border hover:border-primary hover:text-primary'
            )}
          >
            {p === 'all' ? 'All Projects' : PROJECT_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── Media Pipeline ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px bg-border flex-1" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-clay/50 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" />
            Media Pipeline
          </h2>
          <div className="h-px bg-border flex-1" />
        </div>

        <div className="space-y-4">
          {STATUS_ORDER.map(status => {
            const statusItems = byStatus(status);
            const cfg = STATUS_CONFIG[status];
            const collapsed = collapsedStatuses.has(status);

            return (
              <div key={status} className="rounded-2xl border border-border overflow-hidden bg-white">
                {/* Status header */}
                <button
                  onClick={() => toggleCollapse(status)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={cn('w-2.5 h-2.5 rounded-full', cfg.color)} />
                  <cfg.icon className="h-4 w-4 text-clay/60" />
                  <span className="text-sm font-black text-charcoal uppercase tracking-tight italic flex-1">
                    {cfg.label}
                  </span>
                  <span className={cn(
                    'text-[10px] font-black px-2 py-0.5 rounded-full',
                    statusItems.length > 0 ? cfg.badge : 'bg-slate-100 text-slate-400'
                  )}>
                    {statusItems.length}
                  </span>
                  {collapsed ? <ChevronDown className="h-4 w-4 text-clay/40" /> : <ChevronUp className="h-4 w-4 text-clay/40" />}
                </button>

                {/* Items */}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-border/50"
                    >
                      {statusItems.length === 0 ? (
                        <div className="px-5 py-6 text-center">
                          <p className="text-xs text-clay/40 font-medium italic">No items in {cfg.label}</p>
                        </div>
                      ) : (
                        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {statusItems.map(item => (
                            <MediaCard
                              key={item.id}
                              item={item}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onAdvance={handleAdvance}
                              onStatusChange={handleStatusChange}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Delivery Planner ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px bg-border flex-1" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-clay/50 flex items-center gap-2">
            <Send className="h-3.5 w-3.5" />
            Delivery Planner — Planning only
          </h2>
          <div className="h-px bg-border flex-1" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLATFORM_LIST.filter(p => p !== 'other').map(platform => {
            const count = filteredItems.filter(i => i.platformTargets.includes(platform)).length;
            const approved = filteredItems.filter(i => i.platformTargets.includes(platform) && i.status === 'approved').length;
            const published = filteredItems.filter(i => i.platformTargets.includes(platform) && i.status === 'published').length;
            return (
              <div key={platform} className="bg-white rounded-2xl border border-border p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-clay/60">{PLATFORM_LABELS[platform]}</p>
                <p className="text-xl font-black text-charcoal">{count}</p>
                <div className="space-y-1">
                  {approved > 0 && <p className="text-[9px] font-bold text-emerald-600">{approved} approved</p>}
                  {published > 0 && <p className="text-[9px] font-bold text-primary">{published} published</p>}
                  {count === 0 && <p className="text-[9px] font-medium text-clay/40 italic">No items planned</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Partner Promotion Area ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px bg-border flex-1" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-clay/50 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Partner Promotion
          </h2>
          <div className="h-px bg-border flex-1" />
        </div>

        {partnerItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border border-dashed p-8 text-center">
            <Building2 className="h-8 w-8 text-clay/20 mx-auto mb-3" />
            <p className="text-sm font-black text-clay/40 uppercase italic tracking-tight">No partner media items yet</p>
            <p className="text-xs text-clay/30 font-medium mt-1">Create a media item with type "Partner Promo" to see it here</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-secondary/20 shadow-sm overflow-hidden">
                <div className="h-1 bg-secondary" />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-1">
                        {item.partnerName || 'No partner named'}
                      </p>
                      <h3 className="text-sm font-black text-charcoal uppercase italic tracking-tight leading-tight">
                        {item.title}
                      </h3>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.description && <p className="text-xs text-clay/70 font-medium">{item.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div>
                      <p className="font-black uppercase tracking-widest text-clay/40 mb-0.5">Media needed</p>
                      <p className="font-bold text-charcoal">{MEDIA_TYPE_LABELS[item.mediaType]}</p>
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-widest text-clay/40 mb-0.5">Platforms</p>
                      <p className="font-bold text-charcoal">
                        {item.platformTargets.length > 0 ? item.platformTargets.map(p => PLATFORM_LABELS[p]).join(', ') : 'Not set'}
                      </p>
                    </div>
                  </div>
                  {item.captionDraft && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-clay/40 mb-1">Caption ready</p>
                      <p className="text-[10px] font-medium text-charcoal italic bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-100 line-clamp-2">
                        {item.captionDraft}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => handleEdit(item)}
                    className="w-full py-1.5 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-clay/60 hover:border-secondary hover:text-secondary transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Public Story / Project #156 Area ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px bg-border flex-1" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-clay/50 flex items-center gap-2">
            <Star className="h-3.5 w-3.5" />
            Public Story — Project #156
          </h2>
          <div className="h-px bg-border flex-1" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* What Project #156 is about */}
          <div className="bg-charcoal rounded-2xl p-6 text-white space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-yellow-ochre" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Project #156</h3>
            </div>
            <p className="text-sm font-black uppercase italic text-white leading-snug">
              Aboriginal-led community service through GrassRoots Mowing Co.
            </p>
            <p className="text-xs text-white/60 font-medium leading-relaxed">
              Practical yard support, reliable care, and building economic opportunity for Indigenous community members in Mount Isa. Every job is connected to Country, culture, and community trust.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Community Stories', count: storyItems.filter(i => i.mediaType === 'community_update').length },
                { label: 'Before/After', count: storyItems.filter(i => i.mediaType === 'before_after').length },
              ].map(({ label, count }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3">
                  <p className="text-lg font-black text-yellow-ochre">{count}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Story media items */}
          <div className="lg:col-span-2">
            {storyItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border border-dashed p-8 text-center h-full flex flex-col items-center justify-center">
                <FileText className="h-8 w-8 text-clay/20 mx-auto mb-3" />
                <p className="text-sm font-black text-clay/40 uppercase italic tracking-tight">No story content yet</p>
                <p className="text-xs text-clay/30 font-medium mt-1">
                  Add media items tagged as Project #156, Community Update, or Before/After
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {storyItems.slice(0, 6).map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                        {MEDIA_TYPE_LABELS[item.mediaType]}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <h4 className="text-sm font-black text-charcoal uppercase italic tracking-tight leading-tight">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-clay/70 font-medium line-clamp-2">{item.description}</p>
                    )}
                    {item.captionDraft && (
                      <p className="text-[10px] font-medium text-clay/60 italic border-l-2 border-primary/30 pl-2 line-clamp-2">
                        {item.captionDraft}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {item.platformTargets.map(p => <PlatformTag key={p} p={p} />)}
                    </div>
                  </div>
                ))}
                {storyItems.length > 6 && (
                  <div className="bg-slate-50 rounded-2xl border border-border p-4 flex items-center justify-center">
                    <p className="text-xs font-black text-clay/40 uppercase italic">
                      +{storyItems.length - 6} more in pipeline
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Form Modal ── */}
      <AnimatePresence>
        {showForm && (
          <MediaForm
            item={editItem}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditItem(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaCentre;
