import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useJobs, useClients, useSettings, useBookingSettings } from '@/hooks/useFirebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SUBURBS, ADD_ON_LABELS, CLIENT_TYPE_LABELS } from '@/constants';
import { format, addDays, getDay } from 'date-fns';
import { motion } from 'motion/react';
import { CheckCircle2, ChevronRight, MapPin, Calendar, Users, CreditCard, DollarSign, ArrowLeft, Zap, Sparkles, Building2, ClipboardList } from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import { AboriginalFlagBadge } from '@/components/AboriginalFlagBadge';
import { cn } from '@/lib/utils';
import { Mythos } from '@/lib/mythos';
import { ClientCalendar } from '@/components/Calendar/ClientCalendar';
import { useBlockouts } from '@/data/blockoutStore';
import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import { calculateServicePrice } from '@/services/pricingEngine';
import { calculateBookingPrice } from '@/utils/pricing';
import { notificationService } from '@/services/notificationService';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';

const bookingSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  phone: z.string().min(8, 'Valid phone number is required'),
  location: z.any().refine(val => val && val.verified === true, 'Please confirm your property location.'),
  suburb: z.string().optional(),
  date: z.string().min(1, 'Please select a date'),
  timeSlot: z.enum(['morning', 'afternoon']),
  runType: z.enum(['Morning Run', 'Afternoon Run', 'Flexible']),
  clientType: z.enum(['one_off', 'returning', 'premium', 'asset_management']),
  serviceType: z.string().min(1, 'Please select a service package'),
  serviceGrade: z.enum(['standard', 'medium', 'heavy', 'extreme']),
  agencyName: z.string().optional(),
  squareFootage: z.number().optional(),
  addOns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    selected: z.boolean(),
  })),
  conditionFactors: z.object({
    timeSinceLastMow: z.enum(['under-2-weeks', '2-4-weeks', '1-2-months', 'over-2-months']),
    grassHeight: z.enum(['short', 'medium', 'tall', 'very-tall']),
    thickness: z.enum(['light', 'medium', 'thick', 'very-thick']),
    obstacles: z.enum(['low', 'medium', 'high']),
    urgency: z.enum(['normal', 'priority', 'urgent']),
  }),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export const Booking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { jobs, addJob } = useJobs();
  const { addClient } = useClients();
  const { settings, loading: settingsLoading } = useSettings();
  const blocks = useBlockouts();
  const { bookingSettings } = useBookingSettings();

  // Intake gate: before bookingIntakeOpenDate, submit is blocked
  const todayStr = new Date().toISOString().slice(0, 10);
  const bookingsOpen = todayStr >= (bookingSettings?.bookingIntakeOpenDate ?? '2026-06-26');

  // Step 1 (client type selector) has been removed from the public flow.
  // All public bookings start at step 2 (customer details). clientType defaults
  // to 'one_off' unless the URL param provides an override (e.g. ?type=asset_management).
  const [step, setStep] = React.useState(2);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'card' | 'cash'>('card');
  const [createdJobId, setCreatedJobId] = React.useState<string | null>(null);

  const [publicJobs, setPublicJobs] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!user) {
      fetch('/api/public/job-counts')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPublicJobs(data);
          }
        })
        .catch(err => console.error('[Booking] Failed to fetch public job counts:', err));
    }
  }, [user]);

  const effectiveJobs = user ? jobs : publicJobs;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      name: profile?.displayName || '',
      email: profile?.email || '',
      phone: '', 
      timeSlot: 'morning',
      runType: 'Morning Run',
      clientType: (searchParams.get('type') as any) || 'one_off',
      serviceType: (searchParams.get('package') as any) || 'residential_standard',
      serviceGrade: 'standard',
      squareFootage: 0,
      addOns: Object.entries(settings?.pricing?.addOns || {}).map(([id, price]) => {
        const detail = settings?.pricing?.addOnDetails?.[id];
        if (detail && !detail.active) return null;
        return {
          id,
          name: detail?.name || ADD_ON_LABELS[id] || id,
          price: (settings?.pricing?.addOns as any)?.[id] || 0,
          selected: false
        };
      }).filter((a): a is any => a !== null),
      conditionFactors: {
        timeSinceLastMow: 'under-2-weeks',
        grassHeight: 'short',
        thickness: 'light',
        obstacles: 'low',
        urgency: 'normal',
      }
    }
  });

  const watchedValues = watch();

  const [manualAddress, setManualAddress] = React.useState('');
  const [accessNotes, setAccessNotes] = React.useState('');
  
  React.useEffect(() => {
    if (watchedValues.location?.address && !manualAddress) {
      setManualAddress(watchedValues.location.address);
    }
  }, [watchedValues.location?.address]); 

  const locationConfirmed = !!watchedValues.location?.verified;

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const calculateEstimate = () => {
    const rules = settings?.pricing || { base: {}, addOns: {} };
    return calculateServicePrice(
      rules,
      watchedValues.serviceType || 'residential_standard',
      watchedValues.clientType,
      watchedValues.serviceGrade,
      watchedValues.conditionFactors,
      watchedValues.addOns.filter(a => a.selected),
      'standard',
      watchedValues.squareFootage
    );
  };

  const onSubmit = async (data: BookingFormValues) => {
    const snapshot = calculateEstimate();

    // Zero-dollar protection: block if price is $0 and it's not a quote-required service
    if (!snapshot.isQuoteRequired && snapshot.total <= 0) {
      toast.error('Could not calculate a price for this service. Please contact us to book.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use Firebase uid if available (logged-in user), otherwise a guest booking ID.
      // Anonymous sign-in is intentionally NOT used here — it would persist a Firebase
      // session in localStorage that would cause the "auto-login as guest" issue.
      const currentUserId = user?.uid || profile?.uid || ('anonymous_guest_' + Date.now());

      const clientPayload = {
        name: data.name,
        customerName: data.name,
        clientName: data.name,
        address: data.location?.address || '',
        location: data.location || null,
        phone: data.phone,
        clientPhone: data.phone,
        email: data.email,
        clientEmail: data.email,
        suburb: data.suburb || '',
        clientType: data.clientType,
        agencyName: data.agencyName ?? null,
        notes: "Lead from website booking. Reference: " + currentUserId
      };
      
      console.log('[Booking] Upserting Client Identity Context...');
      if (addClient) {
        console.warn('[Booking] Public addClient skipped. Client details are stored on job record.');
      }

      console.log('[Booking] Public client write disabled safely. Client details will be stored on the job record.');

      const jobData: any = {
        clientId: currentUserId,
        customerName: data.name,
        clientName: data.name,
        name: data.name,
        clientPhone: data.phone,
        phone: data.phone,
        clientEmail: data.email,
        email: data.email,
        address: data.location?.address || '',
        location: data.location || null,
        suburb: data.suburb || '',
        status: "scheduled",
        scheduledDate: new Date(data.date).getTime(),
        preferredDate: data.date,
        timeSlot: data.timeSlot,
        runType: data.runType, 
        clientType: data.clientType,
        servicePackage: (data.serviceType || 'residential_standard') as any,
        serviceType: data.serviceType,
        service: data.serviceType,
        jobType: data.serviceType,
        serviceGrade: data.serviceGrade,
        yardSize: data.squareFootage ? `${data.squareFootage} sqft` : "Town block",
        conditionFactors: data.conditionFactors,
        addOns: data.addOns.filter(a => a.selected).map(a => ({ id: a.id, name: a.name, price: a.price, selected: true })),
        basePrice: snapshot.basePrice,
        gradeAdjustment: snapshot.gradeAdjustment,
        conditionSurcharge: snapshot.conditionSurcharge,
        addOnTotal: snapshot.addOnTotal,
        urgencySurcharge: snapshot.urgencySurcharge,
        price: snapshot.total,
        squareFootage: data.squareFootage,
        pricingSnapshot: {
          ...snapshot,
          squareFootage: data.squareFootage,
          addOns: snapshot.addOns.map(a => ({ id: a.id, name: a.name, price: a.price, selected: true }))
        },
        billingType: (snapshot.isQuoteRequired ? 'quote-required' : 'standard') as any,
        recurringSchedule: 'one-off' as any,
        description: `Website Booking: ${snapshot.packageName}`,
        notes: data.notes || '',
        paymentStatus: (snapshot.isQuoteRequired ? 'unpaid' : 'pending') as any,
        source: "website_booking",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      console.log('[Booking] Committing clean transactional record entry...');
      const jobId = await addJob(jobData);
      if (!jobId) throw new Error('Database pipeline refused transaction. Verify connection parameters.');

      setCreatedJobId(jobId);

      try {
        await notificationService.notifyRole(
          'admin', 
          'New Deployment Authorized', 
          `${data.name} in ${data.suburb}. Scope: ${snapshot.packageName}.`,
          `/jobs/${jobId}`,
          'success'
        );

        const stage = (snapshot.isQuoteRequired ? 'lead-captured' : 'booking-created');
        await notificationService.triggerNotification(stage as any, { ...jobData, id: jobId } as any);
      } catch (err) {
        console.warn("[Booking] Notification engine skipped safely:", err);
      }

      if (!snapshot.isQuoteRequired && (data.clientType === 'one_off')) {
         setStep(6);
      } else {
        navigate(`/booking-success?jobId=${jobId}`);
      }
    } catch (error: any) {
      console.error('Booking Process Error:', error);
      toast.error(error.message || 'The booking system encountered an operational hurdle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSelection = async () => {
    setIsSubmitting(true);
    try {
      const data = watchedValues;
      const snapshot = calculateEstimate();
      
      if (paymentMethod === 'card') {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: createdJobId,
            clientName: data.name,
            clientEmail: data.email,
            serviceType: data.serviceType,
            clientType: data.clientType,
            serviceGrade: data.serviceGrade,
            conditionFactors: data.conditionFactors,
            addOns: data.addOns.filter(a => a.selected).map(a => ({ id: a.id, name: a.name, price: a.price })),
            pricingSnapshot: {
              ...snapshot,
              addOns: data.addOns.filter(a => a.selected).map(a => ({ id: a.id, name: a.name, price: a.price }))
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Stripe Portal Error: ${errorData.error || 'Unknown error'}`);
        }

        const { url } = await response.json();
        if (url) {
          window.location.href = url;
          return;
        } else {
          throw new Error('Stripe failed to return a valid checkout URL.');
        }
      } else {
        const response = await fetch('/api/confirm-cash-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: createdJobId,
            clientName: data.name,
            clientEmail: data.email,
            pricingSnapshot: { ...snapshot }
          })
        });

        if (!response.ok) throw new Error('Failed to confirm cash payment.');
        navigate(`/booking-success?jobId=${createdJobId}`); 
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (formErrors: any) => {
    console.error('Form Validation Errors:', formErrors);
    const errorEntries = Object.entries(formErrors);
    if (errorEntries.length > 0) {
      const [field, error] = errorEntries[0];
      const message = (error as any).message || `Invalid ${field}`;
      toast.error(message);
    }
  };

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen bg-background pb-32 relative overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
      
      <div className="fixed -top-10 -left-10 w-64 h-64 pointer-events-none select-none opacity-[0.02]">
        <GrassRootsGuardian size={250} />
      </div>

      <div className="bg-charcoal text-white py-14 px-6 mb-12 relative overflow-hidden">
        <div className="max-w-xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white hover:bg-white/10 h-10 w-10 rounded-full border border-white/20 p-0 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <AppLogo className="h-10 w-auto" textClassName="text-white" />
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-black mb-2 tracking-tight italic uppercase">Book Your Mow</h1>
            <p className="text-primary font-black mb-2 uppercase tracking-[0.3em] text-[10px]">{settings?.serviceLocation || 'Mount Isa'} Local Service</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <AboriginalFlagBadge height={14} />
              <span className="text-[8px] font-black uppercase tracking-[0.25em] italic" style={{ color: 'var(--color-yellow-ochre)' }}>Aboriginal-led â€¢ Respect for Country</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 relative z-10 mt-12 grid grid-cols-3 gap-4 mb-4">
        <ImagePlaceholder src="/cultural/sun-rock-original.jpg" height={120} label="Community" className="[&_img]:object-left" />
        <ImagePlaceholder src="/cultural/sun-rock-original.jpg" height={120} label="Reliable" className="[&_img]:object-center" />
        <ImagePlaceholder src="/cultural/sun-rock-original.jpg" height={120} label="Local" className="[&_img]:object-right" />
      </div>

      <div className="max-w-xl mx-auto px-4 relative z-10">
        <form onSubmit={handleSubmit(onSubmit as any, onInvalid)}>
          {step === 2 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <MapPin size={16} className="text-primary" />
                  Your Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Full Name</Label>
                    <Input {...register('name')} className="h-10 text-xs font-bold rounded-xl" placeholder="John Doe" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Mobile</Label>
                    <Input {...register('phone')} className="h-10 text-xs font-bold rounded-xl" placeholder="0400..." />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Email</Label>
                  <Input {...register('email')} className="h-10 text-xs font-bold rounded-xl" placeholder="email@region.co" />
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Property address</Label>
                    <Input value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} className="h-10 text-xs font-bold rounded-xl" placeholder="e.g. 12 Simpson Street" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Suburb</Label>
                    <Input {...register('suburb')} className="h-10 text-xs font-bold rounded-xl" placeholder="e.g. Mount Isa" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Access notes (optional)</Label>
                    <Textarea value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} className="text-xs rounded-xl min-h-[60px]" placeholder="Gate codes, Best entry etc..." />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    const addr = manualAddress.trim();
                    const sub = (watchedValues.suburb || '').trim();
                    if (!watchedValues.name?.trim() || !watchedValues.phone?.trim()) {
                      toast.error('Please enter your name and mobile first.');
                      return;
                    }
                    if (!addr || !sub) { toast.error('Address and Suburb fields required.'); return; }
                    setValue('location', { latitude: 0, longitude: 0, address: addr, accuracy: 0, source: 'pin', verified: true }, { shouldValidate: true });
                    setValue('suburb', sub);
                    if (accessNotes.trim()) setValue('notes', accessNotes.trim());
                    nextStep();
                  }}
                  className="w-full bg-primary hover:bg-primary-hover text-white h-12 rounded-full font-black uppercase tracking-[0.2em] text-[10px]"
                >
                  Confirm Location <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <Calendar size={16} className="text-primary" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 pb-6">
                <ClientCalendar
                  suburb={watchedValues.suburb}
                  jobs={effectiveJobs}
                  settings={settings!}
                  selectedDate={watchedValues.date}
                  selectedSlot={watchedValues.timeSlot}
                  blocks={blocks}
                  bookingSettings={bookingSettings}
                  onSelect={(date, slot) => {
                    setValue('date', date);
                    setValue('timeSlot', slot);
                    // Keep runType in sync so jobs save under the correct run
                    setValue('runType', slot === 'morning' ? 'Morning Run' : 'Afternoon Run');
                  }}
                />
                <Button type="button" onClick={nextStep} disabled={!watchedValues.date} className="w-full bg-primary h-12 rounded-full font-black uppercase tracking-widest text-[10px] shadow-premium">
                  Select Service Profile <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <ClipboardList size={16} className="text-primary" />
                  Service
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(settings?.pricing?.base || {})
                    .filter(([id]) => id !== 'custom')
                    .map(([id]) => {
                      const detail = settings?.pricing?.packageDetails?.[id];
                      const priceResult = calculateBookingPrice(
                        id,
                        watchedValues.clientType || 'one_off',
                        settings?.pricing
                      );
                      const priceLabel = priceResult.pricingStatus === 'calculated'
                        ? `$${priceResult.estimatedTotal.toFixed(0)}`
                        : priceResult.pricingStatus === 'quote_required'
                          ? 'Quote required'
                          : `$${(settings?.pricing?.base as any)?.[id] ?? 0}`;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setValue('serviceType', id as any)}
                          className={cn("flex flex-col p-3 rounded-2xl border-2 text-left h-32 relative", watchedValues.serviceType === id ? "border-secondary bg-secondary/5" : "border-border bg-background")}
                        >
                          <span className="font-black text-[10px] uppercase tracking-tight italic">{detail?.name || id.replace('_', ' ')}</span>
                          <span className="text-[9px] text-clay font-bold mt-1 line-clamp-2">{detail?.description}</span>
                          <span className="mt-auto text-xs font-black text-primary">{priceLabel}</span>
                        </button>
                      );
                    })}
                </div>
                <Button type="button" onClick={nextStep} className="w-full bg-primary h-12 rounded-full font-black uppercase tracking-widest text-[10px] shadow-premium">
                  Review & Confirm <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <CheckCircle2 size={16} className="text-primary" />
                  Price Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 pb-6">
                {(() => {
                  const est = calculateEstimate();
                  return (
                    <div className="bg-background p-4 rounded-2xl border border-border space-y-3">
                      <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic border-b border-border/40 pb-2">
                        <span>Customer</span>
                        <span className="text-charcoal">{watchedValues.name}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic">
                        <span>Service</span>
                        <span className="text-charcoal">{est.packageName}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic">
                        <span>Date</span>
                        <span className="text-charcoal">{watchedValues.date ? new Date(watchedValues.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                      </div>
                      <div className="border-t border-border/40 pt-2">
                        {est.isQuoteRequired ? (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Custom Quote</span>
                            <span className="text-sm font-black text-clay italic">We'll be in touch</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-[9px] text-clay mb-1">
                              <span>Subtotal (excl. GST)</span>
                              <span>${est.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[9px] text-clay mb-2">
                              <span>GST (10%)</span>
                              <span>${est.gst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Total (inc. GST)</span>
                              <span className="text-xl font-black text-primary">${est.total.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
                {!bookingsOpen ? (
                  <div className="w-full rounded-2xl bg-ochre/10 border border-ochre/30 p-4 text-center">
                    <p className="text-[11px] font-black text-ochre uppercase tracking-[0.15em] italic">
                      Online bookings open Friday 26 June 2026.
                    </p>
                    <p className="text-[10px] text-clay/70 mt-1">
                      You can view the form now, but bookings cannot be submitted yet.
                    </p>
                  </div>
                ) : (
                  <Button type="submit" className="w-full bg-secondary hover:bg-secondary-hover text-white h-14 rounded-full font-black uppercase tracking-[0.2em] text-[11px] shadow-premium italic" isLoading={isSubmitting}>
                    Confirm Booking <Zap size={16} className="ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {step === 6 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-charcoal py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-white uppercase tracking-tight italic text-sm">
                  <CreditCard size={16} className="text-primary" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 px-4 pb-6 text-center">
                <div className="grid grid-cols-2 gap-3">
                   <button type="button" onClick={() => setPaymentMethod('cash')} className={cn("p-6 rounded-2xl border-2 flex flex-col items-center gap-2", paymentMethod === 'cash' ? "border-secondary bg-secondary/5" : "border-border")}>
                     <DollarSign size={24} />
                     <span className="text-[10px] font-black uppercase tracking-tight italic">CASH ON ARRIVAL</span>
                   </button>
                   <button type="button" onClick={() => setPaymentMethod('card')} className={cn("p-6 rounded-2xl border-2 flex flex-col items-center gap-2", paymentMethod === 'card' ? "border-secondary bg-secondary/5" : "border-border")}>
                     <CreditCard size={24} />
                     <span className="text-[10px] font-black uppercase tracking-tight italic">ONLINE CARD</span>
                   </button>
                </div>
                <Button onClick={handlePaymentSelection} isLoading={isSubmitting} className="w-full bg-secondary h-14 rounded-full font-black uppercase tracking-[0.2em] text-[11px] mt-6 italic">
                   CONFIRM PAYMENT
                </Button>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
};
