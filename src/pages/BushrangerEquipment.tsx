import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Trash2, X, Pencil, Image as ImageIcon, Video, Wrench, Eye } from "lucide-react";
import { useEquipment, publicServiceCount } from "@/data/equipmentStore";
import { useBushrangerList, bushrangerList } from "@/data/bushrangerList";
import { useAuth } from "@/contexts/AuthContext";

const money = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

export default function BushrangerEquipment() {
  const all = useEquipment();
  const items = all.filter((item) => (item.brand || "").toLowerCase() === "bushranger");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  // Cost-noted Bushranger list (seeded from the Atlas Motorsport purchase).
  const gear = useBushrangerList();
  const [showAdd, setShowAdd] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [draftModel, setDraftModel] = React.useState("");
  const [draftCost, setDraftCost] = React.useState("");

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim()) {
      toast.error("Equipment name is required.");
      return;
    }
    bushrangerList.add({
      name: draftName.trim(),
      model: draftModel.trim(),
      cost: parseFloat(draftCost) || 0,
    });
    toast.success("Bushranger equipment added.");
    setDraftName("");
    setDraftModel("");
    setDraftCost("");
    setShowAdd(false);
  };

  const removeItem = (id: string, name: string) => {
    if (window.confirm(`Remove "${name}" from the Bushranger list?`)) {
      bushrangerList.remove(id);
      toast.success("Removed.");
    }
  };

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

        {/* ---------------------------------------------------------------- */}
        {/* Bushranger equipment list — cost noted per item, add more here   */}
        {/* ---------------------------------------------------------------- */}
        <section className="mt-12 bg-white rounded-[2rem] border border-stone-200 shadow-sm p-7">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="uppercase tracking-[0.3em] text-[10px] font-black text-clay italic">Bushranger Equipment</p>
              <h2 className="text-2xl font-black italic uppercase mt-1 text-charcoal">Gear &amp; Cost</h2>
            </div>
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-deep-red text-white font-black uppercase text-[11px] tracking-widest hover:bg-deep-red/90"
            >
              {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAdd ? "Cancel" : "Add Bushranger Equipment"}
            </button>
          </div>

          {showAdd && (
            <form onSubmit={addItem} className="mt-5 grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Equipment Name</label>
                <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Bushranger Line Trimmer" className="w-full h-10 rounded-lg border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Model / Code</label>
                <input value={draftModel} onChange={(e) => setDraftModel(e.target.value)} placeholder="optional" className="w-full h-10 rounded-lg border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Cost (AUD)</label>
                <input value={draftCost} onChange={(e) => setDraftCost(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="w-full h-10 rounded-lg border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none" />
              </div>
              <button type="submit" className="h-10 px-5 rounded-lg bg-deep-red text-white font-black uppercase text-[11px] tracking-widest hover:bg-deep-red/90">
                Add
              </button>
            </form>
          )}

          <div className="mt-5 divide-y divide-stone-100">
            {gear.map((g) => (
              <div key={g.id} className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-charcoal truncate">{g.name}</p>
                  {g.model && <p className="text-xs text-stone-400 font-mono">{g.model}</p>}
                </div>
                <p className="font-black text-charcoal whitespace-nowrap">{g.cost ? money(g.cost) : "—"}</p>
                <button onClick={() => removeItem(g.id, g.name)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-deep-red" title="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {gear.length === 0 && (
              <p className="py-6 text-center text-stone-400 italic">No Bushranger equipment listed yet. Click “Add Bushranger Equipment”.</p>
            )}
          </div>
          <p className="mt-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-bold">
            Temporary browser storage — Firebase upgrade required for live production.
          </p>
        </section>

        <h2 className="mt-12 text-2xl font-black italic uppercase text-charcoal">Bushranger Gear in the Field</h2>

        {items.length === 0 ? (
          <div className="mt-10 py-20 text-center border-2 border-dashed border-stone-300 rounded-[2rem] bg-white/50">
            <p className="font-serif text-lg text-stone-500">No Bushranger equipment recorded yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-[2rem] p-7 shadow-sm border border-stone-200 hover:shadow-xl transition-all block"
              >
                <div className="h-52 rounded-2xl bg-stone-200 flex flex-col items-center justify-center text-stone-500 font-bold mb-6 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span>No field photo added yet</span>
                      {isAdmin && (
                        <button
                          onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=media`)}
                          className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-deep-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-deep-red/90"
                        >
                          <ImageIcon className="h-3.5 w-3.5" /> Add Photo
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre">{item.model}</p>
                <h2 className="text-2xl font-black italic mt-2">{item.name}</h2>
                <p className="mt-4"><strong>Main use:</strong> {item.usedFor || "—"}</p>
                <p className="mt-3"><strong>Real Mount Isa performance:</strong> {item.mountIsaNotes || "—"}</p>
                <p className="mt-3"><strong>Review status:</strong> {item.reviewNotes || "Field review footage to be added."}</p>
                <p className="mt-3 text-sm font-bold text-forest">Public service records: {publicServiceCount(item)}</p>

                {isAdmin ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => navigate(`/admin/equipment?edit=${item.id}`)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-charcoal text-white text-[10px] font-black uppercase tracking-widest hover:bg-black">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=media`)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 text-charcoal text-[10px] font-black uppercase tracking-widest hover:bg-stone-200">
                      <ImageIcon className="h-3.5 w-3.5" /> Add Photo
                    </button>
                    <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=media`)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 text-charcoal text-[10px] font-black uppercase tracking-widest hover:bg-stone-200">
                      <Video className="h-3.5 w-3.5" /> Add Video
                    </button>
                    <button onClick={() => navigate(`/admin/equipment?edit=${item.id}&section=service`)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 text-charcoal text-[10px] font-black uppercase tracking-widest hover:bg-stone-200">
                      <Wrench className="h-3.5 w-3.5" /> Add Service Log
                    </button>
                    <Link to={`/equipment/${item.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-deep-red text-deep-red text-[10px] font-black uppercase tracking-widest hover:bg-deep-red/5">
                      <Eye className="h-3.5 w-3.5" /> View Details
                    </Link>
                  </div>
                ) : (
                  <Link to={`/equipment/${item.id}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-black tracking-[0.25em] text-deep-red uppercase">
                    <Eye className="h-4 w-4" /> View Details
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
