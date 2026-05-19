import { Link } from "react-router-dom";
import { defaultBranding } from "../lib/branding";

export default function LandingPage() {
  const branding = defaultBranding;

  return (
    <main className="min-h-screen bg-[#e8decd] text-[#1f2937]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-12 text-center">
        <img
          src={branding.logoUrl}
          alt={branding.businessName}
          className="mb-8 w-full max-w-md drop-shadow-2xl"
        />

        <h1 className="text-5xl font-black leading-tight md:text-7xl">
          {branding.businessName}
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-700 md:text-2xl">
          {branding.heroSubtitle}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/booking"
            className="rounded-2xl bg-green-800 px-10 py-5 text-lg font-bold text-white shadow-xl transition hover:scale-105 hover:bg-green-900"
          >
            {branding.primaryButtonText}
          </Link>

          <Link
            to="/admin"
            className="rounded-2xl border-2 border-slate-800 px-10 py-5 text-lg font-bold transition hover:bg-slate-900 hover:text-white"
          >
            {branding.secondaryButtonText}
          </Link>
        </div>
      </section>
    </main>
  );
}