import * as React from 'react';
import { 
  Building2, 
  DollarSign, 
  ImageIcon, 
  Users, 
  Settings, 
  History,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Card, CardContent } from '../../components/ui/Card';

const ADMIN_MODULES = [
  {
    title: 'Financial Logic',
    description: 'Invoicing, payment processing, and revenue reporting.',
    icon: DollarSign,
    to: '/invoices',
    color: 'bg-primary'
  },
  {
    title: 'Client Database',
    description: 'Master list of properties and client history.',
    icon: Users,
    to: '/clients',
    color: 'bg-secondary'
  },
  {
    title: 'Pricing Engine',
    description: 'Adjust rates, multipliers, and service packages.',
    icon: Zap,
    to: '/admin/pricing',
    color: 'bg-primary'
  },
  {
    title: 'Automations',
    description: 'Manage AI agents and automated workflows.',
    icon: ShieldCheck,
    to: '/admin/automations',
    color: 'bg-secondary'
  },
  {
    title: 'Brand Assets',
    description: 'Manage artwork, videos, and media library.',
    icon: ImageIcon,
    to: '/admin/assets',
    color: 'bg-primary'
  },
  {
    title: 'Personnel Hall',
    description: 'Manage crew access and operational protocols.',
    icon: Users,
    to: '/admin/staff',
    color: 'bg-secondary'
  },
  {
    title: 'System Engine',
    description: 'Global configuration and business identity.',
    icon: Settings,
    to: '/admin/settings',
    color: 'bg-charcoal'
  },
  {
    title: 'Audit Trails',
    description: 'Immutable security and operation logs.',
    icon: History,
    to: '/admin/logs',
    color: 'bg-primary'
  },
  {
    title: 'Access Control',
    description: 'Manage administrative passcodes and keys.',
    icon: ShieldCheck,
    to: '/admin/access',
    color: 'bg-charcoal'
  }
];

export const AdminPortal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/20 p-2 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-charcoal uppercase italic tracking-tighter">Command Centre</h1>
          </div>
          <p className="text-xs text-clay font-bold uppercase tracking-[0.2em] italic ml-11">Agency Master Control System</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-2xl border border-border shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-green-600 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-clay/40 tracking-widest leading-none mb-1">System Integrity</p>
            <p className="text-xs font-bold text-charcoal uppercase tracking-tight">Optimal Performance</p>
          </div>
        </div>
      </header>

      {/* Primary Navigation Modules */}
      
        <section className="mb-10">
          <div className="mb-4">
            <p className="text-xs text-clay font-bold uppercase tracking-[0.2em] italic">
              Equipment Command
            </p>
            <h2 className="text-2xl font-black text-charcoal uppercase italic tracking-tighter">
              GrassRoots Equipment Hub
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => navigate('/admin/equipment')} className="group text-left bg-white rounded-[2rem] p-8 shadow-sm border border-stone-200 hover:shadow-xl transition-all block">
              <div className="w-14 h-14 rounded-2xl bg-deep-red text-white flex items-center justify-center text-xl font-black mb-8">
                EQ
              </div>
              <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre mb-3">
                Equipment Register
              </p>
              <h3 className="text-3xl font-black italic text-charcoal group-hover:text-deep-red transition-colors">
                EQUIPMENT REGISTER
              </h3>
              <p className="mt-4 text-stone-600 leading-7">
                Add, edit and manage GrassRoots machines, tools, maintenance notes, reviews, photos, and field footage.
              </p>
              <p className="mt-6 text-xs font-black tracking-[0.25em] text-deep-red uppercase">
                Manage Equipment
              </p>
            </button>

            <button onClick={() => navigate('/equipment/bushranger')} className="group text-left bg-white rounded-[2rem] p-8 shadow-sm border border-stone-200 hover:shadow-xl transition-all block">
              <div className="w-14 h-14 rounded-2xl bg-forest text-white flex items-center justify-center text-xl font-black mb-8">
                BR
              </div>
              <p className="uppercase tracking-[0.25em] text-[10px] font-black text-ochre mb-3">
                Bushranger Field Review
              </p>
              <h3 className="text-3xl font-black italic text-charcoal group-hover:text-forest transition-colors">
                BUSHRANGER PAGE
              </h3>
              <p className="mt-4 text-stone-600 leading-7">
                Dedicated Bushranger equipment page for the gear GrassRoots uses in real Mount Isa conditions.
              </p>
              <p className="mt-6 text-xs font-black tracking-[0.25em] text-forest uppercase">
                Open Bushranger Review
              </p>
            </button>
          </div>
        </section>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ADMIN_MODULES.map((module, i) => (
          <motion.button
            key={module.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(module.to)}
            className="group relative text-left outline-none"
          >
            <Card className="h-full border-2 border-transparent hover:border-primary/20 shadow-premium hover:shadow-hover transition-all duration-300 rounded-[2rem] overflow-hidden earth-card">
              <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl ${module.color} text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <module.icon className="h-7 w-7" />
                </div>
                
                <h3 className="text-xl font-black text-charcoal uppercase italic tracking-tight mb-2 group-hover:text-primary transition-colors">
                  {module.title}
                </h3>
                <p className="text-sm text-clay font-medium leading-relaxed mb-6">
                  {module.description}
                </p>

                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                  Access Portal <div className="h-px w-8 bg-primary" />
                </div>
              </CardContent>
            </Card>
            
            {/* Decorative background number */}
            <div className="absolute top-4 right-8 text-8xl font-black text-black/[0.03] pointer-events-none italic select-none">
              0{i + 1}
            </div>
          </motion.button>
        ))}
      </div>

      {/* System Warning / Info Panel */}
      <section className="mt-12 bg-charcoal rounded-[2.5rem] p-10 relative overflow-hidden">
        <div className="absolute inset-0 cultural-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">Manual Override Protocols Enabled</h2>
            <p className="text-white/60 text-sm font-medium leading-relaxed">
              This environment provides direct cryptographic access to core business logic. Every modification is signed and logged in the immutable audit sequence. AI assistance is bypassed for maximum administrative precision.
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/admin/logs')}
              className="px-8 py-4 bg-primary text-white font-black uppercase italic tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              System Audit
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminPortal;
