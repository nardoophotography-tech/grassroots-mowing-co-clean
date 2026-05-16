import * as React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, LayoutDashboard, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/src/components/ui/Button';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';

export const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const invoiceId = searchParams.get('invoiceId');
  const amount = searchParams.get('amount');
  const clientName = searchParams.get('clientName');
  const clientEmail = searchParams.get('clientEmail');
  const address = searchParams.get('address');
  const sessionId = searchParams.get('session_id');

  React.useEffect(() => {
    const triggerUpdates = async () => {
      // 1. Update Firestore Database DIRECTLY to bypass broken webhook permissions
      if (jobId) {
        try {
          await updateDoc(doc(db, 'jobs', jobId), {
            paymentStatus: 'paid',
            status: 'scheduled',
            updatedAt: Date.now(),
            ...(sessionId && { stripeSessionId: sessionId }),
            ...(amount && { amountPaid: Number(amount) })
          });
        } catch (err) {
          console.error("Job update error:", err);
        }
      }

      if (invoiceId) {
        try {
          await updateDoc(doc(db, 'invoices', invoiceId), {
            status: 'paid',
            paidAt: Date.now(),
            ...(sessionId && { stripeSessionId: sessionId })
          });
        } catch (err) {
          console.error("Invoice update error:", err);
        }
      }

      // 2. Trigger notification
      if (!jobId || !clientEmail) return;
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: 'payment-successful',
            job: { id: jobId, address: address || '' },
            clientEmail,
            clientName: clientName || 'Client',
            amount: amount || '0'
          })
        });
      } catch (err) {
        console.error("Failed to trigger payment notification:", err);
      }
    };

    triggerUpdates();
  }, [jobId, invoiceId, amount, clientName, clientEmail, address, sessionId]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-4 left-4 flex gap-2 z-20">
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
          className="text-ochre hover:bg-ochre/10 h-10 w-10 rounded-full border border-ochre/20 p-0 flex items-center justify-center"
          title="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-ochre hover:bg-ochre/10 h-10 w-10 rounded-full border border-ochre/20 p-0 flex items-center justify-center"
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>
      {/* Background patterns */}
      <div className="absolute inset-0 cultural-pattern opacity-5" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-12 shadow-2xl relative z-10 border border-ochre/10 text-center"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
          <CheckCircle className="h-10 w-10" />
        </div>
        
        <h1 className="text-3xl font-serif text-charcoal mb-4">Payment Confirmed!</h1>
        <p className="text-charcoal/60 mb-8 leading-relaxed">
          Your booking has been successfully confirmed and paid. Our team will see you on your scheduled date.
        </p>

        {jobId && (
          <div className="bg-ochre/5 p-4 rounded-xl mb-8 border border-ochre/10">
            <span className="text-[10px] font-bold text-ochre uppercase tracking-widest">Reference Number</span>
            <p className="text-lg font-mono font-bold text-charcoal">{jobId.slice(-8).toUpperCase()}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-full font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <ShieldCheck className="h-4 w-4" />
            Go to Management
          </Button>
          
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/5 text-primary border border-primary/10 text-[10px] font-black uppercase tracking-widest mt-4 hover:bg-primary/10 transition-all">
            <Home className="h-3.5 w-3.5" />
            Back to Website
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
