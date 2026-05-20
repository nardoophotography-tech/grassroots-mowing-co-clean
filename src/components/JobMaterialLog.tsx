import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { JobMaterial } from '@/types';

interface JobMaterialLogProps {
  onSave: (materials: JobMaterial[]) => void;
  initialMaterials?: JobMaterial[];
}

export function JobMaterialLog({ onSave, initialMaterials = [] }: JobMaterialLogProps) {
  const [materials, setMaterials] = React.useState<JobMaterial[]>(initialMaterials);

  const addMaterial = () => {
    const newMat: JobMaterial = {
      id: Math.random().toString(36).substring(7),
      name: '',
      quantity: 0,
      unit: 'bags',
      costPerUnit: 0,
      totalCost: 0
    };
    setMaterials([...materials, newMat]);
  };

  const updateMaterial = (id: string, updates: Partial<JobMaterial>) => {
    setMaterials(materials.map(m => {
      if (m.id === id) {
        const updated = { ...m, ...updates };
        updated.totalCost = updated.quantity * updated.costPerUnit;
        return updated;
      }
      return m;
    }));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Beaker className="w-4 h-4 text-orange-600" />
          Chemical & Material Log
        </h3>
        <Button size="sm" variant="outline" onClick={addMaterial} className="h-8 rounded-full">
          <Plus className="w-3 h-3 mr-1" /> Add Item
        </Button>
      </div>

      <div className="space-y-3">
        {materials.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed">
            No materials logged for this stop.
          </p>
        )}
        {materials.map((mat) => (
          <div key={mat.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
            <div className="col-span-12 sm:col-span-5">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Product / Formula</Label>
              <Input 
                value={mat.name} 
                onChange={(e) => updateMaterial(mat.id, { name: e.target.value })}
                placeholder="e.g. Premium NPK Fertilizer"
                className="h-9 text-sm"
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Qty</Label>
              <Input 
                type="number"
                value={mat.quantity} 
                onChange={(e) => updateMaterial(mat.id, { quantity: Number(e.target.value) })}
                className="h-9 text-sm"
              />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Unit</Label>
              <Input 
                value={mat.unit} 
                onChange={(e) => updateMaterial(mat.id, { unit: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Cost/U</Label>
              <Input 
                type="number"
                value={mat.costPerUnit} 
                onChange={(e) => updateMaterial(mat.id, { costPerUnit: Number(e.target.value) })}
                className="h-9 text-sm"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeMaterial(mat.id)}
                className="h-9 w-9 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {materials.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button onClick={() => onSave(materials)} className="bg-slate-900 h-10 px-6 rounded-full text-xs font-black uppercase">
            Save Materials
          </Button>
        </div>
      )}
    </div>
  );
}
