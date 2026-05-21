import * as React from 'react';
import { 
  Settings, 
  Save, 
  MapPin, 
  Bell, 
  CreditCard, 
  MessageSquare, 
  ShieldCheck,
  Building2,
  Trash2,
  Plus,
  Info,
  ExternalLink,
  ChevronRight,
  Quote
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { auditService } from '@/services/auditService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export function SystemSettings() {
  const { settings, loading, updateSettings } = useSettings();
  const { user } = useAuth();
  const [formData, setFormData] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  if (loading || !formData) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const success = await updateSettings(formData);
    if (success) {
      await auditService.log(
        { uid: user.uid, email: user.email || 'unknown' },
        'SETTINGS_UPDATE',
        'Updated global business settings and system identity'
      );
      toast.success('System settings updated successfully');
    }
    setIsSaving(false);
  };

  const updateNestedField = (path: string, value: any) => {
    const keys = path.split('.');
    const newData = { ...formData };
    let current = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setFormData(newData);
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-charcoal p-2 rounded-xl">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-charcoal uppercase italic">System Control</h1>
          </div>
          <p className="text-sm text-clay mt-2 font-medium">Global configuration and business identity override.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-primary text-white hover:bg-primary-hover shadow-button h-12 px-8 rounded-xl flex items-center gap-2"
        >
          {isSaving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />}
          <span className="font-black uppercase tracking-widest italic">Save Changes</span>
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border shadow-premium overflow-hidden">
            <CardHeader className="bg-surface border-b border-border/50">
              <CardTitle className="text-sm font-black uppercase italic tracking-widest">Configuration Modules</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <nav className="space-y-1">
                <Link to="#identity" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface text-clay font-bold italic transition-colors">
                  <Building2 className="w-4 h-4" />
                  Business Identity
                </Link>
                <Link to="#comms" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface text-clay font-bold italic transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Communication
                </Link>
                <Link to="#finance" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface text-clay font-bold italic transition-colors">
                  <CreditCard className="w-4 h-4" />
                  Financial Logic
                </Link>
                <Link to="#system" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface text-clay font-bold italic transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  System Protocols
                </Link>
                <Link to="#testimonials" className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface text-clay font-bold italic transition-colors">
                  <Quote className="w-4 h-4" />
                  Testimonials
                </Link>
                <Link to="/admin/pricing" className="flex items-center justify-between p-3 rounded-xl hover:bg-surface text-clay font-bold italic transition-colors group">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4" />
                    Pricing Rules
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
                <Link to="/admin/assets" className="flex items-center justify-between p-3 rounded-xl hover:bg-surface text-clay font-bold italic transition-colors group">
                   <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4" />
                    Asset Management
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
              </nav>
            </CardContent>
          </Card>

          <Card className="bg-charcoal text-white border-none shadow-premium overflow-hidden relative">
            <div className="absolute inset-0 cultural-pattern opacity-5" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="font-black uppercase italic tracking-widest">Live Updates</h3>
              </div>
              <p className="text-xs text-white/70 font-medium leading-relaxed italic">
                Changes saved here propagate to all client and staff interfaces immediately. Use with caution during peak operation hours.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Section */}
          <section id="identity" className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-charcoal uppercase italic tracking-widest">Business Identity</h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Business Legal Name</Label>
                <Input 
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">HQ Location</Label>
                <Input 
                  value={formData.serviceLocation}
                  onChange={(e) => setFormData({ ...formData, serviceLocation: e.target.value })}
                  className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Support Email</Label>
                <Input 
                  value={formData.businessEmail || ''}
                  onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                  className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                  placeholder="ops@grassrootsmowing.co"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Support Phone</Label>
                <Input 
                  value={formData.businessPhone || ''}
                  onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                  className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                  placeholder="0400 000 000"
                />
              </div>
            </div>

            <Card className="mt-6 border-border shadow-sm">
              <CardHeader className="bg-surface border-b border-border/50">
                <CardTitle className="text-sm font-black uppercase italic tracking-widest">Designer Details</CardTitle>
                <CardDescription className="text-xs text-clay/60">Record the artist and licensing details for your logo and artwork.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Designer / Artist Name</Label>
                    <Input
                      value={formData.designerDetails?.name || ''}
                      onChange={(e) => setFormData({ ...formData, designerDetails: { ...(formData.designerDetails || {}), name: e.target.value } })}
                      className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                      placeholder="Artist Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Design Studio / Business Name</Label>
                    <Input
                      value={formData.designerDetails?.studio || ''}
                      onChange={(e) => setFormData({ ...formData, designerDetails: { ...(formData.designerDetails || {}), studio: e.target.value } })}
                      className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                      placeholder="Studio or Business"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Artwork Story</Label>
                  <Textarea
                    value={formData.designerDetails?.story || ''}
                    onChange={(e) => setFormData({ ...formData, designerDetails: { ...(formData.designerDetails || {}), story: e.target.value } })}
                    className="min-h-[120px] bg-slate-50/50 border-border font-medium italic"
                    placeholder="Describe the inspiration and meaning behind the artwork..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Logo Usage Notes</Label>
                  <Textarea
                    value={formData.designerDetails?.usageNotes || ''}
                    onChange={(e) => setFormData({ ...formData, designerDetails: { ...(formData.designerDetails || {}), usageNotes: e.target.value } })}
                    className="min-h-[80px] bg-slate-50/50 border-border font-medium italic"
                    placeholder="Guidelines for logo usage, clear space, colour variants..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Website / Social Link</Label>
                    <Input
                      value={formData.designerDetails?.website || ''}
                      onChange={(e) => setFormData({ ...formData, designerDetails: { ...(formData.designerDetails || {}), website: e.target.value } })}
                      className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Permission / License Notes</Label>
                    <Input
                      value={formData.designerDetails?.permissionNotes || ''}
                      onChange={(e) => setFormData({ ...formData, designerDetails: { ...(formData.designerDetails || {}), permissionNotes: e.target.value } })}
                      className="bg-white border-border shadow-sm rounded-xl font-bold italic"
                      placeholder="License or permission summary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Communication Section */}
          <section id="comms" className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-charcoal uppercase italic tracking-widest">Communication</h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Card className="border-border shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-black uppercase italic">Automated Morning Alerts</Label>
                    <p className="text-xs text-clay font-medium italic">Notify clients when the first route starts moving.</p>
                  </div>
                  <Switch 
                    checked={formData.nextClientNotificationEnabled}
                    onCheckedChange={(val) => setFormData({ ...formData, nextClientNotificationEnabled: val })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Arrival Message Template</Label>
                  <Textarea 
                    value={formData.messageTemplate}
                    onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                    className="min-h-[100px] bg-slate-50/50 border-border font-medium italic"
                    placeholder="Use [Client Name] variable..."
                  />
                  <p className="text-[9px] text-clay/60 italic font-bold">Variables supported: [Client Name]</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-clay italic tracking-widest">Payment Request Template</Label>
                  <Textarea 
                    value={formData.paymentLinkTemplate}
                    onChange={(e) => setFormData({ ...formData, paymentLinkTemplate: e.target.value })}
                    className="min-h-[100px] bg-slate-50/50 border-border font-medium italic"
                    placeholder="Use [Client Name] and [Link] variables..."
                  />
                  <p className="text-[9px] text-clay/60 italic font-bold">Variables supported: [Client Name], [Link]</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Financial Section */}
          <section id="finance" className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-charcoal uppercase italic tracking-widest">Financial Logic</h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h3 className="font-black uppercase italic text-sm">Stripe Status</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", formData.stripeConnected ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-xs font-black uppercase italic">{formData.stripeConnected ? "Connected" : "Disconnected"}</span>
                  </div>
                  <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest italic rounded-xl h-10 border-blue-200 text-blue-700 hover:bg-blue-50">
                    {formData.stripeConnected ? "Configure Account" : "Connect Stripe"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6 space-y-4">
                   <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-black uppercase italic text-sm">Revenue Safety</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-clay italic">Require Upfront Payment</Label>
                    <Switch 
                      checked={formData.upfrontPaymentRequired}
                      onCheckedChange={(val) => setFormData({ ...formData, upfrontPaymentRequired: val })}
                    />
                  </div>
                  <p className="text-[10px] text-clay/60 italic font-medium">Forces payment before booking confirmation.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Testimonials Section */}
          <section id="system" className="space-y-6">
             <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-charcoal uppercase italic tracking-widest">System Protocols</h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Card className="border-border shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-black uppercase italic">Accepting New Bookings</Label>
                    <p className="text-xs text-clay font-medium italic">Master switch for the public booking engine.</p>
                  </div>
                  <Switch 
                    checked={formData.acceptingNewBookings ?? true}
                    onCheckedChange={(val) => setFormData({ ...formData, acceptingNewBookings: val })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-black uppercase italic">Public Pricing Visibility</Label>
                    <p className="text-xs text-clay font-medium italic">Show or hide the /packages page from the public.</p>
                  </div>
                  <Switch 
                    checked={formData.publicPricingVisible ?? true}
                    onCheckedChange={(val) => setFormData({ ...formData, publicPricingVisible: val })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-black uppercase italic">Enhanced Audit Mode</Label>
                    <p className="text-xs text-clay font-medium italic">Enforce strict logging for all field modifications.</p>
                  </div>
                  <Switch 
                    checked={formData.enhancedAuditMode ?? true}
                    onCheckedChange={(val) => setFormData({ ...formData, enhancedAuditMode: val })}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Testimonials Section */}
          <section id="testimonials" className="space-y-6">
             <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-charcoal uppercase italic tracking-widest">Public Testimonials</h2>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-4">
              {formData.testimonials.map((t: any, index: number) => (
                <Card key={t.id} className="border-border shadow-sm group">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <Label className="text-[9px] font-black uppercase text-clay italic">Client Name</Label>
                           <Input 
                            value={t.name}
                            onChange={(e) => {
                              const newTestimonials = [...formData.testimonials];
                              newTestimonials[index].name = e.target.value;
                              setFormData({ ...formData, testimonials: newTestimonials });
                            }}
                            className="h-8 text-xs font-bold italic"
                           />
                        </div>
                        <div className="space-y-1">
                           <Label className="text-[9px] font-black uppercase text-clay italic">Suburb</Label>
                           <Input 
                            value={t.suburb}
                            onChange={(e) => {
                              const newTestimonials = [...formData.testimonials];
                              newTestimonials[index].suburb = e.target.value;
                              setFormData({ ...formData, testimonials: newTestimonials });
                            }}
                            className="h-8 text-xs font-bold italic"
                           />
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 ml-2"
                        onClick={() => {
                          const newTestimonials = formData.testimonials.filter((_: any, i: number) => i !== index);
                          setFormData({ ...formData, testimonials: newTestimonials });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-clay italic">Testimonial Body</Label>
                      <Textarea 
                        value={t.quote}
                        onChange={(e) => {
                          const newTestimonials = [...formData.testimonials];
                          newTestimonials[index].quote = e.target.value;
                          setFormData({ ...formData, testimonials: newTestimonials });
                        }}
                        className="min-h-[60px] text-xs italic font-medium"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button 
                variant="outline" 
                onClick={() => {
                  const newT = { id: Date.now().toString(), name: 'New Client', suburb: 'Mount Isa', quote: 'Great service!' };
                  setFormData({ ...formData, testimonials: [...formData.testimonials, newT] });
                }}
                className="w-full border-dashed border-border text-clay font-black text-[10px] uppercase tracking-widest italic py-8 border-2 hover:bg-surface"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Testimonial
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SystemSettings;
