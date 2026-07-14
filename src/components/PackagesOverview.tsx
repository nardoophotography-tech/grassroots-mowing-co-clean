import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useFirebase';
import { computeGst } from '@/utils/money';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Plus, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PackagesOverview = () => {
  const { settings } = useSettings();
  const navigate = useNavigate();

  if (!settings?.pricing?.packageDetails) return null;

  // Filter and sort active public packages
  const packages = Object.entries(settings?.pricing?.packageDetails || {})
    .filter(([_, pkg]: [string, any]) => {
      const isPublic = pkg.publicEnabled ?? pkg.active ?? pkg.enabled ?? true;
      return isPublic && pkg.active !== false;
    })
    .sort((a: any, b: any) => (a[1].displayOrder || 0) - (b[1].displayOrder || 0));

  // Determine all unique included services across all packages for the comparison table
  const allServicesSet = new Set<string>();
  packages.forEach(([_, pkg]: [string, any]) => {
    pkg.includedServices?.forEach((s: string) => allServicesSet.add(s));
    pkg.optionalAddOns?.forEach((s: string) => allServicesSet.add(s));
  });
  const allServices = Array.from(allServicesSet).sort();

  return (
    <section className="py-16 bg-[#FDFCFB] cultural-pattern relative overflow-hidden" id="packages">
      <div className="absolute inset-0 rock-impression-soft" style={{ backgroundImage: "url('/cultural/rock-impression-set-transparent.png')", backgroundSize: 'cover' }} aria-hidden="true" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center mb-12">
          <h2 className="text-sm font-black text-secondary uppercase tracking-[0.2em] italic mb-2">Service Packages</h2>
          <h3 className="text-3xl font-serif text-deep-red">Transparent Pricing. No Guesswork.</h3>
          <p className="mt-4 text-sm text-charcoal/70 max-w-2xl mx-auto">
            Choose the package that fits your property. Compare what's included and easily add optional services to match your exact needs.
          </p>
        </div>

        {/* Desktop Comparison Table (Hidden on Mobile) */}
        <div className="hidden lg:block mb-16 overflow-x-auto">
          <table className="w-full text-left border-collapse bg-white rounded-3xl overflow-hidden shadow-sm border border-border/50">
            <thead>
              <tr className="bg-ochre/5">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-clay border-b border-border/50 w-[20%]">Service Features</th>
                {packages.map(([id, pkg]: [string, any]) => (
                  <th key={id} className="p-4 text-[10px] font-black uppercase tracking-widest text-deep-red border-b border-border/50 text-center w-[16%]">
                    {pkg.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allServices.map((service, index) => (
                <tr key={index} className="hover:bg-ochre/5 transition-colors">
                  <td className="p-4 text-[11px] font-bold text-charcoal border-b border-border/10">{service}</td>
                  {packages.map(([id, pkg]: [string, any]) => {
                    const isIncluded = pkg.includedServices?.includes(service);
                    const isOptional = pkg.optionalAddOns?.includes(service);
                    
                    return (
                      <td key={id} className="p-4 border-b border-border/10 text-center align-middle">
                        {isIncluded ? (
                          <div className="flex justify-center"><CheckCircle2 className="h-4 w-4 text-secondary" /></div>
                        ) : isOptional ? (
                          <div className="flex justify-center"><Plus className="h-4 w-4 text-clay/40" /></div>
                        ) : (
                          <div className="flex justify-center"><span className="text-[10px] text-clay/20 font-bold">-</span></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-6 mt-4 justify-center">
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-clay"><CheckCircle2 className="h-3 w-3 text-secondary"/> Included</div>
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-clay"><Plus className="h-3 w-3 text-clay/40"/> Optional Add-on</div>
          </div>
        </div>

        {/* Package Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
          {packages.map(([id, pkg]: [string, any]) => {
            const basePrice = settings.pricing.base[id] || 0;
            const priceDetails = computeGst(basePrice);
            const isCustom = id === 'custom';

            return (
              <div key={id} className="flex flex-col bg-white rounded-[40px] shadow-lg border border-border overflow-hidden group hover:border-secondary/30 transition-all duration-300">
                {/* Header */}
                <div className="p-6 bg-gradient-to-br from-ochre/10 to-transparent border-b border-border/30">
                  <h4 className="text-xl font-black text-deep-red uppercase tracking-wide mb-2">{pkg.name}</h4>
                  <p className="text-[11px] font-bold text-charcoal/70 leading-relaxed min-h-[40px]">
                    {pkg.publicDescription || pkg.description}
                  </p>
                </div>

                {/* Pricing Block */}
                <div className="p-6 bg-charcoal text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                   
                   {isCustom ? (
                     <div className="py-2">
                       <p className="text-2xl font-black uppercase tracking-widest text-secondary">Quote Required</p>
                       <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Price based on inspection</p>
                     </div>
                   ) : (
                     <div className="space-y-1">
                       <div className="flex justify-between items-end">
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Starting Subtotal</p>
                         <p className="text-[12px] font-bold">${priceDetails.subtotal.toFixed(2)}</p>
                       </div>
                       <div className="flex justify-between items-end">
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/50">GST (10%)</p>
                         <p className="text-[12px] font-bold">${priceDetails.gstAmount.toFixed(2)}</p>
                       </div>
                       <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-center">
                         <p className="text-[12px] font-black uppercase tracking-widest text-secondary">Starting Total</p>
                         <p className="text-3xl font-black">${priceDetails.totalIncludingGst.toFixed(2)}</p>
                       </div>
                     </div>
                   )}
                </div>

                {/* Content Block */}
                <div className="p-6 flex-1 flex flex-col bg-white">
                  
                  {/* Best For */}
                  {pkg.bestFor && pkg.bestFor.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-clay mb-3 flex items-center gap-2">
                        <Info className="h-3 w-3" /> Best For
                      </p>
                      <ul className="space-y-2">
                        {pkg.bestFor.map((item, idx) => (
                          <li key={idx} className="text-[11px] font-bold text-charcoal/80 flex items-start gap-2">
                            <span className="text-secondary mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Included Services */}
                  {pkg.includedServices && pkg.includedServices.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-3">What's Included</p>
                      <ul className="space-y-2">
                        {pkg.includedServices.map((item, idx) => (
                          <li key={idx} className="text-[11px] font-bold text-charcoal flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                            <span className="leading-tight">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Optional Add-ons */}
                  {pkg.optionalAddOns && pkg.optionalAddOns.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-clay/60 mb-3">Available Add-ons</p>
                      <ul className="space-y-2">
                        {pkg.optionalAddOns.map((item, idx) => (
                          <li key={idx} className="text-[11px] font-bold text-charcoal/60 flex items-start gap-2">
                            <Plus className="h-3.5 w-3.5 text-clay/40 shrink-0 mt-0.5" />
                            <span className="leading-tight">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Service Notes */}
                  {pkg.serviceNotes && pkg.serviceNotes.length > 0 && (
                    <div className="mb-6 mt-auto pt-6 border-t border-border/30">
                      <p className="text-[9px] font-black uppercase tracking-widest text-clay mb-2">Service Notes</p>
                      <ul className="space-y-1">
                        {pkg.serviceNotes.map((note, idx) => (
                          <li key={idx} className="text-[10px] font-medium text-charcoal/60 italic leading-snug">
                            * {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>

                {/* Footer Action */}
                <div className="p-6 bg-ochre/5 mt-auto border-t border-border/30">
                  <Button 
                    onClick={() => navigate('/booking?package=' + id)}
                    className="w-full h-14 bg-secondary text-white hover:bg-secondary-hover rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg group-hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isCustom ? 'Request Custom Quote' : 'Book ' + pkg.name}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
