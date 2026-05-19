import { Link } from "react-router-dom";

export default function SplashPage() {
  return (
    <main className="min-h-screen bg-[#e8decd] flex items-center justify-center px-6">
      <div className="text-center">

        <img
          src="/logo.png"
          alt="GrassRoots Mowing Co"
          className="mx-auto mb-8 w-full max-w-2xl drop-shadow-2xl"
        />

        <Link
          to="/app"
          className="inline-block rounded-2xl bg-green-800 px-10 py-5 text-2xl font-bold text-white shadow-xl transition hover:scale-105 hover:bg-green-900"
        >
          ENTER
        </Link>

      </div>
    </main>
  );
}