import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Home,
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
  Menu,
  Building2,
  Target,
  Truck,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import AppLogo from '@/components/AppLogo';
import { GrassRootsLogo } from '@/components/GrassRootsLogo';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PRICING_RULES, ADD_ON_LABELS, CLIENT_TYPE_LABELS } from '@/constants';
import { calculateServicePrice } from '@/services/pricingEngine';
import { useSettings, useJobs } from '@/hooks/useFirebase';
import { useLatestAsset, useAssets } from '@/hooks/useAssets';
import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import { EditableImage } from '@/components/EditableImage';
import { toast } from 'react-hot-toast';

import { Sidebar } from '@/components/Navigation';
import { AIBookingAssistant } from '@/components/AIBookingAssistant';

import { BrandCharacter } from '@/components/BrandCharacter';

export const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, profile } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { jobs } = useJobs();
  
  const { asset: logoAsset } = useLatestAsset('logo');
  const { asset: heroAsset } = useLatestAsset('hero');
  const { assets: galleryAssets } = useAssets('gallery');

  const handleLogoUpload = async (newUrl: string) => {
    toast("Manage branding in the Asset Portfolio");
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
          features: ['GrassRoots Mowing Co. Full Care Protocol'],
          description: 'The maintenance essential. Perfect for units, duplexes, and small town blocks.'
        },
        { 
          name: 'Residential Gold', 
          price: 240, 
          features: ['GrassRoots Mowing Co. Full Care Protocol'],
          description: 'Our most popular choice for mid-sized family homes and typical residential lots.'
        },
        { 
          name: 'Premium Gold', 
          price: 340, 
          features: ['GrassRoots Mowing Co. Full Care Protocol'],
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
    <div className="min-h-screen bg-[#FDFCFB] selection:bg-primary/20 selection:text-primary">
      <nav className="sticky top-0 z-50 border-b border-primary/20 bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#174D33] via-[#7A542F] to-[#174D33] opacity-[0.08]" />
            <div className="absolute -right-10 -top-20 opacity-[0.08] scale-75">
              <GrassRootsGuardian size={220} />
            </div>
            <div className="absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-primary via-ochre to-secondary" />
          </div>

          <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (window.history.state && window.history.state.idx > 0) {
                      navigate(-1);
                    } else {
                      navigate('/');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-charcoal text-white shadow-md border border-white/10 hover:opacity-95 touch-manipulation"
                  title="Go Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-[13px] font-black uppercase tracking-wider">Back</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white shadow-md border border-white/10 hover:opacity-95 touch-manipulation"
                  title="Home"
                >
                  <Home className="h-4 w-4" />
                  <span className="text-[13px] font-black uppercase tracking-wider">Home</span>
                </Button>
              </div>

              <div
                className="flex items-center gap-3 cursor-pointer group min-w-0"
                onClick={() => navigate('/')}
              >
                <div className="bg-white rounded-2xl border border-primary/10 shadow-sm px-3 py-2 flex items-center gap-3">
                  <img src="/logo-header.webp" alt="GrassRoots Mowing Co" className="h-8 sm:h-10 w-auto object-contain" />

                  <div className="hidden sm:block border-l border-primary/15 pl-3">
                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] leading-none">
                      GrassRoots
                    </p>
                    <p className="text-[8px] font-bold text-clay uppercase tracking-widest leading-none mt-1">
                      Mowing Co
                    </p>
                  </div>
                </div>
              </div>

              

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/booking?type=one_off')}
                  className="hidden sm:flex px-4 py-2 rounded-full bg-secondary text-white hover:bg-secondary/90 text-[10px] font-black uppercase tracking-widest italic h-10 shadow-md"
                >
                  Quick Book
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="h-10 px-4 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white text-[10px] font-black uppercase tracking-widest shadow-sm"
                >
                  Secure Service Hub
                </Button>
              </div>
            </div>

            <div className="sm:hidden mt-3">
              <Button
                onClick={() => navigate('/booking?type=one_off')}
                className="w-full h-11 rounded-2xl bg-secondary text-white hover:bg-secondary/90 text-[10px] font-black uppercase tracking-[0.2em] italic shadow-md"
              >
                Quick Book
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Action-First Hero */}
      <section className="relative pt-12 pb-12 px-6 overflow-hidden bg-white border-b border-border/40">
        <div className="absolute inset-0 subtle-grid opacity-5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
           <GrassRootsGuardian variant="spotlight" className="opacity-10 w-[600px] h-auto" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl"
          >
            <h1 className="text-5xl lg:text-7xl font-black text-charcoal leading-[0.9] tracking-tighter uppercase italic mb-6">
              Yard Care <span className="text-primary italic">On Demand.</span>
            </h1>
            
            <p className="text-clay text-xs lg:text-sm font-bold max-w-xl mx-auto mb-10 leading-relaxed uppercase tracking-[0.15em]">
              Professional maintenance for {settings?.serviceLocation || 'Mount Isa'}. <br />
              Select your path below for instant processing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
              <Button 
                onClick={() => navigate('/booking?type=one_off')}
                className="h-20 bg-secondary hover:bg-secondary/90 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl shadow-secondary/10 italic flex flex-col items-center justify-center gap-1 group"
              >
                <div className="flex items-center gap-2">
                   <Zap size={16} /> ONE-OFF BOOKING
                </div>
                <span className="text-[8px] opacity-70 tracking-[0.3em] font-medium italic">Instant Quote • 5 Clicks to Success</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/login?intendedRole=returning')}
                className="h-20 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl italic flex flex-col items-center justify-center gap-1"
              >
                <div className="flex items-center gap-2">
                   <Users size={16} /> REGULAR CLIENTS
                </div>
                <span className="text-[8px] opacity-70 tracking-[0.3em] font-medium italic">Manage Plans • Job History</span>
              </Button>

              <Button 
                variant="outline"
                onClick={() => navigate('/login?intendedRole=asset_management')}
                className="h-20 border-slate-900/20 text-slate-900 hover:bg-slate-50 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl italic flex flex-col items-center justify-center gap-1"
              >
                <div className="flex items-center gap-2">
                   <Building2 size={16} /> ASSET MANAGERS
                </div>
                <span className="text-[8px] opacity-70 tracking-[0.3em] font-medium italic">Agency Portal • Bulk Invoicing</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Brand Mission Section - The Story Behind Our Artwork */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full subtle-grid opacity-5 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 opacity-5 pointer-events-none grayscale">
          <GrassRootsGuardian size={400} />
        </div>
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="flex flex-col items-center gap-4 mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-6 py-1 text-[10px] uppercase tracking-[0.3em]">
              Rooted in Country. Built for Community.
            </Badge>
            <h2 className="text-4xl md:text-6xl font-black text-charcoal tracking-tighter uppercase italic leading-[0.85]">
              The Story Behind <br /><span className="text-primary italic">Our Artwork.</span>
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-start text-left mb-24">
            <div className="space-y-6">
              <p className="text-clay text-sm font-medium leading-relaxed italic">
                At GrassRoots Mowing Co, our work is more than just mowing and landscaping — it's about connection, respect and giving back to the land that supports us.
              </p>
              <p className="text-charcoal font-black text-sm leading-relaxed uppercase tracking-tight italic border-l-4 border-primary pl-6">
                "Our visual artwork and logo were created as a modern representation inspired by the artwork of SunRock and the natural landscapes of the country where GrassRoots Mowing Co was founded."
              </p>
              <div className="pt-8 grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Inspired by Country</h4>
                  <p className="text-[9px] font-bold text-clay uppercase tracking-tight">Reflecting the natural landscapes where we live and work.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Symbol of Connection</h4>
                  <p className="text-[9px] font-bold text-clay uppercase tracking-tight">Symbolising connection to land, community, and deep roots.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-border/40 relative">
               <div className="absolute top-4 right-4 opacity-10">
                  <Leaf className="text-primary" size={40} />
               </div>
               <h3 className="text-xl font-black text-charcoal uppercase italic mb-6 tracking-tight underline decoration-primary/20 underline-offset-4">The Logo Foundations</h3>
               <ul className="space-y-4">
                  {[
                    "Strong foundations",
                    "Growth & improvement",
                    "Care for the land",
                    "Community",
                    "Reliability & pride in our work"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                       <CheckCircle2 size={16} className="text-primary" />
                       <span className="text-xs font-black text-clay uppercase tracking-tighter">{item}</span>
                    </li>
                  ))}
               </ul>
               <div className="mt-8 pt-8 border-t border-border/40">
                  <p className="text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] italic mb-2">Roots of our Foundation</p>
                  <p className="text-[8px] text-clay font-medium leading-normal">
                    The central figure and surrounding elements represent GrassRoots Mowing Co's foundations — hard work, care for the land, family, and respect for the Traditional Owners of the country.
                  </p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-ochre/10 rounded-2xl flex items-center justify-center text-primary border border-ochre/20">
                <Target className="h-6 w-6" />
              </div>
              <h4 className="font-black text-charcoal uppercase tracking-tight italic">Precision Focus</h4>
              <p className="text-clay/80 text-xs font-bold leading-relaxed italic">Our proprietary satellite mapping ensures every square inch of your property is accounted for in our deployment plan.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-ochre/10 rounded-2xl flex items-center justify-center text-primary border border-ochre/20">
                <Truck className="h-6 w-6" />
              </div>
              <h4 className="font-black text-charcoal uppercase tracking-tight italic">Rapid Deployment</h4>
              <p className="text-clay/80 text-xs font-bold leading-relaxed italic">Optimized route planning means we spend less time driving and more time perfecting your landscape footprint.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-ochre/10 rounded-2xl flex items-center justify-center text-primary border border-ochre/20">
                <History className="h-6 w-6" />
              </div>
              <h4 className="font-black text-charcoal uppercase tracking-tight italic">Local Heritage</h4>
              <p className="text-clay/80 text-xs font-bold leading-relaxed italic">We understand the soil, the grass, and the local standards. We're part of the community we serve.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cultural Acknowledgement Section */}
      <section className="py-12 bg-charcoal text-white relative overflow-hidden">
         <div className="absolute inset-0 cultural-pattern opacity-10 pointer-events-none grayscale" />
         <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
            <div className="mb-6 p-4 rounded-full border border-white/10 bg-white/5">
               <div className="flex items-center justify-center text-primary">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a4 4 0 0 0 8 0v-2"/><path d="M12 10V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a4 4 0 0 1-8 0v-2"/><path d="M3 13h1m3 0h1M13 13h1m3 0h1"/></svg>
               </div>
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] mb-4 text-primary">Acknowledgement of Country</h3>
            <p className="text-sm md:text-base font-medium italic opacity-80 leading-relaxed max-w-2xl">
              GrassRoots Mowing Co acknowledges the Traditional Custodians of the country we live and work on. We pay our respects to Elders past, present, and emerging, and acknowledge their deep and continuing connection to the land, water, and community.
            </p>
            <p className="mt-8 text-[9px] font-bold uppercase tracking-widest opacity-40">
              Respect the land • Respect the people • Respect the future
            </p>
         </div>
      </section>

      {/* Brand Identity Showcase */}
      <section className="py-24 px-6 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-5 pointer-events-none" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
            <div className="w-full max-w-md">
              <BrandCharacter />
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-8">
            <div className="space-y-4">
              <Badge className="bg-primary/20 text-primary border-none font-black px-4 py-1 text-[10px] uppercase tracking-widest">
                Our Mascot
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight italic uppercase">
                The <span className="text-primary italic">Warrior's</span> Touch
              </h2>
              <p className="text-base text-slate-600 font-medium leading-relaxed max-w-xl">
                Every job we perform is guided by our custom artwork—representing the strength, reliability, and precision of a true field warrior. This isn't just lawn care; it's a commitment to professional excellence.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: "Military Precision", desc: "Operations executed with tactical accuracy." },
                { title: "Indestructible Trust", desc: "A brand character built on reliability." },
                { title: "Warrior Ethos", desc: "We never leave a property until it's perfect." },
                { title: "Modern Heritage", desc: "Combining classic values with smart tech." }
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm uppercase italic tracking-wide">{item.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* High Density Operations Grid */}
      <section className="py-8 bg-[#FDFCFB] cultural-pattern">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-secondary rounded-full" />
                <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Total Care Matrix (Gold)</h2>
              </div>
              <div className="bg-white rounded-[24px] border border-border/40 p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                  {goldPackageInclusions.map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-[8px] font-bold text-clay uppercase tracking-tight truncate">
                      <CheckCircle2 size={10} className="text-secondary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <Button 
                   onClick={() => navigate('/booking?type=ultimate-gold')}
                   className="mt-4 w-full h-8 bg-secondary/5 text-secondary hover:bg-secondary/10 text-[8px] font-black uppercase tracking-widest rounded-lg border border-secondary/10"
                >
                  Join Gold Protocol
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Operational Extensions</h2>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {addonsList.slice(0, 8).map((addon) => (
                  <div key={addon.name} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-border/20">
                    <addon.icon size={12} className="text-clay/40" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[7.5px] font-black text-slate-900 uppercase tracking-tighter truncate leading-none">{addon.name}</span>
                      <span className="text-[8px] font-black text-primary italic mt-0.5">${addon.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-charcoal rounded-full" />
                <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Secure Service Hub</h2>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {portals.map((portal) => (
                  <button 
                    key={portal.role}
                    onClick={() => navigate(`/login?intendedRole=${portal.role}`)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border/20 hover:border-primary/30 transition-all text-left"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", portal.color)}>
                      <portal.icon size={14} />
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">{portal.title}</p>
                       <p className="text-[7px] text-clay font-bold uppercase tracking-tight truncate max-w-[150px]">{portal.description}</p>
                    </div>
                    <ArrowRight size={12} className="ml-auto text-clay/20" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-400 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <AppLogo className="h-8 w-auto" textClassName="text-white" />
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] opacity-50 italic">© {new Date().getFullYear()} {settings?.businessName?.toUpperCase() || 'GRASSROOTS MOWING CO.'}</p>
            </div>
            
            <div className="flex gap-12">
              <div>
                <p className="text-white font-black uppercase tracking-widest text-[9px] mb-4 italic">HQ Contact</p>
                <p className="text-[9px] font-bold uppercase tracking-widest group cursor-pointer">
                  <Mail className="inline h-3 w-3 mr-2 text-primary" /> {settings?.businessEmail || 'ops@grassrootsmowing.co'}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest mt-2 group cursor-pointer">
                  <Phone className="inline h-3 w-3 mr-2 text-primary" /> {settings?.businessPhone || '0400 000 000'}
                </p>
              </div>
              <div>
                <p className="text-white font-black uppercase tracking-widest text-[9px] mb-4 italic">Protocol</p>
                <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest">
                  <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                  <a href="#" className="hover:text-primary transition-colors">Terms</a>
                </div>
              </div>
            </div>
        </div>
      </footer>

      <AIBookingAssistant />

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