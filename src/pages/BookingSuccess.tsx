import * as React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Home, ShieldCheck, ArrowLeft, Loader2, Download, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const invoiceId = searchParams.get('invoiceId');
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    let interval: any;
    const fetchData = async () => {
      try {
        if (jobId) {
          const snap = await getDoc(doc(db, 'jobs', jobId));
          if (snap.exists()) {
            const jobData = snap.data();
            setData(jobData);
            if (jobData.invoicePdfUrl) {
              clearInterval(interval);
            }
          }
        } else if (invoiceId) {
          const snap = await getDoc(doc(db, 'invoices', invoiceId));
          if (snap.exists()) {
            const invData = snap.data();
            setData(invData);
            if (invData.invoicePdfUrl) {
              clearInterval(interval);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching success data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Poll every 3 seconds for the invoice URL to appear
    interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, [jobId, invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-ochre animate-spin mb-4" />
        <p className="text-charcoal/60 font-serif">Verifying payment status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-4 left-4 flex gap-2 z-20">
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
        <p className="text-charcoal/60 mb-8 leading-relaxed text-sm">
          Thank you for your payment. Your booking has been successfully confirmed and your account is up to date.
        </p>

        <div className="bg-ochre/5 p-6 rounded-2xl mb-8 border border-ochre/10 text-left">
          <div className="mb-4">
            <span className="text-[10px] font-bold text-ochre uppercase tracking-widest block mb-1">Reference</span>
            <p className="text-lg font-mono font-bold text-charcoal">{(jobId || invoiceId || '').slice(-8).toUpperCase()}</p>
          </div>
          
          {data?.address && (
            <div className="mb-4">
              <span className="text-[10px] font-bold text-ochre uppercase tracking-widest block mb-1">Service Location</span>
              <p className="text-sm text-charcoal/80 font-medium leading-tight">{data.address}</p>
            </div>
          )}

          <div className="flex justify-between items-end border-t border-ochre/10 pt-4 mt-2">
            <div>
              <span className="text-[10px] font-bold text-ochre uppercase tracking-widest block mb-1">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold uppercase tracking-wider">
                PAID & CONFIRMED
              </span>
            </div>
            {data?.amountPaid && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-ochre uppercase tracking-widest block mb-1">Amount</span>
                <p className="text-xl font-bold text-charcoal">${data.amountPaid.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {data?.invoicePdfUrl ? (
            <Button 
              variant="outline"
              onClick={() => window.open(data.invoicePdfUrl, '_blank')}
              className="w-full border-ochre/20 text-ochre hover:bg-ochre/5 h-12 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Tax Invoice
            </Button>
          ) : (
            invoiceId && (
              <Button 
                variant="outline"
                onClick={() => navigate(`/pay/${invoiceId}`)}
                className="w-full border-ochre/20 text-ochre hover:bg-ochre/5 h-12 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                View Invoice Details
              </Button>
            )
          )}

          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <ShieldCheck className="h-4 w-4" />
            Go to My Bookings
          </Button>
          
          <Link to="/" className="inline-block text-primary text-[10px] font-black uppercase tracking-widest mt-4 hover:underline">
            Back to Website
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
