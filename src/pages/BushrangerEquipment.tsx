
import React from "react";
import { Link } from "react-router-dom";
import { bushrangerEquipment } from "@/data/equipment";

export default function BushrangerEquipment() {
  return (
    <div className="min-h-screen bg-[#f5efe3] p-8 text-charcoal">
      <div className="max-w-7xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-xs font-black text-clay italic">Bushranger Field Review</p>
        <h1 className="text-4xl font-black italic uppercase mt-2">Bushranger Equipment Used by GrassRoots</h1>
        <p className="mt-4 max-w-4xl text-lg text-stone-700">
          GrassRoots Mowing Co uses Bushranger equipment in real Mount Isa conditions — heavy grass, dust, heat, rough yards, overgrown blocks, and community clean-up work.
        </p>

        <Link to="/equipment" className="inline-block mt-6 px-6 py-3 bg-deep-red text-white rounded-xl font-black uppercase">
          Back to Equipment Register
        </Link>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          {bushrangerEquipment.map((item) => (
            <div key={item.id} className="bg-white rounded-[2rem] p-7 shadow-sm border border-stone-200">
              <div className="h-52 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-500 font-bold mb-6">
                {item.image}
              </div>
              <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre">{item.model}</p>
              <h2 className="text-2xl font-black italic mt-2">{item.name}</h2>
              <p className="mt-4"><strong>Main use:</strong> {item.usedFor}</p>
              <p className="mt-3"><strong>Real Mount Isa performance:</strong> {item.mountIsaNotes}</p>
              <p className="mt-3"><strong>Review status:</strong> Field review footage to be added.</p>
              <div className="mt-5 rounded-2xl bg-black text-white p-4 font-bold">{item.video}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
