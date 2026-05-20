import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { useClients, useSettings } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { format } from 'date-fns';
import { ACCOUNT_STATUS_LABELS, SUBURBS } from '@/constants';
import { Badge } from '@/components/ui/Badge';
import { Search, Filter, Phone, Mail, UserPlus, ClipboardList, TrendingUp, DollarSign, ChevronRight, MapPin, AlertCircle, User, X, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LocationPicker } from '@/components/LocationPicker';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.any().refine(val => !!val, 'Location detection required'),
  suburb: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').or(z.literal('')),
  clientType: z.enum(['one_off', 'returning', 'premium', 'asset_management']),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export const ClientList = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { clients, loading, addClient, deleteClient } = useClients();
  const { settings } = useSettings();
  const [isAdding, setIsAdding] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isAdmin = profile?.role === 'admin';

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.phone.includes(searchQuery) ||
                          client.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.accountStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      await addClient({
        ...data,
        address: data.location?.address || '',
        email: data.email || '',
        notes: data.notes || '',
        suburb: data.suburb || '',
      });
      toast.success('Client added successfully');
      reset();
      setIsAdding(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to add client');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center uppercase tracking-widest text-[10px] font-black animate-pulse">Synchronizing CRM Database...</div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 relative overflow-hidden pb-24">
      <div className="absolute inset-0 cultural-pattern opacity-5 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-20 -right-20 w-96 h-96 pointer-events-none select-none opacity-[0.03]">
        <GrassRootsGuardian size={400} />
      </div>
      <div className="fixed top-1/2 -left-40 w-[600px] h-[600px] pointer-events-none select-none -rotate-12 opacity-[0.02]">
        <GrassRootsGuardian size={600} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-4xl font-black text-charcoal uppercase italic tracking-tighter">Asset <span className="text-primary">Directory</span></h2>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex -space-x-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-surface bg-clay text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                  {clients[i]?.name?.[0]}
                </div>
              ))}
            </div>
            <p className="text-clay font-black uppercase tracking-[0.2em] text-[10px] pl-4">{clients.length} Registered Accounts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAdding(!isAdding)} 
            variant={isAdding ? "outline" : "secondary"}
            className="rounded-xl h-12 px-8"
          >
            {isAdding ? <X className="h-5 w-5 mr-3" /> : <UserPlus className="h-5 w-5 mr-3" />}
            {isAdding ? 'Cancel Registration' : 'New Client'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        <Card className="bg-white/80 backdrop-blur-sm border-ochre/10 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-[8px] text-ochre font-black uppercase tracking-widest mb-1 opacity-60">Revenue Stream</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xl font-black text-charcoal">Healthy</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm border-ochre/10 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-[8px] text-ochre font-black uppercase tracking-widest mb-1 opacity-60">Overdue Invoices</p>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-deep-red" />
              <p className="text-xl font-black text-charcoal">
                {clients.filter(c => c.accountStatus === 'overdue').length} Accounts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdding && (
        <Card className="max-w-2xl mx-auto border-ochre/20 shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white">
          <div className="h-2 bg-deep-red" />
          <CardHeader className="bg-ochre/5 border-b border-ochre/10">
            <CardTitle className="font-serif text-deep-red flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Client Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="clientType" className="text-charcoal font-black uppercase text-[10px] tracking-widest pl-1">Client Group</Label>
                  <Select id="clientType" {...register('clientType')} className="h-12 rounded-xl border-ochre/20">
                    <option value="one_off">One-Off</option>
                    <option value="returning">Returning</option>
                    <option value="premium">Premium Member</option>
                    <option value="asset_management">Asset Management</option>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="name" className="text-charcoal font-black uppercase text-[10px] tracking-widest pl-1">Primary Account Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                  <Input id="name" {...register('name')} placeholder="e.g. John Smith" className="pl-10 h-12 rounded-xl border-ochre/20 focus:ring-deep-red" />
                </div>
                {errors.name && <p className="text-xs text-red-500 font-bold italic">{errors.name.message}</p>}
              </div>

               <div className="space-y-4">
                  <Label className="text-charcoal font-black uppercase text-[10px] tracking-widest pl-1">Site Identification Protocol</Label>
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
                  />
                  {errors.location && <p className="text-xs text-red-500 font-bold italic">{(errors.location as any).message}</p>}
                </div>
                
                <div className="hidden">
                  <Input type="hidden" {...register('suburb')} />
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-charcoal font-black uppercase text-[10px] tracking-widest pl-1">Mobile Hotline</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                    <Input id="phone" {...register('phone')} placeholder="0400 000 000" className="pl-10 h-12 rounded-xl border-ochre/20" />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 font-bold italic">{errors.phone.message}</p>}
                </div>
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-charcoal font-black uppercase text-[10px] tracking-widest pl-1">Digital Receipt Inbox</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
                    <Input id="email" type="email" {...register('email')} placeholder="client@address.com" className="pl-10 h-12 rounded-xl border-ochre/20" />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 font-bold italic">{errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="notes" className="text-charcoal font-black uppercase text-[10px] tracking-widest pl-1">System Intelligence / Gate Codes</Label>
                <Textarea id="notes" placeholder="Any crucial property info for field staff..." {...register('notes')} className="min-h-[100px] rounded-xl border-ochre/20 leading-relaxed" />
              </div>

              <Button type="submit" className="w-full bg-deep-red hover:bg-deep-red/90 text-white h-14 rounded-xl font-bold shadow-xl transition-all" isLoading={isSubmitting}>
                Securely Register Account
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 relative z-10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
            <Input 
              placeholder="Search by name, address or digits..." 
              className="pl-12 h-14 rounded-2xl border-ochre/10 shadow-sm bg-white/90 focus:ring-deep-red"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ochre" />
            <Select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-14 rounded-2xl border-ochre/10 bg-white/90 px-6 font-bold uppercase tracking-widest text-[10px] text-charcoal min-w-[180px]"
            >
              <option value="all">All Financial Statuses</option>
              <option value="up-to-date">Up to Date</option>
              <option value="payment-due">Payment Due</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredClients.map(client => (
            <Card key={client.id} className="group hover:bg-ochre/[0.02] border-ochre/10 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="p-5 flex-1 flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-ochre/10 flex items-center justify-center text-deep-red font-serif text-2xl font-black group-hover:bg-deep-red/10 transition-colors">
                    {client.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-serif text-xl font-bold text-charcoal group-hover:text-deep-red transition-colors">{client.name}</h3>
                      <Badge variant={client.accountStatus === 'up-to-date' ? 'success' : 'destructive'} className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 border-none shadow-sm">
                        {ACCOUNT_STATUS_LABELS[client.accountStatus]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5 text-[10px] text-charcoal font-medium">
                        <MapPin className="h-3 w-3 text-ochre" /> {client.address}, {client.suburb}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-charcoal font-medium">
                        <Phone className="h-3 w-3 text-ochre" /> {client.phone}
                      </span>
                      {client.email && (
                        <span className="flex items-center gap-1.5 text-[10px] text-charcoal font-medium">
                          <Mail className="h-3 w-3 text-ochre" /> {client.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-ochre/[0.03] md:w-64 border-t md:border-t-0 md:border-l border-ochre/5 flex items-center justify-between gap-4 group-hover:bg-deep-red/[0.03] transition-colors relative">
                  <div className="text-center flex-1">
                    <p className="text-[8px] text-ochre font-black uppercase tracking-[0.2em] mb-1">Joined</p>
                    <p className="text-xs font-bold text-charcoal">{format(client.createdAt, 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (window.confirm(`Are you sure you want to PERMANENTLY DELETE ${client.name}? This action cannot be undone.`)) {
                            deleteClient(client.id);
                          }
                        }}
                        className="h-10 w-10 text-ochre/40 hover:text-deep-red hover:bg-deep-red/10 rounded-xl transition-all relative z-30"
                        title="Delete Client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <ChevronRight className="h-5 w-5 text-ochre opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filteredClients.length === 0 && !isAdding && (
            <div className="py-24 text-center border-2 border-dashed border-ochre/10 rounded-[32px] bg-white/40">
              <ClipboardList className="h-12 w-12 text-ochre/20 mx-auto mb-4" />
              <p className="font-serif text-lg text-ochre/60">No matching heritage records found.</p>
              <Button variant="ghost" className="mt-4 text-[10px] font-black uppercase tracking-widest text-deep-red" onClick={() => setSearchQuery('')}>Clear Query</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
