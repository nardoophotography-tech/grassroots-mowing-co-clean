import * as React from 'react';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { useSettings, useAdmin } from '../hooks/useFirebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { SUBURBS } from '@/constants';
import { SuburbSchedule, UserProfile, ImageConfig } from '@/types';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Save, Shield, Fingerprint, Key, UserCog, LayoutGrid, CreditCard, User, Mail, ImageIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { PasscodeModal } from '../components/PasscodeModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_IMAGES } from '../constants';
import { Dialog } from '@/components/ui/Dialog';

import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ScheduleManager = () => {
  const { settings, loading, updateSettings } = useSettings();
  const { profile, enablePasskey, setupPasscode, updateProfile } = useAuth();
  const { admins } = useAdmin();
  
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  
  const [businessName, setBusinessName] = React.useState('');
  const [serviceLocation, setServiceLocation] = React.useState('');
  const [servicePostcode, setServicePostcode] = React.useState('');
  const [schedules, setSchedules] = React.useState<SuburbSchedule[]>([]);
  const [notifyEnabled, setNotifyEnabled] = React.useState(true);
  const [template, setTemplate] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [paymentLinkTemplate, setPaymentLinkTemplate] = React.useState('');
  const [receiptTemplate, setReceiptTemplate] = React.useState('');
  const [upfrontPayment, setUpfrontPayment] = React.useState(false);
  const [imageConfig, setImageConfig] = React.useState<ImageConfig>(DEFAULT_IMAGES);
  
  const [showPasscodeSetup, setShowPasscodeSetup] = React.useState(false);
  const [isEnablingPasskey, setIsEnablingPasskey] = React.useState(false);
  const [showSuburbs, setShowSuburbs] = React.useState(false);

  React.useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName || '');
      setServiceLocation(settings.serviceLocation || '');
      setServicePostcode(settings.servicePostcode || '');
      setSchedules(settings.suburbSchedules || []);
      setNotifyEnabled(settings.nextClientNotificationEnabled);
      setTemplate(settings.messageTemplate);
      setPaymentLinkTemplate(settings.paymentLinkTemplate || '');
      setReceiptTemplate(settings.receiptTemplate || '');
      setUpfrontPayment(settings.upfrontPaymentRequired || false);
      if (settings.images) {
        setImageConfig(settings.images);
      }
    }
  }, [settings]);

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setEmail(profile.email || '');
      setPhoneNumber(profile.phoneNumber || '');
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      await updateProfile({ displayName, phoneNumber });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, profile.email);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error('Failed to send reset email');
    } finally {
      setIsSendingReset(false);
    }
  };

  const addSchedule = () => {
    const newSchedule: SuburbSchedule = {
      suburb: SUBURBS[0],
      availableDays: [1, 2, 3, 4, 5], // Mon-Fri
      morningCapacity: 3,
      afternoonCapacity: 3,
      blockedDates: []
    };
    setSchedules([...schedules, newSchedule]);
  };

  const populateAllSuburbs = () => {
    const existingSuburbs = new Set(schedules.map(s => s.suburb));
    const missingSuburbs = SUBURBS.filter(s => !existingSuburbs.has(s));
    
    if (missingSuburbs.length === 0) {
      toast.success('All suburbs are already in the list');
      return;
    }

    const newSchedules = [
      ...schedules,
      ...missingSuburbs.map(suburb => ({
        suburb,
        availableDays: [1, 2, 3, 4, 5],
        morningCapacity: 3,
        afternoonCapacity: 3,
        blockedDates: []
      }))
    ];
    setSchedules(newSchedules);
    toast.success(`Added ${missingSuburbs.length} suburbs`);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, updates: Partial<SuburbSchedule>) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], ...updates };
    setSchedules(newSchedules);
  };

  const toggleDay = (index: number, day: number) => {
    const currentDays = schedules[index].availableDays;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    updateSchedule(index, { availableDays: newDays });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ 
        businessName,
        serviceLocation,
        servicePostcode,
        suburbSchedules: schedules,
        nextClientNotificationEnabled: notifyEnabled,
        messageTemplate: template,
        paymentLinkTemplate,
        receiptTemplate,
        upfrontPaymentRequired: upfrontPayment,
        images: imageConfig
      });
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnablePasskey = async () => {
    setIsEnablingPasskey(true);
    try {
      await enablePasskey();
      toast.success('Passkey/Biometrics enabled for this device!');
    } catch (error) {
      toast.error('Failed to enable passkey');
    } finally {
      setIsEnablingPasskey(false);
    }
  };

  const handlePasscodeReset = async (passcode: string) => {
    try {
      await setupPasscode(passcode);
      toast.success('Passcode updated successfully!');
      setShowPasscodeSetup(false);
    } catch (error) {
      toast.error('Failed to update passcode');
    }
  };

  const handleRoleChange = async (uid: string, newRole: any) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success('User role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern opacity-5 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-20 -right-20 w-96 h-96 pointer-events-none select-none opacity-[0.03]">
        <GrassRootsGuardian size={400} />
      </div>
      <div className="fixed -bottom-20 -left-20 w-80 h-80 pointer-events-none select-none rotate-45 opacity-[0.03]">
        <GrassRootsGuardian size={350} />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <h1 className="text-3xl font-bold text-deep-red font-serif tracking-tight">System Config</h1>
        <Button onClick={handleSave} isLoading={isSaving} className="bg-deep-red hover:bg-deep-red/90 text-white rounded-xl font-bold shadow-lg">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="space-y-4 relative z-10">
        <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-deep-red flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Business Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre pl-1">Business Display Name</Label>
                <Input 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. GrassRoots Mowing Co."
                  className="h-12 rounded-xl border-ochre/20"
                />
                <p className="text-[9px] text-charcoal/40 pl-1 italic">Used across the app and landing page.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre pl-1">Primary Service Location (City/Town)</Label>
                <Input 
                  value={serviceLocation}
                  onChange={(e) => setServiceLocation(e.target.value)}
                  placeholder="e.g. Mount Isa"
                  className="h-12 rounded-xl border-ochre/20"
                />
                <p className="text-[9px] text-charcoal/40 pl-1 italic">The primary city/town for your services.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre pl-1">Primary Postcode</Label>
                <Input 
                  value={servicePostcode}
                  onChange={(e) => setServicePostcode(e.target.value)}
                  placeholder="e.g. 4825"
                  className="h-12 rounded-xl border-ochre/20"
                />
                <p className="text-[9px] text-charcoal/40 pl-1 italic">The postal code for the primary service area.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-deep-red flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Suburb Scheduling
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 text-ochre bg-ochre/5 border-ochre/10">
              {schedules.length} Suburbs Active
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <p className="text-xs text-charcoal/60 italic leading-relaxed">
                Configure your service areas, available days, and daily job capacity. These settings directly impact dynamic pricing and booking availability for clients.
              </p>
              <Button 
                onClick={() => setShowSuburbs(true)}
                className="w-full bg-ochre hover:bg-ochre/90 text-white font-bold h-14 rounded-xl shadow-md flex items-center justify-center gap-3 text-lg"
              >
                <LayoutGrid className="h-5 w-5" />
                Manage Suburbs & Capacity List
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog 
          open={showSuburbs} 
          onOpenChange={setShowSuburbs}
          title="Suburb Scheduling & Capacity"
          description="Manage service area availability and daily job limits."
        >
          <div className="flex flex-col h-full max-h-[85vh]">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
              {schedules.map((schedule, index) => (
                <Card key={index} className="border-ochre/10 shadow-sm rounded-xl overflow-hidden bg-white border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-ochre/5 border-b border-ochre/5 px-4 py-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Input 
                        value={schedule.suburb} 
                        onChange={(e) => updateSchedule(index, { suburb: e.target.value })}
                        placeholder="Suburb Name"
                        className="max-w-[150px] border-ochre/20 focus:ring-deep-red font-bold h-8 text-sm"
                      />
                      <div className="flex-1 flex gap-0.5 overflow-x-auto pb-1 no-scrollbar">
                        {DAYS.map((day, dIndex) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(index, dIndex)}
                            className={`px-1.5 py-1 text-[9px] rounded-md border transition-all font-bold uppercase tracking-tighter shrink-0 ${
                              schedule.availableDays.includes(dIndex)
                                ? 'bg-deep-red border-deep-red text-white shadow-xs'
                                : 'bg-white border-ochre/20 text-ochre hover:bg-ochre/5'
                            }`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSchedule(index)} className="text-deep-red hover:bg-deep-red/5 h-8 w-8 ml-2">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-ochre/70 tracking-widest">Morning Cap</Label>
                        <Input 
                          type="number" 
                          value={schedule.morningCapacity} 
                          onChange={(e) => updateSchedule(index, { morningCapacity: parseInt(e.target.value) || 0 })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-ochre/70 tracking-widest">Afternoon Cap</Label>
                        <Input 
                          type="number" 
                          value={schedule.afternoonCapacity} 
                          onChange={(e) => updateSchedule(index, { afternoonCapacity: parseInt(e.target.value) || 0 })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {schedules.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-ochre/10 rounded-xl bg-ochre/5">
                  <MapPin className="h-10 w-10 text-ochre/20 mx-auto mb-2" />
                  <p className="text-xs text-ochre font-bold uppercase tracking-widest">No Suburbs Configured</p>
                  <p className="text-[10px] text-ochre/60 mt-1">Populate the list or add a custom suburb below.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-ochre/10 mt-2 space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-dashed h-10 text-xs font-bold" onClick={addSchedule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom
                </Button>
                <Button variant="outline" className="flex-1 border-ochre/20 text-ochre hover:bg-ochre/5 h-10 text-xs font-bold" onClick={populateAllSuburbs}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Populate All
                </Button>
              </div>
              <Button onClick={() => setShowSuburbs(false)} className="w-full bg-deep-red text-white h-10 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Close Management
              </Button>
            </div>
          </div>
        </Dialog>
      </div>

      <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden relative z-10 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-deep-red flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Integration
          </CardTitle>
          <Badge variant="outline" className={cn(
            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5",
            settings?.stripeConnected ? "text-green-600 bg-green-50 border-green-200" : "text-ochre bg-ochre/5 border-ochre/10"
          )}>
            {settings?.stripeConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-ochre/10 bg-white">
            <div className="space-y-1">
              <p className="font-bold text-charcoal">Connect Stripe</p>
              <p className="text-xs text-charcoal/60">Allow clients to pay invoices online via your Stripe account.</p>
            </div>
            <Button 
              variant={settings?.stripeConnected ? "outline" : "primary"}
              className={cn(
                "rounded-xl font-bold px-6",
                settings?.stripeConnected ? "border-ochre/20 text-ochre" : "bg-deep-red hover:bg-deep-red/90 text-white"
              )}
              onClick={async () => {
                try {
                  await updateSettings({ stripeConnected: !settings?.stripeConnected });
                  toast.success(settings?.stripeConnected ? 'Stripe disconnected' : 'Stripe connected');
                } catch (err) {
                  toast.error('Failed to update Stripe status');
                }
              }}
            >
              {settings?.stripeConnected ? 'Disconnect' : 'Connect Stripe'}
            </Button>
          </div>

          {settings?.stripeConnected && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre pl-1">Stripe Account ID (Standard/Express)</Label>
              <Input 
                value={settings?.stripeAccountId || ''}
                onChange={async (e) => {
                  try {
                    await updateSettings({ stripeAccountId: e.target.value });
                  } catch (err) {}
                }}
                placeholder="acct_..."
                className="h-12 rounded-xl border-ochre/20 font-mono"
              />
              <p className="text-[10px] text-charcoal/40 pl-1 italic">The account ID where payments will be settled.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden relative z-10 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-ochre/5 border-b border-ochre/10">
          <CardTitle className="font-serif text-deep-red flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Asset Configuration (Images)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <p className="text-xs text-charcoal/60 bg-ochre/5 p-3 rounded-lg border border-ochre/10 leading-relaxed">
            Configure the visual identity of your service packages. All images must be hosted via <span className="font-bold">HTTPS</span>. 
            Use high-quality photos from services like Pexels or Unsplash for a premium look.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'town_block' as keyof ImageConfig, label: 'Town Block Service' },
              { key: 'residential_standard' as keyof ImageConfig, label: 'Residential Standard' },
              { key: 'premium_estate' as keyof ImageConfig, label: 'Premium Estate' },
              { key: 'acreage' as keyof ImageConfig, label: 'Large Lot / Acreage' },
              { key: 'placeholder' as keyof ImageConfig, label: 'Global Placeholder Image' }
            ].map((img) => (
              <div key={img.key} className="space-y-3 p-4 rounded-2xl bg-white border border-ochre/10 shadow-sm">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black text-ochre uppercase tracking-widest">{img.label}</Label>
                </div>
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-ochre/5 border border-ochre/10 mb-2 group relative">
                  <img 
                    src={imageConfig[img.key] || DEFAULT_IMAGES.placeholder} 
                    alt={img.label}
                    className="w-full h-full object-cover transition-all duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_IMAGES.placeholder;
                    }}
                  />
                  <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-[8px] font-bold text-white uppercase tracking-widest bg-deep-red/80 px-2 py-1 rounded">Live Preview</p>
                  </div>
                </div>
                <Input 
                  value={imageConfig[img.key]} 
                  onChange={(e) => setImageConfig({ ...imageConfig, [img.key]: e.target.value })}
                  placeholder="https://images.pexels.com/..."
                  className="h-10 text-xs font-mono border-ochre/20"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden relative z-10 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-ochre/5 border-b border-ochre/10">
          <CardTitle className="font-serif text-deep-red">Payment & Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-3 pb-4 border-b border-ochre/10">
            <input 
              type="checkbox" 
              id="notify"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-ochre/30 text-deep-red focus:ring-deep-red"
            />
            <Label htmlFor="notify" className="font-bold text-charcoal uppercase text-[10px] tracking-widest">Enable automatic next-client notification</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold">Next Client SMS Template</Label>
              <Textarea 
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Hi [Client Name], I’ve just finished the previous job and will be with you soon."
                className="h-24"
              />
              <p className="text-[10px] text-gray-500">Placeholders: [Client Name]</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">Payment Link SMS Template</Label>
              <Textarea 
                value={paymentLinkTemplate}
                onChange={(e) => setPaymentLinkTemplate(e.target.value)}
                placeholder="Hi [Client Name], your lawn service is complete. You can pay here: [Link]"
                className="h-24"
              />
              <p className="text-[10px] text-gray-500">Placeholders: [Client Name], [Link], [Amount]</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">Receipt Email Template</Label>
            <Textarea 
              value={receiptTemplate}
              onChange={(e) => setReceiptTemplate(e.target.value)}
              placeholder="Thank you for your payment of [Amount]. Your receipt number is [Invoice Number]."
              className="h-24"
            />
            <p className="text-[10px] text-gray-500">Placeholders: [Client Name], [Amount], [Invoice Number]</p>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
            <input 
              type="checkbox" 
              id="upfront"
              checked={upfrontPayment}
              onChange={(e) => setUpfrontPayment(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <Label htmlFor="upfront" className="font-medium">Require upfront payment for new casual clients</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden relative z-10 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-ochre/5 border-b border-ochre/10">
          <CardTitle className="font-serif text-deep-red flex items-center gap-2">
            <User className="h-5 w-5" />
            Admin Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre pl-1">Primary Display Name</Label>
              <Input 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Business or Admin Name"
                className="h-12 rounded-xl border-ochre/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre pl-1">Mobile Hotline</Label>
              <Input 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0400 000 000"
                className="h-12 rounded-xl border-ochre/20"
              />
            </div>
            <div className="space-y-2 opacity-60">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre pl-1">Registered Email (Login)</Label>
              <Input 
                value={email}
                disabled
                className="h-12 rounded-xl border-ochre/20 bg-gray-50 font-mono"
              />
              <p className="text-[8px] italic text-charcoal/40 pl-1">Contact system admin to change primary email.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl font-bold h-12 shadow-md transition-all flex items-center justify-center gap-2"
              onClick={handleUpdateProfile}
              isLoading={isUpdatingProfile}
            >
              <Save className="h-4 w-4" />
              Update Identity
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-ochre/20 text-ochre hover:bg-ochre/5 rounded-xl font-bold h-12 shadow-sm flex items-center justify-center gap-2"
              onClick={handleResetPassword}
              isLoading={isSendingReset}
            >
              <Mail className="h-4 w-4" />
              Reset Login Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Security & Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Key className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Passcode Access</p>
                  <p className="text-xs text-gray-500">Fast login for field use</p>
                </div>
              </div>
              <Button variant="outline" className="w-full bg-white" onClick={() => setShowPasscodeSetup(true)}>
                Change Passcode
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Fingerprint className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Passkey / Biometrics</p>
                  <p className="text-xs text-gray-500">Face ID or Touch ID</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full bg-white" 
                onClick={handleEnablePasskey}
                isLoading={isEnablingPasskey}
              >
                {profile?.passkeyEnabled ? 'Passkey Enabled' : 'Enable Passkey'}
              </Button>
            </div>
          </div>

          {profile?.role === 'admin' && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-gray-400" />
                <h3 className="font-bold text-gray-900">Admin User Management</h3>
              </div>
              <div className="space-y-2">
                {admins.map(admin => (
                  <div key={admin.uid} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{admin.displayName}</p>
                      <p className="text-xs text-gray-500">{admin.email}</p>
                    </div>
                    <Select 
                      value={admin.role} 
                      onChange={(e) => handleRoleChange(admin.uid, e.target.value)}
                      className="w-32 h-8 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="employee">Employee</option>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PasscodeModal
        isOpen={showPasscodeSetup}
        onClose={() => setShowPasscodeSetup(false)}
        onSuccess={handlePasscodeReset}
        title="Update Passcode"
        description="Enter a new 4-6 digit PIN for your account."
      />
    </div>
  );
};
