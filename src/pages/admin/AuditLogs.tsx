import * as React from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  User,
  ShieldAlert,
  ArrowUpDown,
  History
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { AuditLog } from '../../services/auditService';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');

  React.useEffect(() => {
    let q = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );

    if (filter !== 'all') {
      q = query(
        collection(db, 'audit_logs'),
        where('action', '==', filter),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const filteredLogs = logs.filter(log => 
    log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-red-100 text-red-600 border-red-200';
    if (action.includes('UPLOAD') || action.includes('PUBLISH')) return 'bg-green-100 text-green-600 border-green-200';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-600 border-blue-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-charcoal uppercase italic tracking-tight">Security & Audit Trails</h1>
          <p className="text-[10px] text-clay font-black uppercase tracking-[0.2em] mt-2">Immutable Record of Administrative Interventions</p>
        </div>
        <div className="bg-charcoal px-4 py-2 rounded-xl flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Compliance Level: High</span>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-clay/40" />
          <Input 
            placeholder="Search logs by email, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-none bg-slate-50 focus:ring-1 focus:ring-primary/20 rounded-xl font-medium"
          />
        </div>
        <div className="flex gap-2">
           <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-slate-50 border-none text-xs font-black uppercase tracking-widest text-charcoal outline-none focus:ring-1 focus:ring-primary/20 appearance-none min-w-[150px]"
          >
            <option value="all">All Actions</option>
            <option value="PRICING_PUBLISH">Pricing Deploys</option>
            <option value="ASSET_UPLOAD">Asset Syncs</option>
            <option value="SETTINGS_UPDATE">Global Configs</option>
            <option value="ASSET_DELETE">Deletions</option>
            <option value="STAFF_INVITE">Personnel Invites</option>
          </select>
          <div className="h-10 px-4 bg-slate-50 rounded-xl flex items-center justify-center text-clay/40">
            <Filter className="h-4 w-4" />
          </div>
        </div>
      </div>

      <Card className="border-border shadow-premium overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-clay italic">Timestamp</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-clay italic">Administrator</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-clay italic">Intervention</th>
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest text-clay italic">Operational Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="p-10 text-center text-[10px] font-black uppercase text-clay/30">Decrypting sequence...</td>
                    </tr>
                  ))
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-ochre/5 transition-colors group">
                      <td className="p-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-charcoal">{log.timestamp ? format(log.timestamp.toDate(), 'MMM d, HH:mm') : 'Recent'}</span>
                          <span className="text-[8px] text-clay/40 font-black uppercase tracking-tighter">{log.timestamp ? format(log.timestamp.toDate(), 'yyyy') : ''}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-clay/60" />
                          </div>
                          <span className="text-[11px] font-bold text-charcoal">{log.userEmail}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border", getActionColor(log.action))}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1">
                          <p className="text-[11px] font-medium text-charcoal leading-relaxed">{log.details}</p>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="text-[9px] text-clay/40 italic font-medium">Record ID: {log.metadata.id || 'N/A'}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-20 text-center">
                      <History className="h-12 w-12 text-clay/10 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-clay/30">Zero Interventions Found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
