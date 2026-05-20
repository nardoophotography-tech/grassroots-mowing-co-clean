import * as React from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Label } from '@/src/components/ui/Label';
import { Settings, ShieldAlert, Power, Save, BellRing, MapPin } from 'lucide-react';

export const AdminSettings = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // The Master Config State
  const [config, setConfig] = React.useState({
    appStatus: 'active', // 'active' or 'maintenance'
    emergencyBannerText: '',
    supportEmail: 'admin@grassrootsmowing.co',
    supportPhone: '0400 000 000',
    primaryServiceRegion: 'Mount Isa',
    requireQuoteForHeavy: true,
  });

  React.useEffect(() => {
    fetchGlobalConfig();
  }, []);

  const fetchGlobalConfig = async () => {
    try {
      const docRef = doc(db, 'system', 'global_config');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setConfig(prev => ({ ...prev, ...docSnap.data() }));
      }
    } catch (error) {
      console.error("Failed to load global config:", error);
      toast.error("Could not load system configurations.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'system', 'global_config');
      await setDoc(docRef, config, { merge: true });
      toast.success('System configuration updated live.');
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error("Failed to update system.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-charcoal uppercase tracking-tight italic">System Configuration</h1>
          <p className="text-sm font-black text-clay/60 uppercase tracking-widest mt-1">Master Control Panel • Live Updates</p>
        </div>
        <Button 
          onClick={handleSave} 
          isLoading={isSaving}
          className="bg-primary hover:bg-primary-hover text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest shadow-premium"
        >
          <Save className="h-4 w-4 mr-2" /> Publish Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core App Status */}
        <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface">
          <CardHeader className="bg-charcoal border-b border-border">
            <CardTitle className="flex items-center gap-3 font-black text-white uppercase tracking-tight italic">
              <Power className="h-5 w-5 text-primary" />
              Application Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <Label className="text-clay/60 font-black uppercase text-[10px] tracking-widest">Master Switch</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setConfig({ ...config, appStatus: 'active' })}
                  className={`p-4 rounded-xl border-2 font-black uppercase tracking-widest text-sm transition-all ${
                    config.appStatus === 'active' 
                      ? 'border-primary bg-primary/10 text-primary shadow-inner' 
                      : 'border-border text-clay hover:border-primary/30'
                  }`}
                >
                  System Online
                </button>
                <button
                  onClick={() => setConfig({ ...config, appStatus: 'maintenance' })}
                  className={`p-4 rounded-xl border-2 font-black uppercase tracking-widest text-sm transition-all ${
                    config.appStatus === 'maintenance' 
                      ? 'border-secondary bg-secondary/10 text-secondary shadow-inner' 
                      : 'border-border text-clay hover:border-secondary/30'
                  }`}
                >
                  Maintenance Mode
                </button>
              </div>
              <p className="text-[10px] text-clay font-medium italic">
                Maintenance mode locks out the client booking portal but allows Admin access.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-clay/60 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                <ShieldAlert className="h-3 w-3 text-secondary" /> Global Alert Banner
              </Label>
              <Input 
                value={config.emergencyBannerText}
                onChange={(e) => setConfig({ ...config, emergencyBannerText: e.target.value })}
                placeholder="e.g. Services delayed due to extreme weather..."
                className="border-border bg-background focus:border-primary"
              />
              <p className="text-[10px] text-clay font-medium italic">Leave blank to hide the banner from the live site.</p>
            </div>
          </CardContent>
        </Card>

        {/* Operational Config */}
        <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface">
          <CardHeader className="bg-primary/5 border-b border-border">
            <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
              <Settings className="h-5 w-5 text-primary" />
              Operational Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label className="text-clay/60 font-black uppercase text-[10px] tracking-widest">Primary Regional Node</Label>
              <Input 
                value={config.primaryServiceRegion}
                onChange={(e) => setConfig({ ...config, primaryServiceRegion: e.target.value })}
                className="border-border bg-background font-bold text-charcoal"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-clay/60 font-black uppercase text-[10px] tracking-widest flex items-center justify-between">
                <span>Require Appraisals for Heavy Terrain</span>
                <input 
                  type="checkbox" 
                  checked={config.requireQuoteForHeavy}
                  onChange={(e) => setConfig({ ...config, requireQuoteForHeavy: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
              </Label>
              <p className="text-[10px] text-clay font-medium italic">If active, clients selecting "Extreme/Wilderness" grades cannot book directly; they must request a quote.</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Routing */}
        <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface lg:col-span-2">
          <CardHeader className="bg-primary/5 border-b border-border">
            <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
              <BellRing className="h-5 w-5 text-primary" />
              Contact Routing
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-clay/60 font-black uppercase text-[10px] tracking-widest">System Email (Receipts/Alerts)</Label>
              <Input 
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                className="border-border bg-background font-bold text-charcoal"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-clay/60 font-black uppercase text-[10px] tracking-widest">Dispatch Phone</Label>
              <Input 
                value={config.supportPhone}
                onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                className="border-border bg-background font-bold text-charcoal"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
