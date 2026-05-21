import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useJobs, useClients, useSettings } from '@/hooks/useFirebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SUBURBS, PRICING_RULES, ADD_ON_LABELS, CLIENT_TYPE_LABELS } from '@/constants';
import { format, addDays, isSameDay, getDay } from 'date-fns';
import { motion } from 'motion/react';
import { CheckCircle2, ChevronRight, ChevronLeft, MapPin, Calendar, Clock, ClipboardList, Info, Home, Users, CreditCard, DollarSign, ArrowLeft, Zap, Sparkles, Building2 } from 'lucide-react';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { cn } from '@/lib/utils';
import { Mythos } from '@/lib/mythos';
import { ClientCalendar } from '@/components/Calendar/ClientCalendar';
import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import { calculateServicePrice } from '@/services/pricingEngine';
import { notificationService } from '@/services/notificationService';

import { SatelliteMeasurement } from '@/components/SatelliteMeasurement';
import { LocationPicker } from '@/components/LocationPicker';
import { LocationData } from '@/types';

const bookingSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(8, 'Valid phone number is required'),
  location: z.any().refine(val => val && val.verified === true, 'Please confirm your property location on the map above.'),
  suburb: z.string().optional(),
  date: z.string().min(1, 'Please select a date'),
  timeSlot: z.enum(['morning', 'afternoon']),
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
  const { user, profile, signInAnonymously } = useAuth();
  const { jobs, addJob } = useJobs();
  const { addClient } = useClients();
  const { settings, loading: settingsLoading } = useSettings();

  const [step, setStep] = React.useState((searchParams.get('type') === 'one_off' || searchParams.get('type') === 'asset_management') ? 2 : 1);
  const [fastTrackMode] = React.useState(searchParams.get('type') === 'one_off');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [confirmedPaymentId, setConfirmedPaymentId] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'card' | 'cash'>('card');
  const [createdJobId, setCreatedJobId] = React.useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      name: profile?.displayName || '',
      email: profile?.email || '',
      phone: '',
      timeSlot: 'morning',
      clientType: (searchParams.get('type') as any) || (profile ? (profile.clientType || 'returning') : 'one_off'),
      serviceType: (searchParams.get('package') as any) || 'residential_standard',
      serviceGrade: 'standard',
      squareFootage: 0,
      addOns: Object.entries(settings?.pricing?.addOns || PRICING_RULES.addOns).map(([id, price]) => {
        const detail = settings?.pricing?.addOnDetails?.[id];
        if (detail && !detail.active) return null;
        return {
          id,
          name: detail?.name || ADD_ON_LABELS[id] || id,
          price: (settings?.pricing?.addOns as any)?.[id] || (PRICING_RULES.addOns as any)[id] || 0,
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

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const getAvailableDates = () => {
    if (!settings || !watchedValues.suburb) return [];
    
    const schedule = settings.suburbSchedules.find(s => s.suburb === watchedValues.suburb);
    const availableDays = schedule?.availableDays || [1, 2, 3, 4, 5];

    const dates = [];
    for (let i = 1; i <= 30; i++) {
      const date = addDays(new Date(), i);
      const dayOfWeek = getDay(date);
      if (availableDays.includes(dayOfWeek)) {
        dates.push(date);
      }
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  const checkSlotAvailability = (dateStr: string, slot: 'morning' | 'afternoon') => {
    if (!settings || !watchedValues.suburb || !dateStr) return false;
    
    const schedule = settings.suburbSchedules.find(s => s.suburb === watchedValues.suburb);
    const capacity = slot === 'morning' 
      ? (schedule?.morningCapacity ?? 2) 
      : (schedule?.afternoonCapacity ?? 2);

    const date = new Date(dateStr).getTime();
    const existingJobs = jobs.filter(j => j.scheduledDate === date && j.timeSlot === slot && j.suburb === watchedValues.suburb);
    
    return existingJobs.length < capacity;
  };

  const calculateEstimate = () => {
    const rules = settings?.pricing || PRICING_RULES;
    
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
    const rules = settings?.pricing || PRICING_RULES;
    const snapshot = calculateEstimate();
    
    setIsSubmitting(true);
    try {
      let currentUserId = user?.uid || profile?.uid || '';
      
      if (!currentUserId) {
        console.log('[Booking] No user found, initiating anonymous sign-in...');
        await signInAnonymously();
        const { auth } = await import('@/firebase');
        currentUserId = auth.currentUser?.uid || '';
        if (!currentUserId) throw new Error('Identity verification failed. Please try again.');
      }

      const clientPayload = {
        name: data.name,
        address: data.location?.address || '',
        location: data.location || null,
        phone: data.phone,
        email: data.email,
        suburb: data.suburb || '',
        clientType: data.clientType,
agencyName: data.agencyName || null,        notes: `Lead from website booking. UID: ${currentUserId}`,
      };
      
      console.log('[Booking] Upserting client for ID:', currentUserId);
      await addClient(clientPayload, currentUserId);
      const clientId = currentUserId;

      const jobData: any = {
        clientId: clientId,
        clientName: data.name,
        clientPhone: data.phone,
        clientEmail: data.email,
        address: data.location?.address || '',
        location: data.location || null,
        suburb: data.suburb || '',
        status: (snapshot.isQuoteRequired ? 'quoted' : 'scheduled') as any,
        scheduledDate: new Date(data.date).getTime(),
        timeSlot: data.timeSlot,
        clientType: data.clientType,
        servicePackage: (data.serviceType || 'residential_standard') as any,
        serviceGrade: data.serviceGrade,
        conditionFactors: {
          timeSinceLastMow: data.conditionFactors.timeSinceLastMow,
          grassHeight: data.conditionFactors.grassHeight,
          thickness: data.conditionFactors.thickness,
          obstacles: data.conditionFactors.obstacles,
          urgency: data.conditionFactors.urgency
        },
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
        paymentStatus: (snapshot.isQuoteRequired ? 'unpaid' : 'pending') as any
      };

      console.log('[Booking] Creating job:', jobData);
      const jobId = await addJob(jobData);
      if (!jobId) throw new Error('Could not save booking details to database.');

      setCreatedJobId(jobId);

      await notificationService.notifyRole(
        'admin', 
        'New Deployment Authorized', 
        `${data.name} in ${data.suburb}. Scope: ${snapshot.packageName}.`,
        `/jobs/${jobId}`,
        'success'
      );

      const stage = (snapshot.isQuoteRequired ? 'lead-captured' : 'booking-created');
      console.log(`[Booking] Triggering notification flow: stage=${stage}, jobId=${jobId}`);
      
      await notificationService.triggerNotification(stage as any, {
        ...jobData,
        id: jobId
      } as any);

      if (!snapshot.isQuoteRequired && (data.clientType === 'one_off')) {
         setStep(7);
      } else if (!snapshot.isQuoteRequired && data.clientType === 'returning') {
        setStep(6);
      } else {
        setStep(7);
      }
    } catch (error: any) {
      console.error('Booking Process Error:', error);
      toast.error(error.message || 'The booking system encountered a critical error. Please contact us.');
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
            pricingSnapshot: {
              ...snapshot
            }
          })
        });

        if (!response.ok) throw new Error('Failed to confirm cash payment.');
        setStep(7);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizeBooking = async (data: BookingFormValues, currentSnapshot: any, paymentId?: string) => {
    setIsSubmitting(true);
    
    try {
      let currentUserId = user?.uid || profile?.uid || '';
      
      if (!currentUserId) {
        await signInAnonymously();
        const { auth } = await import('@/firebase');
        currentUserId = auth.currentUser?.uid || '';
      }

      if (!currentUserId) throw new Error('Identity verification failed.');

      await addClient({
        name: data.name,
        address: data.location?.address || '',
        location: data.location || null,
        phone: data.phone,
        email: data.email,
        suburb: data.suburb || '',
        clientType: data.clientType,
        agencyName: data.agencyName,
        notes: `Booked via website as ${data.clientType}. UID: ${currentUserId}`,
      }, currentUserId);

      const clientId = currentUserId;

      const jobData = {
        clientId: clientId,
        clientName: data.name,
        clientPhone: data.phone,
        clientEmail: data.email,
        address: data.location?.address || '',
        location: data.location || null,
        suburb: data.suburb || '',
        status: currentSnapshot.isQuoteRequired ? 'quoted' : 'scheduled',
        scheduledDate: new Date(data.date).getTime(),
        timeSlot: data.timeSlot,
        clientType: data.clientType,
        servicePackage: (data.serviceType || 'residential_standard') as any,
        serviceGrade: data.serviceGrade,
        conditionFactors: data.conditionFactors,
        addOns: data.addOns.filter(a => a.selected).map(a => ({ id: a.id, name: a.name, price: a.price, selected: true })),
        basePrice: currentSnapshot.basePrice,
        gradeAdjustment: currentSnapshot.gradeAdjustment,
        conditionSurcharge: currentSnapshot.conditionSurcharge,
        addOnTotal: currentSnapshot.addOnTotal,
        urgencySurcharge: currentSnapshot.urgencySurcharge,
        price: currentSnapshot.total,
        pricingSnapshot: {
          ...currentSnapshot,
          subtotal: currentSnapshot.subtotal,
          gst: currentSnapshot.gst,
          squareFootage: currentSnapshot.squareFootage || null,
          addOns: currentSnapshot.addOns.map((a: any) => ({ id: a.id, name: a.name, price: a.price, selected: true }))
        },
        billingType: currentSnapshot.isQuoteRequired ? ('quote-required' as any) : ('standard' as any),
        recurringSchedule: 'one-off' as any,
        description: `Online Booking: ${currentSnapshot.packageName}`,
        notes: data.notes || '',
        paymentId: paymentId || null,
        paymentStatus: paymentId ? 'paid' : 'unpaid'
      };

      const jobId = await addJob(jobData as any);

      if (!jobId) throw new Error('Failed to create job');

      await notificationService.notifyRole(
        'admin', 
        'New Deployment Authorized', 
        `${data.name} in ${data.suburb}. Scope: ${currentSnapshot.packageName}.`,
        `/jobs/${jobId}`,
        'success'
      );

      const stage = paymentId ? 'payment-successful' : (currentSnapshot.isQuoteRequired ? 'lead-captured' : 'booking-created');
      console.log(`[Booking] Triggering notification flow: stage=${stage}, jobId=${jobId}`);
      
      await notificationService.triggerNotification(stage as any, {
        ...jobData,
        id: jobId
      } as any);

      setStep(7);
    } catch (err: any) {
      console.error("Finalization Error:", err);
      toast.error(err.message || 'Payment confirmed but failed to save booking. Please contact support.');
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
      Mythos.error("BOOKING_VALIDATION_FAILED", { field, message });
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  if (step === 7) {
    const estimate = calculateEstimate();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
        <Card className="max-w-md w-full text-center p-6 sm:p-8 border-border shadow-premium rounded-[32px] relative z-10 bg-surface/95 backdrop-blur-md">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-inner">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-charcoal mb-2 tracking-tight uppercase italic underline decoration-primary/30 decoration-4 underline-offset-4">
            {estimate.isQuoteRequired ? 'Quote Sent!' : 'Success!'}
          </h2>
          <p className="text-[10px] text-clay mb-6 font-bold uppercase tracking-widest">
            {estimate.isQuoteRequired 
              ? `We've generated an instant quote for your review.`
              : `Your booking is confirmed. Your digital invoice is ready below.`}
          </p>
          
          <div className="bg-background p-6 rounded-3xl border-2 border-primary/20 mb-6 text-left relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <img
                 src="/logo-header.webp"
                 alt="GrassRoots Mowing Co"
                 className="h-12 w-auto object-contain"
               />
             </div>
             
             <div className="flex justify-between items-center mb-6">
                <div>
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Invoice/Quote</p>
                   <p className="text-[8px] font-bold text-clay uppercase tracking-widest">Job ID: {createdJobId?.slice(-6).toUpperCase()}</p>
                </div>
                <Badge className="bg-primary text-white border-none text-[8px] h-5 font-black uppercase tracking-widest italic pt-0.5">Authorized</Badge>
             </div>

             <div className="space-y-3 mb-6">
                <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic border-b border-border/40 pb-2">
                  <span>Client Profile</span>
                  <span className="text-charcoal">{watchedValues.name}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic border-b border-border/40 pb-2">
                  <span>Service Node</span>
                  <span className="text-charcoal uppercase">{watchedValues.serviceType.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic border-b border-border/40 pb-2">
                  <span>Execution Date</span>
                  <span className="text-charcoal">{format(new Date(watchedValues.date), 'MMM dd, yyyy')}</span>
                </div>
             </div>

             <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[8px] font-black text-clay uppercase tracking-[0.2em] mb-1">Fiscal Total</p>
                  <p className="text-3xl font-black text-primary tracking-tighter italic leading-none">${estimate.total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-bold text-clay uppercase italic">Tax Incl.</p>
                   <p className="text-[8px] font-bold text-primary uppercase italic italic underline underline-offset-2">Payment on Arrival</p>
                </div>
             </div>

            <Button 
               className="w-full bg-slate-900 hover:bg-black text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-[0.2em] shadow-lg"
               onClick={() => navigate(`/jobs/${createdJobId}`)}
            >
              Open Full Digital Audit
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('/')} variant="outline" className="h-12 text-[10px] font-black uppercase tracking-widest rounded-xl border-border">
              Landing Page
            </Button>
            <Button onClick={() => navigate('/login')} className="bg-secondary hover:bg-secondary-hover text-white h-12 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-premium">
              Customer Portal
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 relative overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
      
      <div className="fixed -top-10 -left-10 w-64 h-64 pointer-events-none select-none opacity-[0.02]">
        <GrassRootsGuardian size={250} />
      </div>
      <div className="fixed bottom-20 -right-10 w-80 h-80 pointer-events-none select-none -rotate-12 opacity-[0.02]">
        <GrassRootsGuardian size={320} />
      </div>

      <div className="bg-charcoal text-white py-14 px-6 mb-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 mix-blend-overlay">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,var(--color-ochre),transparent_50%),radial-gradient(circle_at_80%_70%,var(--color-primary),transparent_50%)]" />
        </div>
        
        <div className="max-w-xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate('/');
                  }
                }}
                className="text-white hover:bg-white/10 h-10 w-10 rounded-full border border-white/20 p-0 flex items-center justify-center"
                title="Go Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-white hover:bg-white/10 h-10 rounded-full border border-white/20 px-4 font-black uppercase tracking-widest text-[10px]"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
            <img
              src="/logo-header.webp"
              alt="GrassRoots Mowing Co"
              className="h-12 w-auto object-contain rounded-xl bg-white/90 p-1 shadow-sm"
            />
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-black mb-2 tracking-tight italic uppercase">Book Your Mow</h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">{settings?.serviceLocation || 'Mount Isa'} Local Service</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 relative z-10 mt-12 grid grid-cols-3 gap-4 mb-4">
        <ImagePlaceholder id={12} seed="booking-extra-1" height={120} label="Precision" />
        <ImagePlaceholder id={13} seed="booking-extra-2" height={120} label="Reliable" />
        <ImagePlaceholder id={14} seed="booking-extra-3" height={120} label="Local" />
      </div>

      <div className="max-w-xl mx-auto px-4 relative z-10">
        <div className="flex justify-between mb-12 sm:mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 z-0" />
          <motion.div 
            className="absolute top-1/2 left-0 h-1 bg-secondary -translate-y-1/2 z-1" 
            initial={{ width: '0%' }}
            animate={{ width: `${((step - 1) / 5) * 100}%` }}
          />
          {[
            { id: 1, label: 'Client' },
            { id: 2, label: 'Space' },
            { id: 3, label: 'Time' },
            { id: 4, label: 'Type' },
            { id: 5, label: 'Check' },
            { id: 6, label: 'Pay' }
          ].map(s => (
            <div 
              key={s.id} 
              className={cn("flex flex-col items-center z-10", s.id === 6 && calculateEstimate().total === 0 && "hidden")}
            >
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-500 border-2",
                step === s.id 
                  ? "bg-secondary border-secondary text-white shadow-premium scale-110 sm:scale-125 -translate-y-1" 
                  : step > s.id
                    ? "bg-primary border-primary text-white"
                    : "bg-surface border-border text-clay/40"
              )}>
                {s.id}
              </div>
              <span className={cn(
                "hidden xs:block text-[9px] sm:text-[10px] mt-3 font-black uppercase tracking-[0.2em] transition-colors duration-300",
                step === s.id ? "text-secondary" : step > s.id ? "text-primary" : "text-clay/30"
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit as any, onInvalid)}>
          {step === 1 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <Users size={16} className="text-primary" />
                  Gateway Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'one_off', label: 'One-Off', icon: Zap },
                    { id: 'returning', label: 'Regular', icon: Users },
                    { id: 'premium', label: 'Premium', icon: Sparkles },
                    { id: 'asset_management', label: 'Asset Mgmt', icon: Building2 }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setValue('clientType', type.id as any);
                        nextStep();
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border-2 text-center transition-all h-24",
                        watchedValues.clientType === type.id 
                          ? "border-secondary bg-secondary/5 shadow-premium" 
                          : "border-border bg-background hover:border-primary/20"
                      )}
                    >
                      <type.icon size={18} className={cn("mb-2", watchedValues.clientType === type.id ? "text-secondary" : "text-clay/40")} />
                      <span className={cn(
                        "font-black text-[10px] uppercase tracking-tight italic",
                        watchedValues.clientType === type.id ? "text-secondary" : "text-charcoal"
                      )}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <MapPin size={16} className="text-primary" />
                  Identity & Location
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
                
                <div className="space-y-2 pt-2">
                  <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Property Location</Label>
                  <LocationPicker 
                    onLocationSelect={(loc) => {
                      setValue('location', loc);
                      const parts = loc.address.split(',');
                      if (parts.length >= 2) {
                        const sub = parts[parts.length - 2].trim().replace(/\s+[A-Z]{2,3}\s+\d{4}$/, '');
                        if (sub) setValue('suburb', sub);
                      }
                    }}
                    initialLocation={watchedValues.location}
                  />
                </div>

                <Button 
                  type="button" 
                  onClick={nextStep} 
                  className="w-full bg-primary hover:bg-primary-hover text-white h-12 rounded-full font-black uppercase tracking-[0.2em] text-[10px]"
                  disabled={!watchedValues.location || !watchedValues.name || !watchedValues.phone}
                >
                  Confirm Deployment <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <Calendar size={16} className="text-primary" />
                  Deployment Window
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 pb-6">
                <ClientCalendar
                  suburb={watchedValues.suburb}
                  jobs={jobs}
                  settings={settings!}
                  selectedDate={watchedValues.date}
                  selectedSlot={watchedValues.timeSlot}
                  onSelect={(date, slot) => {
                    setValue('date', date);
                    setValue('timeSlot', slot);
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
                  Service Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 pb-6">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(settings?.pricing?.base || PRICING_RULES.base).slice(0, 4).map(([id, price]) => {
                    const detail = settings?.pricing?.packageDetails?.[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setValue('serviceType', id as any)}
                        className={cn(
                          "flex flex-col p-3 rounded-2xl border-2 text-left transition-all h-32 relative group",
                          watchedValues.serviceType === id ? "border-secondary bg-secondary/5" : "border-border bg-background"
                        )}
                      >
                        <span className={cn(
                          "font-black text-[10px] uppercase tracking-tight italic",
                          watchedValues.serviceType === id ? "text-secondary" : "text-charcoal"
                        )}>{detail?.name || id.replace('_', ' ')}</span>
                        <span className="text-[9px] text-clay font-bold mt-1 line-clamp-2 leading-none">{detail?.description}</span>
                        <div className="mt-auto flex justify-between items-end">
                           <span className="text-xs font-black text-primary">${price}</span>
                           {watchedValues.serviceType === id && <CheckCircle2 size={12} className="text-secondary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Condition</Label>
                    <Select {...register('serviceGrade')} className="h-10 text-[10px] font-bold rounded-xl">
                       <option value="standard">Standard</option>
                       <option value="medium">Medium</option>
                       <option value="heavy">Heavy</option>
                       <option value="extreme">Extreme</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Urgency</Label>
                    <Select {...register('conditionFactors.urgency')} className="h-10 text-[10px] font-bold rounded-xl">
                       <option value="normal">Normal</option>
                       <option value="priority">Priority</option>
                       <option value="urgent">Urgent</option>
                    </Select>
                  </div>
                </div>

                <Button type="button" onClick={nextStep} className="w-full bg-primary h-12 rounded-full font-black uppercase tracking-widest text-[10px] shadow-premium">
                  Review & Finalize <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-charcoal uppercase tracking-tight italic text-sm">
                  <CheckCircle2 size={16} className="text-primary" />
                  Final Operational Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-4 pb-6">
                <div className="bg-background p-4 rounded-2xl border border-border space-y-3">
                  <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic border-b border-border/40 pb-2">
                    <span>Target Node</span>
                    <span className="text-charcoal">{watchedValues.name}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic border-b border-border/40 pb-2">
                    <span>Coordinates</span>
                    <span className="text-charcoal truncate ml-4 max-w-[120px]">{watchedValues.location?.address}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-clay uppercase italic border-b border-border/40 pb-2">
                    <span>Deployment Window</span>
                    <span className="text-charcoal">{watchedValues.date && format(new Date(watchedValues.date), 'MMM dd')} - {watchedValues.timeSlot}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Net Total</span>
                    <span className="text-xl font-black text-primary">${calculateEstimate().total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-clay/50 font-black uppercase text-[8px] tracking-[0.2em] italic">Operational Instructions</Label>
                   <Textarea {...register('notes')} className="text-xs rounded-xl min-h-[60px]" placeholder="Access, Dogs, etc..." />
                </div>

                <Button type="submit" className="w-full bg-secondary hover:bg-secondary-hover text-white h-14 rounded-full font-black uppercase tracking-[0.2em] text-[11px] shadow-premium italic" isLoading={isSubmitting}>
                   AUTHORIZE DEPLOYMENT <Zap size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 6 && (
            <Card className="border-border shadow-premium rounded-[32px] overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-charcoal py-4 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-black text-white uppercase tracking-tight italic text-sm">
                  <CreditCard size={16} className="text-primary" />
                  Fiscal Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 px-4 pb-6 text-center">
                <p className="text-[10px] font-bold text-clay uppercase tracking-[0.2em] mb-4">Select Payment Protocol</p>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                      type="button" 
                      onClick={() => setPaymentMethod('cash')}
                      className={cn("p-6 rounded-2xl border-2 flex flex-col items-center gap-2", paymentMethod === 'cash' ? "border-secondary bg-secondary/5" : "border-border")}
                   >
                     <DollarSign size={24} className={paymentMethod === 'cash' ? "text-secondary" : "text-clay/40"} />
                     <span className="text-[10px] font-black uppercase tracking-tight italic">CASH ON SITE</span>
                   </button>
                   <button 
                      type="button" 
                      onClick={() => setPaymentMethod('card')}
                      className={cn("p-6 rounded-2xl border-2 flex flex-col items-center gap-2", paymentMethod === 'card' ? "border-secondary bg-secondary/5" : "border-border")}
                   >
                     <CreditCard size={24} className={paymentMethod === 'card' ? "text-secondary" : "text-clay/40"} />
                     <span className="text-[10px] font-black uppercase tracking-tight italic">ONLINE CARD</span>
                   </button>
                </div>
                <Button onClick={handlePaymentSelection} isLoading={isSubmitting} className="w-full bg-secondary h-14 rounded-full font-black uppercase tracking-[0.2em] text-[11px] mt-6 italic">
                   CONFIRM RESOLUTION
                </Button>
              </CardContent>
            </Card>
          )}
        </form>

        {step < 5 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-border flex flex-col md:flex-row gap-4 z-[45] shadow-premium">
            <div className="flex-1 flex items-center justify-center md:justify-start px-4">
              <div className="flex flex-col text-center md:text-left">
                <span className="text-[9px] sm:text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] italic">Current Total</span>
                <span className="text-xl sm:text-2xl font-black text-primary italic leading-none mt-1">
                  {calculateEstimate().isQuoteRequired ? 'QUOTE NEEDED' : `$${(calculateEstimate().total || 0).toFixed(2)}`}
                </span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center md:justify-end px-4">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-clay uppercase tracking-widest whitespace-nowrap">Local Price Match</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];