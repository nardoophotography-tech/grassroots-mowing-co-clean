import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClients, useJobs, useInvoices, useSettings } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  History, 
  CreditCard, 
  Edit3, 
  Save, 
  X, 
  Trash2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Map,
  ClipboardCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ACCOUNT_STATUS_LABELS, JOB_STATUS_LABELS, TIME_SLOT_LABELS } from '@/constants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

import { LocationPicker } from '@/components/LocationPicker';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.any().refine(val => !!val, 'Location identification required'),
  suburb: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').or(z.literal('')),
  notes: z.string().optional(),
  clientType: z.enum(['one_off', 'returning', 'premium', 'asset_management']).optional(),
  organisationName: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { clients, loading: clientsLoading, updateClient, deleteClient } = useClients();
  const { jobs, loading: jobsLoading } = useJobs();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { settings } = useSettings();
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  
  const isAdmin = profile?.role === 'admin';
  const client = clients.find(c => c.id === id);
  const clientJobs = jobs.filter(j => j.clientId === id).sort((a, b) => b.scheduledDate - a.scheduledDate);
  const clientInvoices = invoices.filter(i => i.clientId === id).sort((a, b) => b.createdAt - a.createdAt);
  
  const totalSpent = clientInvoices
    .filter(i => i.status === 'paid')
    .reduce((acc, i) => acc + i.totalAmount, 0);
    
  const pendingAmount = clientInvoices
    .filter(i => i.status !== 'paid')
    .reduce((acc, i) => acc + i.totalAmount, 0);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  const watchedLocation = watch('location');

  React.useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        location: client.location || (client.address ? { address: client.address, latitude: 0, longitude: 0, placeId: '', source: 'gps' as any } : undefined),
        suburb: client.suburb,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
        clientType: client.clientType,
        organisationName: (client as any).organisationName,
      });
    }
  }, [client, reset]);

  if (clientsLoading || jobsLoading || invoicesLoading) {
    return <div className="p-8 text-center uppercase tracking-widest text-[10px] font-black animate-pulse">Scanning Client Dossier...</div>;
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-ochre font-serif">
        <p>Client not found in the heritage records.</p>
        <Button onClick={() => navigate('/clients')} variant="ghost" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Database
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: ClientFormValues) => {
    try {
      await updateClient(client.id, {
        ...data,
        address: data.location?.address || client.address,
      });
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update client details');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClient(client.id);
      navigate('/clients');
    } catch (error) {
      toast.error('Failed to remove client');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-6xl mx-auto pb-24 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern opacity-5 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-20 -right-20 w-96 h-96 pointer-events-none select-none opacity-[0.03]">
        <GrassRootsGuardian size={400} />
      </div>
      <div className="fixed top-1/2 -left-40 w-[600px] h-[600px] pointer-events-none select-none -rotate-12 opacity-[0.02]">
        <GrassRootsGuardian size={600} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="h-10 w-10 rounded-full hover:bg-ochre/10">
            <ArrowLeft className="h-5 w-5 text-ochre" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-deep-red font-serif tracking-tight">{client.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={client.accountStatus === 'up-to-date' ? 'success' : 'destructive'} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                {ACCOUNT_STATUS_LABELS[client.accountStatus]}
              </Badge>
              <Badge className="bg-charcoal text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md italic">
                {client.clientType?.replace('_', ' ') || 'LEGACY'}
              </Badge>
              <p className="text-[10px] text-ochre font-bold uppercase tracking-widest">Since {format(client.createdAt, 'MMM yyyy')}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-10 w-10 text-ochre/40 hover:text-deep-red hover:bg-deep-red/5 rounded-xl transition-all mr-2"
              title="Delete Client"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="bg-ochre hover:bg-ochre/90 text-white rounded-xl font-bold h-10 px-6 shadow-md transition-all">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(false)} variant="outline" className="border-ochre/20 text-ochre rounded-xl font-bold h-10 px-6">
              <X className="h-4 w-4 mr-2" />
              Cancel Edits
            </Button>
          )}
          <Button 
            onClick={() => navigate('/jobs/new', { state: { clientId: client.id } })} 
            className="bg-deep-red hover:bg-deep-red/90 text-white rounded-xl font-bold h-10 px-6 shadow-md transition-all"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book Service
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-serif text-deep-red flex items-center gap-2 uppercase tracking-widest">
                Account Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-ochre/5 rounded-xl border border-ochre/10">
                  <p className="text-[8px] text-ochre font-black uppercase tracking-[0.2em] mb-1">Lifetime Value</p>
                  <p className="text-2xl font-black text-deep-red">${totalSpent.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-deep-red/[0.03] rounded-xl border border-deep-red/10">
                  <p className="text-[8px] text-deep-red font-black uppercase tracking-[0.2em] mb-1">Frequency</p>
                  <p className="text-2xl font-black text-charcoal">{clientJobs.length} <span className="text-[10px] font-medium italic tracking-tighter">JOBS</span></p>
                </div>
              </div>

              {client.clientType === 'one_off' && clientJobs.length >= 2 && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1 italic">
                      <TrendingUp className="h-3 w-3" /> Upgrade Lead
                    </p>
                  </div>
                  <p className="text-[10px] text-clay leading-tight font-medium italic">High frequency detected. Suggest recurring plan?</p>
                  <Button 
                    size="sm" 
                    className="h-8 text-[9px] bg-secondary hover:bg-secondary/90 text-white rounded-lg font-black uppercase tracking-widest mt-1"
                    onClick={() => updateClient(client.id, { clientType: 'returning' })}
                  >
                    Promote to Returning
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-4 group">
                  <div className="h-10 w-10 bg-ochre/10 rounded-full flex items-center justify-center text-ochre transition-transform group-hover:scale-110">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[8px] text-ochre font-black uppercase tracking-widest">Phone</p>
                    <p className="text-sm font-bold text-charcoal">{client.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="h-10 w-10 bg-ochre/10 rounded-full flex items-center justify-center text-ochre transition-transform group-hover:scale-110">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[8px] text-ochre font-black uppercase tracking-widest">Email</p>
                    <p className="text-sm font-bold text-charcoal">{client.email || 'No email on file'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="h-10 w-10 bg-ochre/10 rounded-full flex items-center justify-center text-ochre transition-transform group-hover:scale-110">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[8px] text-ochre font-black uppercase tracking-widest">Service Area</p>
                    <p className="text-sm font-bold text-charcoal">{client.address}, {client.suburb}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-ochre/5">
                <p className="text-[8px] text-ochre font-black uppercase tracking-widest mb-2">Internal Property Notes</p>
                <div className="p-3 bg-cream/50 rounded-lg italic text-xs text-charcoal/70 border border-ochre/5 leading-relaxed">
                  {client.notes || 'No specific property warnings recorded.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {isEditing ? (
            <Card className="border-ochre/20 shadow-xl rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-ochre/10 border-b border-ochre/10">
                <CardTitle className="font-serif text-deep-red">Update Client Profile</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-ochre pl-1">Full Name</Label>
                      <Input {...register('name')} className="h-12 rounded-xl border-ochre/20" />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-ochre pl-1">Phone Number</Label>
                      <Input {...register('phone')} className="h-12 rounded-xl border-ochre/20" />
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-ochre pl-1">Email Address</Label>
                    <Input {...register('email')} className="h-12 rounded-xl border-ochre/20" />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-ochre pl-1">Automated Site Location Detection</Label>
                      <LocationPicker 
                        onLocationSelect={(loc) => {
                          setValue('location', loc);
                          // Extract suburb naively
                          const parts = loc.address.split(',');
                          if (parts.length >= 2) {
                            const sub = parts[parts.length - 2].trim().replace(/\s+[A-Z]{2,3}\s+\d{4}$/, '');
                            if (sub) setValue('suburb', sub);
                          }
                        }}
                        initialLocation={watchedLocation}
                      />
                      {errors.location && <p className="text-xs text-red-500 mt-1">{(errors.location as any).message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-ochre pl-1">Client Rank</Label>
                      <Select {...register('clientType')} className="h-12 rounded-xl border-ochre/20">
                        <option value="one_off">One-Off</option>
                        <option value="returning">Returning</option>
                        <option value="premium">Premium</option>
                        <option value="asset_management">Asset Management</option>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="hidden">
                      <Input type="hidden" {...register('suburb')} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-ochre pl-1">Organisation (Tier 4)</Label>
                      <Input {...register('organisationName')} className="h-12 rounded-xl border-ochre/20" placeholder="Agency Name" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-ochre pl-1">Property Notes</Label>
                    <Textarea {...register('notes')} className="min-h-[120px] rounded-xl border-ochre/20 leading-relaxed" />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-12 font-bold shadow-lg">
                      <Save className="h-4 w-4 mr-2" />
                      Save Heritage Record
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden bg-white/95">
                <CardHeader className="bg-ochre/5 border-b border-ochre/10 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-serif text-deep-red flex items-center gap-2 uppercase tracking-widest">
                    <History className="h-4 w-4" />
                    Service History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-ochre/5 border-b border-ochre/10">
                        <tr>
                          <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Date</th>
                          <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Service</th>
                          <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Status</th>
                          <th className="text-right p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Total</th>
                          <th className="text-right p-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ochre/5">
                        {clientJobs.map(job => (
                          <tr key={job.id} className="hover:bg-ochre/[0.02] transition-colors group">
                            <td className="p-4">
                              <p className="font-bold text-charcoal">{format(job.scheduledDate, 'MMM d, yyyy')}</p>
                              <p className="text-[10px] text-ochre uppercase font-medium">{TIME_SLOT_LABELS[job.timeSlot]}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-medium text-charcoal capitalize">{job.serviceGrade} Mowing</p>
                              {job.urgencySurcharge > 0 && <Badge variant="outline" className="text-[7px] h-3 px-1 border-deep-red/20 text-deep-red">URGENT</Badge>}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-black border-none px-0",
                                job.status === 'paid' ? "text-green-600" : "text-ochre"
                              )}>
                                {JOB_STATUS_LABELS[job.status]}
                              </Badge>
                            </td>
                            <td className="p-4 text-right font-black text-deep-red">
                              ${job.price.toFixed(2)}
                            </td>
                            <td className="p-4 text-right">
                              <Link to={`/jobs/${job.id}`} className="text-ochre hover:text-deep-red opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {clientJobs.length === 0 && (
                    <div className="text-center py-20 text-ochre/30 italic uppercase text-[10px] tracking-[0.2em] font-black">
                      Initial Service Deployment Pending
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-ochre/10 shadow-lg rounded-xl overflow-hidden bg-white/95">
                <CardHeader className="bg-deep-red shadow-inner text-white flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-serif flex items-center gap-2 uppercase tracking-widest">
                    <CreditCard className="h-4 w-4" />
                    Billing & Receipts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-ochre/5 border-b border-ochre/10">
                        <tr>
                          <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Invoice #</th>
                          <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Issued</th>
                          <th className="text-left p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Status</th>
                          <th className="text-right p-4 text-[10px] font-black uppercase tracking-widest text-ochre">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ochre/5">
                        {clientInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-ochre/[0.02] transition-colors">
                            <td className="p-4 font-black text-charcoal">{inv.invoiceNumber}</td>
                            <td className="p-4 text-ochre font-medium">{format(inv.createdAt, 'MMM d, yyyy')}</td>
                            <td className="p-4">
                              <Badge className={cn(
                                "text-[8px] font-black uppercase tracking-widest",
                                inv.status === 'paid' ? "bg-green-600/10 text-green-600 border-none" : "bg-deep-red/10 text-deep-red border-none"
                              )}>
                                {inv.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right font-black text-deep-red">${inv.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {clientInvoices.length === 0 && (
                    <div className="text-center py-20 text-ochre/30 italic uppercase text-[10px] tracking-[0.2em] font-black">
                      No Financial Records Synchronized
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-deep-red/30 backdrop-blur-md">
          <Card className="w-full max-w-sm border-ochre/20 shadow-2xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-deep-red/10 border-b border-deep-red/10 text-center pb-8 pt-10">
              <div className="mx-auto w-16 h-16 rounded-full bg-deep-red/10 flex items-center justify-center mb-6 border-2 border-deep-red/20 shadow-sm animate-bounce">
                <Trash2 className="h-8 w-8 text-deep-red" />
              </div>
              <CardTitle className="font-serif text-deep-red text-2xl">Confirm Archival</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 text-center pb-10">
              <div className="space-y-2 px-4">
                <p className="text-charcoal font-black text-lg">Remove {client.name}?</p>
                <p className="text-sm text-charcoal/60 leading-relaxed italic">Archiving this record will detach all historical service logs but keep financial records intact for tax purposes.</p>
              </div>
              <div className="flex gap-4 px-6">
                <Button variant="outline" className="flex-1 rounded-xl h-14 font-bold border-ochre/20 text-ochre" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-deep-red hover:bg-deep-red/90 text-white rounded-xl h-14 font-bold shadow-xl flex items-center justify-center gap-2" onClick={handleDelete}>
                  Delete Record
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
