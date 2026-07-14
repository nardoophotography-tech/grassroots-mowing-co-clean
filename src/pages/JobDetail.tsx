import * as React from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
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
  ShieldAlert,
  Clock,
  Copy,
  RefreshCw,
  ExternalLink,
  CheckSquare,
} from 'lucide-react';
import { useInvoices, useAdmin, useJobs as useJobsHook } from '@/hooks/useFirebase';
import { PaymentMethod, AddOn, JobIssue, ActivityEntry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PasscodeModal } from '@/components/PasscodeModal';
import { PRICING_RULES } from '@/constants';
import { computeGst } from '@/utils/money';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { InvoiceDownloadButton } from '@/components/InvoiceDownloadButton';
import { PhotoUpload } from '@/components/PhotoUpload';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWorkflowStage(job: any): 'booked' | 'on_the_way' | 'payment_pending' | 'paid' {
  if (job.paymentStatus === 'paid' || job.paymentStatus === 'successful' || job.status === 'paid') return 'paid';
  if (job.status === 'invoiced_final' || job.status === 'completed' || job.finalActionProcessed) return 'payment_pending';
  if (job.status === 'on-the-way' || job.status === 'in-progress') return 'on_the_way';
  return 'booked';
}

const STAGE_LABELS: Record<string, string> = {
  booked: 'BOOKED',
  on_the_way: 'ON MY WAY',
  payment_pending: 'COMPLETED — PAYMENT PENDING',
  paid: 'PAID',
};

const STAGE_COLORS: Record<string, string> = {
  booked: 'bg-ochre/10 text-ochre border-ochre/20',
  on_the_way: 'bg-blue-50 text-blue-700 border-blue-200',
  payment_pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
};

// ─── On-Site Add-On row in completion panel ──────────────────────────────────

