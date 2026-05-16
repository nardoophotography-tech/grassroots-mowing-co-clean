import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { collection, query, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { Card, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { toast } from 'react-hot-toast';
import { Plus, FileSignature, CheckCircle2, AlertCircle, Copy, Users } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const StaffList = () => {
  const [staff, setStaff] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const { user } = useAuth();

  React.useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const staffSnap = await getDocs(query(collection(db, 'staff_profiles')));
      const linksSnap = await getDocs(query(collection(db, 'onboarding_links')));
      
      const links = linksSnap.docs.map(doc => ({ token: doc.id, ...doc.data() as any }));
      
      let staffData = staffSnap.docs.map(doc => {
        const data = doc.data() as any;
        const linkedOnboarding = links.find(l => l.staffId === doc.id);
        
        return {
           id: doc.id,
           ...data,
           onboardingDetails: linkedOnboarding || null,
           onboardingStatus: linkedOnboarding?.used ? 'completed' : linkedOnboarding ? 'invite-sent' : 'not-sent'
        };
      });
      setStaff(staffData);
      toast.success('Staff dashboard loaded successfully');
    } catch (err: any) {
      toast.error('Failed to load staff: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async (staffId: string, email: string, name: string, phone: string) => {
    try {
      const toastId = toast.loading('Generating invite...');
      if (!user) throw new Error("Authentication required");

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ staffId, email, name, phone })
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Server error");

      // Also trigger a notification (SMS and Email)
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'staff-invite',
          clientName: name,
          clientEmail: email,
          clientPhone: phone,
          invoiceLink: resData.link
        })
      });

      toast.success('Secure invite sent via SMS & Email!', { id: toastId });
      fetchStaff();
    } catch (err: any) {
      toast.error('Failed to send invite: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-charcoal tracking-tight">Team <span className="text-primary italic">Roster</span></h1>
          <p className="text-clay font-black uppercase tracking-[0.2em] text-[10px] mt-2">Managed Compliance & Personnel Deployment Registry</p>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-background border-b border-border text-clay text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Personnel & Identity</th>
                <th className="px-8 py-5 text-center">Designation</th>
                <th className="px-8 py-5">Contract Type</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Compliance</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-background/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-charcoal text-sm italic underline decoration-primary/20 underline-offset-4">{member.firstName} {member.lastName}</p>
                    <p className="text-[10px] text-clay font-medium mt-1 uppercase tracking-tight">{member.email}</p>
                    <p className="text-[9px] text-clay font-black uppercase tracking-tighter opacity-60">{member.phone}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <Badge variant={member.role === 'admin' ? 'secondary' : 'default'} className="rounded-lg">
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-charcoal uppercase tracking-widest">{member.employmentType}</p>
                    <p className="text-[10px] text-clay font-medium mt-0.5 italic">{member.payType}</p>
                  </td>
                  <td className="px-8 py-6">
                    <Badge variant={member.status === 'active' ? 'success' : 'destructive'}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-6">
                    {member.onboardingStatus === 'completed' ? (
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Verified</span>
                      </div>
                    ) : member.onboardingStatus === 'invite-sent' ? (
                      <div className="flex items-center gap-2 text-accent">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">In-Progress</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-clay opacity-40">
                        <FileSignature className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Awaiting</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    {member.onboardingStatus !== 'completed' ? (
                       <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleGenerateInvite(member.id, member.email, member.firstName, member.phone)}
                        className="rounded-xl px-6"
                      >
                         Secure Invite
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          toast((t) => (
                            <div className="space-y-4 p-2 min-w-[300px]">
                              <div className="flex items-center gap-3 border-b border-border pb-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                  <FileSignature className="h-5 w-5" />
                                </div>
                                <p className="font-black text-charcoal tracking-tight italic text-lg uppercase">Payroll Record</p>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                {[
                                  { label: 'TFN', value: member.secureData?.taxFileNumber },
                                  { label: 'Super Fund', value: member.secureData?.superFund },
                                  { label: 'Member ID', value: member.secureData?.superMemberId },
                                  { label: 'Bank BSB', value: member.secureData?.bankBsb },
                                  { label: 'Account', value: member.secureData?.bankAccount }
                                ].map(item => (
                                  <div key={item.label} className="space-y-0.5">
                                    <p className="text-[9px] font-black text-clay uppercase tracking-widest">{item.label}</p>
                                    <p className="text-xs font-bold text-charcoal">{item.value || 'N/A'}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-background p-4 rounded-2xl border border-border mt-2">
                                <p className="text-[9px] font-black text-clay uppercase tracking-widest mb-1.5 underline underline-offset-4 decoration-primary/30">Emergency Liaison</p>
                                <p className="text-xs font-black text-charcoal uppercase">{member.secureData?.emergencyName || 'UNSPECIFIED'}</p>
                                <p className="text-[10px] font-black text-clay italic tracking-tight">{member.secureData?.emergencyPhone || 'NO ACTIVE LINK'}</p>
                              </div>
                              <Button size="sm" onClick={() => toast.dismiss(t.id)} className="w-full mt-2 rounded-xl bg-charcoal text-white font-black uppercase tracking-widest h-11 italic shadow-lg">Dismiss Record</Button>
                            </div>
                          ), { duration: 15000 });
                        }}
                        className="text-primary hover:bg-primary/10 rounded-xl font-black italic tracking-tight"
                      >
                        Audit Payroll
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-clay/30">
                      <Plus className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-lg font-black italic uppercase tracking-widest">No Active Workforce Detected</p>
                      <p className="text-xs mt-2 font-medium">Onboard new personnel from the Secure Access panel.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
