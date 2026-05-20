import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlusCircle, 
  Users, 
  ShieldCheck, 
  ExternalLink, 
  Trash2, 
  Mail,
  UserPlus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const AdminAccess = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [invitations, setInvitations] = React.useState<any[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const q = query(collection(db, 'invitations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[AdminAccess]: New invitations snapshot received', snapshot.size);
      const docs = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id
      }));
      setInvitations(docs);
    }, (error) => {
      console.error('[AdminAccess]: Snapshot listener error:', error);
      toast.error('Failed to load invitations');
    });
    return () => unsubscribe();
  }, []);

  const handleGenerateLink = async () => {
    const id = Math.random().toString(36).substring(2, 15);
    const t = toast.loading('Generating secure invitation...');
    
    try {
      await setDoc(doc(db, 'invitations', id), {
        id,
        role: 'staff',
        used: false,
        expiresAt: Date.now() + (48 * 60 * 60 * 1000), // 48 hours
        createdAt: Date.now(),
        createdBy: profile?.uid
      });
      toast.success('Invitation link generated! Share it with the new recruit.', { id: t });
    } catch (error) {
      toast.error('Failed to generate invitation.', { id: t });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-charcoal tracking-tight italic uppercase">System Security</h1>
          <p className="text-clay font-medium mt-1">Staff On-boarding and Change Admin Access Management Portal.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleGenerateLink}
            className="rounded-xl bg-secondary text-white hover:bg-secondary-hover transition-all duration-300 font-black uppercase tracking-widest px-6 h-12 shadow-premium"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Generate Staff Invite
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-surface rounded-3xl border border-border shadow-premium overflow-hidden">
            <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-clay/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-charcoal uppercase tracking-tight italic">Workforce Invitations</h2>
                  <p className="text-xs text-clay font-medium tracking-tight">Active registration links for new staff members.</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-border text-clay font-black text-[10px] uppercase tracking-widest px-3">
                {invitations.length} Total
              </Badge>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-background text-[10px] font-black uppercase tracking-[0.2em] text-clay/60 border-b border-border">
                  <tr>
                    <th className="px-8 py-4">Security Token</th>
                    <th className="px-8 py-4">Created At</th>
                    <th className="px-8 py-4">Link Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <Users className="h-12 w-12 mb-3 opacity-20" />
                          <p className="text-sm font-medium italic">No invitations found. Generate one to get started.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invitations.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[140px] uppercase tracking-tighter">
                              {inv.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-500 text-sm font-medium">
                          {inv.createdAt ? format(inv.createdAt, 'MMM d, yyyy') : '—'}
                          <span className="block text-[10px] text-slate-400 lowercase">{inv.createdAt ? format(inv.createdAt, 'hh:mm a') : ''}</span>
                        </td>
                        <td className="px-8 py-5">
                          {inv.used ? (
                            <div className="flex items-center gap-1.5 text-green-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Joined</span>
                            </div>
                          ) : (inv.expiresAt && inv.expiresAt < Date.now()) ? (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Expired</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-primary">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled={inv.used || deletingId === inv.id}
                              onClick={() => {
                                const link = `${window.location.origin}/onboarding/${inv.id}`;
                                navigator.clipboard.writeText(link);
                                toast.success('Onboarding link copied!');
                              }}
                              className="h-9 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 px-3"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Copy URL</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled={deletingId === inv.id}
                              onClick={async () => {
                                if (confirm('Are you sure you want to revoke this invitation? This action cannot be undone.')) {
                                  setDeletingId(inv.id);
                                  try {
                                    console.log('[AdminAccess]: Deleting invitation:', inv.id);
                                    await deleteDoc(doc(db, 'invitations', inv.id));
                                    toast.success('Invitation revoked');
                                  } catch (err: any) {
                                    console.error('[AdminAccess]: Failed to delete invitation:', err);
                                    toast.error('Revocation failed: Permission denied');
                                  } finally {
                                    setDeletingId(null);
                                  }
                                }
                              }}
                              className={cn(
                                "h-9 w-9 p-0 rounded-xl",
                                deletingId === inv.id 
                                  ? "animate-pulse bg-rose-50" 
                                  : "text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                              )}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-charcoal rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight italic">Onboarding Flow</h3>
              </div>
              
              <div className="space-y-4">
                {[
                  { title: 'Single Use', desc: 'Each link is unique and expires after one successful registration.' },
                  { title: 'TTL Security', desc: 'Invitation links are valid for exactly 48 hours for security.' },
                  { title: 'Identity Link', desc: 'Recruits must link their Google ID during onboarding.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="text-primary font-black text-sm">{i + 1}.</div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight uppercase italic">{item.title}</p>
                      <p className="text-xs text-white/50 leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Return to Hub
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