interface OnsiteAddOn {
  id: string;
  description: string;
  amount: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, updateJob, deleteJob, loading, sendQuoteToCustomer } = useJobsHook();
  const { invoices, markAsPaid } = useInvoices();
  const { profile, user: authUser } = useAuth();
  const { verifyAdminPasscode } = useAdmin();

  // ── General UI state ──
  const [isUpdating, setIsUpdating] = React.useState(false);
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

  // ── Workflow state ──
  const [workflowLoading, setWorkflowLoading] = React.useState(false);
  const [workflowMsg, setWorkflowMsg] = React.useState('');
  const [onTheWayResult, setOnTheWayResult] = React.useState<any>(null);

  // ── Completion panel ──
  const [showCompletionPanel, setShowCompletionPanel] = React.useState(false);
  const [completionAmount, setCompletionAmount] = React.useState('');
  const [completionNotes, setCompletionNotes] = React.useState('');
  const [completionDiscount, setCompletionDiscount] = React.useState('');
  const [onsiteAddOns, setOnsiteAddOns] = React.useState<OnsiteAddOn[]>([]);
  const [completionResult, setCompletionResult] = React.useState<any>(null);
  const [completionError, setCompletionError] = React.useState('');

  // ── Manual payment form ──
  const [showManualPayment, setShowManualPayment] = React.useState(false);
  const [manualPayMethod, setManualPayMethod] = React.useState('payid');
  const [manualPayAmount, setManualPayAmount] = React.useState('');
  const [manualPayRef, setManualPayRef] = React.useState('');
  const [manualPayDate, setManualPayDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualPayNotes, setManualPayNotes] = React.useState('');
  const [manualPayLoading, setManualPayLoading] = React.useState(false);

  const job = jobs.find(j => j.id === id);
  const invoice = invoices.find(inv => inv.jobId === id);

  const workflowStage = job ? getWorkflowStage(job) : 'booked';

  // Pre-fill completion panel when it opens.
  // Prefer bookedPrice (preserved at booking time) → pricingSnapshot total → job.price.
  // This ensures the invoice always reflects what the customer was quoted, even if
  // global pricing rules change later.
  React.useEffect(() => {
    if (showCompletionPanel && job) {
      const preferredPrice = (job as any).bookedPrice ?? job.pricingSnapshot?.total ?? job.price ?? 0;
      setCompletionAmount((preferredPrice || 0).toFixed(2));
      // Pre-fill invoice number as reference for manual payment
      if (job.invoiceNumber) setManualPayRef(job.invoiceNumber);
    }
  }, [showCompletionPanel]);

  React.useEffect(() => {
    if (job?.invoiceNumber && !manualPayRef) setManualPayRef(job.invoiceNumber);
  }, [job?.invoiceNumber]);

  if (loading) return <div className="p-8 text-center">Loading job details...</div>;
  if (!job) return <div className="p-8 text-center">Job not found.</div>;

  // ── Computed totals for completion panel ──
  const completionBaseAmount = parseFloat(completionAmount) || job.price || 0;
  const completionAddOnsTotal = onsiteAddOns.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const completionDiscountAmount = parseFloat(completionDiscount) || 0;
  const completionFinalTotal = Math.max(0, completionBaseAmount + completionAddOnsTotal - completionDiscountAmount);

  // ─────────────────────────────────────────────────────────────────────────
  // WORKFLOW HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleOnTheWay = async (resend = false) => {
    if (workflowLoading) return;
    setWorkflowLoading(true);
    setWorkflowMsg(resend ? 'Resending message…' : 'Sending On My Way message…');
    try {
      const res = await fetch(`/api/jobs/${job.id}/on-the-way`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: authUser?.uid, resend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOnTheWayResult(data);
      const smsStatus = data.smsResult?.ok ? 'SMS sent ✓' : 'SMS failed';
      toast.success(resend ? `Message resent — ${smsStatus}` : `On My Way! — ${smsStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send On My Way message');
    } finally {
      setWorkflowLoading(false);
      setWorkflowMsg('');
    }
  };

  const handleCompleteAndInvoice = async () => {
    if (workflowLoading) return;
    if (completionFinalTotal <= 0) {
      setCompletionError('Final amount must be greater than $0');
      return;
    }
    setCompletionError('');
    setWorkflowLoading(true);
    setWorkflowMsg('Completing job…');
    try {
      setWorkflowMsg('Creating invoice…');
      const res = await fetch(`/api/jobs/${job.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalAmount: completionFinalTotal,
          addOns: onsiteAddOns.filter(a => parseFloat(a.amount) > 0).map(a => ({ description: a.description, amount: parseFloat(a.amount) })),
          discount: completionDiscountAmount,
          notes: completionNotes,
          completedBy: authUser?.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete job');

      setCompletionResult(data);
      setShowCompletionPanel(false);

      if (data.stripeSetupFailed) {
        toast.success(`Job completed. Invoice created — Stripe link failed. Use manual payment if needed.`);
      } else {
        toast.success(`Job completed! Invoice sent — ${data.smsResult?.ok ? 'SMS sent' : 'SMS failed'}.`);
      }
    } catch (err: any) {
      setCompletionError(err.message || 'Unknown error');
      toast.error(err.message || 'Failed to complete job');
    } finally {
      setWorkflowLoading(false);
      setWorkflowMsg('');
    }
  };

  const handleResendInvoice = async () => {
    if (workflowLoading) return;
    setWorkflowLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/resend-invoice`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`Invoice resent — SMS: ${data.smsResult?.ok ? '✓' : '✗'}, Email: ${data.emailResult?.ok ? '✓' : '✗'}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (manualPayLoading) return;
    const amount = parseFloat(manualPayAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setManualPayLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/manual-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: manualPayMethod,
          amount,
          date: manualPayDate,
          reference: manualPayRef || job.invoiceNumber,
          notes: manualPayNotes,
          recordedBy: authUser?.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowManualPayment(false);
      toast.success(data.isPaid ? 'Payment recorded — Invoice PAID!' : `Partial payment recorded. Balance: $${(data.balanceDue || 0).toFixed(2)}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setManualPayLoading(false);
    }
  };

  const handleRetryStripe = async () => {
    if (workflowLoading) return;
    setWorkflowLoading(true);
    try {
      const finalAmount = (job as any).finalAmount || job.price || 0;
      const res = await fetch(`/api/jobs/${job.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalAmount, completedBy: authUser?.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(data.paymentLink ? 'Stripe payment link created!' : 'Retry failed — Stripe still unavailable');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LEGACY / ADMIN HANDLERS (kept unchanged)
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddAddOn = (addonKey: string) => {
    const name = ADD_ON_LABELS[addonKey];
    const price = (PRICING_RULES.addOns as any)[addonKey];
    const newAddOn: Partial<AddOn> = { id: addonKey + '-' + Date.now(), name, price, selected: true, addedBy: authUser?.uid };
    if (profile?.role === 'admin') { confirmAddAddOn(newAddOn, authUser?.uid); }
    else { setPendingAddOn(newAddOn); setShowApprovalModal(true); setShowAddOnModal(false); }
  };

  const confirmAddAddOn = async (addon: Partial<AddOn>, approvedBy?: string) => {
    setIsUpdating(true);
    try {
      const updatedAddOns = [...job.addOns, { ...addon, approvedBy, approvedAt: Date.now() } as AddOn];
      const addOnTotal = updatedAddOns.reduce((acc, a) => acc + (a.selected ? a.price : 0), 0);
      const newPrice = job.basePrice + job.gradeAdjustment + job.conditionSurcharge + job.urgencySurcharge + addOnTotal;
      await updateJob(job.id, { addOns: updatedAddOns, addOnTotal, price: newPrice });
      toast.success('Add-on added!');
      setPendingAddOn(null);
    } catch (error) { toast.error('Failed to add add-on'); }
    finally { setIsUpdating(false); }
  };

  const handleApprovalSuccess = async (passcode: string) => {
    const admin = await verifyAdminPasscode(passcode);
    if (admin && pendingAddOn) { setShowApprovalModal(false); setApprovalError(''); confirmAddAddOn(pendingAddOn, admin.uid); }
    else { setApprovalError('Invalid Admin Passcode'); }
  };

  const handleDeleteJob = async () => {
    setIsUpdating(true);
    try { await deleteJob(job.id); navigate('/jobs'); }
    catch (error) { toast.error('Failed to delete job'); }
    finally { setIsUpdating(false); setShowDeleteConfirm(false); }
  };

  const handleApplyOverride = async (confirmed: boolean = false) => {
    if (!overridePrice) return;
    const priceValue = parseFloat(overridePrice);
    if (isNaN(priceValue)) { toast.error('Please enter a valid price'); return; }
    if (!confirmed) { setShowOverrideConfirm(true); setShowOverrideModal(false); return; }
    setIsUpdating(true);
    try { await updateJob(job.id, { price: priceValue, manualOverride: true }); toast.success('Manual price override applied'); setShowOverrideConfirm(false); }
    catch (error) { toast.error('Failed to apply override'); }
    finally { setIsUpdating(false); }
  };

  // ── On-site add-on helpers ──
  const addOnsiteAddOn = () => setOnsiteAddOns(prev => [...prev, { id: Date.now().toString(), description: '', amount: '' }]);
  const removeOnsiteAddOn = (id: string) => setOnsiteAddOns(prev => prev.filter(a => a.id !== id));
  const updateOnsiteAddOn = (id: string, field: 'description' | 'amount', value: string) =>
    setOnsiteAddOns(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  // ─────────────────────────────────────────────────────────────────────────
  // WORKFLOW PANEL — stage-based UI
  // ─────────────────────────────────────────────────────────────────────────

  const renderWorkflowPanel = () => {
    const paymentLink = job.paymentLink || invoice?.paymentLink;
    const invoiceNumber = (job as any).invoiceNumber || invoice?.invoiceNumber;
    const finalAmount = (job as any).finalAmount || job.price || 0;
    const paymentStatus = (job as any).paymentStatus;
    const amountPaid = (job as any).amountPaid || 0;
    const balanceDue = (job as any).balanceDue ?? finalAmount;

    if (workflowStage === 'paid') {
      return (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-black text-green-700 uppercase tracking-widest text-sm">PAID</p>
            {invoiceNumber && <p className="text-[10px] text-green-600 mt-1">Invoice {invoiceNumber}</p>}
            {amountPaid > 0 && <p className="text-[10px] text-green-600">Amount: ${amountPaid.toFixed(2)}</p>}
          </div>
          {invoice && (
            <InvoiceDownloadButton
              invoiceId={invoice.id}
              existingPdfUrl={invoice.invoicePdfUrl}
              variant="outline"
              className="w-full border-ochre/20 text-ochre font-bold uppercase text-[10px] tracking-widest h-10"
            />
          )}
          {(job as any).receiptPdfUrl && (
            <Button variant="outline" className="w-full border-green-200 text-green-700 font-bold uppercase text-[10px] tracking-widest h-10"
              onClick={() => window.open((job as any).receiptPdfUrl, '_blank')}>
              <FileText className="mr-2 h-3 w-3" /> View Receipt
            </Button>
          )}
        </div>
      );
    }

    if (workflowStage === 'payment_pending') {
      const hasStripeLink = !!paymentLink;
      return (
        <div className="space-y-3">
          {/* Status banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="font-black text-amber-700 uppercase tracking-widest text-[10px] flex items-center gap-2">
              <Clock className="h-3 w-3" /> Completed — Awaiting Payment
            </p>
            {invoiceNumber && <p className="text-xs text-amber-600 mt-1">Invoice {invoiceNumber} · ${finalAmount.toFixed(2)}</p>}
            {balanceDue > 0 && balanceDue < finalAmount && (
              <p className="text-xs text-amber-600">Balance due: ${balanceDue.toFixed(2)}</p>
            )}
          </div>

          {/* Stripe pay button */}
          {hasStripeLink ? (
            <Button
              className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-12 rounded-xl font-bold shadow-lg"
              onClick={() => window.open(paymentLink, '_blank')}>
              <CreditCard className="mr-2 h-4 w-4" /> PAY SECURELY BY CARD
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full border-deep-red/30 text-deep-red h-12 rounded-xl font-bold"
              onClick={handleRetryStripe}
              disabled={workflowLoading}>
              <RefreshCw className="mr-2 h-4 w-4" /> {workflowLoading ? 'Retrying…' : 'Retry Stripe Payment Link'}
            </Button>
          )}

          {/* PayID instructions */}
          <div className="p-3 bg-ochre/5 border border-ochre/20 rounded-xl space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-ochre">Pay by PayID</p>
            {process.env.PAYID_EMAIL ? (
              <>
                <p className="text-xs text-charcoal">PayID: {process.env.PAYID_EMAIL}</p>
                <p className="text-xs text-charcoal">Amount: ${finalAmount.toFixed(2)}</p>
                <p className="text-xs text-charcoal">Reference: <span className="font-black">{invoiceNumber}</span></p>
              </>
            ) : (
              <p className="text-[10px] text-charcoal/50">PayID not configured — set PAYID_EMAIL on Render.</p>
            )}
          </div>

          {/* Copy payment link */}
          {hasStripeLink && (
            <Button variant="outline" className="w-full border-ochre/20 text-ochre font-bold uppercase text-[10px] tracking-widest h-10"
              onClick={() => { navigator.clipboard.writeText(paymentLink!); toast.success('Payment link copied!'); }}>
              <Copy className="mr-2 h-3 w-3" /> Copy Payment Link
            </Button>
          )}

          {/* View invoice */}
          {invoice && (
            <InvoiceDownloadButton
              invoiceId={invoice.id}
              existingPdfUrl={invoice.invoicePdfUrl}
              variant="outline"
              className="w-full border-ochre/20 text-ochre font-bold uppercase text-[10px] tracking-widest h-10"
            />
          )}

          {/* Resend invoice */}
          <Button variant="outline" className="w-full border-ochre/20 text-charcoal hover:bg-ochre/5 font-bold uppercase text-[10px] tracking-widest h-10"
            onClick={handleResendInvoice} disabled={workflowLoading}>
            <Send className="mr-2 h-3 w-3" /> Resend Invoice
          </Button>

          {/* Record manual payment — admin only */}
          {(profile?.role === 'admin' || profile?.role === 'staff') && (
            <Button variant="outline"
              className="w-full border-deep-red/20 text-deep-red hover:bg-deep-red/5 font-bold uppercase text-[10px] tracking-widest h-10"
              onClick={() => { setManualPayAmount(balanceDue.toFixed(2)); setManualPayRef(invoiceNumber || ''); setShowManualPayment(true); }}>
              <Banknote className="mr-2 h-3 w-3" /> Record Manual Payment
            </Button>
          )}
        </div>
      );
    }

    if (workflowStage === 'on_the_way') {
      return (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="font-black text-blue-700 uppercase tracking-widest text-[10px] flex items-center gap-2">
              <Truck className="h-3 w-3" /> On My Way
            </p>
            {(job as any).onTheWayAt && (
              <p className="text-[10px] text-blue-500 mt-1">
                Sent {format((job as any).onTheWayAt, 'h:mm a')}
              </p>
            )}
          </div>

          <Button
            className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-14 rounded-xl font-black text-base shadow-lg"
            onClick={() => setShowCompletionPanel(true)}
            disabled={workflowLoading}>
            <CheckCircle className="mr-2 h-5 w-5" /> COMPLETE JOB
          </Button>

          {/* Resend on my way — admin secondary */}
          {profile?.role === 'admin' && (
            <Button variant="ghost"
              className="w-full text-[10px] font-bold uppercase tracking-widest text-ochre h-8"
              onClick={() => handleOnTheWay(true)}
              disabled={workflowLoading}>
              {workflowLoading ? workflowMsg : 'Resend On My Way Message'}
            </Button>
          )}
        </div>
      );
    }

    // 'booked' stage
    return (
      <div className="space-y-3">
        <div className="p-3 bg-ochre/10 border border-ochre/20 rounded-xl">
          <p className="font-black text-ochre uppercase tracking-widest text-[10px]">Booked</p>
          <p className="text-[10px] text-ochre/60 mt-0.5">{format(job.scheduledDate, 'EEEE, MMMM d')} · {TIME_SLOT_LABELS[job.timeSlot]}</p>
        </div>

        <Button
          className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-14 rounded-xl font-black text-base shadow-lg disabled:opacity-60"
          onClick={() => handleOnTheWay(false)}
          disabled={workflowLoading}>
          <Truck className="mr-2 h-5 w-5" />
          {workflowLoading ? workflowMsg || 'Sending…' : 'ON MY WAY'}
        </Button>

        {onTheWayResult && (
          <p className="text-[10px] text-center font-bold text-ochre">
            {onTheWayResult.smsResult?.ok ? '✓ SMS sent' : '✗ SMS failed'} · {onTheWayResult.emailResult?.ok ? 'Email sent' : 'No email'}
          </p>
        )}

        {!job.clientPhone && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[10px] font-bold text-amber-700 flex items-start gap-2">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /> No mobile number — SMS will be skipped
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVITY LOG
  // ─────────────────────────────────────────────────────────────────────────

  const activityLog: ActivityEntry[] = (job as any).activityLog || [];

  const renderActivityLog = () => {
    if (activityLog.length === 0) return null;
    return (
      <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-ochre/5 border-b border-ochre/10">
          <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
            <Clock className="h-5 w-5" /> Activity History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {[...activityLog].sort((a, b) => b.timestamp - a.timestamp).map((entry) => (
            <div key={entry.id} className="flex gap-3 pb-3 border-b border-ochre/5 last:border-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${entry.status === 'success' ? 'bg-green-500' : entry.status === 'failed' ? 'bg-deep-red' : 'bg-ochre'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-charcoal">{entry.action}</p>
                {entry.detail && <p className="text-[10px] text-charcoal/60">{entry.detail}</p>}
                <p className="text-[10px] text-ochre/60 mt-0.5">{format(entry.timestamp, 'MMM d, h:mm a')} · {entry.by || 'system'}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLETION PANEL MODAL
  // ─────────────────────────────────────────────────────────────────────────

  const renderCompletionPanel = () => (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-deep-red/30 backdrop-blur-md">
      <Card className="w-[calc(100vw-24px)] max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl border-ochre/20 max-h-[90vh] flex flex-col overflow-y-auto">
        <CardHeader className="bg-deep-red text-white flex flex-row items-center justify-between shrink-0">
          <CardTitle className="font-serif text-lg">Complete Job</CardTitle>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 w-8 p-0 rounded-lg"
            onClick={() => { setShowCompletionPanel(false); setCompletionError(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div className="overflow-y-auto flex-1">
          <CardContent className="space-y-5 pt-5 pb-4">

            {/* Final amount */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Final Job Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                <Input type="number" step="0.01" className="pl-9 h-12 rounded-xl border-ochre/20 font-bold text-base"
                  placeholder="0.00" value={completionAmount}
                  onChange={e => setCompletionAmount(e.target.value)} />
              </div>
              <p className="text-[10px] text-charcoal/50">Booked price: ${((job as any).bookedPrice ?? job.pricingSnapshot?.total ?? job.price ?? 0).toFixed(2)}. Change only if on-site conditions differ.</p>
            </div>

            {/* On-site add-ons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">On-Site Add-Ons</Label>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold text-deep-red h-7 px-2" onClick={addOnsiteAddOn}>
                  <PlusCircle className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
              {onsiteAddOns.map(addon => (
                <div key={addon.id} className="flex gap-2 items-center">
                  <Input placeholder="Description (e.g. Green waste removal)"
                    className="flex-1 h-10 rounded-xl border-ochre/20 text-sm"
                    value={addon.description} onChange={e => updateOnsiteAddOn(addon.id, 'description', e.target.value)} />
                  <div className="relative w-28 shrink-0">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ochre" />
                    <Input type="number" step="0.01" placeholder="0.00"
                      className="pl-7 h-10 rounded-xl border-ochre/20 text-sm"
                      value={addon.amount} onChange={e => updateOnsiteAddOn(addon.id, 'amount', e.target.value)} />
                  </div>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-deep-red hover:bg-deep-red/10 rounded-xl"
                    onClick={() => removeOnsiteAddOn(addon.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Discount */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Discount (optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                <Input type="number" step="0.01" className="pl-9 h-10 rounded-xl border-ochre/20"
                  placeholder="0.00" value={completionDiscount}
                  onChange={e => setCompletionDiscount(e.target.value)} />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Completion Notes (optional)</Label>
              <Textarea className="rounded-xl border-ochre/20 text-sm h-20" placeholder="Any notes about the job…"
                value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} />
            </div>

            {/* Totals summary */}
            <div className="bg-ochre/5 border border-ochre/20 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Base Service</span>
                <span className="font-bold">${completionBaseAmount.toFixed(2)}</span>
              </div>
              {completionAddOnsTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Add-Ons</span>
                  <span className="font-bold">+${completionAddOnsTotal.toFixed(2)}</span>
                </div>
              )}
              {completionDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="font-bold uppercase tracking-widest text-[10px]">Discount</span>
                  <span className="font-bold">-${completionDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {(() => {
                // Calculate GST explicitly on top of the subtotal
                const g = computeGst(completionFinalTotal);
                return (
                  <>
                    <div className="flex justify-between text-sm pt-2 border-t border-ochre/10">
                      <span className="text-charcoal/60 font-bold uppercase tracking-widest text-[10px]">Subtotal (excl. GST)</span>
                      <span className="font-bold">${g.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-charcoal/60 font-bold uppercase tracking-widest text-[10px]">GST (10%)</span>
                      <span className="font-bold">${g.gstAmount.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
              <div className="flex justify-between pt-2 border-t border-ochre/20">
                <span className="font-serif font-bold text-deep-red">Final Total (inc. GST)</span>
                <span className="font-black text-deep-red text-xl">${computeGst(completionFinalTotal).totalIncludingGst.toFixed(2)}</span>
              </div>
            </div>

            {completionError && (
              <div className="bg-deep-red/10 border border-deep-red/20 p-3 rounded-xl text-[10px] font-bold text-deep-red">
                {completionError}
              </div>
            )}

          </CardContent>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-ochre/10 bg-white space-y-2 shrink-0">
          <Button
            className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-14 rounded-xl font-black text-base shadow-lg disabled:opacity-60"
            onClick={handleCompleteAndInvoice}
            disabled={workflowLoading || completionFinalTotal <= 0}>
            <CheckSquare className="mr-2 h-5 w-5" />
            {workflowLoading ? workflowMsg || 'Processing…' : 'COMPLETE AND SEND INVOICE'}
          </Button>
          <Button variant="ghost" className="w-full h-10 text-[10px] font-bold uppercase tracking-widest text-ochre"
            onClick={() => { setShowCompletionPanel(false); setCompletionError(''); }}
            disabled={workflowLoading}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MANUAL PAYMENT MODAL
  // ─────────────────────────────────────────────────────────────────────────

  const renderManualPaymentModal = () => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-deep-red/40 backdrop-blur-md">
      <Card className="w-[calc(100vw-24px)] max-w-md rounded-2xl overflow-hidden shadow-2xl border-ochre/20 max-h-[90vh] flex flex-col overflow-y-auto">
        <CardHeader className="bg-ochre/10 border-b border-ochre/20 flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-deep-red">Record Manual Payment</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => setShowManualPayment(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Payment Method</Label>
            <select className="w-full h-10 rounded-xl border border-ochre/20 px-3 text-sm bg-white"
              value={manualPayMethod} onChange={e => setManualPayMethod(e.target.value)}>
              <option value="payid">PayID</option>
              <option value="cash">Cash</option>
              <option value="eft">EFT / Bank Transfer</option>
              <option value="stripe">Card (External)</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Amount Received</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
              <Input type="number" step="0.01" className="pl-9 h-10 rounded-xl border-ochre/20"
                placeholder="0.00" value={manualPayAmount} onChange={e => setManualPayAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Payment Date</Label>
            <Input type="date" className="h-10 rounded-xl border-ochre/20"
              value={manualPayDate} onChange={e => setManualPayDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Payment Reference</Label>
            <Input className="h-10 rounded-xl border-ochre/20" placeholder="Invoice number or transaction ref"
              value={manualPayRef} onChange={e => setManualPayRef(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-ochre">Notes (optional)</Label>
            <Textarea className="rounded-xl border-ochre/20 h-16 text-sm" placeholder="e.g. BSB confirmation number"
              value={manualPayNotes} onChange={e => setManualPayNotes(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setShowManualPayment(false)}>Cancel</Button>
            <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white h-11 rounded-xl font-bold shadow-lg"
              onClick={handleManualPayment} disabled={manualPayLoading}>
              {manualPayLoading ? 'Recording…' : 'Record Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

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

      {/* Header */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-deep-red font-serif tracking-tight">{job.clientName}</h2>
          <p className="text-ochre font-bold uppercase tracking-widest text-[10px]">{format(job.scheduledDate, 'EEEE, MMMM d, yyyy')} · {TIME_SLOT_LABELS[job.timeSlot]}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${STAGE_COLORS[workflowStage]}`}>
          {STAGE_LABELS[workflowStage]}
        </div>
      </div>

      {job.notificationSent && (
        <div className="bg-ochre/10 border border-ochre/20 p-4 rounded-xl flex items-center gap-3 text-ochre text-sm relative z-10">
          <Info className="h-4 w-4 shrink-0" />
          <p className="font-bold uppercase tracking-wider text-[10px]">Next client has been notified</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* LEFT COLUMN */}
        <div className="md:col-span-2 space-y-6">

          {/* Service Address */}
          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Service Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-charcoal font-bold">{job.location?.address || job.address}</p>
            </CardContent>
          </Card>

          {/* Service Overview */}
          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                <ClipboardList className="h-5 w-5" /> Service Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {job.notes && (
                <div className="space-y-1 pt-4 border-t border-ochre/5">
                  <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Notes</p>
                  <p className="text-sm text-charcoal/70 leading-relaxed">{job.notes}</p>
                </div>
              )}
              {(job as any).completionNotes && (
                <div className="space-y-1 pt-4 border-t border-ochre/5">
                  <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Completion Notes</p>
                  <p className="text-sm text-charcoal/70 leading-relaxed">{(job as any).completionNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice card (if exists) */}
          {invoice && (
            <Card className="overflow-hidden border-ochre/20 shadow-xl rounded-xl">
              <CardHeader className="bg-deep-red text-white">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Invoice {invoice.invoiceNumber}
                  </CardTitle>
                  <Badge variant="outline" className="border-white/30 text-white font-bold uppercase text-[10px] tracking-widest">
                    {invoice.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <InvoiceDownloadButton
                    invoiceId={invoice.id}
                    existingPdfUrl={invoice.invoicePdfUrl}
                    variant="ghost"
                    className="text-white hover:bg-white/10 border-white/20 flex-1 h-10 text-[10px] font-black uppercase tracking-widest"
                  />
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
                      <td className="p-4 text-deep-red font-serif text-lg">Total</td>
                      <td className="p-4 text-right text-deep-red text-2xl font-black">${(invoice.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
                {invoice.status === 'paid' && invoice.paidAt && (
                  <div className="p-4 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest border-t border-green-100">
                    Paid via {invoice.paymentMethod} on {format(invoice.paidAt, 'MMM d, h:mm a')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {(job.quotePdfUrl || job.bookingPdfUrl || job.reportPdfUrl || job.invoicePdfUrl || job.receiptPdfUrl) && (
            <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-ochre/5 border-b border-ochre/10">
                <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.quotePdfUrl && <Button variant="outline" className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5" onClick={() => window.open(job.quotePdfUrl, '_blank')}><FileText className="mr-3 h-4 w-4 text-ochre" /><div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-ochre">Quote</p></div></Button>}
                {job.bookingPdfUrl && <Button variant="outline" className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5" onClick={() => window.open(job.bookingPdfUrl, '_blank')}><CheckCircle className="mr-3 h-4 w-4 text-secondary" /><div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-ochre">Booking Pass</p></div></Button>}
                {job.reportPdfUrl && <Button variant="outline" className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5" onClick={() => window.open(job.reportPdfUrl, '_blank')}><ClipboardList className="mr-3 h-4 w-4 text-blue-500" /><div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-ochre">Service Report</p></div></Button>}
                {job.invoicePdfUrl && <Button variant="outline" className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5" onClick={() => window.open(job.invoicePdfUrl, '_blank')}><DollarSign className="mr-3 h-4 w-4 text-deep-red" /><div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-ochre">Tax Invoice</p></div></Button>}
                {job.receiptPdfUrl && <Button variant="outline" className="justify-start border-ochre/20 h-14 rounded-xl hover:bg-ochre/5" onClick={() => window.open(job.receiptPdfUrl, '_blank')}><ShieldAlert className="mr-3 h-4 w-4 text-green-600" /><div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest text-ochre">Receipt</p></div></Button>}
              </CardContent>
            </Card>
          )}

          {/* Pricing Breakdown */}
          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="text-lg font-serif text-deep-red">Pricing Breakdown</CardTitle>
            </CardHeader>
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
                      <span className="font-black text-charcoal">{job.pricingSnapshot.tierAdjustment > 0 ? '+' : ''}${(job.pricingSnapshot.tierAdjustment || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Grade Adjustment</span>
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
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Base Price</span>
                    <span className="font-black text-charcoal">${(job.basePrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ochre font-bold uppercase tracking-widest text-[10px]">Grade Adjustment</span>
                    <span className="font-black text-charcoal">+${(job.gradeAdjustment || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="pt-4 border-t border-ochre/20 flex justify-between items-center">
                <span className="font-serif text-xl font-bold text-deep-red">Total Price</span>
                <span className="text-3xl font-black text-deep-red">
                  {job.price === 0 && job.billingType === 'quote-required' ? 'Quote Required' : `$${(job.price || 0).toFixed(2)}`}
                </span>
              </div>
              {(job as any).manualOverride && (
                <p className="text-[10px] text-ochre font-bold uppercase tracking-widest flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Manual override applied</p>
              )}

              {/* Quote send button (if applicable) */}
              {job.billingType === 'quote-required' && (
                <div className="flex gap-3 pt-2 border-t border-ochre/10">
                  <Button variant="outline" size="sm"
                    onClick={() => { if (!job.clientEmail) { toast.error('Email missing'); return; } sendQuoteToCustomer(job.id); }}
                    className="flex-1 border-ochre/30 text-ochre hover:bg-ochre/5 font-bold uppercase text-[10px] tracking-widest h-10">
                    <Send className="h-3 w-3 mr-2" /> Send Quote
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/quote/${job.id}`, '_blank')}
                    className="text-ochre hover:bg-ochre/5 font-bold uppercase text-[10px] tracking-widest h-10">
                    Preview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity log */}
          {renderActivityLog()}

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* ── WORKFLOW PANEL ── */}
          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="text-lg font-serif text-deep-red">Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {renderWorkflowPanel()}
            </CardContent>
          </Card>

          {/* On-Site Tools (visible before completion) */}
          {workflowStage !== 'paid' && (
            <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-ochre/5 border-b border-ochre/10">
                <CardTitle className="text-lg font-serif text-deep-red">On-Site Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <Button variant="outline" className="w-full justify-start border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold"
                  onClick={() => { setActiveTab('issues'); setTimeout(() => document.getElementById('onsite-upload-btn')?.click(), 100); }}>
                  <Camera className="mr-2 h-4 w-4 text-ochre" /> Add Photo
                </Button>
                <Button variant="outline" className="w-full justify-start border-ochre/20 text-charcoal hover:bg-ochre/5 rounded-xl h-12 font-bold"
                  onClick={() => setShowAddOnModal(true)}>
                  <PlusCircle className="mr-2 h-4 w-4 text-deep-red" /> Add On-Site Add-On
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Selected Add-Ons */}
          {(job.addOns ?? []).some(a => a.selected) && (
            <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-ochre/5 border-b border-ochre/10">
                <CardTitle className="text-lg font-serif text-deep-red">Selected Add-Ons</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {(job.addOns ?? []).filter(a => a.selected).map(addon => (
                    <li key={addon.id} className="text-sm flex justify-between items-center">
                      <span className="text-charcoal font-medium">{addon.name}</span>
                      <span className="font-black text-deep-red">${(addon.price || 0).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Admin Controls */}
          {/* Admin Controls */}
          {profile?.role === 'admin' && (
            <Card className="border-deep-red/20 bg-deep-red/5 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-deep-red/10 border-b border-deep-red/10">
                <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Admin Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <Button variant="outline" className="w-full justify-start border-deep-red/20 text-deep-red hover:bg-deep-red/5 rounded-xl h-12 font-bold"
                  onClick={() => { setOverridePrice(job.price.toString()); setShowOverrideModal(true); }}>
                  <Edit3 className="mr-2 h-4 w-4" /> Override Price
                </Button>
                <Button variant="outline" className="w-full justify-start border-deep-red/40 text-deep-red hover:bg-deep-red/10 rounded-xl h-12 font-bold"
                  onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Job
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Job Workspace (photos/issues) */}
      <Card className="border-ochre/20 shadow-xl rounded-xl overflow-hidden relative z-10">
        <CardHeader className="bg-ochre/5 border-b border-ochre/10">
          <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
            <Camera className="h-5 w-5" /> Job Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs className="w-full">
            <TabsList className="w-full h-14 bg-ochre/10 rounded-none border-b border-ochre/10">
              <TabsTrigger active={activeTab === 'before'} onClick={() => setActiveTab('before')} className="flex-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px]">Before</TabsTrigger>
              <TabsTrigger active={activeTab === 'after'} onClick={() => setActiveTab('after')} className="flex-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px]">After</TabsTrigger>
              <TabsTrigger active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} className="flex-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                Issues <Badge variant="secondary" className="bg-deep-red text-white border-none h-4 px-1 text-[8px]">{job.issuePhotos?.length || 0}</Badge>
              </TabsTrigger>
            </TabsList>
            <div className="p-6">
              <TabsContent active={activeTab === 'before'}>
                <PhotoUpload jobId={job.id} folder="before" photos={job.beforePhotos || []}
                  onChange={async (p) => { try { await updateJob(job.id, { beforePhotos: p }); } catch { toast.error('Failed to update photos'); } }} />
              </TabsContent>
              <TabsContent active={activeTab === 'after'}>
                <PhotoUpload jobId={job.id} folder="after" photos={job.afterPhotos || []}
                  onChange={async (p) => { try { await updateJob(job.id, { afterPhotos: p }); } catch { toast.error('Failed to update photos'); } }} />
              </TabsContent>
              <TabsContent active={activeTab === 'issues'}>
                <div className="space-y-6">
                  <div className="bg-red-50 border border-deep-red/10 p-4 rounded-xl flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-deep-red">
                      <ShieldAlert className="h-5 w-5" />
                      <span className="font-serif text-lg">Safety &amp; Issue Reporting</span>
                    </div>
                    <PhotoUpload jobId={job.id} folder="issues" buttonId="onsite-upload-btn"
                      photos={job.issuePhotos?.map(p => p.url) || []}
                      onChange={async (urls) => {
                        try {
                          const existingUrls = job.issuePhotos?.map(p => p.url) || [];
                          const newIssues: JobIssue[] = [
                            ...(job.issuePhotos || []),
                            ...urls.filter(u => !existingUrls.includes(u)).map(url => ({ url, createdAt: Date.now(), note: '' }))
                          ];
                          await updateJob(job.id, { issuePhotos: newIssues });
                        } catch { toast.error('Failed to report issue'); }
                      }} />
                  </div>
                  {job.issuePhotos && job.issuePhotos.length > 0 && (
                    <div className="space-y-4">
                      {job.issuePhotos.map((issue, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl border border-ochre/10 bg-white shadow-sm">
                          <img src={issue.url} alt="Issue" className="w-24 h-24 object-cover rounded-lg border border-ochre/10" />
                          <div className="flex-1 space-y-2">
                            {editingIssueIndex === idx ? (
                              <div className="space-y-2">
                                <Textarea className="h-16 text-sm border-ochre/20" placeholder="e.g., Broken sprinkler"
                                  value={tempIssueNote} onChange={e => setTempIssueNote(e.target.value)} autoFocus />
                                <div className="flex gap-2">
                                  <Button size="sm" className="bg-deep-red text-white h-8"
                                    onClick={async () => {
                                      const updated = [...(job.issuePhotos || [])];
                                      updated[idx].note = tempIssueNote;
                                      await updateJob(job.id, { issuePhotos: updated });
                                      setEditingIssueIndex(null); setTempIssueNote(''); toast.success('Note saved');
                                    }}>
                                    <Save className="h-3 w-3 mr-1" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold text-ochre" onClick={() => setEditingIssueIndex(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-charcoal/80">{issue.note || 'No notes'}</p>
                                <Button size="sm" variant="ghost" className="h-auto p-1 mt-1 text-ochre hover:text-deep-red font-bold text-[10px] uppercase"
                                  onClick={() => { setEditingIssueIndex(idx); setTempIssueNote(issue.note || ''); }}>Edit Note</Button>
                              </div>
                            )}
                            <p className="text-[10px] text-ochre/60 uppercase font-black">{format(issue.createdAt, 'MMM d, h:mm a')}</p>
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

      {/* Pre-set add-on selection modal */}
      {showAddOnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-red/20 backdrop-blur-md">
          <Card className="w-[calc(100vw-24px)] max-w-md border-ochre/20 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col overflow-y-auto">
            <CardHeader className="bg-ochre/10 border-b border-ochre/20 px-5 py-4 flex items-center justify-between flex-row">
              <h3 className="font-bold text-lg text-charcoal font-serif">Add Service Add-On</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddOnModal(false)}>X</Button>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-charcoal/60">Select to append to this job:</p>
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
                {Object.entries(ADD_ON_LABELS).map(([key, label]) => {
                  const price = (PRICING_RULES.addOns as any)[key];
                  const already = job.addOns?.some((a: any) => a.id?.startsWith(key) && a.selected);
                  return (
                    <button key={key} disabled={already} onClick={() => handleAddAddOn(key)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${already ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-ochre/30 text-charcoal hover:bg-ochre/5 hover:border-ochre/60'}`}>
                      <span>{label}</span>
                      <span className="text-deep-red font-black">{already ? 'Added' : price != null ? '+$' + price.toFixed(2) : 'Custom'}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin passcode approval modal */}
      {showApprovalModal && (
        <PasscodeModal
          title="Admin Approval Required"
          description="Enter admin passcode to approve this add-on."
          error={approvalError}
          onSuccess={handleApprovalSuccess}
          onClose={() => { setShowApprovalModal(false); setApprovalError(''); setPendingAddOn(null); }}
        />
      )}

      {/* Completion panel */}
      {showCompletionPanel && createPortal(renderCompletionPanel(), document.body)}

      {/* Manual payment modal */}
      {showManualPayment && createPortal(renderManualPaymentModal(), document.body)}

      {/* Delete confirmation */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deep-red/40 backdrop-blur-md">
          <Card className="w-[calc(100vw-24px)] max-w-sm border-ochre/20 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col overflow-y-auto">
            <CardHeader className="bg-deep-red/10 border-b border-deep-red/10 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-deep-red/10 flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-deep-red" />
              </div>
              <CardTitle className="font-serif text-deep-red">Confirm Deletion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-center">
              <p className="text-sm text-charcoal">Delete this job? This cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold" onClick={handleDeleteJob} disabled={isUpdating}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      , document.body)}

      {/* Price override modal */}
      {showOverrideModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deep-red/20 backdrop-blur-md">
          <Card className="w-[calc(100vw-24px)] max-w-sm border-ochre/20 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col overflow-y-auto">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10">
              <CardTitle className="font-serif text-deep-red">Admin Price Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-ochre">New Total Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                  <Input type="number" step="0.01" className="pl-9 h-12 rounded-xl border-ochre/20" placeholder="0.00"
                    value={overridePrice} onChange={e => setOverridePrice(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold" onClick={() => handleApplyOverride(false)} disabled={isUpdating}>Apply</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      , document.body)}

      {showOverrideConfirm && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deep-red/40 backdrop-blur-md">
          <Card className="w-[calc(100vw-24px)] max-w-sm border-ochre/20 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col overflow-y-auto">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-ochre/10 flex items-center justify-center mb-2">
                <DollarSign className="h-6 w-6 text-deep-red" />
              </div>
              <CardTitle className="font-serif text-deep-red">Confirm Price Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 text-center">
              <p className="text-sm text-charcoal">Change the total price to ${(parseFloat(overridePrice) || 0).toFixed(2)}?</p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold" onClick={() => { setShowOverrideConfirm(false); setShowOverrideModal(true); }}>Back</Button>
                <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold" onClick={async () => {
                  if (!job) return;
                  try {
                    setWorkflowLoading(true);
                    await updateDoc(doc(db, 'jobs', job.id), { price: parseFloat(overridePrice) || 0 });
                    toast.success('Price updated.');
                    setShowOverrideConfirm(false);
                    setShowOverrideModal(false);
                    setOverridePrice('');
                  } catch (e: any) {
                    toast.error(e.message || 'Failed to update price.');
                  } finally {
                    setWorkflowLoading(false);
                  }
                }}>Confirm Override</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      , document.body)}
    </div>
  );
};
