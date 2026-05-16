import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Users, 
  ShieldCheck, 
  UserCircle, 
  Leaf, 
  Sparkles, 
  Trophy, 
  Trees,
  MapPin,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Droplets,
  Trash2,
  Scissors,
  Zap,
  Waves,
  Wind,
  ClipboardList,
  DollarSign,
  Camera,
  UserPlus,
  LayoutDashboard,
  Plus,
  Calendar,
  TrendingUp,
  X,
  Menu
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import AppLogo from '@/src/components/AppLogo';
import { WarriorMan } from '@/src/components/WarriorMan';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { PRICING_RULES, ADD_ON_LABELS, CLIENT_TYPE_LABELS } from '@/src/constants';
import { calculateServicePrice } from '@/src/services/pricingEngine';
import { useSettings, useJobs } from '@/src/hooks/useFirebase';
import { ImagePlaceholder } from '@/src/components/ImagePlaceholder';
import { EditableImage } from '@/src/components/EditableImage';

import { Sidebar } from '@/src/components/Navigation';

export const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, profile } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { jobs } = useJobs();

  const handleLogoUpload = async (newUrl: string) => {
    await updateSettings({ images: { ...settings?.images, placeholder: newUrl } as any });
  };

  const handleHeroUpload = async (newUrl: string) => {
    // Assuming town_block is used for hero or we add a hero field
    await updateSettings({ images: { ...settings?.images, town_block: newUrl } as any });
  };

  const handleAssetUpload = async (assetId: string, url: string) => {
    await updateSettings({
      assets: {
        ...settings?.assets,
        [assetId]: { url }
      }
    });
  };

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isClientWelcome = location.pathname === '/welcome';

  const pricing = settings?.pricing || PRICING_RULES;
  const testimonials = settings?.testimonials || [];
  const completedJobsCount = jobs.filter(j => j.status === 'paid' || j.status === 'completed').length;

  const [selectedGoldPackage, setSelectedGoldPackage] = React.useState<string | null>(null);

  const goldPackageInclusions = [
    'Edge Trimming',
    'Path Blowing',
    'Whipper Snipping',
    'Brush Cutting',
    'Weed treatment',
    'Green Waste Removal',
    'Fertiliser Treatment',
    'Pruning',
    'Mulching Service',
    'Clipping Removal',
    'Full Yearly Analysis & Planning'
  ];

  const packages = [
    {
      id: 'town_block',
      name: 'Town Block (Mow & Go)',
      price: pricing.base['town_block'],
      description: 'The maintenance essential. Perfect for units, duplexes, and small town blocks.',
      features: ['Lawn Mowing', 'Whipper snipping', 'Path & Driveway Blowing', 'Clipping Removal'],
      color: 'border-ochre/20'
    },
    {
      id: 'residential_standard',
      name: 'Residential Standard',
      price: pricing.base['residential_standard'],
      description: 'Our most popular choice for mid-sized family homes and typical residential lots.',
      features: ['Lawn Mowing', 'Whipper snipping', 'Path & Driveway Blowing', 'Clipping Removal'],
      color: 'border-secondary/50',
      featured: true
    },
    {
      id: 'premium_estate',
      name: 'Premium Estate',
      price: pricing.base['premium_estate'],
      description: 'The gold standard for corner blocks and larger residential properties.',
      features: ['Lawn Mowing', 'Whipper snipping', 'Path & Driveway Blowing', 'Clipping Removal'],
      color: 'border-ochre'
    },
    {
      id: 'acreage',
      name: 'Large Lot / Acreage',
      price: pricing.base['acreage'],
      description: 'Heavy-duty care for oversized blocks, mini-acreage, and commercial fringes.',
      features: ['Lawn Mowing', 'Brush Cutting'],
      color: 'border-secondary'
    },
    {
      id: 'ultimate',
      name: 'Ultimate Property Gold',
      price: pricing.base['ultimate'],
      description: 'Our top tier of comprehensive property management. Professional gardening, arborist work, and seasonal care.',
      color: 'border-charcoal bg-charcoal text-white',
      isGold: true,
      goldLevels: [
        { 
          name: 'Town Gold', 
          price: 160, 
          features: ['(GrassRoots Lawn Co.lawn full package)'],
          description: 'The maintenance essential. Perfect for units, duplexes, and small town blocks.'
        },
        { 
          name: 'Residential Gold', 
          price: 240, 
          features: ['(GrassRoots Lawn Co.lawn full package)'],
          description: 'Our most popular choice for mid-sized family homes and typical residential lots.'
        },
        { 
          name: 'Premium Gold', 
          price: 340, 
          features: ['(GrassRoots Lawn Co.lawn full package)'],
          description: 'The gold standard for corner blocks and larger residential properties.'
        }
      ]
    }
  ];

  const portals = [
    {
      role: 'admin',
      title: 'Management Console',
      description: 'Access business analytics, staff management, and financial reporting.',
      icon: ShieldCheck,
      color: 'bg-secondary'
    },
    {
      role: 'staff',
      title: 'Staff Portal',
      description: 'View your daily schedule, navigate to jobs, and track your work.',
      icon: Users,
      color: 'bg-ochre'
    },
    {
      role: 'client',
      title: 'Client Portal',
      description: 'Manage your existing recurring services and view your invoices.',
      icon: UserCircle,
      color: 'bg-charcoal'
    }
  ];

  const addonsList = [
    { name: 'Edge Trimming', price: pricing.addOns?.['edging'] || 0, icon: Sparkles },
    { name: 'Path Blowing', price: pricing.addOns?.['blowing'] || 0, icon: Wind },
    { name: 'Whipper Snipping', price: pricing.addOns?.['whipper-snipping'] || 0, icon: Scissors },
    { name: 'Brush Cutting', price: pricing.addOns?.['brush-cutting'] || 0, icon: Trees },
    { name: 'Garden Weeding/Spraying', price: pricing.addOns?.['weed-spraying'] || 0, icon: Droplets },
    { name: 'Hedge Trimming', price: pricing.addOns?.['hedge-trimming'] || 0, icon: Scissors },
    { name: 'Green Waste Removal', price: pricing.addOns?.['green-waste-removal'] || 0, icon: Trash2 },
    { name: 'Fertiliser Treatment', price: pricing.addOns?.['fertiliser-treatment'] || 0, icon: Zap },
    { name: 'Pruning', price: pricing.addOns?.['pruning'] || 0, icon: Scissors },
    { name: 'Mulching Service', price: pricing.addOns?.['mulching'] || 0, icon: Leaf },
    { name: 'Clipping Removal', price: pricing.addOns?.['clipping-removal'] || 0, icon: Trash2 },
    { name: 'Full Yearly Analysis & Planning', price: pricing.addOns?.['yearly-analysis'] || 0, icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background text-charcoal font-sans selection:bg-primary/20 selection:text-primary">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} variant="drawer" />
      <div className="fixed inset-0 subtle-grid opacity-10 pointer-events-none" />
      
      {isClientWelcome && !user && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-primary text-white py-3 px-6 text-center relative z-[60] shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6">
            <p className="text-xs font-bold uppercase tracking-wider flex items-center">
              <Sparkles className="h-4 w-4 mr-2" />
              Empowering Landscape Excellence • Managed Solutions
            </p>
            <div className="flex gap-3">
              <Button 
                size="sm" 
                onClick={() => navigate('/login?intendedRole=client')}
                className="bg-white/10 text-white hover:bg-white/20 border border-white/20 text-[10px] h-8 font-bold rounded-lg"
              >
                Sign In
              </Button>
              <Button 
                size="sm" 
                onClick={() => navigate('/booking')}
                className="bg-white text-primary hover:bg-slate-50 text-[10px] h-8 font-bold rounded-lg"
              >
                Book Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-clay hover:bg-ochre/10 rounded-xl transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
              <AppLogo className="h-10 w-auto group-hover:scale-105 transition-transform" />
              <div className="hidden xl:block ml-2 border-l border-border pl-4">
                <p className="text-[8px] font-black text-clay uppercase tracking-[0.2em] leading-none">Regional Node</p>
                <p className="text-[7px] font-bold text-primary uppercase tracking-widest leading-none mt-1">Active-Secured</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6 lg:gap-10">
            <div className="hidden md:flex items-center gap-3">
              <a 
                href="#one-off" 
                onClick={(e) => { e.preventDefault(); document.getElementById('one-off')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-4 py-2 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
              >
                Residential
              </a>
              <a 
                href="#regular" 
                onClick={(e) => { e.preventDefault(); document.getElementById('regular')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-4 py-2 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
              >
                Subscription
              </a>
              <a 
                href="#real-estate" 
                onClick={(e) => { e.preventDefault(); document.getElementById('real-estate')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-4 py-2 rounded-full bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
              >
                Portfolio
              </a>
            </div>
            
            <div className="hidden sm:block h-6 w-px bg-border mx-2" />
            
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="h-10 px-6 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-[10px] font-black uppercase tracking-widest shadow-none"
                  >
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Admin
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => logout()}
                    className="h-10 px-6 rounded-full bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => navigate('/login')}
                  className="h-10 px-6 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-[10px] font-black uppercase tracking-widest shadow-none"
                >
                  <UserCircle className="mr-2 h-3.5 w-3.5" /> Staff Portal
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Top Logo Placeholder Area */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <EditableImage
          src={settings?.images?.placeholder || "/logo.png"}
          onUpload={handleLogoUpload}
          label="brand-logo"
          height={300}
          className="rounded-3xl shadow-lg border-ochre/30"
        />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 pb-40 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider mb-8 border border-primary/20">
              <Sparkles className="h-4 w-4" /> {settings?.serviceLocation || 'Mount Isa'}'s Elite Landscape Management
            </div>
            <h1 className="text-7xl lg:text-9xl font-bold text-charcoal leading-[0.85] tracking-tight mb-10 text-balance">
              Cultivating <br />
              <span className="text-primary italic">Perfection.</span>
            </h1>
            <p className="text-xl text-clay mb-12 leading-relaxed max-w-lg">
              Precision lawn maintenance and automated enterprise solutions for residential portfolios and acreage estates.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Button 
                onClick={() => navigate('/booking')}
                size="lg"
                className="h-16 px-12 text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 rounded-full font-black bg-primary hover:bg-primary/90 transition-all border-b-4 border-primary/30"
              >
                Instant Booking <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex flex-col justify-center px-8 border-l-2 border-primary/10">
                <span className="text-[10px] font-black text-clay uppercase tracking-widest">Starting At</span>
                <span className="text-2xl font-black text-charcoal tracking-tight">${pricing.base['town_block']} <span className="text-sm text-clay font-medium italic">/ job</span></span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-10 bg-primary/5 rounded-full blur-3xl" />
            <EditableImage 
              src={settings?.images?.town_block || `https://picsum.photos/seed/lawn1/800/1000`}
              onUpload={handleHeroUpload}
              label="hero-banner"
              className="rounded-[40px] shadow-2xl relative z-10 border border-white/20"
              aspectRatio="4/5"
            />
            {testimonials.length > 0 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-12 -left-12 bg-white/95 backdrop-blur-md p-10 rounded-[32px] shadow-premium z-20 max-w-xs border border-white/20"
              >
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(i => <Sparkles key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                  "{testimonials[0].quote}"
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[10px]">
                    {testimonials[0].name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900"> {testimonials[0].name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{testimonials[0].suburb}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Professional Add-Ons Section */}
      <section id="services" className="py-32 px-6 bg-white border-t border-slate-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
            <div className="max-w-xl">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Precision Extensions</p>
              <h2 className="text-5xl font-bold text-slate-900 tracking-tight">System <span className="text-primary">Capabilities</span></h2>
            </div>
            <p className="text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
              Enhance your core maintenance with specialized technical services. Integrated directly into your automated schedule.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {addonsList.map(addon => (
              <Card key={addon.name} className="p-8 hover:border-primary/30 transition-all group flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                  <addon.icon className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-2">{addon.name}</h4>
                <p className="text-lg font-bold text-primary">${addon.price}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* One-Off Clients Section */}
      <section id="one-off" className="py-40 px-6 bg-slate-50 relative border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-20 items-center">
            <div className="flex-1 space-y-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest">
                Residential Solutions
              </div>
              <h2 className="text-6xl font-bold text-slate-900 leading-tight">
                Premium Core <br />
                <span className="text-primary italic">Maintenance.</span>
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg max-w-md">
                On-demand precision for casual requirements. No commitment, just elite landscape execution when you need it most.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <ImagePlaceholder id={20} seed="lawn-mowed-1" height={200} className="rounded-2xl shadow-premium" />
                <ImagePlaceholder id={21} seed="lawn-mowed-2" height={200} className="rounded-2xl shadow-premium" />
              </div>
            </div>

            <Card 
              onClick={() => navigate('/booking?type=one-off')}
              className="flex-1 max-w-xl p-12 bg-white cursor-pointer hover:-translate-y-2"
            >
              <div className="flex flex-col gap-4 mb-10">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starting From</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-bold text-slate-900">$150</span>
                  <span className="text-sm font-semibold text-slate-400">Total</span>
                </div>
              </div>
              
              <ul className="space-y-6 mb-12">
                {[
                  'Professional Mow & Precision Edging',
                  'Strategic Debris Extraction & Blowing',
                  'Clipping Management (Mulch/Removal)',
                  'Post-Service Digital Compliance Report'
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-4 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="h-6 w-6 text-primary" /> {f}
                  </li>
                ))}
              </ul>

              <Button size="lg" className="w-full h-16 rounded-full text-sm font-black uppercase tracking-widest shadow-xl group bg-primary hover:bg-primary/90">
                Access Residential Solution <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      <section id="regular" className="py-40 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-20 mb-20">
            <div className="max-w-2xl">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Recurring Excellence</p>
              <h2 className="text-6xl font-bold text-white tracking-tight leading-tight">
                Subscription <br />
                <span className="text-primary italic">Architecture.</span>
              </h2>
            </div>
            <p className="text-slate-400 font-medium max-w-sm text-lg leading-relaxed">
              Automated maintenance protocols designed for consistent peak performance. Never think about your lawn again.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {packages.filter(p => !p.isGold).map((pkg) => (
              <Card 
                key={pkg.id} 
                onClick={() => navigate(`/booking?package=${pkg.id}&type=returning`)}
                className="bg-white/5 backdrop-blur-md border-white/10 p-10 hover:border-primary/50 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-8 relative">
                    <EditableImage
                      src={settings?.assets?.[pkg.id as 'residential_standard' | 'premium_estate']?.url || `https://picsum.photos/seed/${pkg.id}/100/100`}
                      onUpload={(url) => handleAssetUpload(pkg.id, url)}
                      label={`${pkg.name} Asset`}
                      className="absolute inset-0 w-full h-full rounded-2xl"
                    />
                    <Calendar className="h-6 w-6 relative z-10 pointer-events-none mix-blend-difference text-white/50" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-2">{pkg.name}</h4>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-bold text-white">${pkg.price}</span>
                    <span className="text-xs text-slate-500 font-bold uppercase">/ service</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs font-semibold text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className="w-full bg-white text-slate-900 hover:bg-primary hover:text-white font-black rounded-full h-14 uppercase tracking-widest text-[10px]">
                  Configure Tier
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* Real Estate Section */}
      <section id="real-estate" className="py-40 px-6 bg-white overflow-hidden border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                Enterprise Solutions
              </div>
              <h2 className="text-6xl font-bold text-slate-900 leading-tight text-balance">
                Portfolio <br />
                <span className="text-primary italic">Asset Services.</span>
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg max-w-md font-medium">
                Consolidated management for real estate agencies and asset portfolios. Automated compliance, digital reporting, and bulk account orchestration.
              </p>
              
              <div className="space-y-4">
                {[
                  { title: 'Portfolio Dashboard', desc: 'Unified interface for high-volume property management.' },
                  { title: 'Agency-Level Terms', desc: 'Consolidated monthly billing & specialized service rates.' },
                  { title: 'Compliance Vault', desc: 'Secure digital evidence for lease-end and move-out reports.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary font-bold shadow-sm border border-slate-100 flex-shrink-0">
                      <LayoutDashboard className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="px-10 h-16 rounded-full font-black uppercase tracking-widest shadow-xl bg-primary">
                  Access Agency Portal
                </Button>
                <Button variant="outline" size="lg" className="px-10 h-16 rounded-full font-black uppercase tracking-widest border-2">
                  Request Terms
                </Button>
              </div>
            </motion.div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-[100px] opacity-30" />
              <Card className="relative bg-slate-900 border-slate-800 rounded-[48px] overflow-hidden p-12 shadow-2xl">
                 <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-8">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                             <TrendingUp className="h-6 w-6" />
                          </div>
                          <div>
                             <p className="text-white font-bold text-lg leading-tight uppercase tracking-tight">Portfolio Alpha</p>
                             <p className="text-primary text-[10px] font-bold uppercase tracking-widest">Enterprise Active</p>
                          </div>
                       </div>
                       <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full text-[10px] font-bold">14 Properties Active</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                          <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Weekly Compliant</p>
                          <p className="text-3xl font-bold text-white tracking-tight">98.2%</p>
                       </div>
                       <div className="bg-white/10 p-6 rounded-3xl border border-white/20">
                          <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Current Expenditure</p>
                          <p className="text-3xl font-bold text-primary tracking-tight">$4.2k</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                       {[
                          { addr: '14 Barkly Dr, Mornington', status: 'Compliant' },
                          { addr: `82 Main St, ${settings?.serviceLocation || 'Local Region'}`, status: 'In Progress' }
                       ].map((p, i) => (
                          <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                             <p className="text-xs text-white/80 font-medium">{p.addr}</p>
                             <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'Compliant' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{p.status}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Section */}
      <section id="portals" className="py-40 px-6 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-slate-900 mb-6 tracking-tight text-glow-indigo">Authorized Access</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Select your gateway to the landscape management system</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {portals.map((portal) => (
              <Card 
                key={portal.role} 
                onClick={() => navigate(`/login?intendedRole=${portal.role}`)}
                className="group cursor-pointer p-10 bg-white border border-slate-200 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 rounded-[32px]"
              >
                <div className={`${portal.role === 'admin' ? 'bg-indigo-600' : portal.role === 'staff' ? 'bg-emerald-600' : 'bg-slate-900'} w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:rotate-6 transition-transform`}>
                  <portal.icon className="h-8 w-8 text-white" />
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                  {portal.role} Restricted
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-primary transition-colors">{portal.title}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                  {portal.description}
                </p>
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                  Secure Login <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-32 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-4 gap-20 mb-24">
            <div className="space-y-8">
              <AppLogo className="h-10 w-auto" textClassName="text-white" />
              <p className="text-sm font-medium leading-relaxed max-w-xs">
                Precision landscape management and automated maintenance protocols for elite {settings?.serviceLocation || 'Mount Isa'} portfolios.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer">
                  <Instagram className="h-5 w-5" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer">
                  <Facebook className="h-5 w-5" />
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-white font-bold uppercase tracking-widest text-xs mb-8">Service Operations</p>
              <ul className="space-y-6 text-sm font-medium">
                <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
                  <Phone className="h-4 w-4 text-primary" /> 0404 231 448
                </li>
                <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
                  <Mail className="h-4 w-4 text-primary" /> admin@grassrootslawn.co
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-primary" /> {settings?.serviceLocation || 'Mount Isa'}
                </li>
              </ul>
            </div>

            <div>
              <p className="text-white font-bold uppercase tracking-widest text-xs mb-8">Active Districts</p>
              <ul className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest">
                {(settings?.suburbSchedules || []).slice(0, 8).map(s => (
                  <li key={s.suburb} className="text-slate-500 hover:text-white transition-colors cursor-pointer">/ {s.suburb}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-bold uppercase tracking-widest text-xs mb-8">System Compliance</p>
              <div className="bg-white/5 p-8 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                   <p className="text-[10px] font-bold text-white uppercase tracking-widest">System Operational</p>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium text-wrap">
                  Cloud Infrastructure v4.2.0-Production <br /> {settings?.serviceLocation || 'Mount Isa'} Regional Node: Active
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold uppercase tracking-widest">
            <p>© {new Date().getFullYear()} GrassRoots Mowing Co. // Architecture for Landscape.</p>
            <div className="flex gap-10">
              <span className="hover:text-white transition-colors cursor-pointer">Security Protocol</span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* goldLevels Dialog */}
      <AnimatePresence>
        {selectedGoldPackage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGoldPackage(null)}
              className="absolute inset-0 bg-charcoal/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-background rounded-[40px] shadow-2xl overflow-hidden border border-border"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-secondary via-ochre to-secondary" />
              <div className="p-8 sm:p-12">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h4 className="text-3xl font-bold text-secondary mb-2">{selectedGoldPackage}</h4>
                    <p className="text-[10px] font-black text-clay uppercase tracking-widest leading-tight">
                      GrassRoots Lawn Co. Lawn Full Package Standard Inclusions
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedGoldPackage(null)}
                    className="h-8 w-8 rounded-full border border-border text-clay hover:bg-ochre/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {goldPackageInclusions.map((item, idx) => (
                    <motion.div 
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-ochre/5 border border-border"
                    >
                      <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                      <span className="text-[11px] font-bold text-clay uppercase tracking-tight">{item}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-12">
                  <Button 
                    onClick={() => {
                      setSelectedGoldPackage(null);
                      navigate(`/booking?package=ultimate&type=ultimate-gold`);
                    }}
                    className="w-full h-14 bg-secondary hover:bg-secondary/90 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg"
                  >
                    Proceed with {selectedGoldPackage}
                  </Button>
                  <p className="mt-4 text-center text-[9px] font-bold text-clay/40 uppercase tracking-widest italic">
                    * All items listed above are included as standard in the Gold membership.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
