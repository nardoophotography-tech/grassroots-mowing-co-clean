import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GrassRootsLogo } from '../components/GrassRootsLogo';
import { CheckCircle2, ShieldCheck, CreditCard, ArrowLeft, Home } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export const InvoicePayment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'invoices', id), (snap) => {
      if (snap.exists()) {
        setInvoice({ id: snap.id, ...snap.data() } as Invoice);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const handlePayment = async () => {
    if (!invoice) return;
    setProcessing(true);
    try {
      console.log(`[Checkout]: Requesting session for Invoice ${invoice.id}`);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          clientName: invoice.clientName,
          clientEmail: '', 
          jobId: invoice.jobId,
          pricingSnapshot: {
            total: invoice.totalAmount || invoice.items?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0,
            packageName: `Invoice ${invoice.invoiceNumber}`,
            packageId: 'invoice'
          }
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        
        if (url) {
          window.location.href = url;
          return;
        } else {
          throw new Error('Server failed to provide a valid Checkout Session URL.');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment gateway connection failed.');
      }
    } catch (error: any) {
      console.error('[Checkout Error]:', error);
      toast.error(error.message || 'Payment system error. Please contact us.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = async () => {
    if (!invoice) return;
    setProcessing(true);
    try {
      const response = await fetch('/api/confirm-cash-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          jobId: invoice.jobId,
          clientName: invoice.clientName,
          clientEmail: '',
        })
      });
      if (!response.ok) throw new Error('Failed to update payment choice');
    } catch (error: any) {
      toast.error(error.message || 'Could not update to cash payment.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-deep-red border-t-transparent rounded-full" />
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <Home className="h-16 w-16 text-ochre mx-auto opacity-20" />
        <h1 className="text-2xl font-serif text-deep-red font-bold">Invoice Not Found</h1>
        <p className="text-charcoal/60">The invoice you're looking for doesn't exist or may have been archived.</p>
        <Button onClick={() => navigate('/')} className="bg-deep-red text-white">Go to Website</Button>
      </div>
    </div>
  );

  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full border-ochre/20 shadow-2xl">
          <CardContent className="pt-12 pb-12">
            <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-serif text-deep-red font-bold mb-2">Invoice Paid</h1>
            <p className="text-charcoal/60 mb-8">This invoice ({invoice.invoiceNumber}) was paid on {format(invoice.paidAt || Date.now(), 'PPP')}.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="border-ochre/20">Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invoice.status === 'pending-cash') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full border-ochre/20 shadow-2xl">
          <CardContent className="pt-12 pb-12">
            <CheckCircle2 className="h-20 w-20 text-ochre mx-auto mb-6" />
            <h1 className="text-2xl font-serif text-deep-red font-bold mb-2">Pending Cash Payment</h1>
            <p className="text-charcoal/60 mb-8">This invoice ({invoice.invoiceNumber}) is scheduled to be paid in cash on completion.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="border-ochre/20">Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-12 px-4 md:px-0 relative overflow-hidden">
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
          className="text-charcoal hover:bg-ochre/10 h-10 w-10 rounded-full border border-ochre/20 p-0 flex items-center justify-center"
          title="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-charcoal hover:bg-ochre/10 h-10 w-10 rounded-full border border-ochre/20 p-0 flex items-center justify-center"
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-w-xl mx-auto space-y-8 relative z-10">
        <div className="flex justify-center mb-8">
          <GrassRootsLogo className="h-16 w-auto" />
        </div>

        <Card className="border-ochre/20 shadow-2xl overflow-hidden rounded-2xl bg-white">
          <div className="h-2 bg-deep-red" />
          <CardHeader className="bg-ochre/5 border-b border-ochre/10 pt-8">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-serif text-deep-red">{invoice.invoiceNumber}</CardTitle>
                <p className="text-[10px] font-black text-ochre uppercase tracking-widest mt-1">Invoice for Service</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-charcoal">${invoice.totalAmount.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mt-1">Total Due</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[9px] font-black text-ochre uppercase tracking-widest mb-3">Service At</p>
                <p className="text-sm font-bold text-charcoal leading-relaxed">{invoice.clientAddress}</p>
                <p className="text-xs text-charcoal/60">{invoice.clientName}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-ochre uppercase tracking-widest mb-3">Issued Date</p>
                <p className="text-sm font-bold text-charcoal">{format(invoice.createdAt, 'MMM d, yyyy')}</p>
                <p className="text-[9px] font-black text-deep-red uppercase tracking-widest mt-2">Status: Outstanding</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-ochre/5">
              <p className="text-[9px] font-black text-ochre uppercase tracking-widest mb-4">Breakdown</p>
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-charcoal/70">{item.description}</span>
                  <span className="font-bold text-charcoal">${item.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-4 mt-4 border-t border-ochre/20">
                <span className="font-black text-charcoal uppercase text-xs tracking-widest">Total AUD</span>
                <span className="text-xl font-black text-deep-red">${invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-8 space-y-4">
              <Button 
                onClick={handlePayment} 
                className="w-full h-16 bg-deep-red hover:bg-deep-red/90 text-white font-bold text-lg rounded-xl shadow-xl transition-all flex items-center justify-center gap-3"
                disabled={processing}
              >
                <CreditCard className="h-6 w-6" />
                {processing ? 'Launching Secure Portal...' : 'Pay with Card / Apple / Google'}
              </Button>

              <Button
                onClick={handleCashPayment}
                variant="outline"
                className="w-full h-12 border-ochre/20 text-charcoal hover:bg-ochre/5 font-bold rounded-xl transition-all flex items-center justify-center gap-3"
                disabled={processing}
              >
                Or Pay Cash on Completion
              </Button>
              
              <div className="flex items-center justify-center gap-4 text-charcoal/40 py-2">
                <div className="flex items-center gap-1.5 grayscale opacity-50">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">PCI Secure Payment</span>
                </div>
                <div className="h-1 w-1 bg-ochre/20 rounded-full" />
                <div className="flex items-center gap-1.5 grayscale opacity-50">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Powered by Stripe</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="text-[10px] font-black uppercase tracking-[0.2em] text-ochre hover:text-deep-red"
            >
              <ArrowLeft className="h-3 w-3 mr-2" /> Return to Website
            </Button>
        </div>
      </div>
    </div>
  );
};
