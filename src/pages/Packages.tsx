import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { GrassRootsLogo } from '@/components/GrassRootsLogo';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { CheckCircle2, Info, ArrowRight, ChevronLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useFirebase';
import { useAssets } from '@/hooks/useAssets';
import { PRICING_RULES } from '@/constants';

export const Packages = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { assets: serviceAssets } = useAssets('service');
  
  const pricing = settings?.pricing || PRICING_RULES;

  const getPkgImage = (pkgId: string, defaultImg: string) => {
    const asset = serviceAssets.find(a => a.category === pkgId);
    return asset?.url || defaultImg;
  };

  const packages = [
    {
      id: 'town_block',
      name: 'Town Block (Mow & Go)',
      price: pricing.base['town_block'],
      description: 'Quick and efficient. Perfect for well-maintained town blocks.',
      features: [
        'Professional Lawn Mowing',
        'Basic Path Blowing',
        'Clippings Left (Mulched)',
        'Fast Service'
      ],
      color: 'border-ochre/20',
      image: getPkgImage('town_block', settings?.images?.town_block || '')
    },
    {
      id: 'residential_standard',
      name: 'Residential Standard',
      price: pricing.base['residential_standard'],
      description: 'Our most popular choice for mid-sized family homes and typical residential lots.',
      features: [
        'Lawn Mowing',
        'Precision Edging',
        'Path & Driveway Blowing',
        'Clipping Removal',
        'Exclusive to Recurring Clients'
      ],
      color: 'border-deep-red/50',
      featured: true,
      image: getPkgImage('residential_standard', settings?.images?.residential_standard || '')
    },
    {
      id: 'premium_estate',
      name: 'Premium Estate',
      price: pricing.base['premium_estate'],
      description: 'The gold standard for corner blocks and larger residential properties.',
      features: [
        'All Standard Features',
        'Garden Weeding (15 mins)',
        'Fertiliser Treatment',
        'Priority Scheduling',
        'Detailed Property Report'
      ],
      color: 'border-ochre',
      image: getPkgImage('premium_estate', settings?.images?.premium_estate || '')
    },
    {
      id: 'acreage',
      name: 'Large Lot / Acreage',
      price: pricing.base['acreage'],
      description: 'Heavy-duty care for oversized blocks, mini-acreage, and commercial fringes.',
      features: [
        'Lawn Mowing',
        'Brush Cutting'
      ],
      color: 'border-deep-red',
      image: getPkgImage('acreage', settings?.images?.acreage || '')
    },
    {
      id: 'ultimate',
      name: 'Ultimate Gold',
      price: pricing.base['ultimate'],
      description: 'The "Everything" package. Complete property perfection.',
      features: [
        'All Estate Features',
        'Zero-Waste Cleanup',
        'Total Weed Control',
        'Window Cleaning (Ext)',
        'Dedicated Site Manager'
      ],
      color: 'border-charcoal',
      image: getPkgImage('ultimate', settings?.images?.placeholder || '')
    }
  ];

  return (
    <div className="min-h-screen bg-cream pb-20 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern pointer-events-none opacity-10" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-20 -right-20 w-96 h-96 pointer-events-none select-none opacity-[0.05]">
        <GrassRootsGuardian size={400} />
      </div>
      <div className="fixed bottom-20 -left-20 w-80 h-80 pointer-events-none select-none -rotate-12 opacity-[0.04]">
        <GrassRootsGuardian size={320} />
      </div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none select-none opacity-[0.02]">
        <GrassRootsGuardian size={600} />
      </div>

      <div className="bg-deep-red text-white py-16 px-4 mb-12 relative overflow-hidden">
        <div className="absolute inset-0 cultural-pattern opacity-20" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="text-ochre hover:text-white hover:bg-white/10 h-10 px-3"
              >
                <Home className="h-4 w-4 mr-2" /> Home
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="text-ochre hover:text-white hover:bg-white/10 h-10 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            </div>
            <GrassRootsLogo className="h-20 w-20" />
            <div className="w-24 lg:block hidden" /> {/* Spacer */}
          </div>
          <h1 className="text-5xl font-bold mb-4 font-serif tracking-tight">Service Kits - Service Packages</h1>
          <p className="text-ochre font-bold uppercase tracking-widest text-sm max-w-lg mx-auto leading-relaxed">
            Professional landscape maintenance tailored to the {settings?.serviceLocation || 'Mount Isa'} landscape. Select your required kit profile.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 lg:grid-cols-5 gap-6 relative z-10">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id} 
            className={`flex flex-col border-2 ${pkg.color} shadow-xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm transition-transform hover:scale-[1.02] duration-300`}
          >
            {pkg.featured && (
              <div className="bg-deep-red text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 text-center">
                Most Popular
              </div>
            )}
            <div className="aspect-video w-full overflow-hidden border-b border-ochre/10 bg-ochre/5">
              <img 
                src={pkg.image || settings?.images?.placeholder} 
                alt={pkg.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <CardHeader className="pt-8 pb-4 text-center">
              <CardTitle className="text-2xl font-serif text-deep-red mb-2">{pkg.name}</CardTitle>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm font-bold text-ochre">From</span>
                <span className="text-4xl font-black text-charcoal">${pkg.price}</span>
              </div>
              <p className="text-xs text-charcoal/60 mt-4 px-4">{pkg.description}</p>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 pt-4">
              <div className="space-y-3">
                {pkg.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-ochre shrink-0 mt-0.5" />
                    <span className="text-sm text-charcoal/80 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-6 mt-auto">
                <Button 
                  onClick={() => navigate('/booking')}
                  className={`w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs ${
                    pkg.featured 
                      ? 'bg-deep-red hover:bg-deep-red/90 text-white shadow-lg' 
                      : 'bg-white border-2 border-ochre/20 text-ochre hover:bg-ochre/5'
                  }`}
                >
                  Book This Plan <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-20 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm border-2 border-ochre/10 rounded-3xl p-8 md:p-12 shadow-lg">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-20 h-20 bg-ochre/10 rounded-full flex items-center justify-center shrink-0">
              <Info className="h-10 w-10 text-ochre" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-serif text-deep-red mb-3">Custom Quotes & Extreme Overgrowth</h3>
              <p className="text-charcoal/70 text-sm leading-relaxed mb-6">
                If your property has been neglected for more than 2 months or requires a complete overhaul, 
                our standard packages may not apply. We offer free on-site assessments for extreme cleanups 
                and commercial properties.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/booking')}
                className="border-ochre/30 text-ochre hover:bg-ochre/5 font-bold rounded-xl"
              >
                Request a Custom Quote
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
