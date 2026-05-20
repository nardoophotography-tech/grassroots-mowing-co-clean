import * as React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  CreditCard, 
  Star, 
  MessageSquare, 
  ArrowRight, 
  Bell, 
  Settings,
  ShieldCheck,
  Package,
  CalendarCheck
} from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function AutomationsManager() {
  const [automations, setAutomations] = React.useState([
    {
      id: 'auto_bill',
      name: 'Zero-Touch Invoicing',
      description: 'Auto-generate PDF and charge card on file immediately after technician marks job complete.',
      icon: CreditCard,
      status: true,
      color: 'blue'
    },
    {
      id: 'reviews',
      name: 'Review Multiplier',
      description: 'Send Google Review request via SMS 15 minutes after payment is processed.',
      icon: Star,
      status: true,
      color: 'orange'
    },
    {
      id: 'rain_out',
      name: 'Weather "Skip" Logic',
      description: 'Auto-reschedule all routes if rainfall exceeds 5mm/hr in customer service zones.',
      icon: Zap,
      status: false,
      color: 'purple'
    },
    {
      id: 'upsell',
      name: 'Seasonal Upsell Bot',
      description: 'Target active standard clients with aeration and mulch offers based on local season.',
      icon: Package,
      status: true,
      color: 'green'
    }
  ]);

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => a.id === id ? { ...a, status: !a.status } : a));
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl">
            <Zap className="w-6 h-6 text-orange-400" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic">Automation Hub</h1>
        </div>
        <p className="text-sm text-slate-500 mt-2 font-medium">The 100% automated machinery running behind the scenes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automations.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={a.status ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100 grayscale opacity-60'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${a.color}-100 text-${a.color}-600`}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black uppercase italic">{a.name}</CardTitle>
                    <Badge variant={a.status ? 'default' : 'secondary'} className="text-[9px] h-4">
                      {a.status ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>
                </div>
                <Switch 
                  checked={a.status} 
                  onCheckedChange={() => toggleAutomation(a.id)}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-xs font-medium leading-relaxed">
                  {a.description}
                </CardDescription>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px] font-black uppercase">
                    Config
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 rounded-full font-black text-[10px] uppercase">
                    Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Stats Ribbon */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white grid grid-cols-1 md:grid-cols-3 gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-32 h-32" />
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profit Reclamation</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black italic">+$12,450</span>
            <Badge className="bg-green-500 border-none">+18%</Badge>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase italic">vs Manual Processing</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Hours Saved</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black italic">84h</span>
            <Badge className="bg-orange-500 border-none">THIS MONTH</Badge>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase italic">No Manual Invoicing</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Impact</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black italic">4.9/5</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-orange-400 text-orange-400" />)}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase italic">89 New 5-Star Reviews</p>
        </div>
      </div>
    </div>
  );
}
