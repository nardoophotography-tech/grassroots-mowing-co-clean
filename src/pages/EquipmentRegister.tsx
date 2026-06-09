import React from "react";
import { Link } from "react-router-dom";
import { useEquipment, publicServiceCount } from "@/data/equipmentStore";

export default function EquipmentRegister() {
  const items = useEquipment();

  return (
    <div className="min-h-screen bg-[#f5efe3] p-8 text-charcoal">
      <div className="max-w-7xl mx-auto">
        <p className="uppercase tracking-[0.3em] text-xs font-black text-clay italic">GrassRoots Equipment Command</p>
        <h1 className="text-4xl font-black italic uppercase mt-2">Equipment Register</h1>
        <p className="mt-4 max-w-3xl text-lg text-stone-700">
          Full register of equipment used by GrassRoots Mowing Co in real Mount Isa conditions.
        </p>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link to="/equipment/bushranger" className="inline-block px-6 py-3 bg-forest text-white rounded-xl font-black uppercase">
            Open Bushranger Page
          </Link>
          <Link to="/admin/equipment" className="inline-block px-6 py-3 bg-deep-red text-white rounded-xl font-black uppercase">
            Manage Equipment (Admin)
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 py-20 text-center border-2 border-dashed border-stone-300 rounded-[2rem] bg-white/50">
            <p className="font-serif text-lg text-stone-500">No equipment records yet. Add some in the admin manager.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-10">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/equipment/${item.id}`}
                className="bg-white rounded-[2rem] p-7 shadow-sm border border-stone-200 hover:shadow-xl transition-all block"
              >
                <div className="h-44 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-500 font-bold mb-6 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    "No field photo added yet"
                  )}
                </div>
                <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre">{item.brand} · {item.category}</p>
                <h2 className="text-2xl font-black italic mt-2">{item.name}</h2>
                <p className="mt-2 text-sm text-stone-500">Model: {item.model || "—"}</p>
                <p className="mt-4"><strong>Used for:</strong> {item.usedFor || "—"}</p>
                <p className="mt-3"><strong>Mount Isa notes:</strong> {item.mountIsaNotes || "—"}</p>
                <p className="mt-3 text-sm font-bold text-forest">Public service records: {publicServiceCount(item)}</p>
                <p className="mt-5 text-xs font-black tracking-[0.25em] text-deep-red uppercase">View Details</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
