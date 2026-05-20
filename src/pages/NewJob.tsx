import * as React from 'react';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, User, Phone, Mail } from 'lucide-react';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { GrassRootsLogo } from '@/components/GrassRootsLogo';
import { useJobs, useClients, useSettings } from '@/hooks/useFirebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PRICING_RULES, ADD_ON_LABELS, SUBURBS } from '@/constants';
import { Mythos } from '@/lib/mythos';

// ... (other imports)
import { ClientType, ServicePackage, ServiceGrade, BillingType, RecurringSchedule, AddOn, ConditionFactors, PricingRules } from '@/types';
import { calculateServicePrice, validateQuotePricing } from '@/services/pricingEngine';

import { PhotoUpload } from '@/components/PhotoUpload';
import { LocationPicker } from '@/components/LocationPicker';
import { LocationData } from '@/types';

const jobSchema = z.object({
  clientId: z.string().optional(),
  manualClientName: z.string().optional(),
  manualClientPhone: z.string().optional(),
  manualClientEmail: z.string().email('Valid email is required').optional().or(z.literal('')),
  location: z.any().optional(),
  suburb: z.string().optional(),
  scheduledDate: z.string().min(1, 'Please select a date'),
  timeSlot: z.enum(['morning', 'afternoon']),
  clientType: z.enum(['one_off', 'returning', 'premium', 'asset_management']),
  servicePackage: z.string().optional(),
  serviceGrade: z.enum(['standard', 'medium', 'heavy', 'extreme']),
  billingType: z.enum(['included', 'extra', 'quote-required']),
  recurringSchedule: z.enum(['weekly', 'fortnightly', 'monthly', 'one-off']),
  conditionFactors: z.object({
    timeSinceLastMow: z.enum(['under-2-weeks', '2-4-weeks', '1-2-months', 'over-2-months']).default('under-2-weeks'),
    grassHeight: z.enum(['short', 'medium', 'tall', 'very-tall']).default('short'),
    thickness: z.enum(['light', 'medium', 'thick', 'very-thick']).default('light'),
    obstacles: z.enum(['low', 'medium', 'high']).default('low'),
    urgency: z.enum(['normal', 'priority', 'urgent']).default('normal'),
  }).default({
    timeSinceLastMow: 'under-2-weeks',
    grassHeight: 'short',
    thickness: 'light',
    obstacles: 'low',
    urgency: 'normal',
  }),
  addOns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.coerce.number(),
    selected: z.boolean(),
  })).default([]),
  manualPrice: z.coerce.number().optional(),
  manualOverride: z.boolean().default(false),
  description: z.string().optional(),
  notes: z.string().optional(),
  packageNotes: z.string().optional(),
  photos: z.array(z.string()).default([]),
  beforePhotos: z.array(z.string()).default([]),
  afterPhotos: z.array(z.string()).default([]),
  issuePhotos: z.array(z.object({
    url: z.string(),
    note: z.string().optional(),
    createdAt: z.number()
  })).default([]),
}).superRefine((data, ctx) => {
  if (data.clientType !== 'one_off') {
    if (!data.clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a client",
        path: ["clientId"]
      });
    }
  } else {
    if (!data.manualClientName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter client name",
        path: ["manualClientName"]
      });
    }
    // Make phone and address superficially required but specific errors
    if (!data.manualClientPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter phone number",
        path: ["manualClientPhone"]
      });
    }
    if (!data.manualClientEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter email address",
        path: ["manualClientEmail"]
      });
    }
    if (!data.location || !data.location.verified) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please confirm the job location on the map.",
        path: ["location"]
      });
    }
  }
});

type JobFormValues = z.infer<typeof jobSchema>;

