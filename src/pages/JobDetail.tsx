import * as React from 'react';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobs } from '@/hooks/useFirebase';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, TIME_SLOT_LABELS, ADD_ON_LABELS } from '@/constants';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from 'react-hot-toast';
import { offlineQueue } from '@/services/offlineQueue';
import { 
  ArrowLeft, 
  CheckCircle, 
  Play, 
  DollarSign, 
  Camera, 
  FileText,
  Truck,
  Info,
  AlertCircle,
  CreditCard,
  Banknote,
  Send,
  Navigation,
  MapPin,
  ClipboardList,
  PlusCircle,
  Trash2,
  Edit3,
  Settings,
  X,
  Save,
  ShieldAlert
} from 'lucide-react';
import { useInvoices, useAdmin, useJobs as useJobsHook } from '@/hooks/useFirebase';
import { PaymentMethod, AddOn, JobIssue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PasscodeModal } from '@/components/PasscodeModal';
import { PRICING_RULES } from '@/constants';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { InvoiceDownloadButton } from '@/components/InvoiceDownloadButton';

import { PhotoUpload } from '@/components/PhotoUpload';

export const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, updateJob, deleteJob, loading, sendQuoteToCustomer } = useJobsHook();
  const { invoices, markAsPaid } = useInvoices();
  const { profile, user: authUser } = useAuth();
  const { verifyAdminPasscode } = useAdmin();
  
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const [showAddOnModal, setShowAddOnModal] = React.useState(false);
  const [showApprovalModal, setShowApprovalModal] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showOverrideModal, setShowOverrideModal] = React.useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = React.useState(false);
  const [overridePrice, setOverridePrice] = React.useState<string>('');
  const [pendingAddOn, setPendingAddOn] = React.useState<Partial<AddOn> | null>(null);
  const [approvalError, setApprovalError] = React.useState('');
  
  const [activeTab, setActiveTab] = React.useState('before');
  const [editingIssueIndex, setEditingIssueIndex] = React.useState<number | null>(null);
  const [tempIssueNote, setTempIssueNote] = React.useState('');
  
  const onsiteUploadRef = React.useRef<HTMLButtonElement>(null);
  
  const job = jobs.find(j => j.id === id);
  const invoice = invoices.find(inv => inv.jobId === id);

  if (loading) return <div className="p-8 text-center">Loading job details...</div>;
  if (!job) return <div className="p-8 text-center">Job not found.</div>;

  const handleCompleteJob = async () => {
    if (!job) return;
    
    // 1. Log the offline command
    offlineQueue.add(job.id, 'COMPLETE_JOB');
    
    // 2. Optimistic UI update (Local Firestore is good at this, but we'll also update locally just in case)
    try {
      await updateJob(job.id, { 
        status: 'completed',
        // Optional: you could add a 'syncing' flag here
      });
      toast.success('Job marked as completed. Finalizing in background...');
    } catch (err) {
      // Even if Firestore update fails (offline), the offlineQueue will still try to hit the backend later
      toast.success('Action queued. Will sync when internet is available.');
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    setIsUpdating(true);
    try {
      await updateJob(job.id, { status: newStatus });
      toast.success(`Job status updated to ${JOB_STATUS_LABELS[newStatus]}`);
      
      // Trigger Notification for specific status changes
      try {
        let stage: string | null = null;
        if (newStatus === 'scheduled') stage = 'job-scheduled';
        if (newStatus === 'on-the-way') stage = 'team-en-route';
        if (newStatus === 'completed') stage = 'completed';

        if (stage) {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stage,
              job: {
                id: job.id,
                address: job.location?.address || job.address,
                suburb: job.suburb,
                servicePackage: job.servicePackage,
                price: job.price,
                status: job.status,
                scheduledDate: job.scheduledDate,
                timeSlot: job.timeSlot,
              },
              clientEmail: job.clientEmail,
              clientPhone: job.clientPhone,
              clientName: job.clientName,
              amount: job.price
            })
          });
        }
      } catch (notifyErr) {
        console.error("Delayed notification trigger failed:", notifyErr);
      }

    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkPaid = async (method: PaymentMethod) => {
    if (!invoice) return;
    setIsUpdating(true);
    try {
      await markAsPaid(invoice.id, method);
      toast.success(`Job marked as paid via ${method}`);
      setShowPaymentOptions(false);
    } catch (error) {
      toast.error('Failed to mark as paid');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddAddOn = (addonKey: string) => {
    const name = ADD_ON_LABELS[addonKey];
    const price = (PRICING_RULES.addOns as any)[addonKey];
    
    const newAddOn: Partial<AddOn> = {
      id: addonKey + '-' + Date.now(),
      name,
      price,
      selected: true,
      addedBy: authUser?.uid
    };

    if (profile?.role === 'admin') {
      // Admins can approve their own
      confirmAddAddOn(newAddOn, authUser?.uid);
    } else {
      setPendingAddOn(newAddOn);
      setShowApprovalModal(true);
      setShowAddOnModal(false);
    }
  };

  const confirmAddAddOn = async (addon: Partial<AddOn>, approvedBy?: string) => {
    setIsUpdating(true);
    try {
      const updatedAddOns = [...job.addOns, { ...addon, approvedBy, approvedAt: Date.now() } as AddOn];
      const addOnTotal = updatedAddOns.reduce((acc, a) => acc + (a.selected ? a.price : 0), 0);
      const newPrice = job.basePrice + job.gradeAdjustment + job.conditionSurcharge + job.urgencySurcharge + addOnTotal;
      
      await updateJob(job.id, { 
        addOns: updatedAddOns,
        addOnTotal,
        price: newPrice
      });
      toast.success('Add-on added and approved!');
      setPendingAddOn(null);
    } catch (error) {
      toast.error('Failed to add add-on');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprovalSuccess = async (passcode: string) => {
    const admin = await verifyAdminPasscode(passcode);
    if (admin && pendingAddOn) {
      setShowApprovalModal(false);
      setApprovalError('');
      confirmAddAddOn(pendingAddOn, admin.uid);
    } else {
      setApprovalError('Invalid Admin Passcode');
    }
  };

  const handleDeleteJob = async () => {
    if (!job) return;
    setIsUpdating(true);
    try {
      await deleteJob(job.id);
      navigate('/jobs');
    } catch (error) {
      toast.error('Failed to delete job');
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleApplyOverride = async (confirmed: boolean = false) => {
    if (!job || !overridePrice) return;
    const priceValue = parseFloat(overridePrice);
    if (isNaN(priceValue)) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!confirmed) {
      setShowOverrideConfirm(true);
      setShowOverrideModal(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateJob(job.id, { 
        price: priceValue, 
        manualOverride: true 
      });
      toast.success('Manual price override applied');
      setShowOverrideConfirm(false);
    } catch (error) {
      toast.error('Failed to apply override');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-4xl mx-auto pb-24 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern opacity-5 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-20 -right-20 w-96 h-96 pointer-events-none select-none opacity-[0.03]">
        <GrassRootsGuardian size={400} />
      </div>
      <div className="fixed top-1/2 -left-40 w-[600px] h-[600px] pointer-events-none select-none -rotate-12 opacity-[0.02]">
        <GrassRootsGuardian size={600} />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-deep-red font-serif tracking-tight">{job.clientName}</h2>
          <p className="text-ochre font-bold uppercase tracking-widest text-[10px]">{format(job.scheduledDate, 'EEEE, MMMM d, yyyy')} • {TIME_SLOT_LABELS[job.timeSlot]}</p>
        </div>
        <Badge variant="outline" className="ml-auto border-ochre/30 text-ochre font-bold uppercase text-[10px] tracking-widest">
          {JOB_STATUS_LABELS[job.status]}
        </Badge>
      </div>

      {job.notificationSent && (
        <div className="bg-ochre/10 border border-ochre/20 p-4 rounded-xl flex items-center gap-3 text-ochre text-sm relative z-10">
          <Info className="h-4 w-4 shrink-0" />
          <p className="font-bold uppercase tracking-wider text-[10px]">Next client has been notified</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Service Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-charcoal font-bold">{job.location?.address || job.address}</p>
            </CardContent>
          </Card>

          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Service Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Client Type</p>
                  <p className="text-sm font-black text-charcoal capitalize">{job.clientType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Service Grade</p>
                  <p className="text-sm font-black text-charcoal capitalize">{job.serviceGrade}</p>
                </div>
                {job.servicePackage && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Package</p>
                    <p className="text-sm font-black text-charcoal capitalize">{job.servicePackage.replace(/-/g, ' ')}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Schedule</p>
                  <p className="text-sm font-black text-charcoal capitalize">{job.recurringSchedule}</p>
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-ochre/5">
                <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Description</p>
                <p className="text-sm text-charcoal/70 leading-relaxed">{job.description || 'No description provided.'}</p>
              </div>

              {job.packageNotes && (
                <div className="bg-ochre/10 p-4 rounded-xl border border-ochre/20">
                  <p className="text-[10px] text-ochre font-black uppercase tracking-widest mb-1">Package Notes</p>
                  <p className="text-sm text-charcoal italic">{job.packageNotes}</p>
                </div>
              )}

              <div className="space-y-1 pt-4 border-t border-ochre/5">
                <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Private Notes</p>
                <p className="text-sm text-charcoal/70 leading-relaxed">{job.notes || 'No notes.'}</p>
              </div>
            </CardContent>
          </Card>

          {invoice && (
            <Card className="overflow-hidden border-ochre/20 shadow-xl rounded-xl">
              <CardHeader className="bg-deep-red text-white">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoice {invoice.invoiceNumber}
                  </CardTitle>
                  <Badge variant="outline" className="border-white/30 text-white font-bold uppercase text-[10px] tracking-widest">
                    {invoice.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-4">
                  <div className="flex gap-2">
                    <InvoiceDownloadButton 
                      invoiceId={invoice.id} 
                      existingPdfUrl={invoice.invoicePdfUrl}
                      variant="ghost"
                      className="text-white hover:bg-white/10 border-white/20 flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                    />
                    {invoice.status === 'paid' && job.receiptPdfUrl && (
                      <Button
                        variant="ghost"
                        onClick={() => window.open(job.receiptPdfUrl, '_blank')}
                        className="text-white hover:bg-white/10 border-white/20 flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                      >
                        Download Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-ochre/5 border-b border-ochre/10">
                    <tr>
                      <th className="text-left p-4 text-[10px] font-bold uppercase tracking-widest text-ochre">Description</th>
                      <th className="text-right p-4 text-[10px] font-bold uppercase tracking-widest text-ochre">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ochre/5">
                    {invoice.items.map((item, i) => (
                      <tr key={i} className="bg-white">
                        <td className="p-4 text-charcoal font-medium">{item.description}</td>
                        <td className="p-4 text-right font-black text-charcoal">${(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-ochre/5 font-black">
                    <tr>
                      <td className="p-4 text-deep-red font-serif text-lg">Total Amount</td>
                      <td className="p-4 text-right text-deep-red text-2xl font-black">${(invoice.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
                {invoice.status === 'paid' && (
                  <div className="p-4 bg-ochre/10 text-ochre text-[10px] font-bold uppercase tracking-widest flex justify-between items-center">
                    <span>Paid via {invoice.paymentMethod} on {format(invoice.paidAt!, 'MMM d, h:mm a')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden relative z-10">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents & Proof
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.quotePdfUrl && (
                  <Button 
                    variant="outline" 
                    className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5 group"
                    onClick={() => window.open(job.quotePdfUrl, '_blank')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-ochre/10 flex items-center justify-center mr-3 group-hover:bg-ochre/20 transition-colors">
                      <FileText className="h-4 w-4 text-ochre" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ochre">Service Quote</p>
                      <p className="text-[9px] text-charcoal/60">Official Cost Estimate</p>
                    </div>
                  </Button>
                )}
                {job.bookingPdfUrl && (
                  <Button 
                    variant="outline" 
                    className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5 group"
                    onClick={() => window.open(job.bookingPdfUrl, '_blank')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-ochre/10 flex items-center justify-center mr-3 group-hover:bg-ochre/20 transition-colors">
                      <CheckCircle className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ochre">Booking Pass</p>
                      <p className="text-[9px] text-charcoal/60">Deployment Confirmation</p>
                    </div>
                  </Button>
                )}
                {job.reportPdfUrl && (
                  <Button 
                    variant="outline" 
                    className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5 group"
                    onClick={() => window.open(job.reportPdfUrl, '_blank')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-ochre/10 flex items-center justify-center mr-3 group-hover:bg-ochre/20 transition-colors">
                      <ClipboardList className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ochre">Service Report</p>
                      <p className="text-[9px] text-charcoal/60">Operational After-Action</p>
                    </div>
                  </Button>
                )}
                {job.invoicePdfUrl && (
                  <Button 
                    variant="outline" 
                    className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5 group"
                    onClick={() => window.open(job.invoicePdfUrl, '_blank')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-ochre/10 flex items-center justify-center mr-3 group-hover:bg-ochre/20 transition-colors">
                      <DollarSign className="h-4 w-4 text-deep-red" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ochre">Tax Invoice</p>
                      <p className="text-[9px] text-charcoal/60">Financial documentation</p>
                    </div>
                  </Button>
                )}
                {job.receiptPdfUrl && (
                  <Button 
                    variant="outline" 
                    className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5 group"
                    onClick={() => window.open(job.receiptPdfUrl, '_blank')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-ochre/10 flex items-center justify-center mr-3 group-hover:bg-ochre/20 transition-colors">
                      <ShieldAlert className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-ochre">Payment Receipt</p>
                      <p className="text-[9px] text-charcoal/60">Proof of settlement</p>
                    </div>
                  </Button>
                )}
                {!job.quotePdfUrl && !job.bookingPdfUrl && !job.reportPdfUrl && !job.invoicePdfUrl && !job.receiptPdfUrl && (
                  <div className="col-span-full py-8 text-center bg-ochre/5 rounded-xl border border-dashed border-ochre/20">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ochre/40">No generated documents yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10"><CardTitle className="text-lg font-serif text-deep-red">Pricing Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-6">
              {job.pricingSnapshot ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Base Package ({job.pricingSnapshot.packageName})</span>
                    <span className="font-black text-charcoal">${(job.pricingSnapshot.basePrice || 0).toFixed(2)}</span>
                  </div>
                  {job.pricingSnapshot.tierAdjustment !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Client Tier ({job.pricingSnapshot.tierName})</span>
                      <span className="font-black text-charcoal">{(job.pricingSnapshot.tierAdjustment || 0) > 0 ? '+' : ''}${(job.pricingSnapshot.tierAdjustment || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Grade Adjustment ({job.serviceGrade})</span>
                    <span className="font-black text-charcoal">+${(job.pricingSnapshot.gradeAdjustment || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Condition Surcharges</span>
                    <span className="font-black text-charcoal">+${(job.pricingSnapshot.conditionSurcharge || 0).toFixed(2)}</span>
                  </div>
                  {(job.pricingSnapshot.urgencySurcharge || 0) > 0 && (
                    <div className="flex justify-between text-sm text-deep-red">
                      <span className="font-bold uppercase tracking-widest text-[10px]">Urgency Surcharge</span>
                      <span className="font-black">+${(job.pricingSnapshot.urgencySurcharge || 0).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {job.pricingSnapshot.addOns.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <p className="text-[9px] font-bold text-ochre/60 uppercase">Add-ons Breakdown</p>
                      {job.pricingSnapshot.addOns.map((addon) => (
                        <div key={addon.id} className="flex justify-between text-xs text-charcoal/70 pl-2">
                          <span>• {addon.name}</span>
                          <span>+${(addon.price || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Base Price ({job.clientType})</span>
                    <span className="font-black text-charcoal">${(job.basePrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Grade Adjustment ({job.serviceGrade})</span>
                    <span className="font-black text-charcoal">+${(job.gradeAdjustment || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Condition Surcharges</span>
                    <span className="font-black text-charcoal">+${(job.conditionSurcharge || 0).toFixed(2)}</span>
                  </div>
                  {(job.urgencySurcharge || 0) > 0 && (
                    <div className="flex justify-between text-sm text-deep-red">
                      <span className="font-bold uppercase tracking-widest text-[10px]">Urgency Surcharge</span>
                      <span className="font-black">+${(job.urgencySurcharge || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Add-Ons Total</span>
                    <span className="font-black text-charcoal">+${(job.addOnTotal || 0).toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-ochre/20 flex flex-col gap-3 mt-2">
                {(!job.clientEmail && !jobs.find(j => j.id === id)?.clientEmail) && (
                  <div className="bg-deep-red/10 border border-deep-red/20 p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-deep-red shrink-0 mt-0.5" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-deep-red">
                      Email Required: Delivery cannot proceed without a valid recipient address.
                    </p>
                  </div>
                )}
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (!job.clientEmail) {
                        toast.error("Email Address Missing. Please update the job or client record.");
                        return;
                      }
                      sendQuoteToCustomer(job.id);
                    }}
                    disabled={!job.clientEmail && !jobs.find(j => j.id === id)?.clientEmail}
                    className={`flex-1 border-ochre/30 text-ochre hover:bg-ochre/5 font-bold uppercase text-[10px] tracking-widest h-10 ${(!job.clientEmail) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    <Send className="h-3 w-3 mr-2" />
                    Send Quote to Customer
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(`/quote/${job.id}`, '_blank')}
                    className="text-ochre hover:bg-ochre/5 font-bold uppercase text-[10px] tracking-widest h-10"
                  >
                    Preview Link
                  </Button>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-ochre/10 flex justify-between items-center">
                <span className="font-serif text-xl font-bold text-deep-red">Total Price</span>
                <span className="text-3xl font-black text-deep-red">
                  {job.price === 0 && (job.serviceGrade === 'extreme' || job.billingType === 'quote-required') 
                    ? 'Quote Required' 
                    : `$${(job.price || 0).toFixed(2)}`}
                </span>
              </div>
              {job.manualOverride && (
                <p className="text-[10px] text-ochre font-bold uppercase tracking-widest flex items-center gap-1 mt-2">
                  <AlertCircle className="h-3 w-3" /> Manual override applied
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10"><CardTitle className="text-lg font-serif text-deep-red">Workflow</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-6">
              {['scheduled', 'on-the-way', 'in-progress'].includes(job.status) && (
                <Button className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-12 rounded-xl font-bold shadow-lg" onClick={handleCompleteJob} isLoading={isUpdating}>
                  <CheckCircle className="mr-2 h-4 w-4" /> COMPLETE JOB (AUTO-INVOICE)
                </Button>
              )}
              {job.status === 'scheduled' && (
                <Button variant="outline" className="w-full border-ochre/20 text-ochre hover:bg-ochre/5 h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest mt-2" onClick={() => handleStatusChange('on-the-way')} isLoading={isUpdating}>
                  <Truck className="mr-2 h-3 w-3" /> Start Transit
                </Button>
              )}
              {job.status === 'on-the-way' && (
                <Button variant="outline" className="w-full border-ochre/20 text-ochre hover:bg-ochre/5 h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest mt-2" onClick={() => handleStatusChange('in-progress')} isLoading={isUpdating}>
                  <Play className="mr-2 h-3 w-3" /> Start On-Site Work
                </Button>
              )}
              {job.status === 'invoiced_final' && (
                <Button className="w-full bg-ochre hover:bg-ochre/90 text-white h-12 rounded-xl font-bold shadow-lg" onClick={() => setShowPaymentOptions(true)} isLoading={isUpdating}>
                  <DollarSign className="mr-2 h-4 w-4" /> Take Payment
                </Button>
              )}
              {job.status === 'paid' && (
                <div className="p-4 bg-ochre/10 text-ochre rounded-xl text-center font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-ochre/20">
                  <CheckCircle className="h-5 w-5" /> JOB PAID
                </div>
              )}
            </CardContent>
          </Card>

          {showPaymentOptions && (
            <Card className="border-ochre/20 bg-ochre/5 shadow-xl rounded-xl overflow-hidden">
              <CardHeader className="bg-ochre/10 border-b border-ochre/10"><CardTitle className="text-[10px] font-bold uppercase tracking-widest text-ochre">Payment Options</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-4">
                <Button variant="outline" className="w-full justify-start bg-white border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold" onClick={() => handleMarkPaid('cash')}>
                  <Banknote className="mr-2 h-4 w-4 text-ochre" /> Mark Cash Paid
                </Button>
                <Button variant="outline" className="w-full justify-start bg-white border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold" onClick={() => handleMarkPaid('bank-transfer')}>
                  <DollarSign className="mr-2 h-4 w-4 text-deep-red" /> Mark Bank Transfer
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold" 
                  onClick={() => {
                    if (job.paymentLink) {
                      window.open(job.paymentLink, '_blank');
                      toast.success('Payment link opened in new tab');
                    } else {
                      toast.error('Payment link not generated. Please complete the job first.');
                    }
                  }}
                >
                  <Send className="mr-2 h-4 w-4 text-ochre" /> Send Payment Link
                </Button>
                <Button variant="outline" className="w-full justify-start bg-white border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold">
                  <CreditCard className="mr-2 h-4 w-4 text-charcoal/60" /> Tap to Pay (Stripe)
                </Button>
                <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-ochre" onClick={() => setShowPaymentOptions(false)}>Cancel</Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10"><CardTitle className="text-lg font-serif text-deep-red">On-Site Tools</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-6">
              <Button 
                variant="outline" 
                className="w-full justify-start border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold"
                onClick={() => {
                  setActiveTab('issues');
                  setTimeout(() => {
                    const el = document.getElementById('onsite-upload-btn');
                    el?.click();
                  }, 100);
                }}
              >
                <Camera className="mr-2 h-4 w-4 text-ochre" /> Add Photo
              </Button>
              <Button variant="outline" className="w-full justify-start border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold" onClick={() => setShowAddOnModal(true)}>
                <PlusCircle className="mr-2 h-4 w-4 text-deep-red" /> Add On-Site Add-On
              </Button>
            </CardContent>
          </Card>

          {job.addOns.some(a => a.selected) && (
            <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-ochre/5 border-b border-ochre/10"><CardTitle className="text-lg font-serif text-deep-red">Selected Add-Ons</CardTitle></CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {job.addOns.filter(a => a.selected).map(addon => (
                    <li key={addon.id} className="text-sm flex justify-between items-center">
                      <span className="text-charcoal font-medium">{addon.name}</span>
                      <span className="font-black text-deep-red">${(addon.price || 0).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {profile?.role === 'admin' && (
            <Card className="border-deep-red/20 bg-deep-red/5 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-deep-red/10 border-b border-deep-red/10">
                <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Admin Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-deep-red/20 text-deep-red hover:bg-deep-red/5 rounded-xl h-12 font-bold" 
                  onClick={() => {
                    setOverridePrice(job.price.toString());
                    setShowOverrideModal(true);
                  }}
                >
                  <Edit3 className="mr-2 h-4 w-4" /> Override Price
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-deep-red/40 text-deep-red hover:bg-deep-red/10 rounded-xl h-12 font-bold" 
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Job
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deep-red/40 backdrop-blur-md">
          <Card className="w-full max-w-sm border-ochre/20 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-deep-red/10 border-b border-deep-red/10 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-deep-red/10 flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-deep-red" />
              </div>
              <CardTitle className="font-serif text-deep-red">Confirm Deletion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-center">
              <p className="text-sm text-charcoal">Are you sure you want to delete this job? This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold shadow-lg" onClick={handleDeleteJob} isLoading={isUpdating}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showOverrideModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deep-red/20 backdrop-blur-md">
          <Card className="w-full max-w-sm border-ochre/20 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="font-serif text-deep-red">Admin Price Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre">New Total Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                  <Input 
                    type="number" 
                    step="0.01"
                    className="pl-9 h-12 rounded-xl border-ochre/20"
                    placeholder="0.00"
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowOverrideModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold shadow-lg" onClick={() => handleApplyOverride(false)} isLoading={isUpdating}>
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showOverrideConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deep-red/40 backdrop-blur-md">
          <Card className="w-full max-w-sm border-ochre/20 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-ochre/10 flex items-center justify-center mb-2">
                <DollarSign className="h-6 w-6 text-deep-red" />
              </div>
              <CardTitle className="font-serif text-deep-red">Confirm Price Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-center">
              <p className="text-sm text-charcoal">
                Are you sure you want to change the total price to <span className="font-black text-deep-red">${(parseFloat(overridePrice) || 0).toFixed(2)}</span>?
                This will override all automated pricing rules.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => {
                  setShowOverrideConfirm(false);
                  setShowOverrideModal(true);
                }}>
                  Back
                </Button>
                <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold shadow-lg" onClick={() => handleApplyOverride(true)} isLoading={isUpdating}>
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Evidence & Documentation Workspace */}
      <Card className="border-ochre/20 shadow-xl rounded-xl overflow-hidden relative z-10">
        <CardHeader className="bg-ochre/5 border-b border-ochre/10">
          <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Job Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs className="w-full">
            <TabsList className="w-full h-14 bg-ochre/10 rounded-none border-b border-ochre/10">
              <TabsTrigger 
                active={activeTab === 'before'} 
                onClick={() => setActiveTab('before')}
                className="flex-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px]"
              >
                Before
              </TabsTrigger>
              <TabsTrigger 
                active={activeTab === 'after'} 
                onClick={() => setActiveTab('after')}
                className="flex-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px]"
              >
                After
              </TabsTrigger>
              <TabsTrigger 
                active={activeTab === 'issues'} 
                onClick={() => setActiveTab('issues')}
                className="flex-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px] flex items-center gap-2"
              >
                Issues <Badge variant="secondary" className="bg-deep-red text-white border-none h-4 px-1 text-[8px]">{job.issuePhotos?.length || 0}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent active={activeTab === 'before'}>
                <div className="space-y-4">
                  <PhotoUpload 
                    jobId={job.id}
                    folder="before"
                    photos={job.beforePhotos || []} 
                    onChange={async (newPhotos) => {
                      try {
                        await updateJob(job.id, { beforePhotos: newPhotos });
                      } catch (error) {
                        toast.error('Failed to update photos');
                      }
                    }} 
                  />
                </div>
              </TabsContent>

              <TabsContent active={activeTab === 'after'}>
                <div className="space-y-4">
                  <PhotoUpload 
                    jobId={job.id}
                    folder="after"
                    photos={job.afterPhotos || []} 
                    onChange={async (newPhotos) => {
                      try {
                        await updateJob(job.id, { afterPhotos: newPhotos });
                      } catch (error) {
                        toast.error('Failed to update photos');
                      }
                    }} 
                  />
                </div>
              </TabsContent>

              <TabsContent active={activeTab === 'issues'}>
                <div className="space-y-6">
                  {/* Issue Upload Section */}
                  <div className="bg-red-50 border border-deep-red/10 p-4 rounded-xl flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-deep-red">
                      <ShieldAlert className="h-5 w-5" />
                      <span className="font-serif text-lg">Safety & Issue Reporting</span>
                    </div>
                    
                    <PhotoUpload 
                      jobId={job.id}
                      folder="issues"
                      buttonId="onsite-upload-btn"
                      photos={job.issuePhotos?.map(p => p.url) || []} 
                      onChange={async (urls) => {
                        try {
                          // Find new URLs that aren't in the issues list yet
                          const existingUrls = job.issuePhotos?.map(p => p.url) || [];
                          const newUrls = urls.filter(u => !existingUrls.includes(u));
                          
                          const newIssues: JobIssue[] = [
                            ...(job.issuePhotos || []),
                            ...newUrls.map(url => ({
                              url,
                              createdAt: Date.now(),
                              note: ''
                            }))
                          ];
                          
                          await updateJob(job.id, { issuePhotos: newIssues });
                        } catch (error) {
                          toast.error('Failed to report issue');
                        }
                      }} 
                    />
                  </div>

                  {/* Issues List with Notes */}
                  {job.issuePhotos && job.issuePhotos.length > 0 && (
                    <div className="space-y-4">
                      {job.issuePhotos.map((issue, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl border border-ochre/10 bg-white shadow-sm ring-1 ring-ochre/5">
                          <img 
                            src={issue.url} 
                            alt="Issue" 
                            className="w-24 h-24 object-cover rounded-lg border border-ochre/10" 
                          />
                          <div className="flex-1 space-y-2">
                            {editingIssueIndex === idx ? (
                              <div className="space-y-2">
                                <Textarea 
                                  className="h-16 text-sm border-ochre/20"
                                  placeholder="e.g., Broken sprinkler at North corner..."
                                  value={tempIssueNote}
                                  onChange={(e) => setTempIssueNote(e.target.value)}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    className="bg-deep-red text-white h-8"
                                    onClick={async () => {
                                      const updatedIssues = [...(job.issuePhotos || [])];
                                      updatedIssues[idx].note = tempIssueNote;
                                      await updateJob(job.id, { issuePhotos: updatedIssues });
                                      setEditingIssueIndex(null);
                                      setTempIssueNote('');
                                      toast.success('Issue note saved');
                                    }}
                                  >
                                    <Save className="h-3 w-3 mr-1" /> Save Note
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 text-[10px] uppercase font-bold text-ochre"
                                    onClick={() => setEditingIssueIndex(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="group relative">
                                <p className="text-sm text-charcoal/80 leading-relaxed min-h-[1.5rem]">
                                  {issue.note || <span className="text-ochre/40 italic">No notes added...</span>}
                                </p>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-auto p-1 mt-1 text-ochre hover:text-deep-red font-bold text-[10px] uppercase tracking-widest"
                                  onClick={() => {
                                    setEditingIssueIndex(idx);
                                    setTempIssueNote(issue.note || '');
                                  }}
                                >
                                  Edit Note
                                </Button>
                              </div>
                            )}
                            <p className="text-[10px] text-ochre/60 uppercase font-black">
                              {format(issue.createdAt, 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {showAddOnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-red/20 backdrop-blur-md">
          <Card className="w-full max-w-md border-ochre/20 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="font-serif text-deep-red">Add On-Site Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6 max-h-[60vh] overflow-y-auto">
              {Object.keys(PRICING_RULES.addOns).map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  className="w-full justify-between h-14 border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl font-bold px-6"
                  onClick={() => handleAddAddOn(key)}
                >
                  <span className="font-serif text-lg">{ADD_ON_LABELS[key]}</span>
                  <span className="font-black text-deep-red text-xl">${(PRICING_RULES.addOns as any)[key]}</span>
                </Button>
              ))}
              <Button variant="ghost" className="w-full mt-6 text-[10px] font-bold uppercase tracking-widest text-ochre" onClick={() => setShowAddOnModal(false)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <PasscodeModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onSuccess={handleApprovalSuccess}
        error={approvalError}
        title="Admin Approval Required"
        description={`An admin must approve the addition of ${pendingAddOn?.name}.`}
      />
    </div>
  );
};
