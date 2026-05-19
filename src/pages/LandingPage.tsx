import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ShieldCheck, Star, CheckCircle2 } from 'lucide-react';
import { GrassRootsLogo } from '../components/GrassRootsLogo';
import { Card, CardContent } from '../components/ui/Card';

const highlights = [
  'Fast lawn mowing bookings',
  'Clear service windows',
  'Direct admin workflow',
];

const servicePoints = [
  'Residential lawns, acreage, and regular maintenance',
  'Morning and afternoon booking windows',
  'Job records saved to Firestore bookings',
];

export const LandingPage = () => {
  return (
    <main className="min-h-screen bg-background text-charcoal">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-35" />
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(31,77,58,0.18),transparent_58%),linear-gradient(180deg,rgba(244,233,216,0.98),rgba(244,233,216,0.9),rgba(244,233,216,0.7))]" />

        <div className="relative mx-auto max-w-7xl px-6 py-6 lg:px-10 lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <GrassRootsLogo showText className="scale-110" />
            <div className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-clay md:flex">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Secure booking and admin
            </div>
          </div>

          <div className="grid gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary shadow-sm">
                <CalendarDays className="h-4 w-4" />
                GrassRoots Mowing Co
              </p>
              <h1 className="mt-6 max-w-2xl text-5xl font-black tracking-tight text-charcoal sm:text-6xl lg:text-7xl">
                Lawn care that arrives on time and looks finished.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-clay sm:text-xl">
                Book a mowing service with clear windows, straight-through booking records, and a simple admin view for incoming jobs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {highlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-xs font-bold text-charcoal shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/booking"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-white shadow-premium transition-all hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  to="/admin"
                  className="inline-flex items-center justify-center rounded-md border-2 border-primary/20 bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/5"
                >
                  Admin Access
                </Link>
              </div>
            </div>

            <Card className="glass-card relative border-border/70 bg-surface/90">
              <CardContent className="p-8 lg:p-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-clay">Trusted local service</p>
                    <h2 className="text-2xl font-black tracking-tight">Simple from first tap</h2>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {servicePoints.map((point) => (
                    <div key={point} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
                      <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-clay">{point}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-border/60 bg-primary/5 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Next steps</p>
                  <p className="mt-2 text-sm leading-6 text-clay">
                    Choose a date, submit the job, and the request lands in the admin dashboard immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
