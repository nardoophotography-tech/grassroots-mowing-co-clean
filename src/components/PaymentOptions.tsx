import * as React from 'react';
import { getPaymentOptions } from '@/constants';
import { useSettings } from '@/hooks/useFirebase';

/**
 * Customer payment options block.
 *
 * Reads the PayID details from the Firestore `settings/business` document
 * (single source of truth) via useSettings(). Falls back to the defaults in
 * constants.ts only if that document has not been populated.
 *
 * Display only: this does NOT process payments and does NOT alter the existing
 * payment-link system. The payment link and cash remain available and unchanged.
 */
export const PaymentOptions = ({ className = '' }: { className?: string }) => {
  const { settings } = useSettings();
  const options = getPaymentOptions(settings);

  return (
    <div
      className={`rounded-2xl border border-secondary/30 bg-secondary/5 p-4 sm:p-5 ${className}`}
      data-testid="payment-options"
    >
      <p className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-secondary">
        {options.heading}
      </p>

      <p className="mt-2 text-[11px] sm:text-xs font-medium text-clay leading-relaxed">
        {options.instruction}
      </p>

      <p className="mt-1 text-base sm:text-lg font-black tracking-wide text-charcoal">
        {options.phone}
      </p>

      <p className="mt-3 text-[10px] sm:text-[11px] font-medium text-clay/80 leading-relaxed">
        {options.alternatives}
      </p>
    </div>
  );
};

export default PaymentOptions;
