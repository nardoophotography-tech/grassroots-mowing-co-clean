import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <nav className="sticky top-0 z-50 border-b border-primary/20 bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-charcoal text-white"
            title="Go Back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-black uppercase">Back</span>
          </Button>
          <h1 className="text-lg font-black text-charcoal uppercase italic">Terms of Service</h1>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <section className="space-y-4">
          <h2 className="text-3xl font-black text-charcoal uppercase italic">
            GrassRoots Mowing Co Terms
          </h2>
          <div className="prose prose-sm max-w-none space-y-4 text-charcoal font-medium leading-relaxed">
            <p>
              Service bookings, quotes, payments, cancellations, property access, and client responsibilities are subject to GrassRoots Mowing Co service terms.
            </p>
            <p>
              Full legal terms to be added.
            </p>
          </div>
        </section>

        <section className="bg-white border border-border rounded-2xl p-8">
          <h3 className="text-lg font-black text-primary uppercase italic mb-4">Service Agreement</h3>
          <p className="text-sm text-clay font-medium">
            By using our booking and service platform, you agree to abide by GrassRoots Mowing Co's terms and service conditions.
          </p>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-300 py-8 px-6 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto text-center text-xs font-bold uppercase tracking-widest">
          <p>© {new Date().getFullYear()} GrassRoots Mowing Co. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
