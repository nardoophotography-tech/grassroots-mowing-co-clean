import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { calculateServicePrice } from '@/src/services/pricingEngine';
import { PRICING_RULES } from '@/src/constants';
import { Calculator, Play, RefreshCcw } from 'lucide-react';

export const SimulationEngine = () => {
  const [result, setResult] = React.useState<any>(null);
  const [params, setParams] = React.useState({
    package: 'residential_standard',
    grade: 'standard',
    urgency: 'normal'
  });

  const runSimulation = () => {
    // This calls your actual pricing logic engine
    const mockFactors = {
      timeSinceLastMow: 'under-2-weeks',
      grassHeight: 'short',
      thickness: 'light',
      obstacles: 'low',
      urgency: params.urgency as any
    };

    const simulation = calculateServicePrice(
      PRICING_RULES,
      params.package,
      'one-off',
      params.grade as any,
      mockFactors,
      []
    );
    setResult(simulation);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-charcoal uppercase tracking-tight italic">Simulation Engine</h1>
        <p className="text-sm font-black text-clay/60 uppercase tracking-widest mt-1">Pricing Logic Sandbox • Non-Destructive</p>
      </div>

      <Card className="border-border shadow-premium rounded-3xl bg-surface">
        <CardHeader className="bg-primary/5 border-b border-border">
          <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
            <Calculator className="h-5 w-5 text-primary" />
            Input Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Select onChange={(e) => setParams({...params, package: e.target.value})}>
              <option value="residential_standard">Standard Res</option>
              <option value="commercial_block">Commercial</option>
            </Select>
            <Select onChange={(e) => setParams({...params, grade: e.target.value})}>
              <option value="standard">Standard Grade</option>
              <option value="extreme">Extreme Grade</option>
            </Select>
            <Select onChange={(e) => setParams({...params, urgency: e.target.value})}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
          <Button onClick={runSimulation} className="w-full bg-charcoal text-white rounded-xl h-12 font-black uppercase tracking-widest">
            <Play className="h-4 w-4 mr-2" /> Run Simulation
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-secondary/20 shadow-lg rounded-3xl bg-secondary/5">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-xs font-black text-secondary uppercase tracking-widest mb-2 italic">Calculated Output</div>
              <div className="text-5xl font-black text-charcoal italic tracking-tighter">${result.total.toFixed(2)}</div>
              <div className="text-[10px] font-bold text-clay uppercase mt-2">Base: ${result.basePrice} | Surcharges: ${result.urgencySurcharge}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
