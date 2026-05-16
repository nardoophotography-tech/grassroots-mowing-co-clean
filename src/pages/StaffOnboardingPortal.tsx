import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Label } from '@/src/components/ui/Label';
import { ShieldCheck, UserCircle, CreditCard, CheckCircle2 } from 'lucide-react';
import { GrassRootsLogo } from '@/src/components/GrassRootsLogo';

export const StaffOnboardingPortal = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<any>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const [agreed, setAgreed] = React.useState(false);
  
  React.useEffect(() => {
    const verifyToken = async () => {
      if (!token) return navigate('/');
      try {
        const response = await fetch(`/api/onboarding/${token}`);
        if (response.ok) {
          const { session } = await response.json();
          setSession(session);
        } else {
          const err = await response.json();
          toast.error(err.error || 'Invalid or expired link.');
          navigate('/');
        }
      } catch (err: any) {
        console.error('Validation error fallback');
        toast.error('Could not validate session.');
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token, navigate]);

  const onSubmit = async (data: any) => {
    if (!agreed) {
      toast.error('You must accept the employment agreement and policies.');
      return;
    }
    
    try {
      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          data: {
            address: data.address,
            emergencyName: data.emergencyName,
            emergencyPhone: data.emergencyPhone,
            taxFileNumber: data.taxFileNumber,
            superFund: data.superFund,
            superMemberId: data.superMemberId,
            bankBsb: data.bankBsb,
            bankAccount: data.bankAccount
          } 
        })
      });

      if (response.ok) {
        toast.success('Onboarding complete! Your details have been securely submitted.');
        setSession({ ...session, used: true });
      } else {
        const err = await response.json();
        toast.error(err.error || 'Error submitting details.');
      }
    } catch (err: any) {
      toast.error('Error submitting details.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-4 border-deep-red border-t-transparent" />
      </div>
    );
  }

  if (session?.used) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-ochre/20 shadow-2xl bg-white">
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-serif text-deep-red font-bold mb-2">Setup Complete</h1>
            <p className="text-charcoal/60">Your secure HR and payroll details have been submitted directly to management. You will receive further instructions shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-center">
          <GrassRootsLogo className="h-16 w-auto" />
        </div>

        <Card className="border-ochre/20 shadow-2xl overflow-hidden rounded-2xl bg-white">
           <div className="h-2 bg-deep-red" />
           <CardHeader className="bg-ochre/5 border-b border-ochre/10 pt-8 pb-8">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-deep-red/10 flex items-center justify-center text-deep-red">
                  <UserCircle className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-serif text-deep-red">Employee Onboarding</CardTitle>
                  <p className="text-sm font-medium text-charcoal/60 mt-1">Welcome aboard, {session?.name}! Please complete your secure profile.</p>
                </div>
             </div>
           </CardHeader>

           <CardContent className="p-8">
             <div className="flex items-center gap-3 p-4 mb-8 bg-green-50 text-green-800 rounded-lg border border-green-200">
               <ShieldCheck className="h-6 w-6 shrink-0" />
               <p className="text-xs font-medium leading-relaxed">
                 You are completing this via a secure 256-bit encrypted link. Your sensitive banking, TFN, and HR data is deposited directly into the admin vault and is not stored in your browser.
               </p>
             </div>

             <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
               
               {/* 1. Basic Details */}
               <div className="space-y-6">
                 <div className="flex items-center gap-2 border-b border-ochre/10 pb-2">
                   <UserCircle className="h-5 w-5 text-ochre" />
                   <h3 className="text-lg font-serif text-deep-red font-bold">Personal & Emergency</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">Residential Address</Label>
                     <Input {...register('address', { required: true })} className="border-ochre/20" placeholder="123 Example Street, Suburb" />
                   </div>
                   <div className="space-y-2">
                     <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">Emergency Contact Name</Label>
                     <Input {...register('emergencyName', { required: true })} className="border-ochre/20" />
                   </div>
                   <div className="space-y-2">
                     <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">Emergency Contact Phone</Label>
                     <Input {...register('emergencyPhone', { required: true })} className="border-ochre/20" />
                   </div>
                 </div>
               </div>

               {/* 2. Tax & Payroll */}
               <div className="space-y-6">
                 <div className="flex items-center gap-2 border-b border-ochre/10 pb-2">
                   <CreditCard className="h-5 w-5 text-ochre" />
                   <h3 className="text-lg font-serif text-deep-red font-bold">Tax & Payroll</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">Tax File Number (TFN)</Label>
                     <Input type="password" {...register('taxFileNumber', { required: true })} className="border-ochre/20" placeholder="9-digit TFN" />
                   </div>
                   <div className="space-y-2">
                     <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">Superannuation Fund Name</Label>
                     <Input {...register('superFund', { required: true })} className="border-ochre/20" />
                   </div>
                   <div className="space-y-2">
                     <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">Super Member Number</Label>
                     <Input {...register('superMemberId', { required: true })} className="border-ochre/20" />
                   </div>
                   <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-ochre/5">
                      <div className="space-y-2 md:col-span-1">
                        <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">BSB</Label>
                        <Input {...register('bankBsb', { required: true })} className="border-ochre/20" placeholder="000-000" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="uppercase text-[10px] tracking-widest text-ochre font-black">Account Number</Label>
                        <Input {...register('bankAccount', { required: true })} className="border-ochre/20" />
                      </div>
                   </div>
                 </div>
               </div>

               {/* 3. Compliance and Sign off */}
               <div className="pt-6 border-t border-ochre/10">
                 <div className="bg-ochre/5 p-6 rounded-xl border border-ochre/10 space-y-4">
                   <h4 className="font-serif text-deep-red font-bold">Employment Agreement & OHS Policy</h4>
                   <p className="text-sm text-charcoal/70 leading-relaxed">
                     By checking the box below, you digitally sign and accept the GrassRoots Mowing Co Employment Standards, Confidentiality Agreement, and Occupational Health & Safety (OHS) Guidelines. You declare that the financial and tax information provided is accurate and true.
                   </p>
                   <label className="flex items-start gap-3 mt-4 cursor-pointer">
                     <input 
                       type="checkbox" 
                       className="mt-1 h-5 w-5 rounded border-ochre/30 text-deep-red focus:ring-deep-red"
                       checked={agreed}
                       onChange={(e) => setAgreed(e.target.checked)}
                     />
                     <span className="text-sm font-bold text-charcoal">I accept the terms and digitally sign my onboarding package.</span>
                   </label>
                 </div>
               </div>

               <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full h-14 text-lg font-bold bg-deep-red text-white hover:bg-deep-red/90 rounded-xl"
               >
                 Submit Secure Onboarding Package
               </Button>
             </form>

           </CardContent>
        </Card>
      </div>
    </div>
  );
};
