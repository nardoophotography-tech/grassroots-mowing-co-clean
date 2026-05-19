import { Link } from "react-router-dom";
import { defaultBranding as branding } from "../lib/branding";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#e8decd] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 text-center">

        <img
          src={branding.logoUrl}
          alt={branding.businessName}
          className="mb-8 w-full max-w-2xl drop-shadow-2xl"
        />

        <h1 className="text-5xl font-black leading-tight md:text-7xl">
          {branding.businessName}
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-slate-700 md:text-2xl">
          {branding.heroSubtitle}
        </p>

        <div className="mt-10 flex items-center justify-center">
          <Link
            to="/booking"
            className="rounded-2xl bg-green-800 px-10 py-5 text-lg font-bold text-white shadow-xl transition hover:scale-105 hover:bg-green-900"
          >
            BOOK NOW
          </Link>
        </div>

      </section>
    </main>
  );
}