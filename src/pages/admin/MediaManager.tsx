import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Image, Upload, Trash2, Save, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const MediaManager = () => {
  const [assets, setAssets] = React.useState([
    { id: 'logo', name: 'Company Logo', url: '/assets/logo.png' },
    { id: 'truck', name: 'Truck Wrap Artwork', url: '/assets/truck-wrap.png' },
    { id: 'banner', name: 'Landing Page Banner', url: '/assets/banner.png' }
  ]);

  const handleUpdate = (id: string, newUrl: string) => {
    setAssets(assets.map(a => a.id === id ? { ...a, url: newUrl } : a));
    toast.success('Asset path updated for deployment.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal uppercase tracking-tight italic">Assets & Media</h1>
        <p className="text-sm font-black text-clay/60 uppercase tracking-widest mt-1">Manage brand collateral and imagery</p>
      </div>

      <div className="grid gap-6">
        {assets.map((asset) => (
          <Card key={asset.id} className="border-border shadow-sm rounded-2xl overflow-hidden bg-surface">
            <CardContent className="p-6 flex items-center gap-6">
              <div className="w-24 h-24 bg-background rounded-xl border border-border flex items-center justify-center shrink-0">
                <Image className="h-8 w-8 text-primary/40" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="font-black text-charcoal uppercase tracking-widest text-sm">{asset.name}</div>
                <div className="flex gap-2">
                  <input 
                    value={asset.url}
                    onChange={(e) => handleUpdate(asset.id, e.target.value)}
                    className="flex-1 border-border bg-background rounded-lg h-10 px-3 text-xs font-bold"
                  />
                  <Button variant="outline" className="h-10 w-10 p-0 rounded-lg">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full bg-primary hover:bg-primary-hover text-white rounded-xl h-14 font-black uppercase tracking-widest shadow-premium">
        <Upload className="h-4 w-4 mr-2" /> Sync Asset Repository
      </Button>
    </div>
  );
};
