import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices, useJobs } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAILS } from '../constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Search, 
  ArrowLeft, 
  Send, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { triggerNotification } from '@/services/notificationService';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

export const InvoiceList = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { invoices, loading, markAsPaid, deleteInvoice } = useInvoices();
  const { jobs } = useJobs();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const isAdmin = profile?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email));

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const invoiceId = params.get('invoiceId');
    
    if (success && invoiceId) {
      // Small delay to ensure Firestore has updated or just to show the toast
      const processSuccess = async () => {
        // Since we are redirecting back, we mark it as paid via the hook
        await markAsPaid(invoiceId, 'stripe');
        toast.success('Invoice successfully paid via Stripe!');
        // Clean the URL
        navigate('/invoices', { replace: true });
      };
      processSuccess();
    }
  }, [navigate, markAsPaid]);

  const sendReminder = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    const job = jobs.find(j => j.id === inv.jobId);
    if (!job) return;

    await triggerNotification('payment-reminder', job, { amount: inv.totalAmount, link: inv.paymentLink });
    toast.success('Reminder sent via Email & SMS');
  };

  const handleMarkAsPaid = async (id: string, method: 'bank-transfer' | 'cash' = 'bank-transfer') => {
    if (confirm(`Mark this invoice as paid via ${method === 'cash' ? 'CASH' : 'manual transfer'}?`)) {
      await markAsPaid(id, method);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsConfirmingDelete(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const success = await deleteInvoice(deletingId);
      if (success) {
        setIsConfirmingDelete(false);
        setDeletingId(null);
      }
    } catch (error) {
      toast.error('Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.createdAt - a.createdAt);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-deep-red border-t-transparent" />
        <p className="text-ochre font-black uppercase tracking-widest text-[10px]">Syncing Invoices...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-charcoal tracking-tight">Asset Billing - Financial Center</h1>
          <p className="text-xs text-ochre font-bold uppercase tracking-widest italic">Revenue & Invoice Management Control Room</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search client or invoice #" 
              className="pl-10 h-11 border-ochre/10 focus:border-ochre/30 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 bg-white border border-ochre/10 rounded-xl px-4 text-xs font-bold text-charcoal outline-none focus:ring-2 focus:ring-ochre/20"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase">Total Invoiced</p>
              <p className="text-2xl font-bold text-blue-900">${invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-bold uppercase">Total Paid</p>
              <p className="text-2xl font-bold text-green-900">${invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full text-orange-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-orange-600 font-bold uppercase">Outstanding</p>
              <p className="text-2xl font-bold text-orange-900">${invoices.filter(i => i.status !== 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-background border-b border-border text-clay text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5 italic">Credential</th>
                <th className="px-8 py-5">Account Holder</th>
                <th className="px-8 py-5">Emission Date</th>
                <th className="px-8 py-5">Appraisal</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredInvoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-background/50 transition-colors group">
                  <td className="px-8 py-6 font-mono font-black text-secondary tracking-tighter text-xs">{invoice.invoiceNumber}</td>
                  <td className="px-8 py-6">
                    <p className="font-black text-charcoal text-sm italic">{invoice.clientName}</p>
                    <p className="text-[10px] text-clay font-medium truncate max-w-[200px] mt-0.5">{invoice.clientAddress}</p>
                  </td>
                  <td className="px-8 py-6 text-clay text-xs font-black uppercase tracking-widest">{format(invoice.createdAt, 'MMM d, yyyy')}</td>
                  <td className="px-8 py-6 font-black text-charcoal text-base">${invoice.totalAmount.toFixed(2)}</td>
                  <td className="px-8 py-6">
                    <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 px-2">
                      {isAdmin && invoice.status !== 'paid' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMarkAsPaid(invoice.id, invoice.status === 'pending-cash' ? 'cash' : 'bank-transfer')}
                          className="text-primary"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Paid
                        </Button>
                      )}
                      {!isAdmin && invoice.status !== 'paid' && (
                        <Button 
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/pay/${invoice.id}`)}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                      {isAdmin && invoice.status !== 'paid' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => sendReminder(invoice.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Remind
                        </Button>
                      )}
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            const link = `${window.location.origin}/pay/${invoice.id}`;
                            navigator.clipboard.writeText(link);
                            toast.success('Payment link copied');
                          }}
                          className="text-accent"
                        >
                          Liaise
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${invoice.jobId}`)}>
                        Audit
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isDeleting && deletingId === invoice.id}
                          onClick={() => handleDeleteClick(invoice.id)}
                          className={cn(
                            "text-secondary hover:bg-secondary/5",
                            isDeleting && deletingId === invoice.id && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Trash2 className={cn("h-4 w-4", isDeleting && deletingId === invoice.id && "animate-pulse")} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="p-20 text-center text-clay italic font-black uppercase tracking-widest text-[10px]">
              No financial records found in current segment.
            </div>
          )}
        </div>
      </div>

      <Dialog 
        open={isConfirmingDelete} 
        onOpenChange={setIsConfirmingDelete}
        title="Delete Invoice"
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Are you sure you want to delete this invoice? This action cannot be undone and will reset the associated job to "Completed" status.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
              className="font-bold text-gray-500"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 font-bold min-w-[100px]"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Invoice'
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
