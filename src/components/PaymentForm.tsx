import * as React from 'react';
import { 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { Button } from './ui/Button';
import { toast } from 'react-hot-toast';

interface PaymentFormProps {
  amount: number;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ 
  amount, 
  onSuccess, 
  onCancel,
  isProcessing: externalProcessing 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [internalProcessing, setInternalProcessing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const isAnyProcessing = externalProcessing || internalProcessing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setInternalProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL is required but we handle success in the same page flow 
        // if we use confirmPayment with redirect: 'if_required'
        return_url: `${window.location.origin}/booking-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'An unexpected error occurred.');
      toast.error(error.message || 'Payment failed');
      setInternalProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success('Payment authorized successfully!');
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-ochre/10 shadow-sm">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={isAnyProcessing}
          className="flex-1 border-ochre/20 text-ochre hover:bg-ochre/5 rounded-xl h-12 font-bold"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isAnyProcessing}
          className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold shadow-lg"
          isLoading={isAnyProcessing}
        >
          Pay ${amount.toFixed(2)} & Book
        </Button>
      </div>
      
      <p className="text-[10px] text-center text-charcoal/40 font-medium uppercase tracking-widest">
        Secure Transaction via Stripe
      </p>
    </form>
  );
};