export const NewJob = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addJob } = useJobs();
  const { clients, loading: clientsLoading, addClient } = useClients();
  const { settings, loading: settingsLoading } = useSettings();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const initialClientId = (location.state as any)?.clientId;

  const defaultAddOns: AddOn[] = React.useMemo(() => {
    return Object.entries(settings?.pricing?.addOns || PRICING_RULES.addOns).map(([id, price]) => {
      const detail = settings?.pricing?.addOnDetails?.[id];
      return {
        id,
        name: detail?.name || ADD_ON_LABELS[id] || id,
        price: Number(price) || 0,
        selected: false,
      };
    });
  }, [settings]);

  const { register, handleSubmit, control, setValue, watch, reset, getValues, formState: { errors } } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema) as any,
    defaultValues: {
      clientType: initialClientId ? 'returning' : 'one_off',
      clientId: initialClientId || '',
      servicePackage: 'residential_standard',
      serviceGrade: 'standard',
      billingType: 'extra',
      recurringSchedule: 'one-off',
      timeSlot: 'morning',
      scheduledDate: new Date().toISOString().split('T')[0],
      conditionFactors: {
        timeSinceLastMow: 'under-2-weeks',
        grassHeight: 'short',
        thickness: 'light',
        obstacles: 'low',
        urgency: 'normal',
      },
      addOns: [], // Initialize empty and let reset handle it when settings load
      manualOverride: false,
      beforePhotos: [],
      afterPhotos: [],
      issuePhotos: []
    }
  });

  const { fields } = useFieldArray({
    control,
    name: "addOns",
    keyName: "_field_id"
  });

  // Keep form in sync with settings when they load
  React.useEffect(() => {
    if (!settingsLoading && settings?.pricing?.addOns) {
      const currentAddOns = getValues('addOns');
      if (!currentAddOns || currentAddOns.length === 0) {
        reset({
          ...getValues(),
          addOns: defaultAddOns
        });
      }
    }
  }, [settingsLoading, settings, reset, getValues, defaultAddOns]);

  const [tempJobId] = React.useState(() => `new-job-${Math.random().toString(36).substring(7)}`);

  const watchedValues = watch();

  // Pre-fill suburb when client changes
  React.useEffect(() => {
    if (watchedValues.clientId) {
      const client = clients.find(c => c.id === watchedValues.clientId);
      if (client) {
        if (client.suburb) setValue('suburb', client.suburb);
        if (client.notes) setValue('notes', client.notes);
      }
    }
  }, [watchedValues.clientId, clients, setValue]);

  const calculatePrice = React.useCallback(() => {
    const rules = settings?.pricing || PRICING_RULES;

    // Defend against missing default add-ons during initial load
    const safeAddOns = watchedValues.addOns || [];

    const snapshot = calculateServicePrice(
      rules,
      watchedValues.servicePackage || 'residential_standard',
      watchedValues.clientType || 'one_off',
      watchedValues.serviceGrade || 'standard',
      watchedValues.conditionFactors || {
        timeSinceLastMow: 'under-2-weeks',
        grassHeight: 'short',
        thickness: 'light',
        obstacles: 'low',
        urgency: 'normal',
      },
      safeAddOns.filter(a => a.selected),
      watchedValues.billingType || 'extra'
    );

    if (watchedValues.manualOverride && watchedValues.manualPrice !== undefined) {
      // If override, we still store the original snapshot but update the total
      return { ...snapshot, total: watchedValues.manualPrice, manualOverride: true };
    }

    return snapshot;
  }, [watchedValues, settings]);

  const pricingSnapshot = calculatePrice();
  const totalPrice = pricingSnapshot.total;

  const onSubmit = async (data: JobFormValues) => {
    Mythos.log("SUBMIT_START", "New Job Payload Pre-Processing", data);
    
    // 1. Centralized Pricing Validation
    const validation = validateQuotePricing(pricingSnapshot);
    if (!validation.valid) {
      console.error("[NewJob] Pricing Validation FAILED:", validation.errors);
      toast.error(`Pricing Error: ${validation.errors.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalClientId = data.clientId;
      let finalClientName = '';
      let finalClientPhone = '';
      let finalAddress = '';
      let finalClientEmail = '';
      let finalLocation = data.location;

      if (data.clientType !== 'one_off') {
        const client = clients.find(c => c.id === data.clientId);
        if (!client) throw new Error('Client not found');
        finalClientName = client.name;
        finalClientPhone = client.phone;
        finalAddress = client.address;
        finalClientEmail = client.email || '';
        finalLocation = client.location || null;
      } else {
        // One-off checks
        if (!data.manualClientName) throw new Error("Client name is required");
        finalClientName = data.manualClientName;
        finalClientPhone = data.manualClientPhone || '';
        finalAddress = data.location?.address || '';
        finalClientEmail = data.manualClientEmail || ''; 
        finalLocation = data.location || null;
      }

      const jobData = {
        clientId: finalClientId || '',
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        clientEmail: finalClientEmail,
        address: finalAddress,
        location: finalLocation,
        suburb: data.suburb || '',
        status: 'scheduled',
        scheduledDate: new Date(data.scheduledDate).getTime(),
        timeSlot: data.timeSlot,
        clientType: data.clientType,
        servicePackage: data.servicePackage || 'residential_standard',
        serviceGrade: data.serviceGrade,
        conditionFactors: data.conditionFactors,
        addOns: data.addOns.filter(a => a.selected).map(a => ({ id: a.id, name: a.name, price: a.price, selected: true })),
        basePrice: pricingSnapshot.basePrice,
        gradeAdjustment: pricingSnapshot.gradeAdjustment,
        conditionSurcharge: pricingSnapshot.conditionSurcharge,
        addOnTotal: pricingSnapshot.addOnTotal,
        urgencySurcharge: pricingSnapshot.urgencySurcharge,
        price: totalPrice,
        pricingSnapshot: {
          ...pricingSnapshot,
          squareFootage: pricingSnapshot.squareFootage || null,
          addOns: pricingSnapshot.addOns.map(a => ({ id: a.id, name: a.name, price: a.price, selected: true }))
        },
        manualOverride: data.manualOverride,
        packageNotes: data.packageNotes || '',
        billingType: data.billingType,
        recurringSchedule: data.recurringSchedule,
        description: data.description || '',
        notes: data.notes || '',
        photos: data.photos || [],
      };

      if (data.clientType === 'one_off') {
        const newClientId = await addClient({
          name: finalClientName,
          phone: finalClientPhone,
          address: finalAddress,
          location: data.location,
          suburb: data.suburb || '',
          clientType: 'one_off',
          email: finalClientEmail,
          notes: 'One-off client created during job entry.',
        });
        if (!newClientId) throw new Error('Failed to create casual client');
        jobData.clientId = newClientId;
      }

      console.log("[NewJob] Submitting Job to Firebase...", jobData);
      await addJob(jobData as any);

      toast.success('Job created successfully');
      navigate('/jobs');
    } catch (error: any) {
      console.error("[NewJob] Submit Error:", error);
      toast.error(`Failed to create job: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientsLoading || settingsLoading) {
    return <div className="p-8 text-center uppercase tracking-widest text-[10px] font-black animate-pulse">Loading Platform Data...</div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto pb-24 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern opacity-5 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-20 -right-20 w-96 h-96 pointer-events-none select-none opacity-[0.03]">
        <GrassRootsGuardian size={400} />
      </div>
      <div className="fixed -bottom-20 -left-20 w-80 h-80 pointer-events-none select-none rotate-45 opacity-[0.03]">
        <GrassRootsGuardian size={350} />
      </div>

      <form onSubmit={handleSubmit(onSubmit as any, (errors) => {
        // Log clean error messages for debugging
        const errorList = Object.entries(errors).map(([key, value]) => {
          const err = value as any;
          if (Array.isArray(err)) {
             return `${key}: [${err.map((e: any) => e?.message || (e ? Object.keys(e).join(',') : 'Invalid')).join(' | ')}]`;
          }
          return `${key}: ${err.message || 'Invalid'}`;
        });
        
        Mythos.error("FORM_VALIDATION_FAILED", {
          errorKeys: Object.keys(errors),
          details: errorList 
        });

        // Use safe labels to avoid circular DOM references from errors object
        console.error("Form Validation detailed keys:", Object.keys(errors));
        toast.error(`Please complete all required fields: ${Object.keys(errors).join(', ')}`);
      })} className="space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <GrassRootsLogo className="h-16 w-auto" />
            <p className="text-ochre font-bold uppercase tracking-widest text-[10px] mt-1">New Job • {settings?.serviceLocation || 'Mount Isa'} Region</p>
          </div>
          <div className="text-right bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-ochre/10 shadow-sm min-w-[200px]">
            <p className="text-[10px] text-ochre font-bold uppercase tracking-wider mb-1">Estimated Total</p>
            <p className="text-3xl font-black text-deep-red">
              {pricingSnapshot.isQuoteRequired && !watchedValues.manualOverride
                ? 'Quote Required' 
                : `$${(totalPrice || 0).toFixed(2)}`}
            </p>
            {!watchedValues.manualOverride && (
              <div className="mt-2 space-y-0.5 text-right border-t border-ochre/10 pt-2">
                <p className="text-[8px] text-charcoal/40 uppercase font-black">
                  Base: ${(pricingSnapshot.basePrice || 0).toFixed(2)} | Add-ons: ${(pricingSnapshot.addOnTotal || 0).toFixed(2)}
                </p>
                {pricingSnapshot.tierAdjustment !== 0 && (
                  <p className="text-[8px] text-charcoal/40 uppercase font-black">
                    Tier: {(pricingSnapshot.tierAdjustment || 0) > 0 ? '+' : ''}${(pricingSnapshot.tierAdjustment || 0).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Client & Schedule</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <input type="hidden" {...register('clientType')} />
                    <Button
                      type="button"
                      variant={watchedValues.clientType === 'one_off' ? 'primary' : 'outline'}
                      className="flex-1 min-w-[120px]"
                      onClick={() => {
                        setValue('clientType', 'one_off');
                      }}
                    >
                      One-Off
                    </Button>
                    <Button
                      type="button"
                      variant={watchedValues.clientType === 'returning' ? 'primary' : 'outline'}
                      className="flex-1 min-w-[120px]"
                      onClick={() => {
                        setValue('clientType', 'returning');
                      }}
                    >
                      Returning
                    </Button>
                    <Button
                      type="button"
                      variant={watchedValues.clientType === 'premium' ? 'primary' : 'outline'}
                      className="flex-1 min-w-[120px]"
                      onClick={() => setValue('clientType', 'premium')}
                    >
                      Gold
                    </Button>
                    <Button
                      type="button"
                      variant={watchedValues.clientType === 'asset_management' ? 'primary' : 'outline'}
                      className="flex-1 min-w-[120px]"
                      onClick={() => setValue('clientType', 'asset_management')}
                    >
                      Real Estate
                    </Button>
                  </div>

                  {watchedValues.clientType !== 'one_off' ? (
                    <div className="space-y-2">
                    <Label>Select Regular Client</Label>
                    <Select {...register('clientId')}>
                      <option value="">Select a client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    {errors.clientId && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{(errors.clientId as any).message}</p>}
                  </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-ochre/5 rounded-xl border border-ochre/10">
                      <p className="text-[10px] font-black text-ochre uppercase tracking-widest">Site Identity Protocol</p>
                      <div className="space-y-2">
                        <Label>Client Name</Label>
                        <Input {...register('manualClientName')} placeholder="Enter name" />
                        {errors.manualClientName && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{(errors.manualClientName as any).message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input {...register('manualClientPhone')} placeholder="Enter phone" />
                        {errors.manualClientPhone && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{(errors.manualClientPhone as any).message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input {...register('manualClientEmail')} type="email" placeholder="Enter email" />
                        {errors.manualClientEmail && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{(errors.manualClientEmail as any).message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Automated Location Intelligence</Label>
                        <LocationPicker 
                          onLocationSelect={(loc) => {
                            setValue('location', loc);
                            // Extract suburb from formatted address if possible
                            const parts = loc.address.split(',');
                            if (parts.length >= 2) {
                              // Expected: " Mount Isa QLD 4825"
                              const suburbStatePostcode = parts[parts.length - 2].trim();
                              const suburb = suburbStatePostcode.replace(/\s+[A-Z]{2,3}\s+\d{4}$/, ''); // Remove State and Postcode
                              if (suburb) setValue('suburb', suburb);
                            }
                          }}
                        />
                        {errors.location && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{(errors.location as any).message}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suburb has been removed as per Gemini Upgrade requirements. It is auto-derived. */}
                <div className="hidden">
                  <Input type="hidden" {...register('suburb')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" {...register('scheduledDate')} />
                    {errors.scheduledDate && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{(errors.scheduledDate as any).message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Time Slot</Label>
                    <Select {...register('timeSlot')}>
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                    </Select>
                    {errors.timeSlot && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{(errors.timeSlot as any).message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Service Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                  {watchedValues.clientType !== 'one_off' && (
                    <div className="space-y-2">
                      <Label>Service Package</Label>
                      <Select {...register('servicePackage')}>
                        {Object.entries(settings?.pricing?.base || PRICING_RULES.base)
                          .sort((a, b) => (settings?.pricing?.packageDetails?.[a[0]]?.displayOrder || 0) - (settings?.pricing?.packageDetails?.[b[0]]?.displayOrder || 0))
                          .map(([id, price]) => {
                            const detail = settings?.pricing?.packageDetails?.[id];
                            const label = detail?.name || id.replace(/_/g, ' ');
                            return (
                              <option key={id} value={id}>
                                {label} (${price} min)
                              </option>
                            );
                          })}
                      </Select>
                    </div>
                  )}

                <div className="space-y-2">
                  <Label>Service Grade</Label>
                  <Select {...register('serviceGrade')}>
                    <option value="standard">Standard Maintenance</option>
                    <option value="medium">Medium Overgrowth</option>
                    <option value="heavy">Heavy Overgrowth</option>
                    <option value="extreme">Extreme Cleanup / Reclaim</option>
                  </Select>
                  {errors.serviceGrade && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">{errors.serviceGrade.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Billing Type</Label>
                    <Select {...register('billingType')}>
                      <option value="included">Included in Package</option>
                      <option value="extra">Extra Charge</option>
                      <option value="quote-required">Quote Required</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recurring Schedule</Label>
                    <Select {...register('recurringSchedule')}>
                      <option value="one-off">One-off</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Add-Ons</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map((field, index) => (
                    <label key={field._field_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        {...register(`addOns.${index}.selected`)}
                      />
                      <input type="hidden" {...register(`addOns.${index}.id`)} />
                      <input type="hidden" {...register(`addOns.${index}.name`)} />
                      <input type="hidden" {...register(`addOns.${index}.price`, { valueAsNumber: true })} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{(field as any).name}</p>
                        <p className="text-xs text-gray-500">+${(field as any).price}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.addOns && <p className="text-xs text-red-500 mt-2">Invalid add-ons configuration</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Mowing Condition Factors</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-deep-red/5 border border-deep-red/10 rounded-2xl mb-4">
                  <div className="space-y-1">
                    <Label htmlFor="urgent-toggle" className="text-deep-red font-black uppercase tracking-widest text-xs">Urgent Booking</Label>
                    <p className="text-[10px] text-deep-red/60 font-bold uppercase">Priority Dispatch • +$60 Surcharge</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="urgent-toggle"
                    className="w-10 h-6 shrink-0 rounded-full appearance-none bg-charcoal/10 checked:bg-deep-red relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-1 before:left-1 checked:before:left-5 transition-all"
                    onChange={(e) => {
                      setValue('conditionFactors.urgency', e.target.checked ? 'urgent' : 'normal');
                    }}
                    checked={watchedValues.conditionFactors?.urgency === 'urgent'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time Since Last Mow</Label>
                  <Select {...register('conditionFactors.timeSinceLastMow')}>
                    <option value="under-2-weeks">Under 2 weeks</option>
                    <option value="2-4-weeks">2 to 4 weeks</option>
                    <option value="1-2-months">1 to 2 months</option>
                    <option value="over-2-months">Over 2 months</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grass Height</Label>
                  <Select {...register('conditionFactors.grassHeight')}>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="tall">Tall</option>
                    <option value="very-tall">Very Tall</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grass Thickness</Label>
                  <Select {...register('conditionFactors.thickness')}>
                    <option value="light">Light</option>
                    <option value="medium">Medium</option>
                    <option value="thick">Thick</option>
                    <option value="very-thick">Very Thick</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select {...register('conditionFactors.urgency')}>
                    <option value="normal">Normal</option>
                    <option value="priority">Priority (+ $25)</option>
                    <option value="urgent">Urgent (+ $60)</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pricing Override</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register('manualOverride')} id="manualOverride" />
                  <Label htmlFor="manualOverride">Manual Price Override</Label>
                </div>
                {watchedValues.manualOverride && (
                  <div className="space-y-2">
                    <Label>Manual Price ($)</Label>
                    <Input type="number" step="0.01" {...register('manualPrice')} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notes & Description</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Job Description</Label>
                  <Textarea {...register('description')} placeholder="Main service details..." />
                </div>
                <div className="space-y-2">
                  <Label>Package Notes</Label>
                  <Textarea {...register('packageNotes')} placeholder="Recurring inclusions/exclusions..." />
                </div>
                <div className="space-y-2">
                  <Label>Private Notes</Label>
                  <Textarea {...register('notes')} placeholder="Gate codes, pet info, etc..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Job Photos</CardTitle></CardHeader>
              <CardContent>
                <PhotoUpload 
                  jobId={tempJobId}
                  photos={watchedValues.photos || []} 
                  onChange={(newPhotos) => setValue('photos', newPhotos)} 
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-ochre/20 flex flex-col md:flex-row gap-4 lg:left-64 z-20">
          <div className="flex-1 flex items-center justify-center md:justify-start px-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-ochre uppercase tracking-widest">Estimated Total</span>
              <span className="text-2xl font-black text-deep-red">${(totalPrice || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-4 flex-1">
            <Button type="button" variant="outline" className="flex-1 border-ochre/20 text-ochre hover:bg-ochre/5 rounded-xl font-bold" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl font-bold shadow-lg" 
              isLoading={isSubmitting}
              onClick={() => Mythos.button("Create Job Pressed")}
            >
              {totalPrice === 0 && (watchedValues.serviceGrade === 'extreme' || watchedValues.billingType === 'quote-required')
                ? 'Create Job (Quote Required)'
                : `Create Job`}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
