import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/src/contexts/AuthContext';
import { useJobs, useClients, useSettings } from '@/src/hooks/useFirebase';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Label } from '@/src/components/ui/Label';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { SUBURBS, PRICING_RULES, ADD_ON_LABELS, CLIENT_TYPE_LABELS } from '@/src/constants';
import { format, addDays, isSameDay, getDay } from 'date-fns';
import { motion } from 'motion/react';
import { CheckCircle2, ChevronRight, ChevronLeft, MapPin, Calendar, Clock, ClipboardList, Info, Home, Users, CreditCard, DollarSign, ArrowLeft } from 'lucide-react';
import AppLogo from '@/src/components/AppLogo';
import { GrassRootsLogo } from '@/src/components/GrassRootsLogo';
import { WarriorMan } from '@/src/components/WarriorMan';
import { cn } from '@/src/lib/utils';
import { ClientCalendar } from '@/src/components/Calendar/ClientCalendar';
import { ImagePlaceholder } from '@/src/components/ImagePlaceholder';
import { calculateServicePrice } from '@/src/services/pricingEngine';

const bookingSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  suburb: z.string().min(1, 'Please select your suburb'),
  date: z.string().min(1, 'Please select a date'),
  timeSlot: z.enum(['morning', 'afternoon']),
  clientType: z.enum(['one-off', 'returning', 'ultimate-gold', 'real-estate']),
  serviceType: z.string().min(1, 'Please select a service package'),
  serviceGrade: z.enum(['standard', 'medium', 'heavy', 'extreme']),
  agencyName: z.string().optional(),
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
  const { profile } = useAuth();
  const { jobs, addJob } = useJobs();
  const { addClient } = useClients();
  const { settings, loading: settingsLoading } = useSettings();

  const [step, setStep] = React.useState(1);
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
      phone: '', // Users don't have phone in UserProfile
      timeSlot: 'morning',
      clientType: (searchParams.get('type') as any) || (profile ? 'returning' : 'one-off'),
      serviceType: (searchParams.get('package') as any) || 'residential_standard',
      serviceGrade: 'standard',
      addOns: Object.entries(settings?.pricing?.addOns || PRICING_RULES.addOns).map(([id, price]) => {
        const detail = settings?.pricing?.addOnDetails?.[id];
        // For booking, we might only want to show active ones
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

  // Availability Logic
  const getAvailableDates = () => {
    if (!settings || !watchedValues.suburb) return [];
    
    // Find specific schedule or use default (Mon-Fri)
    const schedule = settings.suburbSchedules.find(s => s.suburb === watchedValues.suburb);
    const availableDays = schedule?.availableDays || [1, 2, 3, 4, 5];

    const dates = [];
    // Show next 30 days
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
      watchedValues.addOns.filter(a => a.selected)
    );
  };

  const onSubmit = async (data: BookingFormValues) => {
    const rules = settings?.pricing || PRICING_RULES;
    const snapshot = calculateEstimate();
    
    setIsSubmitting(true);
    try {
      // 1. Create/Find Client
      let clientId = profile?.uid || '';
      if (!clientId) {
        const newClientId = await addClient({
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          suburb: data.suburb,
          clientType: data.clientType,
          agencyName: data.agencyName,
          notes: `Lead from website booking.`,
        });
        if (!newClientId) throw new Error('Failed to register client details.');
        clientId = newClientId;
      }

      // 2. Create "Pending" Job in Firestore
      const jobData = {
        clientId: clientId,
        clientName: data.name,
        clientPhone: data.phone,
        clientEmail: data.email,
        address: data.address,
        suburb: data.suburb,
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
        pricingSnapshot: {
          total: snapshot.total,
          packageName: snapshot.packageName,
          packageId: snapshot.packageId || 'custom',
          basePrice: snapshot.basePrice,
          addOnTotal: snapshot.addOnTotal,
          tierAdjustment: snapshot.tierAdjustment,
          tierName: snapshot.tierName,
          conditionSurcharge: snapshot.conditionSurcharge,
          gradeAdjustment: snapshot.gradeAdjustment,
          urgencySurcharge: snapshot.urgencySurcharge,
          discount: snapshot.discount || 0,
          isQuoteRequired: snapshot.isQuoteRequired || false,
          addOns: snapshot.addOns.map(a => ({ id: a.id, name: a.name, price: a.price, selected: true }))
        },
        billingType: (snapshot.isQuoteRequired ? 'quote-required' : 'standard') as any,
        recurringSchedule: 'one-off' as any,
        description: `Website Booking: ${snapshot.packageName}`,
        notes: data.notes || '',
        paymentStatus: (snapshot.isQuoteRequired ? 'unpaid' : 'pending') as any
      };

      const jobId = await addJob(jobData);
      if (!jobId) throw new Error('Could not save booking details to database.');

      setCreatedJobId(jobId);

      // 3. Handle Payment or Success
      if (!snapshot.isQuoteRequired && (data.clientType === 'one-off' || data.clientType === 'returning')) {
        setStep(6);
      } else {
        // If quote required, go straight to success
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
              total: snapshot.total,
              packageName: snapshot.packageName,
              basePrice: snapshot.basePrice,
              addOnTotal: snapshot.addOnTotal
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
              total: snapshot.total,
              packageName: snapshot.packageName,
              basePrice: snapshot.basePrice
            }
          })
        });

        if (!response.ok) throw new Error('Failed to confirm cash payment.');
        setStep(7); // Show success screen
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
      let clientId = profile?.uid || '';

      if (!clientId) {
        // Create/Find Client
        const newClientId = await addClient({
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          suburb: data.suburb,
          clientType: data.clientType,
          agencyName: data.agencyName,
          notes: `Booked via website as ${data.clientType}.`,
        });
        if (!newClientId) throw new Error('Failed to create client');
        clientId = newClientId;
      }

      // 2. Create Job
      const jobId = await addJob({
        clientId: clientId,
        clientName: data.name,
        clientPhone: data.phone,
        clientEmail: data.email,
        address: data.address,
        suburb: data.suburb,
        status: currentSnapshot.isQuoteRequired ? 'quoted' : 'scheduled',
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
        basePrice: currentSnapshot.basePrice,
        gradeAdjustment: currentSnapshot.gradeAdjustment,
        conditionSurcharge: currentSnapshot.conditionSurcharge,
        addOnTotal: currentSnapshot.addOnTotal,
        urgencySurcharge: currentSnapshot.urgencySurcharge,
        price: currentSnapshot.total,
        pricingSnapshot: {
          total: currentSnapshot.total,
          packageName: currentSnapshot.packageName,
          packageId: currentSnapshot.packageId || 'custom',
          basePrice: currentSnapshot.basePrice,
          addOnTotal: currentSnapshot.addOnTotal,
          tierAdjustment: currentSnapshot.tierAdjustment,
          tierName: currentSnapshot.tierName,
          conditionSurcharge: currentSnapshot.conditionSurcharge,
          gradeAdjustment: currentSnapshot.gradeAdjustment,
          urgencySurcharge: currentSnapshot.urgencySurcharge,
          discount: currentSnapshot.discount || 0,
          isQuoteRequired: currentSnapshot.isQuoteRequired || false,
          addOns: currentSnapshot.addOns ? currentSnapshot.addOns.map((a: any) => ({ id: a.id, name: a.name, price: a.price, selected: true })) : []
        },
        billingType: currentSnapshot.isQuoteRequired ? ('quote-required' as any) : ('standard' as any),
        recurringSchedule: 'one-off' as any,
        description: `Online Booking: ${currentSnapshot.packageName}`,
        notes: data.notes || '',
        paymentId: paymentId || null,
        paymentStatus: paymentId ? 'paid' : 'unpaid'
      });

      if (!jobId) throw new Error('Failed to create job');

      // 3. Trigger Notification
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: paymentId ? 'payment-successful' : 'booking-created',
            job: {
              id: jobId,
              address: data.address,
              servicePackage: data.serviceType,
              price: currentSnapshot.total,
              scheduledDate: new Date(data.date).getTime(),
            },
            clientEmail: data.email,
            clientPhone: data.phone,
            clientName: data.name,
            amount: currentSnapshot.total
          })
        });
      } catch (err) {
        console.error("Failed to trigger notification:", err);
      }

      setStep(7); // Show success screen
    } catch (err: any) {
      console.error("Finalization Error:", err);
      toast.error(err.message || 'Payment confirmed but failed to save booking. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (formErrors: any) => {
    console.error('Form Validation Errors found. Check UI for details.');
    const firstError = Object.values(formErrors)[0] as any;
    toast.error(firstError?.message || 'Please check all required fields.');
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  if (step === 7) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
        <Card className="max-w-md w-full text-center p-8 border-border shadow-premium rounded-[32px] relative z-10 bg-surface/95 backdrop-blur-md">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-inner">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-black text-charcoal mb-2 tracking-tight uppercase italic underline decoration-primary/30 decoration-4 underline-offset-4">
            {calculateEstimate().total === 0 ? 'Quote Received!' : 'Booking Confirmed!'}
          </h2>
          <p className="text-clay mb-8 font-medium">
            {calculateEstimate().total === 0 
              ? `Thank you, ${watchedValues.name}. We've received your inquiry for ${format(new Date(watchedValues.date), 'EEEE, MMMM d')}. We will review the details and send you a formal quote shortly.`
              : `Thank you, ${watchedValues.name}. We've received your booking for ${format(new Date(watchedValues.date), 'EEEE, MMMM d')}.`}
          </p>
          
          <div className="bg-background p-6 rounded-2xl border border-border mb-8 text-left">
            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-2 italic">Want to manage your service?</p>
            <p className="text-xs text-clay leading-relaxed mb-4 font-medium">
              Create an account to track your job status, view past invoices, and get a $30 discount on regular maintenance.
            </p>
            <Button 
              variant="outline" 
              className="w-full border-border text-clay hover:bg-ochre/5 rounded-xl h-10 font-black uppercase text-[10px] tracking-[0.2em]"
              onClick={() => navigate('/login')}
            >
              Create Account
            </Button>
          </div>

          <Button onClick={() => navigate('/')} className="w-full bg-secondary hover:bg-secondary-hover text-white h-14 text-sm font-black uppercase tracking-[0.2em] rounded-xl shadow-premium">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12 relative overflow-hidden">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-10 -left-10 w-64 h-64 pointer-events-none select-none opacity-[0.02]">
        <WarriorMan size={250} />
      </div>
      <div className="fixed bottom-20 -right-10 w-80 h-80 pointer-events-none select-none -rotate-12 opacity-[0.02]">
        <WarriorMan size={320} />
      </div>

      <div className="bg-charcoal text-white py-14 px-6 mb-12 relative overflow-hidden">
        {/* Abstract topographic-like background */}
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
            <AppLogo className="h-10 w-auto" textClassName="text-white" />
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-black mb-2 tracking-tight italic uppercase">Service Booking</h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">{settings?.serviceLocation || 'Mount Isa'} Regional Operations Center</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 relative z-10 mt-12 grid grid-cols-3 gap-4 mb-4">
        <ImagePlaceholder id={12} seed="booking-extra-1" height={120} label="Precision" />
        <ImagePlaceholder id={13} seed="booking-extra-2" height={120} label="Reliable" />
        <ImagePlaceholder id={14} seed="booking-extra-3" height={120} label="Local" />
      </div>

      <div className="max-w-xl mx-auto px-4 relative z-10">
        {/* Progress Bar */}
        <div className="flex justify-between mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 z-0" />
          <motion.div 
            className="absolute top-1/2 left-0 h-1 bg-secondary -translate-y-1/2 z-1" 
            initial={{ width: '0%' }}
            animate={{ width: `${((step - 1) / 5) * 100}%` }}
          />
          {[
            { id: 1, label: 'Client' },
            { id: 2, label: 'Location' },
            { id: 3, label: 'Schedule' },
            { id: 4, label: 'Service' },
            { id: 5, label: 'Review' },
            { id: 6, label: 'Payment' }
          ].map(s => (
            <div 
              key={s.id} 
              className={cn("flex flex-col items-center z-10", s.id === 6 && calculateEstimate().total === 0 && "hidden")}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all duration-500 border-2",
                step === s.id 
                  ? "bg-secondary border-secondary text-white shadow-premium scale-125 -translate-y-1" 
                  : step > s.id
                    ? "bg-primary border-primary text-white"
                    : "bg-surface border-border text-clay/40"
              )}>
                {s.id}
              </div>
              <span className={cn(
                "text-[10px] mt-3 font-black uppercase tracking-[0.2em] transition-colors duration-300",
                step === s.id ? "text-secondary" : step > s.id ? "text-primary" : "text-clay/30"
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit as any, onInvalid)}>
          {step === 1 && (
            <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 border-b border-border">
                <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
                  <Users className="h-5 w-5 text-primary" />
                  Client Profile
                </CardTitle>
                <p className="text-[10px] font-black text-clay/60 uppercase tracking-[0.2em] mt-1">Select your account type</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-8">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'one-off', label: 'One-Off Client', desc: 'Single booking for casual service.' },
                    { id: 'returning', label: 'Recurring Client', desc: 'Loyal customer with mid-term needs.' },
                    { id: 'ultimate-gold', label: 'Ultimate Gold Member', desc: 'Premium subscription & priority service.' },
                    { id: 'real-estate', label: 'Portfolio Management', desc: 'Agency & asset property management.' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setValue('clientType', type.id as any)}
                      className={cn(
                        "flex flex-col p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                        watchedValues.clientType === type.id 
                          ? "border-secondary bg-secondary/5 shadow-premium" 
                          : "border-border bg-background hover:border-primary/30"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn(
                          "font-black text-sm uppercase tracking-tight italic",
                          watchedValues.clientType === type.id ? "text-secondary" : "text-charcoal"
                        )}>{type.label}</span>
                        {watchedValues.clientType === type.id && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                      </div>
                      <span className="text-[10px] text-clay font-medium leading-tight">{type.desc}</span>
                    </button>
                  ))}
                </div>

                <Button 
                  type="button" 
                  onClick={nextStep} 
                  className="w-full bg-primary hover:bg-primary-hover text-white h-14 rounded-full font-black uppercase tracking-[0.2em] shadow-premium mt-6"
                >
                  Continue <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 border-b border-border">
                <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
                  <MapPin className="h-5 w-5 text-primary" />
                  Service Site
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Contact Name</Label>
                    <Input 
                      {...register('name')} 
                      placeholder="Enter your full name" 
                      className="border-border bg-background focus:ring-primary/20 focus:border-primary/50 rounded-xl h-12 font-bold text-charcoal"
                    />
                    {errors.name && <p className="text-xs text-secondary font-black uppercase italic">{errors.name.message}</p>}
                  </div>

                  {(watchedValues.clientType === 'real-estate' || watchedValues.clientType === 'ultimate-gold') && (
                    <div className="space-y-2">
                      <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Agency / Company</Label>
                      <Input 
                        {...register('agencyName')}
                        placeholder="e.g. Isaac Regional Agency" 
                        className="border-border bg-background focus:ring-primary/20 focus:border-primary/50 rounded-xl h-12 font-bold text-charcoal"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Email Secure</Label>
                    <Input 
                      {...register('email')} 
                      type="email"
                      placeholder="client@region.co" 
                      className="border-border bg-background focus:ring-primary/20 focus:border-primary/50 rounded-xl h-12 font-bold text-charcoal"
                    />
                    {errors.email && <p className="text-xs text-secondary font-black uppercase italic">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Mobile Connection</Label>
                    <Input 
                      {...register('phone')} 
                      placeholder="0400 000 000" 
                      className="border-border bg-background focus:ring-primary/20 focus:border-primary/50 rounded-xl h-12 font-bold text-charcoal"
                    />
                    {errors.phone && <p className="text-xs text-secondary font-black uppercase italic">{errors.phone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Full Address</Label>
                    <Input 
                      {...register('address')} 
                      placeholder="Street number and name" 
                      className="border-border bg-background focus:ring-primary/20 focus:border-primary/50 rounded-xl h-12 font-bold text-charcoal"
                    />
                    {errors.address && <p className="text-xs text-secondary font-black uppercase italic">{errors.address.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Operating Suburb</Label>
                    <Select {...register('suburb')} className="border-border bg-background focus:ring-primary/20 focus:border-primary/50 rounded-xl h-12 font-bold text-charcoal">
                      <option value="">Select district...</option>
                      {(settings?.suburbSchedules && settings.suburbSchedules.length > 0 
                        ? settings.suburbSchedules.map(s => s.suburb) 
                        : SUBURBS
                      ).map(suburb => (
                        <option key={suburb} value={suburb}>{suburb}</option>
                      ))}
                    </Select>
                    {errors.suburb && <p className="text-xs text-secondary font-black uppercase italic">{errors.suburb.message}</p>}
                    <p className="text-[10px] text-clay/60 font-black italic tracking-tighter uppercase mt-1">Regional nodes active for {settings?.serviceLocation || 'Mount Isa'} districts.</p>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={nextStep} 
                  className="w-full bg-primary hover:bg-primary-hover text-white h-14 rounded-full font-black uppercase tracking-[0.2em] shadow-premium"
                  disabled={!watchedValues.address || !watchedValues.suburb || !watchedValues.name || !watchedValues.phone || !watchedValues.email}
                >
                  Confirm Details <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 border-b border-border">
                <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
                  <Calendar className="h-5 w-5 text-primary" />
                  Service Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                {!settings ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto" />
                    <p className="text-clay font-black uppercase tracking-[0.2em] text-[10px]">Syncing Availability...</p>
                  </div>
                ) : (
                  <ClientCalendar
                    suburb={watchedValues.suburb}
                    jobs={jobs}
                    settings={settings}
                    selectedDate={watchedValues.date}
                    selectedSlot={watchedValues.timeSlot}
                    onSelect={(date, slot) => {
                      setValue('date', date);
                      setValue('timeSlot', slot);
                    }}
                  />
                )}

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1 border-border text-clay hover:bg-ochre/5 rounded-full h-14 font-black uppercase tracking-[0.1em] text-[10px]">
                    <ChevronLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} disabled={!watchedValues.date || !watchedValues.timeSlot} className="flex-1 bg-primary hover:bg-primary-hover text-white rounded-full h-14 font-black uppercase tracking-[0.1em] text-[10px] shadow-premium">
                    Continue <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 border-b border-border">
                <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Package Configuration
                </CardTitle>
                <p className="text-[10px] font-black text-clay/60 uppercase tracking-[0.2em] mt-1">Configure your regional service scope</p>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Select Iron-Clad Service</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(settings?.pricing?.base || PRICING_RULES.base)
                        .map(([id, price]) => {
                          const detail = settings?.pricing?.packageDetails?.[id];
                          if (detail && !detail.active) return null;
                          return {
                            id,
                            label: detail?.name || id.replace(/_/g, ' '),
                            desc: detail?.description || '',
                            price: price,
                            image: detail?.image || (settings?.images as any)?.[id] || settings?.images?.placeholder,
                            displayOrder: detail?.displayOrder || 0
                          };
                        })
                        .filter((pkg): pkg is any => pkg !== null)
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setValue('serviceType', pkg.id as any)}
                            className={cn(
                              "flex flex-col rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                              watchedValues.serviceType === pkg.id 
                                ? "border-secondary bg-secondary/5 shadow-premium ring-4 ring-secondary/5" 
                                : "border-border bg-background hover:border-primary/30 shadow-sm"
                            )}
                          >
                            <div className="aspect-video w-full overflow-hidden border-b border-border bg-background/50">
                              <img 
                                src={pkg.image} 
                                alt={pkg.label}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-1">
                                <span className={cn(
                                  "font-black text-sm uppercase tracking-tight italic",
                                  watchedValues.serviceType === pkg.id ? "text-secondary" : "text-charcoal"
                                )}>{pkg.label}</span>
                                <span className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg whitespace-nowrap">${pkg.price}</span>
                              </div>
                              <span className="text-[10px] text-clay font-medium leading-tight block italic">{pkg.desc}</span>
                            </div>
                            {watchedValues.serviceType === pkg.id && (
                              <div className="absolute right-3 bottom-3 text-secondary">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Terrain Conditions (Grade)</Label>
                    <div className="grid gap-3">
                      {[
                        { id: 'standard', label: 'Maintained Ground', desc: 'Standard residential maintenance', recurringOnly: true },
                        { id: 'medium', label: 'Moderate Scrub', desc: 'Growth requiring extra clearance' },
                        { id: 'heavy', label: 'Dense Vegetation', desc: 'Tall growth & thick terrain' },
                        { id: 'extreme', label: 'Wilderness Recovery', desc: 'Neglected outback property cleanup' }
                      ].map((grade) => (
                        <button
                          key={grade.id}
                          type="button"
                          onClick={() => setValue('serviceGrade', grade.id as any)}
                          className={cn(
                            "flex flex-col p-5 rounded-2xl border-2 text-left transition-all relative",
                            watchedValues.serviceGrade === grade.id 
                              ? "border-secondary bg-secondary/5 shadow-premium ring-4 ring-secondary/5" 
                              : "border-border bg-background hover:border-primary/30"
                          )}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={cn(
                              "font-black uppercase tracking-tight italic",
                              watchedValues.serviceGrade === grade.id ? "text-secondary" : "text-charcoal"
                            )}>{grade.label}</span>
                            {watchedValues.serviceGrade === grade.id && <CheckCircle2 className="h-5 w-5 text-secondary" />}
                          </div>
                          <span className="text-[10px] text-clay font-medium leading-tight italic">{grade.desc}</span>
                          
                          {grade.recurringOnly && (
                            <div className="mt-3 flex items-center gap-2 p-2 bg-primary/5 rounded-xl border border-primary/10">
                              <Info className="h-3 w-3 text-primary shrink-0" />
                              <p className="text-[9px] font-black text-primary uppercase tracking-wider">
                                Active Subscription Only
                              </p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Last Mow</Label>
                      <Select {...register('conditionFactors.timeSinceLastMow')} className="border-border bg-background rounded-xl font-bold text-charcoal h-11">
                        <option value="under-2-weeks">Under 2 weeks</option>
                        <option value="2-4-weeks">2 to 4 weeks</option>
                        <option value="1-2-months">1 to 2 months</option>
                        <option value="over-2-months">Over 2 months</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Grass Height</Label>
                      <Select {...register('conditionFactors.grassHeight')} className="border-border bg-background rounded-xl font-bold text-charcoal h-11">
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="tall">Tall</option>
                        <option value="very-tall">Very Tall</option>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Thickness</Label>
                      <Select {...register('conditionFactors.thickness')} className="border-border bg-background rounded-xl font-bold text-charcoal h-11">
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="thick">Thick</option>
                        <option value="very-thick">Very Thick</option>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Priority</Label>
                      <Select {...register('conditionFactors.urgency')} className="border-border bg-background rounded-xl font-bold text-charcoal h-11">
                        <option value="normal">Normal</option>
                        <option value="priority">Priority (+ $25)</option>
                        <option value="urgent">Urgent (+ $60)</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-border">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clay/40 italic">Add-on Operational Modules</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {watchedValues.addOns?.map((addon, index) => (
                        <label key={addon.id} className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                          addon.selected ? "border-secondary bg-secondary/5 shadow-premium" : "border-border bg-background hover:border-primary/30"
                        )}>
                          <div className="flex items-center gap-4">
                            <input 
                              type="checkbox" 
                              checked={addon.selected}
                              onChange={(e) => {
                                const newAddOns = [...watchedValues.addOns];
                                newAddOns[index].selected = e.target.checked;
                                setValue('addOns', newAddOns);
                              }}
                              className="h-5 w-5 rounded-lg border-border text-secondary focus:ring-secondary cursor-pointer"
                            />
                            <span className={cn(
                              "text-sm font-black uppercase tracking-tight italic",
                              addon.selected ? "text-secondary" : "text-charcoal"
                            )}>{addon.name}</span>
                          </div>
                          <span className="text-sm font-black text-primary">+${addon.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-8">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1 border-border text-clay hover:bg-ochre/5 rounded-full h-14 font-black uppercase tracking-[0.1em] text-[10px]">
                    <ChevronLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} className="flex-1 bg-primary hover:bg-primary-hover text-white rounded-full h-14 font-black uppercase tracking-[0.1em] text-[10px] shadow-premium">
                    Review Quote <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-primary/5 border-b border-border">
                <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Review Operation
                </CardTitle>
                <p className="text-[10px] font-black text-clay/60 uppercase tracking-[0.2em] mt-1">Final reconciliation before deployment</p>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="bg-background p-6 rounded-2xl border border-border space-y-5 shadow-inner">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] mb-1 italic">Contractor/Client</p>
                      <p className="font-black text-charcoal uppercase tracking-tight italic">{watchedValues.name}</p>
                      <p className="text-[10px] text-clay font-bold uppercase tracking-tight italic leading-none mt-1">{watchedValues.clientType.replace('-', ' ')} Account Type</p>
                      <p className="text-xs text-clay font-medium mt-2">{watchedValues.email}</p>
                      <p className="text-xs text-clay font-medium">{watchedValues.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] mb-1 italic">Deployment Window</p>
                      <p className="font-black text-charcoal tracking-tight italic uppercase">{watchedValues.date && format(new Date(watchedValues.date), 'EEE, MMM d, yyyy')}</p>
                      <p className="text-[10px] text-clay font-bold uppercase tracking-tight italic mt-1">{watchedValues.timeSlot} Operations</p>
                    </div>
                  </div>
                  
                  <div className="pt-5 border-t border-border">
                    <p className="text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] mb-1 italic">Target Coordinates</p>
                    <p className="font-black text-charcoal tracking-tight uppercase italic">{watchedValues.address}</p>
                    <p className="text-xs text-clay font-black uppercase text-[10px] tracking-widest mt-1 opacity-60 underline decoration-primary/20">{watchedValues.suburb} District Node</p>
                  </div>

                  <div className="pt-5 border-t border-border">
                    <p className="text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] mb-1 italic">Service Specification</p>
                    <p className="font-black text-charcoal tracking-tight uppercase italic">{watchedValues.serviceType.replace(/_/g, ' ')} Module</p>
                    <p className="text-xs text-clay font-black uppercase text-[10px] tracking-widest mt-1 opacity-60 italic leading-none">{watchedValues.serviceGrade} Severity Grade Applied</p>
                  </div>

                  <div className="pt-5 border-t border-border">
                    <p className="text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] mb-4 italic">Financial Breakdown</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-medium text-clay">
                        <span className="uppercase tracking-tight italic">Standard Base Module</span>
                        <span className="font-black text-charcoal">${calculateEstimate().basePrice.toFixed(2)}</span>
                      </div>
                      
                      {calculateEstimate().tierAdjustment !== 0 && (
                        <div className="flex justify-between text-xs font-medium text-secondary italic">
                          <span className="font-black">Account Rank Modifier ({calculateEstimate().tierName})</span>
                          <span className="font-black">{calculateEstimate().tierAdjustment > 0 ? '+' : ''}${calculateEstimate().tierAdjustment.toFixed(2)}</span>
                        </div>
                      )}

                      {(calculateEstimate().gradeAdjustment !== 0 || calculateEstimate().conditionSurcharge !== 0 || calculateEstimate().urgencySurcharge !== 0) && (
                        <div className="flex justify-between text-xs font-medium text-clay">
                          <span className="uppercase tracking-tight italic">Environmental Load Factors</span>
                          <span className="font-black text-charcoal">+${(calculateEstimate().gradeAdjustment + calculateEstimate().conditionSurcharge + calculateEstimate().urgencySurcharge).toFixed(2)}</span>
                        </div>
                      )}

                      {calculateEstimate().addOns.length > 0 && (
                        <div className="pt-2 space-y-1">
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 italic">Active Add-on Modules</p>
                          {calculateEstimate().addOns.map((addon) => (
                            <div key={addon.id} className="flex justify-between text-xs font-medium text-clay pl-3">
                              <span className="uppercase tracking-tight italic opacity-70">• {addon.name}</span>
                              <span className="font-black text-charcoal">+${addon.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center bg-primary/5 p-5 rounded-2xl border border-primary/20 shadow-premium">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">
                          {calculateEstimate().isQuoteRequired ? 'Net Estimate' : 'Deployment Total'}
                        </p>
                        <p className="text-[9px] text-clay font-medium italic leading-none opacity-60">Inclusive of regional tariffs</p>
                      </div>
                      <p className="text-3xl font-black text-primary tracking-tighter">
                        {calculateEstimate().isQuoteRequired ? 'PENDING QUOTE' : `$${calculateEstimate().total.toFixed(2)}`}
                      </p>
                    </div>
                    <p className="text-[8px] text-clay/40 font-black uppercase tracking-[0.2em] mt-4 text-center">
                      {calculateEstimate().isQuoteRequired 
                        ? '* Formal appraisal required for final terrain certification'
                        : '* Binding rate for defined coordinates and scope'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-clay/50 font-black uppercase text-[10px] tracking-[0.2em] italic">Operational Instructions</Label>
                    <Textarea 
                      {...register('notes')} 
                      placeholder="Access codes, terrain warnings, or specific site requirements..." 
                      className="border-border bg-background rounded-xl min-h-[100px] focus:ring-primary/20 focus:border-primary/50 text-charcoal font-medium text-sm leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1 border-border text-clay hover:bg-ochre/5 rounded-full h-14 font-black uppercase tracking-[0.1em] text-[10px]">
                    <ChevronLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button type="submit" className="flex-1 bg-secondary hover:bg-secondary-hover text-white rounded-full h-14 font-black uppercase tracking-[0.1em] text-[10px] shadow-premium" isLoading={isSubmitting}>
                    {calculateEstimate().isQuoteRequired ? 'Submit for Review' : 'Initialize Settlement'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 6 && (
            <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface/80 backdrop-blur-sm">
              <CardHeader className="bg-charcoal border-b border-border">
                <CardTitle className="flex items-center gap-3 font-black text-white uppercase tracking-tight italic">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Settlement Method
                </CardTitle>
                <p className="text-[10px] font-black text-clay uppercase tracking-[0.2em] mt-1 italic">Authorize operation parameters</p>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setPaymentMethod('card')}
                    className={`cursor-pointer rounded-2xl p-6 border-2 transition-all group ${paymentMethod === 'card' ? 'border-secondary bg-secondary/5 ring-4 ring-secondary/5 shadow-premium' : 'border-border bg-background hover:border-primary/30'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <CreditCard className={`h-8 w-8 transition-colors ${paymentMethod === 'card' ? 'text-secondary' : 'text-clay/40 group-hover:text-clay/60'}`} />
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'card' ? 'border-secondary bg-secondary' : 'border-border'}`}>
                        {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-tight text-charcoal mb-1 italic">Standard Card</h3>
                    <p className="text-[10px] text-clay font-medium leading-tight italic">Secure iron-clad settlement via Stripe.</p>
                  </div>

                  <div 
                    onClick={() => setPaymentMethod('cash')}
                    className={`cursor-pointer rounded-2xl p-6 border-2 transition-all group ${paymentMethod === 'cash' ? 'border-secondary bg-secondary/5 ring-4 ring-secondary/5 shadow-premium' : 'border-border bg-background hover:border-primary/30'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className={`h-8 w-8 transition-colors ${paymentMethod === 'cash' ? 'text-secondary' : 'text-clay/40 group-hover:text-clay/60'}`} />
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'cash' ? 'border-secondary bg-secondary' : 'border-border'}`}>
                        {paymentMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-tight text-charcoal mb-1 italic">Field Settlement</h3>
                    <p className="text-[10px] text-clay font-medium leading-tight italic">Cash settlement upon site clearance.</p>
                  </div>
                </div>

                <Button 
                  onClick={handlePaymentSelection} 
                  isLoading={isSubmitting}
                  className="w-full bg-secondary hover:bg-secondary-hover text-white rounded-full h-14 font-black uppercase tracking-[0.1em] text-[10px] shadow-premium"
                >
                  Confirm & {paymentMethod === 'card' ? 'Authorize Payload' : 'Finalize Dispatch'}
                </Button>

              </CardContent>
            </Card>
          )}

        </form>

        {step < 5 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-border flex flex-col md:flex-row gap-4 z-20 shadow-premium">
            <div className="flex-1 flex items-center justify-center md:justify-start px-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] italic">Deployment Estimate</span>
                <span className="text-2xl font-black text-primary italic leading-none mt-1">
                  {calculateEstimate().isQuoteRequired ? 'APPRAISAL REQUIRED' : `$${calculateEstimate().total.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
