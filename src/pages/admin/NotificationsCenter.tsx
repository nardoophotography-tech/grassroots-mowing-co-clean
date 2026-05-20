import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Bell, Mail, MessageSquare, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const NotificationsCenter = () => {
  const [logs] = React.useState([
    { id: 1, type: 'SMS', to: '0400 123 456', status: 'delivered', time: '10:45 AM' },
    { id: 2, type: 'Email', to: 'client@example.com', status: 'sent', time: '09:30 AM' },
    { id: 3, type: 'SMS', to: '0400 999 888', status: 'failed', time: '08:15 AM' }
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-charcoal uppercase tracking-tight italic">Notifications</h1>
          <p className="text-sm font-black text-clay/60 uppercase tracking-widest mt-1">SMS & Email Dispatch Log</p>
        </div>
      </div>

      <Card className="border-border shadow-premium rounded-3xl overflow-hidden bg-surface">
        <CardHeader className="bg-primary/5 border-b border-border">
          <CardTitle className="flex items-center gap-3 font-black text-charcoal uppercase tracking-tight italic">
            <Bell className="h-5 w-5 text-primary" />
            Recent Dispatch Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-4">
                  {log.type === 'SMS' ? <MessageSquare className="h-5 w-5 text-clay" /> : <Mail className="h-5 w-5 text-clay" />}
                  <div>
                    <div className="text-xs font-black text-charcoal">{log.to}</div>
                    <div className="text-[10px] text-clay font-medium">{log.time}</div>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  log.status === 'delivered' ? "bg-green-100 text-green-700" : 
                  log.status === 'sent' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                )}>
                  {log.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Button className="w-full bg-secondary hover:bg-secondary-hover text-white rounded-xl h-14 font-black uppercase tracking-widest shadow-premium">
          <Send className="h-4 w-4 mr-2" /> Manual Blast
        </Button>
        <Button variant="outline" className="w-full rounded-xl h-14 font-black uppercase tracking-widest border-border text-clay">
          <AlertCircle className="h-4 w-4 mr-2" /> Re-sync Twilio
        </Button>
      </div>
    </div>
  );
};
