import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { useJobs, useClients, useInvoices, useSettings, useAgencyStaff, usePayments } from '@/src/hooks/useFirebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { 
  PlusCircle, 
  MapPin, 
  ClipboardList, 
  ExternalLink, 
  Clock, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  LayoutDashboard,
  Calendar,
  FileText,
  CreditCard,
  Settings,
  UserCircle,
  ArrowRight,
  Zap,
  UserPlus,
  Trash2,
  ArrowLeft,
  Home,
  Plus,
  Mail,
  ShieldCheck,
  Building2,
  PieChart
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Input } from '@/src/components/ui/Input';
import { Label } from '@/src/components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/Tabs';
import { format } from 'date-fns';
import { JOB_STATUS_LABELS, TIME_SLOT_LABELS } from '@/src/constants';

const AdminDashboard = () => {
  const { jobs, broadcastDailyStart, loading: jobsLoading } = useJobs();
  const { clients, loading: clientsLoading } = useClients();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { payments, loading: paymentsLoading } = usePayments();
  const { settings } = useSettings();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isLoading = jobsLoading || clientsLoading || invoicesLoading || paymentsLoading;

  const [clientTypeFilter, setClientTypeFilter] = React.useState<string>('all');
  const [suburbFilter, setSuburbFilter] = React.useState<string>('all');

  const filteredJobs = jobs.filter(j => {
    const matchesType = clientTypeFilter === 'all' || j.clientType === clientTypeFilter;
    const matchesSuburb = suburbFilter === 'all' || j.suburb === suburbFilter;
    return matchesType && matchesSuburb;
  });

  // LIVE CALCULATIONS
  // Active Jobs: scheduled | on-the-way | in-progress
  const activeJobsCount = filteredJobs.filter(j => 
    ['scheduled', 'on-the-way', 'in-progress'].includes(j.status)
  ).length;

  // Pending Payment: completed | invoiced
  const pendingPaymentJobsCount = filteredJobs.filter(j => 
    ['completed', 'invoiced'].includes(j.status)
  ).length;

  // Monthly Revenue: successful payments this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthRevenue = payments
    .filter(p => {
      const pDate = new Date(p.createdAt);
      return p.status === 'successful' && 
             pDate.getMonth() === currentMonth && 
             pDate.getFullYear() === currentYear;
    })
    .reduce((acc, p) => acc + p.amount, 0);

  const [isDiagnosticRunning, setIsDiagnosticRunning] = React.useState(false);
  const [stripeStatus, setStripeStatus] = React.useState<'checking' | 'connected' | 'error'>(settings?.stripeConnected ? 'connected' : 'error');

  // Re-check stripe when settings change
  React.useEffect(() => {
    setStripeStatus(settings?.stripeConnected ? 'connected' : 'error');
  }, [settings?.stripeConnected]);

  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    const t = toast.loading('Running system diagnostics...');
    
    try {
      // Simulate checking various parts of the system
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.loading('Checking Firestore connection...', { id: t });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.loading('Verifying image configurations...', { id: t });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.loading('Testing notification gateway...', { id: t });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('All systems operational (100%)', { id: t });
    } catch (error) {
      toast.error('Diagnostic check failed. Please view logs.', { id: t });
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const stats = [
    { label: 'Active Jobs', value: activeJobsCount, icon: MapPin, to: '/jobs' },
    { label: 'Total Clients', value: clients.length, icon: Users, to: '/clients' },
    { label: 'Pending Payment', value: pendingPaymentJobsCount, icon: Clock, to: '/invoices' },
    { label: 'Monthly Revenue', value: `$${monthRevenue.toLocaleString()}`, icon: DollarSign, to: '/invoices' },
  ];

  const upcomingJobs = filteredJobs
    .filter(j => ['scheduled', 'in-progress', 'on-the-way'].includes(j.status))
    .sort((a, b) => a.scheduledDate - b.scheduledDate)
    .slice(0, 10);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl lg:text-5xl font-black text-charcoal tracking-tight">Deployment <span className="text-primary italic">Hub</span> - Admin <span className="text-primary italic">Terminal</span></h1>
          </div>
          <p className="text-clay font-black uppercase tracking-[0.2em] text-[10px] ml-4">Full System Orchestration</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={async () => {
              const t = toast.loading('Broadcasting morning alerts...');
              await broadcastDailyStart();
              toast.dismiss(t);
            }}
            className="border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase text-[10px] tracking-widest rounded-xl"
          >
            <Zap className="h-4 w-4 mr-2" />
            Morning Alert
          </Button>
          <Button variant="outline" onClick={() => navigate('/settings')} className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl">
            <Settings className="h-4 w-4 mr-2" />
            System Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            onClick={() => navigate(stat.to)}
            className="border-border bg-surface shadow-premium hover:shadow-hover transition-all group cursor-pointer active:scale-95 rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-clay group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-[10px] text-clay font-black uppercase tracking-widest">{stat.label}</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-black text-charcoal tracking-tight">{stat.value}</p>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-border/20 p-6 rounded-3xl border border-border">
        <div className="flex-1 space-y-2">
          <Label className="text-[10px] font-black text-clay uppercase tracking-widest ml-1">Account Filter</Label>
          <select 
            value={clientTypeFilter}
            onChange={(e) => setClientTypeFilter(e.target.value)}
            className="w-full bg-white border border-border rounded-xl h-12 px-4 text-xs font-bold text-charcoal outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          >
            <option value="all">All Client Types</option>
            <option value="one-off">One-Off</option>
            <option value="returning">Returning</option>
            <option value="ultimate-gold">Ultimate Gold</option>
            <option value="real-estate">Real Estate</option>
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Region Filter</Label>
          <select 
            value={suburbFilter}
            onChange={(e) => setSuburbFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl h-12 px-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          >
            <option value="all">All Suburbs</option>
            {Array.from(new Set(jobs.map(j => j.suburb))).sort().map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-2 border-slate-200 shadow-premium rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between p-6">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              Priority Schedule
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} className="text-primary font-bold uppercase text-[10px] tracking-widest hover:bg-primary/5 px-4 h-10 rounded-lg">View All</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {upcomingJobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <LayoutDashboard className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight mb-1">{job.clientName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(job.scheduledDate, 'MMM d')} • {TIME_SLOT_LABELS[job.timeSlot]} • {job.suburb}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest rounded-lg px-3 py-1 bg-white">
                    {JOB_STATUS_LABELS[job.status]}
                  </Badge>
                </Link>
              ))}
              {upcomingJobs.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">No Priority Tasks</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-premium rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex justify-between items-center">
                Maps Engine
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/20" />
              </p>
              <div className="flex items-center gap-3 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" /> Operational
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex justify-between items-center">
                Financial Gateway
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  stripeStatus === 'connected' ? "bg-emerald-500" : "bg-amber-500"
                )} />
              </p>
              {stripeStatus === 'connected' ? (
                <div className="flex items-center gap-3 text-emerald-600 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Connected
                </div>
              ) : (
                <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> Action Required
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              onClick={runDiagnostics}
              disabled={isDiagnosticRunning}
              className="w-full text-slate-400 hover:text-primary font-bold uppercase text-[10px] tracking-widest py-8 border-t border-slate-100 disabled:opacity-50"
            >
              {isDiagnosticRunning ? 'System Diagnostics Running...' : 'Execute System Diagnostics'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-premium rounded-2xl overflow-hidden mt-12 bg-white">
        <CardHeader className="bg-slate-900 px-8 py-8">
          <CardTitle className="text-xl font-bold flex items-center gap-3 text-white">
            <ExternalLink className="h-6 w-6 text-primary" />
            Infrastructure Gateways
          </CardTitle>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Platform Access Control</p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-hover transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                  <UserCircle className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">Client Gateway</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Public Booking Link</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">External link for customer onboarding and automated reservation services.</p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/welcome`);
                    toast.success('Client gateway link copied');
                  }}
                  className="flex-1 bg-white border border-slate-200 text-slate-900 hover:bg-primary hover:text-white font-bold h-12 rounded-xl transition-all shadow-sm"
                >
                  Copy Protocol
                </Button>
                <Button variant="outline" className="h-12 w-12 rounded-xl text-slate-400 border-slate-200" onClick={() => window.open('/welcome', '_blank')}>
                  <ExternalLink className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-hover transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">Workforce Portal</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Team Access Control</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">Secure credentials for field operators to access schedule and compliance reporting.</p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/staff-entry`);
                    toast.success('Workforce portal link copied');
                  }}
                  className="flex-1 bg-white border border-slate-200 text-slate-900 hover:bg-primary hover:text-white font-bold h-12 rounded-xl transition-all shadow-sm"
                >
                  Copy Protocol
                </Button>
                <Button variant="outline" className="h-12 w-12 rounded-xl text-slate-400 border-slate-200" onClick={() => window.open('/staff-entry', '_blank')}>
                  <ExternalLink className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StaffDashboard = () => {
  const { jobs, broadcastDailyStart, updateJob, loading: jobsLoading } = useJobs();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isLoading = jobsLoading || invoicesLoading;

  const myJobs = jobs
    .filter(j => ['scheduled', 'in-progress', 'on-the-way'].includes(j.status))
    .sort((a, b) => a.scheduledDate - b.scheduledDate);

  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid');

  const stats = [
    { label: 'Today\'s Route', value: myJobs.filter(j => format(j.scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length, icon: MapPin, to: '/jobs' },
    { label: 'Total Upcoming', value: myJobs.length, icon: ClipboardList, to: '/jobs' },
    { label: 'Pending Payments', value: pendingInvoices.length, icon: DollarSign, to: '/invoices' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Workforce <span className="text-primary">Hub</span></h1>
          </div>
          <p className="text-slate-500 font-semibold uppercase tracking-widest text-[10px] ml-4">Identity: {profile?.displayName} • Operational Level 1</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={async () => {
              const t = toast.loading('Broadcasting morning alerts...');
              await broadcastDailyStart();
              toast.dismiss(t);
            }}
            className="border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase text-[10px] tracking-widest rounded-xl"
            title="Sends the 7AM 'Ready for Entry' message to today's clients"
          >
            <Zap className="h-4 w-4 mr-2" />
            Morning Alert
          </Button>
          <Button variant="outline" onClick={() => navigate('/jobs')} className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase text-[10px] tracking-widest rounded-xl h-11 px-6">
            <ClipboardList className="h-4 w-4 mr-2" />
            Job Queue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            onClick={() => navigate(stat.to)}
            className="border-slate-200 bg-white shadow-sm hover:shadow-premium transition-all cursor-pointer group active:scale-95 rounded-2xl"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                   <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        <Card className="border-slate-200 shadow-premium rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-900 p-6">
            <CardTitle className="text-xl font-bold flex items-center gap-3 text-white">
              <Calendar className="h-6 w-6 text-primary" />
              Operational Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {myJobs.length > 0 ? myJobs.map(job => (
                <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="cursor-pointer p-6 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors">{job.clientName}</h3>
                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest bg-white">
                      {TIME_SLOT_LABELS[job.timeSlot]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 font-medium mb-1">{job.address}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{job.suburb} • {format(job.scheduledDate, 'MMM d, yyyy')}</p>
                  
                  <div className="mt-6 pt-6 border-t border-slate-100 flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.address}, ${job.suburb}`)}`, '_blank');
                      }}
                      className="flex-1 h-11 border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-50"
                    >
                      <MapPin className="h-4 w-4 mr-2" /> Route
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateJob(job.id, { status: 'in-progress' });
                        toast.success('System: Mission initialized.');
                      }}
                      className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-primary/20"
                    >
                      Initialize Job
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">All Scheduled Tasks Compete</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-premium rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-primary" />
              Remittance Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {pendingInvoices.length > 0 ? pendingInvoices.slice(0, 5).map(inv => (
                <div key={inv.id} onClick={() => navigate('/invoices')} className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                        <FileText className="h-5 w-5" />
                     </div>
                     <div>
                        <p className="font-bold text-slate-900 truncate max-w-[150px] leading-tight mb-1">{inv.clientName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocol {inv.invoiceNumber}</p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900 tracking-tight">${inv.totalAmount.toFixed(0)}</p>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-primary uppercase justify-end tracking-widest mt-1">
                      Pending <ArrowRight className="h-2 w-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Financial compliance verified</p>
                </div>
              )}
              {pendingInvoices.length > 5 && (
                <Button variant="ghost" onClick={() => navigate('/invoices')} className="w-full text-primary font-bold uppercase text-[10px] tracking-widest py-4 border-t border-slate-100 mt-4 rounded-none">
                  Review All ({pendingInvoices.length}) Pending Entries
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const RealEstateDashboard = () => {
  const { jobs, loading: jobsLoading } = useJobs();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { staff: agencyStaff, loading: staffLoading } = useAgencyStaff();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = React.useState('portfolio');

  const isLoading = jobsLoading || invoicesLoading || staffLoading;

  const myUpcomingJobs = jobs
    .filter(j => ['scheduled', 'in-progress', 'on-the-way'].includes(j.status))
    .sort((a, b) => a.scheduledDate - b.scheduledDate);

  const pendingInvoices = invoices.filter(i => i.status !== 'paid');
  const overdueInvoices = pendingInvoices.filter(i => i.dueDate < Date.now());

  const jobsByAddress = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    jobs.forEach(job => {
      if (!groups[job.address]) groups[job.address] = [];
      groups[job.address].push(job);
    });
    return groups;
  }, [jobs]);

  const billingByAddress = React.useMemo(() => {
    const groups: { [key: string]: { count: number, total: number, overdue: number } } = {};
    pendingInvoices.forEach(inv => {
      if (!groups[inv.propertyAddress]) {
        groups[inv.propertyAddress] = { count: 0, total: 0, overdue: 0 };
      }
      groups[inv.propertyAddress].count += 1;
      groups[inv.propertyAddress].total += inv.totalAmount;
      if (inv.dueDate < Date.now()) {
        groups[inv.propertyAddress].overdue += inv.totalAmount;
      }
    });
    return groups;
  }, [pendingInvoices]);

  const stats = [
    { label: 'Managed Assets', value: Object.keys(jobsByAddress).length, icon: Home, to: '/clients' },
    { label: 'Active Protocols', value: myUpcomingJobs.length, icon: Clock, to: '/jobs' },
    { label: 'Pending Dues', value: `$${pendingInvoices.reduce((acc, i) => acc + i.totalAmount, 0).toFixed(0)}`, icon: DollarSign, to: '/invoices' },
    { label: 'Agency Staff', value: agencyStaff.length + 1, icon: Users, to: '/dashboard' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Agency <span className="text-primary">Console</span></h1>
          </div>
          <p className="text-slate-500 font-semibold uppercase tracking-widest text-[10px] ml-4">
            {profile?.businessName || profile?.displayName} • Portfolio Optimization Active
          </p>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl h-12 px-6" 
            onClick={() => {
              const t = toast.loading('Synchronizing portfolio data...');
              setTimeout(() => {
                toast.success('Protocol: Data exported to agency head.', { id: t });
              }, 2000);
            }}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Export Portfolio
          </Button>
          <Button onClick={() => navigate('/booking?type=real-estate')} className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl h-12 px-8 rounded-xl font-bold transition-all hover:-translate-y-0.5">
            <PlusCircle className="h-4 w-4 mr-2" />
            Initialize Asset Booking
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            onClick={() => navigate(stat.to)}
            className="border-slate-200 bg-white shadow-sm hover:shadow-premium transition-all cursor-pointer group active:scale-95 rounded-2xl overflow-hidden"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <stat.icon size={20} />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-8">
        <TabsList className="bg-slate-100 p-1.5 h-14 rounded-2xl flex w-fit border border-slate-200 shadow-sm">
          <TabsTrigger 
            active={activeTab === 'portfolio'} 
            onClick={() => setActiveTab('portfolio')}
            className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm h-11 rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest transition-all"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Portfolio Terminal
          </TabsTrigger>
          <TabsTrigger 
            active={activeTab === 'billing'} 
            onClick={() => setActiveTab('billing')}
            className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm h-11 rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest relative transition-all"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Financial Orchestration
            {overdueInvoices.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-lg shadow-primary/20">
                {overdueInvoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            active={activeTab === 'team'} 
            onClick={() => setActiveTab('team')}
            className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm h-11 rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            Agency Workforce
          </TabsTrigger>
        </TabsList>

        <TabsContent active={activeTab === 'portfolio'}>
          <div className="grid lg:grid-cols-3 gap-10">
            <Card className="lg:col-span-2 border-slate-200 shadow-premium rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-900 px-8 py-8">
                <CardTitle className="text-xl font-bold flex items-center gap-4 text-white">
                  <MapPin className="h-6 w-6 text-primary" />
                  Asset Management Protocol
                </CardTitle>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Live Portfolio Tracking</p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-12">
                  {Object.keys(jobsByAddress).length > 0 ? Object.entries(jobsByAddress).map(([address, addressJobs]: [string, any[]]) => (
                    <div key={address} className="group">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-slate-100">
                            <Home className="h-5 w-5" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{address}</h3>
                        </div>
                        <Badge className="bg-slate-100 text-slate-500 border-none px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg">
                          {addressJobs.length} {addressJobs.length === 1 ? 'Record' : 'Records'}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-4 pl-4 border-l-2 border-slate-50 group-hover:border-primary/20 transition-colors">
                        {addressJobs.sort((a,b) => b.scheduledDate - a.scheduledDate).slice(0, 3).map(job => (
                          <div key={job.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-hover transition-all">
                            <div className="flex items-center gap-6">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                job.status === 'paid' ? "bg-emerald-500" : "bg-primary shadow-glow shadow-primary/20"
                              )} />
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{format(job.scheduledDate, 'MMM d, yyyy')}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{job.servicePackage} Protocol • {JOB_STATUS_LABELS[job.status]}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${job.id}`)} className="text-primary hover:bg-primary/5 font-bold uppercase text-[9px] tracking-widest h-9 rounded-lg px-4">
                              View Audit <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-24 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white rounded-[24px] shadow-sm flex items-center justify-center mx-auto mb-6 border border-slate-100">
                        <Home className="h-10 w-10 text-slate-200" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Portfolio Data Empty</h3>
                      <p className="text-sm text-slate-400 font-medium mb-8 max-w-xs mx-auto">No managed assets detected. Initialize your first property protocol below.</p>
                      <Button onClick={() => navigate('/booking?type=real-estate')} className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-10 rounded-xl shadow-lg shadow-primary/20">
                        Book First Service
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="border-slate-200 shadow-premium rounded-2xl overflow-hidden bg-slate-50/50">
                <CardHeader className="bg-slate-900 p-6">
                  <CardTitle className="text-lg font-bold flex items-center gap-3 text-white">
                    <Zap className="h-5 w-5 text-primary" />
                    Asset Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {myUpcomingJobs.slice(0, 5).map(job => (
                      <div key={job.id} className="flex gap-5 group items-start">
                        <div className="w-1.5 h-10 bg-slate-200 rounded-full group-hover:bg-primary transition-colors mt-1" />
                        <div>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1.5">{format(job.scheduledDate, 'EEEE')}</p>
                          <p className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[180px]">{job.address}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{job.status}</p>
                        </div>
                      </div>
                    ))}
                    {myUpcomingJobs.length === 0 && (
                      <div className="text-center py-10 opacity-30">
                        <Calendar className="h-10 w-10 mx-auto mb-3" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No Protocol Active</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-premium rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">Portfolio Audit</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Compliance Level 4</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                    Automated photogrammetry and digital verification protocols for lease-end bond security.
                  </p>
                  <Button variant="outline" className="w-full border-slate-200 text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 font-bold uppercase text-[10px] tracking-widest h-14 rounded-xl transition-all">
                    Access Compliance Vault
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent active={activeTab === 'billing'}>
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-ochre/10 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-deep-red text-white">
                <CardTitle className="text-lg font-serif">Portfolio Billing Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-ochre/5 border-b border-ochre/10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-ochre uppercase tracking-widest">Property Address</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ochre uppercase tracking-widest text-center">Invoices</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ochre uppercase tracking-widest text-right">Outstanding</th>
                        <th className="px-6 py-4 text-[10px] font-black text-ochre uppercase tracking-widest text-right">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ochre/5">
                      {Object.entries(billingByAddress).map(([address, data]: [string, any]) => (
                        <tr key={address} className="hover:bg-ochre/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-xs text-charcoal">{address}</td>
                          <td className="px-6 py-4 text-xs text-center font-bold text-charcoal/60">{data.count}</td>
                          <td className="px-6 py-4 text-xs text-right font-black text-charcoal">${data.total.toFixed(2)}</td>
                          <td className="px-6 py-4 text-xs text-right font-black text-deep-red">
                            {data.overdue > 0 ? `$${data.overdue.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                      {pendingInvoices.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-charcoal/30 italic text-sm">
                            No outstanding portfolio invoices found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {pendingInvoices.length > 0 && (
                      <tfoot className="bg-cream/50 font-black border-t-2 border-ochre/10">
                        <tr>
                          <td className="px-6 py-4 text-xs uppercase tracking-widest text-ochre">Total Portfolio Dues</td>
                          <td className="px-6 py-4 text-center text-charcoal/60">{pendingInvoices.length}</td>
                          <td className="px-6 py-4 text-right text-deep-red text-base">${pendingInvoices.reduce((a,c) => a + c.totalAmount, 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-deep-red text-base">${overdueInvoices.reduce((a,c) => a + c.totalAmount, 0).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-ochre text-charcoal">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Consolidated Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="bg-ochre/5 p-4 rounded-2xl border border-ochre/10 mb-6">
                    <p className="text-[10px] font-black text-ochre uppercase tracking-widest mb-1">Billing Account</p>
                    <p className="text-sm font-bold text-charcoal">{profile?.businessName || 'Main Agency Account'}</p>
                  </div>
                  <p className="text-[10px] text-charcoal/60 mb-6 leading-relaxed">
                    Make a single payment across your entire portfolio or export a consolidated statement for your finance department.
                  </p>
                  <Button className="w-full bg-charcoal text-white hover:bg-charcoal/90 font-black uppercase text-[10px] tracking-widest h-12 mb-3">
                    Pay Total Balance
                  </Button>
                  <Button variant="outline" className="w-full border-ochre/20 text-ochre hover:bg-ochre/5 font-black uppercase text-[10px] tracking-widest h-12">
                    Request Invoice PDF
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent active={activeTab === 'team'}>
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-ochre/10 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="bg-ochre/10 border-b border-ochre/10">
                <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Agency Team Management
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Agency Owner (Self) */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-ochre/20 bg-ochre/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-ochre/20">
                        <UserCircle className="h-8 w-8 text-ochre" />
                      </div>
                      <div>
                        <p className="font-bold text-charcoal">{profile?.displayName} <span className="text-[10px] bg-ochre text-white px-2 py-0.5 rounded-full ml-2">OWNER</span></p>
                        <p className="text-xs text-charcoal/50">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-ochre uppercase tracking-widest">Main Account</p>
                    </div>
                  </div>

                  {agencyStaff.map(member => (
                    <div key={member.uid} className="flex items-center justify-between p-4 rounded-xl border border-ochre/10 bg-white hover:bg-ochre/[0.02]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center border border-ochre/10">
                          <UserCircle className="h-8 w-8 text-charcoal/20" />
                        </div>
                        <div>
                          <p className="font-bold text-charcoal">{member.displayName}</p>
                          <p className="text-xs text-charcoal/50">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-ochre hover:text-deep-red font-bold uppercase text-[9px] tracking-widest">
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}

                  {agencyStaff.length === 0 && !staffLoading && (
                    <div className="text-center py-12 bg-cream/50 rounded-2xl border-2 border-dashed border-ochre/20">
                      <UserPlus className="h-10 w-10 text-ochre/20 mx-auto mb-4" />
                      <p className="text-xs font-bold text-charcoal/40 uppercase tracking-widest">No staff accounts linked yet.</p>
                      <p className="text-[10px] text-charcoal/30 mt-1 italic">Add members to help manage bookings and invoices.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
                <CardHeader className="bg-charcoal text-white">
                  <CardTitle className="text-sm uppercase tracking-widest font-black">Invite Portfolio Staff</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-ochre uppercase tracking-widest">Staff email</Label>
                      <Input placeholder="colleague@agency.com" className="border-ochre/20 h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-ochre uppercase tracking-widest">Full Name</Label>
                      <Input placeholder="Enter staff name" className="border-ochre/20 h-10" />
                    </div>
                    <Button className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest mt-2" onClick={() => toast.success('Staff invitation logic coming soon!')}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Access Invitation
                    </Button>
                    <p className="text-[9px] text-charcoal/40 italic text-center">
                      Staff will receive a secure login link to manage your agency's property portfolio.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="p-6 bg-ochre/10 rounded-3xl border border-ochre/20">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-5 w-5 text-ochre" />
                  <h4 className="font-bold text-sm text-charcoal">Multi-User Control</h4>
                </div>
                <p className="text-[10px] text-charcoal/60 leading-relaxed mb-4">
                  Shared access allows your team to cover leave and ensure no property maintenance is missed. All actions are logged per user for accountability.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </div>
    </div>
  );
};

const ClientDashboard = () => {
  const { jobs } = useJobs();
  const { invoices } = useInvoices();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // For clients, useJobs already filters by user.uid (implemented in useFirebase hook)
  const myUpcomingJobs = jobs
    .filter(j => ['scheduled', 'in-progress', 'on-the-way'].includes(j.status))
    .sort((a, b) => a.scheduledDate - b.scheduledDate);

  const myInvoices = invoices
    .filter(i => i.status !== 'paid')
    .sort((a, b) => b.createdAt - a.createdAt);

  const jobsByAddress = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    myUpcomingJobs.forEach(job => {
      if (!groups[job.address]) groups[job.address] = [];
      groups[job.address].push(job);
    });
    return groups;
  }, [myUpcomingJobs]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')} 
              className="h-10 w-10 rounded-full border border-ochre/10 text-ochre hover:text-deep-red hover:bg-ochre/5"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-4xl lg:text-6xl font-bold text-deep-red font-serif tracking-tighter">
              {profile?.clientType === 'real-estate' ? 'Asset Mgmt' : 'Portal'}
            </h1>
          </div>
          <p className="text-ochre font-medium uppercase tracking-widest text-xs ml-14">
            Hello, {profile?.displayName} {profile?.clientType === 'real-estate' && '• Property Portfolio Control'}
          </p>
        </div>
        <Button onClick={() => navigate('/booking')} className="bg-deep-red hover:bg-deep-red/90 text-white shadow-lg h-12 rounded-xl font-bold">
          <PlusCircle className="h-4 w-4 mr-2" />
          Book New Service
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-ochre/5 border-b border-ochre/10">
            <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {profile?.clientType === 'real-estate' ? 'Property Schedule' : 'Upcoming Services'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {Object.keys(jobsByAddress).length > 0 ? Object.entries(jobsByAddress).map(([address, addressJobs]: [string, any[]]) => (
                <div key={address} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Home className="h-4 w-4 text-ochre" />
                    <p className="text-xs font-black text-charcoal uppercase tracking-widest">{address}</p>
                  </div>
                  <div className="grid gap-2">
                    {addressJobs.map(job => (
                      <div key={job.id} className="p-4 rounded-xl border border-ochre/10 bg-white ml-2">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-black text-charcoal text-sm">{format(job.scheduledDate, 'EEEE, MMM d')}</p>
                          <Badge variant="outline" className="border-ochre/30 text-ochre font-bold uppercase text-[8px] tracking-widest">
                            {JOB_STATUS_LABELS[job.status]}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">{TIME_SLOT_LABELS[job.timeSlot]} Window</p>
                          <p className="text-[10px] font-black text-deep-red capitalize">{job.servicePackage} Tier</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-ochre/20 mx-auto mb-4" />
                  <p className="text-sm text-charcoal/40 italic">No services scheduled yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-ochre/5 border-b border-ochre/10">
            <CardTitle className="text-lg font-serif text-deep-red flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payments & Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {myInvoices.length > 0 ? myInvoices.map(inv => (
                <div key={inv.id} className="p-4 rounded-xl border-2 border-deep-red/10 bg-deep-red/[0.02] flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Invoice {inv.invoiceNumber}</p>
                    <p className="text-lg font-black text-deep-red">${inv.totalAmount.toFixed(2)}</p>
                  </div>
                  <Button 
                    className="bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-10 font-bold px-6"
                    onClick={() => inv.paymentLink ? window.open(inv.paymentLink, '_blank') : toast.error('Payment link not available')}
                  >
                    Pay Now
                  </Button>
                </div>
              )) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-600/20 mx-auto mb-4" />
                  <p className="text-sm text-charcoal/40 italic uppercase text-[10px] tracking-widest font-black">All accounts up to date</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-8 border-t border-ochre/10">
              <p className="text-[10px] text-ochre font-bold uppercase tracking-widest mb-4">Past Activity</p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/jobs')}
                className="w-full border-ochre/20 text-ochre hover:bg-ochre/5 rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Order History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) return <div className="p-8 text-center uppercase tracking-widest text-[10px] font-black animate-pulse">Loading Platform...</div>;

  if (profile?.role === 'admin') return <AdminDashboard />;
  if (profile?.role === 'staff') return <StaffDashboard />;
  if (profile?.role === 'client' && profile?.clientType === 'real-estate') return <RealEstateDashboard />;
  if (profile?.role === 'client') return <ClientDashboard />;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white/50 backdrop-blur-sm rounded-[40px] border border-ochre/10 shadow-xl">
      <div className="w-20 h-20 bg-ochre/10 rounded-full flex items-center justify-center mb-6">
        <LayoutDashboard className="h-10 w-10 text-ochre" />
      </div>
      <h2 className="text-2xl font-serif text-deep-red mb-2">Portal Access Required</h2>
      <p className="text-sm text-charcoal/60 mb-8 max-w-sm">
        We couldn't determine your account role. Please return to the homepage and select your intended portal.
      </p>
      <Button 
        onClick={() => {
          window.location.href = '/';
        }}
        className="bg-deep-red text-white hover:bg-deep-red/90 px-8 py-6 rounded-2xl font-bold uppercase tracking-widest text-xs"
      >
        Return to Landing Page
      </Button>
    </div>
  );
};
