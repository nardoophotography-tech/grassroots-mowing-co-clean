import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, 
  RotateCcw, 
  History, 
  Plus, 
  Trash2, 
  Edit,
  CheckCircle2, 
  AlertCircle,
  FileBadge,
  DollarSign,
  TrendingUp,
  Package,
  PlusCircle,
  Settings,
  ArrowRight,
  ListRestart,
  PlusSquare,
  Repeat,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Input } from '@/src/components/ui/Input';
import { Label } from '@/src/components/ui/Label';
import { Textarea } from '@/src/components/ui/Textarea';
import { Switch } from '@/src/components/ui/Switch';
import { Dialog } from '@/src/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/Tabs';
import { useSettings, usePricingHistory } from '@/src/hooks/useFirebase';
import { PricingRules, ClientType, ServicePackage, ServiceGrade, AddOn } from '@/src/types';
import { calculateServicePrice, getDefaultPricingRules } from '@/src/services/pricingEngine';
import { ADD_ON_LABELS, CLIENT_TYPE_LABELS } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export const PricingManagement = () => {
  const { settings, savePricingConfig, loading } = useSettings();
  const { history } = usePricingHistory();
  const [localRules, setLocalRules] = React.useState<PricingRules | null>(null);
  const [isLive, setIsLive] = React.useState(true);
  const [previewData, setPreviewData] = React.useState({
    package: 'residential_standard' as ServicePackage,
    clientType: 'one-off' as ClientType,
    grade: 'standard' as ServiceGrade,
    addOns: [] as AddOn[]
  });

  const [tab, setTab] = React.useState('base');
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [publishNotes, setPublishNotes] = React.useState("Adjusted base rates and multipliers");

  const [isAddOnModalOpen, setIsAddOnModalOpen] = React.useState(false);
  const [editingAddOnId, setEditingAddOnId] = React.useState<string | null>(null);
  const [addOnForm, setAddOnForm] = React.useState({
    name: '',
    price: 0,
    description: '',
    category: '',
    active: true,
    displayOrder: 0
  });

  const [isPackageModalOpen, setIsPackageModalOpen] = React.useState(false);
  const [editingPackageId, setEditingPackageId] = React.useState<string | null>(null);
  const [packageForm, setPackageForm] = React.useState({
    name: '',
    price: 0,
    description: '',
    category: '',
    active: true,
    displayOrder: 0
  });

  // Sync snapshot
  React.useEffect(() => {
    if (settings?.pricing && isLive) {
      setLocalRules(JSON.parse(JSON.stringify(settings.pricing)));
    } else if (!settings?.pricing && loading === false && isLive) {
      setLocalRules(getDefaultPricingRules());
    }
  }, [settings?.pricing, isLive, loading]);

  const handleUpdateBase = (pkg: string, value: number) => {
    if (!localRules) return;
    setLocalRules(prev => ({
      ...prev!,
      base: { ...prev!.base, [pkg]: value }
    }));
    setIsLive(false);
  };

  const handleCreateOrUpdatePackage = () => {
    if (!localRules) return;
    if (!packageForm.name.trim()) {
      toast.error('Package name is required');
      return;
    }

    const id = editingPackageId || packageForm.name.toLowerCase().replace(/\s+/g, '_');
    
    if (!editingPackageId && localRules.base[id]) {
      toast.error('A package with this name (or slug) already exists');
      return;
    }

    setLocalRules(prev => {
      if (!prev) return null;
      const newRules = { ...prev };
      newRules.base = { ...newRules.base, [id]: packageForm.price };
      newRules.packageDetails = {
        ...(newRules.packageDetails || {}),
        [id]: {
          name: packageForm.name,
          description: packageForm.description,
          category: packageForm.category,
          active: packageForm.active,
          displayOrder: packageForm.displayOrder || (Object.keys(newRules.base).length)
        }
      };
      return newRules;
    });

    setIsLive(false);
    setIsPackageModalOpen(false);
    setEditingPackageId(null);
    setPackageForm({ name: '', price: 0, description: '', category: '', active: true, displayOrder: 0 });
    toast.success(editingPackageId ? 'Package updated locally' : 'Package created locally');
  };

  const handleDeletePackage = (id: string) => {
    if (!localRules) return;
    if (id === 'custom') {
      toast.error('The "custom" package cannot be deleted as it is a system requirement.');
      return;
    }
    if (confirm(`Are you sure you want to delete the package "${localRules.packageDetails?.[id]?.name || id}"?`)) {
      setLocalRules(prev => {
        if (!prev) return null;
        const newRules = { ...prev };
        const newBase = { ...newRules.base };
        delete newBase[id];
        const newDetails = { ...(newRules.packageDetails || {}) };
        delete newDetails[id];
        return { ...newRules, base: newBase, packageDetails: newDetails };
      });
      setIsLive(false);
      toast.success('Package removed locally');
    }
  };

  const openEditPackageModal = (id: string) => {
    if (!localRules) return;
    const detail = localRules.packageDetails?.[id];
    setEditingPackageId(id);
    setPackageForm({
      name: detail?.name || id.replace(/_/g, ' '),
      price: localRules.base[id] || 0,
      description: detail?.description || '',
      category: detail?.category || '',
      active: detail?.active ?? true,
      displayOrder: detail?.displayOrder || 0
    });
    setIsPackageModalOpen(true);
  };

  const handleUpdateMultiplier = (type: string, value: number) => {
    if (!localRules) return;
    setLocalRules(prev => ({
      ...prev!,
      clientType: { ...prev!.clientType, [type]: value }
    }));
    setIsLive(false);
  };

  const handleUpdateAddOn = (id: string, value: number) => {
    if (!localRules) return;
    setLocalRules(prev => ({
      ...prev!,
      addOns: { ...prev!.addOns, [id]: value }
    }));
    setIsLive(false);
  };

  const handleCreateOrUpdateAddOn = () => {
    if (!localRules) return;
    if (!addOnForm.name.trim()) {
      toast.error('Add-on name is required');
      return;
    }

    const id = editingAddOnId || addOnForm.name.toLowerCase().replace(/\s+/g, '-');
    
    if (!editingAddOnId && localRules.addOns[id]) {
      toast.error('An add-on with this name (or slug) already exists');
      return;
    }

    setLocalRules(prev => {
      if (!prev) return null;
      const newRules = { ...prev };
      newRules.addOns = { ...newRules.addOns, [id]: addOnForm.price };
      newRules.addOnDetails = {
        ...(newRules.addOnDetails || {}),
        [id]: {
          name: addOnForm.name,
          description: addOnForm.description,
          category: addOnForm.category,
          active: addOnForm.active,
          displayOrder: addOnForm.displayOrder || (Object.keys(newRules.addOns).length)
        }
      };
      return newRules;
    });

    setIsLive(false);
    setIsAddOnModalOpen(false);
    setEditingAddOnId(null);
    setAddOnForm({ name: '', price: 0, description: '', category: '', active: true, displayOrder: 0 });
    toast.success(editingAddOnId ? 'Add-on updated locally' : 'Add-on created locally');
  };

  const handleDeleteAddOn = (id: string) => {
    if (!localRules) return;
    if (confirm(`Are you sure you want to delete the add-on "${localRules.addOnDetails?.[id]?.name || id}"?`)) {
      setLocalRules(prev => {
        if (!prev) return null;
        const newRules = { ...prev };
        const newAddOns = { ...newRules.addOns };
        delete newAddOns[id];
        const newDetails = { ...(newRules.addOnDetails || {}) };
        delete newDetails[id];
        return { ...newRules, addOns: newAddOns, addOnDetails: newDetails };
      });
      setIsLive(false);
      toast.success('Add-on removed locally');
    }
  };

  const openEditModal = (id: string) => {
    if (!localRules) return;
    const detail = localRules.addOnDetails?.[id];
    setEditingAddOnId(id);
    setAddOnForm({
      name: detail?.name || id,
      price: localRules.addOns[id] || 0,
      description: detail?.description || '',
      category: detail?.category || '',
      active: detail?.active ?? true,
      displayOrder: detail?.displayOrder || 0
    });
    setIsAddOnModalOpen(true);
  };

  const startPublish = () => {
    console.log('[PricingManagement]: Publish button clicked');
    if (!localRules) {
      console.warn('[PricingManagement]: localRules is null, cannot publish');
      return;
    }
    setIsPublishModalOpen(true);
  };

  const handleSave = async () => {
    if (!localRules) return;
    console.log('[PricingManagement]: Confirming publish with notes:', publishNotes);
    setIsPublishModalOpen(false);
    
    setIsPublishing(true);
    try {
      console.log('[PricingManagement]: Sending payload to savePricingConfig:', localRules);
      const success = await savePricingConfig(localRules, publishNotes);
      console.log('[PricingManagement]: Publish result:', success);
      if (success) {
        setIsLive(true);
        toast.success('Configuration published successfully!');
      } else {
        console.error('[PricingManagement]: savePricingConfig returned false');
      }
    } catch (err: any) {
      console.error('[PricingManagement]: Execution error during publish:', err);
      toast.error(`Publish error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset all local changes to match the current live version?")) {
      setLocalRules(JSON.parse(JSON.stringify(settings?.pricing || getDefaultPricingRules())));
      setIsLive(true);
    }
  };

  const rollbackToVersion = (versionRules: PricingRules) => {
    if (confirm("Setting local editor to this version. You will still need to click 'Publish' to make it live. Proceed?")) {
      setLocalRules(JSON.parse(JSON.stringify(versionRules)));
      setIsLive(false);
    }
  };

  const previewResult = calculateServicePrice(
    localRules || settings?.pricing || getDefaultPricingRules(),
    previewData.package,
    previewData.clientType,
    previewData.grade,
    { timeSinceLastMow: 'under-2-weeks', grassHeight: 'short', thickness: 'light', obstacles: 'low', urgency: 'normal' },
    previewData.addOns
  );

  if (!localRules) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        <p className="text-slate-500 font-medium animate-pulse">Initializing Pricing Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black text-charcoal tracking-tight leading-none uppercase italic underline decoration-primary/40 underline-offset-[12px]">Pricing Engine</h1>
          <p className="text-clay font-black uppercase tracking-[0.2em] text-[10px] mt-6">Algorithmic Valuation & Asset Monetization</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {!isLive && (
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isPublishing}
              className="rounded-xl px-6 h-12"
            >
              <RotateCcw className="mr-3 h-5 w-5" />
              Discard Draft
            </Button>
          )}
          <Button 
            onClick={startPublish}
            disabled={isLive || isPublishing}
            className="rounded-xl px-10 h-12"
          >
            {isPublishing ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Save className="mr-3 h-5 w-5" />
                Publish Live Config
              </>
            )}
          </Button>
        </div>
      </div>

      {!isLive && (
        <div className="p-6 bg-accent/10 border border-accent/20 rounded-[2rem] flex items-center gap-6 shadow-premium-sm animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-charcoal uppercase tracking-widest italic">Draft Configuration Pending Deployment</p>
            <p className="text-[10px] text-clay font-medium uppercase tracking-tight mt-0.5">Validate logic in the terminal simulator prior to production commit.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-surface rounded-3xl border border-border shadow-premium overflow-hidden">
            <div className="flex border-b border-border p-3 gap-2 bg-background/50">
              {[
                { id: 'base', icon: Package, label: 'Packages' },
                { id: 'tiers', icon: TrendingUp, label: 'Client Tiers' },
                { id: 'addons', icon: PlusSquare, label: 'Add-Ons' },
                { id: 'history', icon: History, label: 'History' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    tab === t.id ? "bg-surface text-primary shadow-premium ring-1 ring-border italic" : "text-clay hover:text-charcoal hover:bg-background"
                  )}
                >
                  <t.icon className="h-5 w-5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {tab === 'base' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-charcoal tracking-tight uppercase italic underline decoration-primary/30 underline-offset-4">Standard Service Rates</h3>
                      <p className="text-sm text-clay font-medium">Core service packages used in direct booking flow.</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingPackageId(null);
                        setPackageForm({ name: '', price: 0, description: '', category: '', active: true, displayOrder: 0 });
                        setIsPackageModalOpen(true);
                      }}
                      className="bg-secondary text-white hover:bg-secondary-hover rounded-xl font-black uppercase tracking-widest h-10 px-4 shadow-premium transition-all"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Package
                    </Button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(localRules.base).sort((a,b) => (localRules.packageDetails?.[a[0]]?.displayOrder || 0) - (localRules.packageDetails?.[b[0]]?.displayOrder || 0)).map(([key, value]) => {
                      const detail = localRules.packageDetails?.[key];
                      const isActive = detail?.active ?? true;
                      return (
                        <div key={key} className={cn(
                          "p-6 rounded-3xl border transition-all group relative overflow-hidden",
                          isActive ? "border-border bg-surface hover:border-primary/30" : "border-border bg-clay/5 opacity-60"
                        )}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-charcoal leading-none uppercase tracking-tight">{detail?.name || key.replace(/_/g, ' ')}</h4>
                                {!isActive && <Badge variant="outline" className="bg-clay/10 text-clay/40 border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4">Hidden</Badge>}
                              </div>
                              {detail?.description && <p className="text-[10px] text-clay/60 font-medium line-clamp-1 italic">{detail.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditPackageModal(key)} className="p-2 text-clay/40 hover:text-primary hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-border transition-all">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeletePackage(key)} className="p-2 text-clay/40 hover:text-secondary hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-border transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-[9px] font-black text-clay/40 uppercase tracking-[0.2em] mb-1.5 block">Price Point</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                                <Input 
                                  type="number"
                                  value={value}
                                  onChange={(e) => handleUpdateBase(key, Number(e.target.value))}
                                  className="pl-9 h-11 rounded-xl bg-white border-border font-black text-charcoal focus:ring-primary/20"
                                />
                              </div>
                            </div>
                            {detail?.category && (
                              <div className="pt-5 flex flex-col items-end">
                                <Label className="text-[9px] font-black text-clay/40 uppercase tracking-[0.2em] mb-2 block whitespace-nowrap">Tier</Label>
                                <Badge className="bg-ochre/10 text-primary border-none px-2 py-1 uppercase text-[9px] font-black shadow-sm h-6">
                                  {detail.category}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'tiers' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-bold text-charcoal tracking-tight uppercase italic underline decoration-primary/30 underline-offset-4">Global Multipliers</h3>
                    <p className="text-sm text-clay font-medium">Automatic price adjustments applied based on client classification.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(localRules.clientType).map(([key, value]) => {
                      const numValue = value as number;
                      return (
                        <div key={key} className="p-6 rounded-3xl border border-border bg-surface">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-charcoal capitalize tracking-tight uppercase italic">{CLIENT_TYPE_LABELS[key] || key.replace(/-/g, ' ')}</h4>
                            <div className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                              numValue === 1 ? "bg-clay/10 text-clay/50" : numValue < 1 ? "bg-emerald-100 text-emerald-600" : "bg-ochre/20 text-primary"
                            )}>
                              {numValue === 1 ? 'Neutral' : numValue < 1 ? 'Discount' : 'Surcharge'}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-primary/40 font-black text-xs">
                                ×
                              </div>
                              <Input 
                                type="number"
                                step="0.01"
                                value={numValue}
                                onChange={(e) => handleUpdateMultiplier(key, Number(e.target.value))}
                                className="pl-8 h-12 rounded-xl bg-white border-border font-black text-charcoal"
                              />
                            </div>
                            <div className="p-3 bg-background rounded-xl border border-dashed border-border text-[10px] text-clay/60 font-medium">
                              Adjusts total job price by <span className="font-black text-charcoal">{Math.abs((numValue - 1) * 100).toFixed(0)}%</span> {numValue < 1 ? 'downwards' : numValue > 1 ? 'upwards' : 'at par'}.
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'addons' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-charcoal tracking-tight uppercase italic underline decoration-primary/30 underline-offset-4">Service Enhancements</h3>
                      <p className="text-sm text-clay font-medium">Flat rate add-ons available during the selection process.</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingAddOnId(null);
                        setAddOnForm({ name: '', price: 0, description: '', category: '', active: true, displayOrder: 0 });
                        setIsAddOnModalOpen(true);
                      }}
                      className="bg-secondary text-white hover:bg-secondary-hover rounded-xl font-black uppercase tracking-widest h-10 px-4 shadow-premium transition-all"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Add-On
                    </Button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(localRules.addOns).sort((a,b) => (localRules.addOnDetails?.[a[0]]?.displayOrder || 0) - (localRules.addOnDetails?.[b[0]]?.displayOrder || 0)).map(([key, value]) => {
                      const detail = localRules.addOnDetails?.[key];
                      const isActive = detail?.active ?? true;
                      return (
                        <div key={key} className={cn(
                          "p-6 rounded-3xl border transition-all group relative overflow-hidden",
                          isActive ? "border-border bg-surface hover:border-primary/30" : "border-border bg-clay/5 opacity-60"
                        )}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-charcoal leading-none uppercase tracking-tight">{detail?.name || ADD_ON_LABELS[key] || key}</h4>
                                {!isActive && <Badge variant="outline" className="bg-clay/10 text-clay/40 border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4">Inactive</Badge>}
                              </div>
                              {detail?.description && <p className="text-[10px] text-clay/60 font-medium line-clamp-1 italic">{detail.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditModal(key)} className="p-2 text-clay/40 hover:text-primary hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-border transition-all">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeleteAddOn(key)} className="p-2 text-clay/40 hover:text-secondary hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-border transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-[9px] font-black text-clay/40 uppercase tracking-[0.2em] mb-1.5 block">Service Fee</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
                                <Input 
                                  type="number"
                                  value={value}
                                  onChange={(e) => handleUpdateAddOn(key, Number(e.target.value))}
                                  className="pl-9 h-11 rounded-xl bg-white border-border font-black text-charcoal focus:ring-primary/20"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'history' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-xl font-bold text-charcoal tracking-tight uppercase italic underline decoration-primary/30 underline-offset-4">Configuration History</h3>
                    <p className="text-sm text-clay font-medium">Archive of all published pricing versions for rollback and auditing.</p>
                  </div>

                  <div className="space-y-3">
                    {history.map((v) => (
                      <div key={v.id} className="p-5 rounded-2xl border border-border bg-surface hover:bg-ochre/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-clay/40 font-black text-[10px] border border-border shadow-premium">
                            v{v.version}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-charcoal tracking-tight leading-tight mb-1">{v.notes || 'Routine rule update'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-clay/40 font-black uppercase tracking-widest">
                              <span>{format(v.updatedAt, 'MMM d, yyyy · hh:mm a')}</span>
                              <span>•</span>
                              <span className="text-clay/60">By {v.updatedBy.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => rollbackToVersion(v.rules)}
                          className="rounded-xl hover:bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest h-9 border border-transparent hover:border-primary/20"
                        >
                          <Repeat className="mr-2 h-3.5 w-3.5" />
                          Load Rules
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-charcoal rounded-[2.5rem] p-8 text-white shadow-premium sticky top-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black tracking-tight uppercase italic">Simulation</h3>
              <Badge className="bg-primary/20 text-primary border-none font-black text-[10px] uppercase tracking-widest px-2 py-0.5">Live Logic</Badge>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/50">Core Package</Label>
                <select 
                  value={previewData.package}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, package: e.target.value as any }))}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white focus:ring-1 focus:ring-primary outline-none appearance-none"
                >
                  {Object.keys(localRules.base).map(pkg => (
                    <option key={pkg} value={pkg} className="bg-charcoal">{localRules.packageDetails?.[pkg]?.name || pkg}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/50">Client Profile</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['one-off', 'returning', 'ultimate-gold', 'real-estate'] as ClientType[]).map(c => (
                    <button 
                      key={c}
                      onClick={() => setPreviewData(prev => ({ ...prev, clientType: c }))}
                      className={cn(
                        "py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                        previewData.clientType === c 
                          ? "bg-primary border-primary text-white" 
                          : "bg-white/5 border-white/10 text-clay/50 hover:text-white"
                      )}
                    >
                      {c.replace(/-/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/50">Property Grade</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['standard', 'medium', 'heavy', 'extreme'].map(g => (
                    <button 
                      key={g}
                      onClick={() => setPreviewData(prev => ({ ...prev, grade: g as any }))}
                      className={cn(
                        "py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                        previewData.grade === g 
                          ? "bg-secondary border-secondary text-white" 
                          : "bg-white/5 border-white/10 text-clay/50 hover:text-white"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-clay/50 text-[10px] font-black uppercase tracking-[0.2em]">Base Rate (w/ Tier)</span>
                <span className="text-white font-bold ml-auto">${(previewResult.basePrice + (previewResult.tierAdjustment || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-clay/50 text-[10px] font-black uppercase tracking-[0.2em]">Grade Modifiers</span>
                <span className="text-white font-bold ml-auto">${(previewResult.gradeAdjustment || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-clay/50 text-[10px] font-black uppercase tracking-[0.2em]">Add-On Net</span>
                <span className="text-white font-bold ml-auto">${(previewResult.addOnTotal || 0).toFixed(2)}</span>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Estimated Final</p>
                  {previewResult.isQuoteRequired && <Badge className="bg-secondary text-white border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">Manual Quote Required</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-clay/50 text-sm">$</span>
                  <span className="text-5xl font-black text-white italic">{Math.round(previewResult.total)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-primary/40 flex-shrink-0" />
              <p className="text-[9px] font-medium text-clay/40 leading-relaxed italic">Changes made here are local to your browser until published to the global production engine.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Dialog
        open={isPackageModalOpen}
        onOpenChange={setIsPackageModalOpen}
        title={editingPackageId ? 'Edit Service Package' : 'Create New Package'}
        description="Configure the core properties of this service offering."
      >
        <div className="space-y-6 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Package Title</Label>
              <Input 
                value={packageForm.name}
                onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Urban Lot"
                className="rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-bold text-charcoal"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Base Rate ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40" />
                <Input 
                  type="number"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="pl-10 rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-black text-charcoal"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Marketing Description</Label>
            <Textarea 
              value={packageForm.description}
              onChange={(e) => setPackageForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed explanation of the lot size and typical constraints..."
              className="rounded-xl border-border min-h-[120px] resize-none bg-background focus:ring-primary/20 font-medium text-charcoal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Tag / Category</Label>
              <Input 
                value={packageForm.category}
                onChange={(e) => setPackageForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Under 800m2"
                className="rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-bold text-charcoal"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Display Weight</Label>
              <Input 
                type="number"
                value={packageForm.displayOrder}
                onChange={(e) => setPackageForm(prev => ({ ...prev, displayOrder: Number(e.target.value) }))}
                placeholder="Sort order (0-99)"
                className="rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-bold text-charcoal"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-ochre/5 rounded-3xl border border-ochre/10">
            <div className="space-y-1">
              <p className="text-xs font-black text-charcoal uppercase tracking-tight italic">Active Visibility</p>
              <p className="text-[10px] text-clay/60 font-medium tracking-tight">If disabled, this package is hidden from new bookings.</p>
            </div>
            <Switch 
              checked={packageForm.active}
              onCheckedChange={(checked) => setPackageForm(prev => ({ ...prev, active: checked }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsPackageModalOpen(false)} className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] border-border text-clay">Cancel</Button>
            <Button onClick={handleCreateOrUpdatePackage} className="flex-1 rounded-xl h-12 bg-secondary text-white font-black uppercase tracking-widest text-[10px] shadow-premium">
              {editingPackageId ? 'Update Package' : 'Save Package'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={isAddOnModalOpen}
        onOpenChange={setIsAddOnModalOpen}
        title={editingAddOnId ? 'Edit Add-On service' : 'Define New Add-On'}
        description="Configure pricing and availability for extra service items."
      >
        <div className="space-y-6 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Service Name</Label>
              <Input 
                value={addOnForm.name}
                onChange={(e) => setAddOnForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Bio-Degradable Bags"
                className="rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-bold text-charcoal"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Unit Price ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/40" />
                <Input 
                  type="number"
                  value={addOnForm.price}
                  onChange={(e) => setAddOnForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="pl-10 rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-black text-charcoal"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Add-On Details</Label>
            <Textarea 
              value={addOnForm.description}
              onChange={(e) => setAddOnForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief explanation of the value provided..."
              className="rounded-xl border-border min-h-[100px] resize-none bg-background focus:ring-primary/20 font-medium text-charcoal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Grouping</Label>
              <Input 
                value={addOnForm.category}
                onChange={(e) => setAddOnForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Materials"
                className="rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-bold text-charcoal"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Priority</Label>
              <Input 
                type="number"
                value={addOnForm.displayOrder}
                onChange={(e) => setAddOnForm(prev => ({ ...prev, displayOrder: Number(e.target.value) }))}
                placeholder="0"
                className="rounded-xl border-border h-12 bg-background focus:ring-primary/20 font-bold text-charcoal"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-ochre/5 rounded-3xl border border-ochre/10">
            <div className="space-y-1">
              <p className="text-xs font-black text-charcoal uppercase tracking-tight italic">Active Capability</p>
              <p className="text-[10px] text-clay/60 font-medium tracking-tight">Only enabled add-ons can be selected by clients.</p>
            </div>
            <Switch 
              checked={addOnForm.active}
              onCheckedChange={(checked) => setAddOnForm(prev => ({ ...prev, active: checked }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsAddOnModalOpen(false)} className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] border-border text-clay">Cancel</Button>
            <Button onClick={handleCreateOrUpdateAddOn} className="flex-1 rounded-xl h-12 bg-secondary text-white font-black uppercase tracking-widest text-[10px] shadow-premium">
              {editingAddOnId ? 'Update Add-On' : 'Save Add-On'}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={isPublishModalOpen}
        onOpenChange={setIsPublishModalOpen}
        title="Deploy Pricing configuration"
        description="This will instantly update the service pricing engine for all clients. This action is recorded."
      >
        <div className="space-y-6 pt-4 pb-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40">Changelog Entry</Label>
            <Textarea 
              value={publishNotes}
              onChange={(e) => setPublishNotes(e.target.value)}
              placeholder="Describe the reason for this adjustment (e.g., Seasonal fuel adjustment)..."
              className="rounded-xl border-border min-h-[140px] resize-none font-medium text-sm leading-relaxed bg-background focus:ring-primary/20 text-charcoal"
            />
            <p className="text-[10px] text-clay/40 font-medium italic">Clear notes help during reconciliation and role audits.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)} className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] border-border text-clay">Review More</Button>
            <Button onClick={handleSave} className="flex-1 rounded-xl h-12 bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-premium">
              Confirm & Deploy Live
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
