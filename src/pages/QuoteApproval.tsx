import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs, useSettings } from '@/src/hooks/useFirebase';
import { Button } from '@/src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/src/components/ui/Card';
import { CheckCircle2, XCircle, Info, MapPin, Calendar, Clock, ClipboardList, TrendingUp, CreditCard, DollarSign, Home, ArrowLeft } from 'lucide-react';
import { GrassRootsLogo } from '@/src/components/GrassRootsLogo';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';

export const QuoteApproval = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { jobs, loading: jobsLoading } = useJobs();
  const { settings } = useSettings();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'card' | 'cash'>('card');

  const job = jobs.find(j => j.id === jobId);

  if (jobsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-deep-red border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Card className="max-w-md w-full text-center p-8">
          <XCircle className="h-12 w-12 text-deep-red mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-charcoal mb-2">Quote Not Found</h2>
          <p className="text-charcoal/60 mb-6">This quote link may be expired or incorrect.</p>
          <Button onClick={() => navigate('/')} className="bg-deep-red text-white">Return Home</Button>
        </Card>
      </div>
    );
  }

  const snapshot = job.pricingSnapshot;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      if (!jobId) throw new Error('No job ID');
      
      const payload: any = {
        quoteStatus: 'approved',
        quoteApprovedAt: Date.now(),
        updatedAt: Date.now()
      };

      if (paymentMethod === 'cash') {
        payload.paymentMethod = 'cash';
        payload.paymentStatus = 'pending-cash';
        payload.status = 'scheduled';
      } else {
        payload.status = 'scheduled';
      }

      await updateDoc(doc(db, 'jobs', jobId), payload);
      
      toast.success('Quote approved! We will contact you shortly.');
      
      // If payment is required and not paid, redirect to payment
      if (job.paymentStatus !== 'paid' && !job.paymentId && job.price > 0) {
          if (paymentMethod === 'card') {
            const checkoutResponse = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job.id,
                    clientEmail: job.clientEmail,
                    clientName: job.clientName,
                    pricingSnapshot: {
                      packageId: job.pricingSnapshot?.packageId,
                      packageName: job.pricingSnapshot?.packageName,
                      total: job.pricingSnapshot?.total || job.price,
                      basePrice: job.pricingSnapshot?.basePrice,
                      addOnTotal: job.pricingSnapshot?.addOnTotal,
                    },
                    total: job.price
                })
            });
            const { url } = await checkoutResponse.json();
            if (url) window.location.href = url;
          } else {
            const checkoutResponse = await fetch('/api/confirm-cash-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job.id,
                    clientEmail: job.clientEmail,
                    clientName: job.clientName,
                    pricingSnapshot: {
                      packageId: job.pricingSnapshot?.packageId,
                      packageName: job.pricingSnapshot?.packageName,
                      total: job.pricingSnapshot?.total || job.price,
                    }
                })
            });
            if (!checkoutResponse.ok) throw new Error("Failed to enroll cash payment");
          }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      if (!jobId) throw new Error('No job ID');
      await updateDoc(doc(db, 'jobs', jobId), {
        quoteStatus: 'rejected',
        quoteRejectedAt: Date.now(),
        status: 'cancelled',
        updatedAt: Date.now()
      });
      toast.success('Quote rejected.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-12 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="bg-deep-red text-white py-8 px-4 mb-8 relative">
        <div className="absolute top-4 left-4 flex gap-2">
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
            className="text-white hover:bg-white/10 h-10 w-10 rounded-full border border-white/20 p-0 flex items-center justify-center"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <GrassRootsLogo className="h-12 w-auto mb-6" />
          <h1 className="text-3xl font-bold font-serif mb-2">Service Quote</h1>
          <p className="text-ochre uppercase tracking-widest text-xs font-bold">{settings?.serviceLocation || 'Mount Isa'}'s Premium Lawn Care</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-ochre/20 shadow-xl overflow-hidden">
              <CardHeader className="bg-ochre/5 border-b border-ochre/10">
                <CardTitle className="flex items-center gap-2 text-deep-red font-serif">
                  <ClipboardList className="h-5 w-5" />
                  Quote Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-ochre uppercase tracking-widest">Property</p>
                    <p className="font-bold text-charcoal">{job.address}</p>
                    <p className="text-sm text-charcoal/60">{job.suburb}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-ochre uppercase tracking-widest">Desired Date</p>
                    <p className="font-bold text-charcoal">{format(new Date(job.scheduledDate), 'EEEE, MMM d')}</p>
                    <p className="text-sm text-charcoal/60 capitalize text-ochre font-bold">{job.timeSlot} Slot</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-ochre/10">
                  <p className="text-[10px] font-black text-ochre uppercase tracking-widest mb-3">Service Scope</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white border border-ochre/10 rounded-xl">
                      <div className="w-10 h-10 bg-deep-red/5 rounded-full flex items-center justify-center text-deep-red">
                         <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-charcoal capitalize">{job.servicePackage?.replace(/_/g, ' ')} Package</p>
                        <p className="text-[10px] text-charcoal/50 leading-tight">Professional equipment & signature finish</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white border border-ochre/10 rounded-xl">
                      <div className="w-10 h-10 bg-ochre/10 rounded-full flex items-center justify-center text-ochre">
                         <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-charcoal capitalize">{job.serviceGrade} Condition Grade</p>
                        <p className="text-[10px] text-charcoal/50 leading-tight">Itemized for property specific conditions</p>
                      </div>
                    </div>
                  </div>
                </div>

                {job.addOns.filter(a => a.selected).length > 0 && (
                  <div className="pt-6 border-t border-ochre/10">
                    <p className="text-[10px] font-black text-ochre uppercase tracking-widest mb-3">Selected Add-ons</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       {job.addOns.filter(a => a.selected).map(addon => (
                        <div key={addon.id} className="flex items-center gap-2 p-2 bg-ochre/5 rounded-lg border border-ochre/10">
                          <CheckCircle2 className="h-3 w-3 text-ochre" />
                          <span className="text-xs font-bold text-charcoal capitalize">{addon.name}</span>
                        </div>
                       ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pricing Summary */}
          <div className="lg:col-span-1">
            <Card className="border-ochre/20 shadow-2xl sticky top-8 overflow-hidden">
              <CardHeader className="bg-charcoal text-white border-b border-ochre/10">
                <CardTitle className="text-lg font-serif">Pricing Snapshot</CardTitle>
                <p className="text-[10px] font-bold text-ochre/80 uppercase tracking-[0.2em] mt-1">Live Engine Authority</p>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {snapshot ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-charcoal/60">Base Package</span>
                      <span className="font-bold text-charcoal">${snapshot.basePrice.toFixed(2)}</span>
                    </div>
                    {snapshot.tierAdjustment !== 0 && (
                      <div className="flex justify-between text-xs italic">
                        <span className="text-charcoal/60">{snapshot.tierName} Adjustment</span>
                        <span className={cn("font-bold", snapshot.tierAdjustment > 0 ? "text-deep-red" : "text-green-600")}>
                          {snapshot.tierAdjustment > 0 ? '+' : ''}${snapshot.tierAdjustment.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(snapshot.gradeAdjustment !== 0 || snapshot.conditionSurcharge !== 0 || snapshot.urgencySurcharge !== 0) && (
                      <div className="flex justify-between text-xs">
                        <span className="text-charcoal/60">Condition Surcharges</span>
                        <span className="font-bold text-deep-red">+${(snapshot.gradeAdjustment + snapshot.conditionSurcharge + snapshot.urgencySurcharge).toFixed(2)}</span>
                      </div>
                    )}
                    {snapshot.addOnTotal > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-charcoal/60">Add-ons Total</span>
                        <span className="font-bold text-deep-red">+${snapshot.addOnTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-ochre/20 flex justify-between items-center">
                      <span className="text-sm font-black text-charcoal uppercase tracking-widest">Total Quote</span>
                      <span className="text-2xl font-black text-deep-red">${snapshot.total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm font-black text-deep-red uppercase tracking-widest">Total: ${job.price.toFixed(2)}</p>
                  </div>
                )}

                <div className="bg-ochre/5 p-4 rounded-xl border border-ochre/10 mt-4">
                  <div className="flex gap-2 mb-2">
                    <Info className="h-4 w-4 text-ochre shrink-0" />
                    <p className="text-[10px] text-charcoal/70 leading-relaxed italic">
                      This quote is valid for 7 days. Approval triggers job scheduling and payment processing.
                    </p>
                  </div>
                </div>

                {job.quoteStatus === 'approved' ? (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-green-800">Quote Approved!</p>
                    <p className="text-[10px] text-green-600">Approved on {format(new Date(job.quoteApprovedAt || Date.now()), 'PPp')}</p>
                  </div>
                ) : job.quoteStatus === 'rejected' ? (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-red-800">Quote Rejected</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div 
                        onClick={() => setPaymentMethod('card')}
                        className={`cursor-pointer rounded-xl p-3 border-2 transition-all ${paymentMethod === 'card' ? 'border-deep-red bg-deep-red/5' : 'border-ochre/20 hover:border-ochre/50'}`}
                      >
                        <CreditCard className={`h-6 w-6 mb-2 ${paymentMethod === 'card' ? 'text-deep-red' : 'text-charcoal/40'}`} />
                        <h3 className="font-bold text-xs text-charcoal leading-tight">Pay Card</h3>
                      </div>
                      <div 
                        onClick={() => setPaymentMethod('cash')}
                        className={`cursor-pointer rounded-xl p-3 border-2 transition-all ${paymentMethod === 'cash' ? 'border-deep-red bg-deep-red/5' : 'border-ochre/20 hover:border-ochre/50'}`}
                      >
                        <DollarSign className={`h-6 w-6 mb-2 ${paymentMethod === 'cash' ? 'text-deep-red' : 'text-charcoal/40'}`} />
                        <h3 className="font-bold text-xs text-charcoal leading-tight">Pay Cash</h3>
                      </div>
                    </div>

                    <Button 
                      onClick={handleApprove} 
                      isLoading={isProcessing}
                      className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-12 rounded-xl font-bold uppercase tracking-widest text-xs"
                    >
                      ✔ Approve Quote & {paymentMethod === 'card' ? 'Pay Now' : 'Pay On Day'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleReject} 
                      disabled={isProcessing}
                      className="w-full border-ochre/30 text-ochre hover:bg-ochre/5 h-12 rounded-xl font-bold uppercase tracking-widest text-xs"
                    >
                      ❌ Reject Quote
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer Watermark */}
      <div className="max-w-4xl mx-auto px-4 mt-12 text-center text-charcoal/20">
         <p className="text-xs uppercase tracking-[0.5em] font-black">GrassRoots Precision Mowing</p>
      </div>
    </div>
  );
};
