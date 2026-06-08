
import React from "react";
import { Link } from "react-router-dom";
import { equipmentItems } from "@/data/equipment";

export default function EquipmentRegister() {
  return (
    <div className="min-h-screen bg-[#f5efe3] p-8 text-charcoal">
      <div className="max-w-7xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-xs font-black text-clay italic">GrassRoots Equipment Command</p>
        <h1 className="text-4xl font-black italic uppercase mt-2">Equipment Register</h1>
        <p className="mt-4 max-w-3xl text-lg text-stone-700">
          Full register of equipment used by GrassRoots Mowing Co in real Mount Isa conditions.
        </p>

        <Link to="/equipment/bushranger" className="inline-block mt-6 px-6 py-3 bg-forest text-white rounded-xl font-black uppercase">
          Open Bushranger Page
        </Link>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-10">
          {equipmentItems.map((item) => (
            <div key={item.id} className="bg-white rounded-[2rem] p-7 shadow-sm border border-stone-200">
              <div className="h-44 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-500 font-bold mb-6">
                {item.image}
              </div>
              <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre">{item.brand} · {item.category}</p>
              <h2 className="text-2xl font-black italic mt-2">{item.name}</h2>
              <p className="mt-2 text-sm text-stone-500">Model: {item.model}</p>
              <p className="mt-4"><strong>Used for:</strong> {item.usedFor}</p>
              <p className="mt-3"><strong>Mount Isa notes:</strong> {item.mountIsaNotes}</p>
              <div className="mt-5 rounded-2xl bg-black text-white p-4 font-bold">{item.video}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
