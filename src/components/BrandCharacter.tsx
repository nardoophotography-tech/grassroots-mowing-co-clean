import * as React from 'react';
import { GrassRootsGuardian } from './GrassRootsGuardian';
import { motion } from 'motion/react';

export const BrandCharacter: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative group cursor-pointer"
    >
      <div className="absolute -inset-4 bg-primary/20 rounded-[4rem] blur-2xl group-hover:bg-primary/30 transition-all duration-700 opacity-50" />
      <div className="relative bg-white p-8 rounded-[3rem] border border-border shadow-2xl overflow-hidden aspect-square flex items-center justify-center">
        <div className="absolute inset-0 subtle-grid opacity-10" />
        <GrassRootsGuardian variant="original" size={300} className="scale-110 group-hover:scale-125 transition-transform duration-700" />
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border border-white/20 whitespace-nowrap">
        The GrassRoots Guardian
      </div>
    </motion.div>
  );
};
