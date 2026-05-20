import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Play, 
  Pause, 
  CheckCircle2, 
  Camera, 
  Navigation, 
  Clock, 
  AlertTriangle,
  Beaker,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { Job, JobMaterial } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobMaterialLog } from '@/components/JobMaterialLog';
import { format } from 'date-fns';
import { Mythos } from '@/lib/mythos';
import { useJobs } from '@/hooks/useFirebase';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';

export function TechnicianDashboard() {
  const { jobs: allJobs, updateJob } = useJobs();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [activeJob, setActiveJob] = React.useState<Job | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showMaterialLog, setShowMaterialLog] = React.useState(false);

  React.useEffect(() => {
    const q = query(
      collection(db, 'jobs'),
      where('status', 'in', ['scheduled', 'in-progress']),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(jobData);
      const inProgress = jobData.find(j => j.status === 'in-progress');
      if (inProgress) setActiveJob(inProgress);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStartJob = async (job: Job) => {
    try {
      await updateJob(job.id, {
        status: 'in-progress'
      });
      setActiveJob({ ...job, status: 'in-progress' });
      Mythos.info("JOB_STARTED", { jobId: job.id });
    } catch (error) {
      Mythos.error("COULD_NOT_START_JOB", { error });
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    try {
      await updateJob(jobId, {
        status: 'completed',
        completedAt: Date.now()
      });
      setActiveJob(null);
      Mythos.success("JOB_COMPLETED", { jobId });
    } catch (error) {
      Mythos.error("COULD_NOT_COMPLETE_JOB", { error });
    }
  };

  const handleSaveMaterials = async (materials: JobMaterial[]) => {
    if (!activeJob) return;
    try {
      await updateJob(activeJob.id, {
        materials
      });
      setShowMaterialLog(false);
      Mythos.success("MATERIALS_LOGGED");
    } catch (error) {
      Mythos.error("SAVE_MATERIALS_FAILED", { error });
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Clock className="w-8 h-8 text-orange-600" />
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern opacity-5 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-10 -right-10 w-40 h-40 pointer-events-none select-none opacity-[0.03]">
        <GrassRootsGuardian size={200} />
      </div>
      <div className="fixed bottom-20 -left-10 w-40 h-40 pointer-events-none select-none -rotate-12 opacity-[0.03]">
        <GrassRootsGuardian size={200} />
      </div>

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Field Command</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Crew Dashboard • {format(new Date(), 'EEEE')}</p>
        </div>
        <div className="bg-orange-50 p-2 rounded-xl border border-orange-100 italic font-black text-orange-700 text-xs">
          7 Stops Left
        </div>
      </div>

      {/* Active Job Focused View */}
      <AnimatePresence mode="wait">
        {activeJob ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <Card className="border-2 border-orange-500 shadow-2xl overflow-hidden">
              <div className="bg-orange-500 p-3 text-white flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest">Active Stop</span>
                <Badge className="bg-white text-orange-600 border-none font-black text-[10px]">IN PROGRESS</Badge>
              </div>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{activeJob.clientName}</h2>
                  <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    {activeJob.address}, {activeJob.suburb}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 border-slate-200 flex flex-col items-center justify-center gap-1 rounded-2xl">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span className="text-[9px] font-black uppercase">Navigate</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 border-slate-200 flex flex-col items-center justify-center gap-1 rounded-2xl"
                    onClick={() => setShowMaterialLog(!showMaterialLog)}
                  >
                    <Beaker className="w-4 h-4 text-orange-600" />
                    <span className="text-[9px] font-black uppercase">Log Materials</span>
                  </Button>
                </div>

                {showMaterialLog && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                    <JobMaterialLog 
                      onSave={handleSaveMaterials}
                      initialMaterials={activeJob.materials}
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <TrendingDown className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Target Time</p>
                      <p className="text-sm font-black text-slate-900">45m</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-orange-600">
                      <Clock className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Elapsed</p>
                      <p className="text-sm font-black text-slate-900">12:45</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-red-800">Critical Note</p>
                      <p className="text-xs text-red-700 font-medium">{activeJob.packageNotes || 'Watch for underground sprinkler heads near south boundary.'}</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleCompleteJob(activeJob.id)}
                  className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg flex items-center justify-center gap-3"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-lg font-black uppercase italic">Finish & Auto-Bill</span>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl text-white shadow-xl">
              <div className="bg-green-500 p-2 rounded-xl">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Route Active</p>
                <p className="text-sm font-bold">14.2 km total distance optimized</p>
              </div>
            </div>

            <div className="space-y-3">
              {jobs.filter(j => j.status === 'scheduled').map((job, index) => (
                <div 
                  key={job.id}
                  className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-center gap-4"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Stop</span>
                    <span className="text-xl font-black text-slate-900 leading-none">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-900">{job.clientName}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight line-clamp-1">{job.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200">
                        {(job.servicePackage || 'Service').split('_').pop()?.replace(/-/g, ' ')}
                      </Badge>
                      <span className="text-[10px] text-orange-600 font-black">+{job.addOns.filter(a => a.selected).length} Addons</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleStartJob(job)}
                    className="h-10 w-10 p-0 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                  >
                    <Play className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Navigation (Mobile Style) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center">
        <button className="flex flex-col items-center gap-1 text-orange-600">
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Schedule</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-orange-600 transition-colors">
          <MapPin className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Map</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-orange-600 transition-colors">
          <Camera className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Photos</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-orange-600 transition-colors">
          <Clock className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Shift</span>
        </button>
      </div>
    </div>
  );
}
