import * as React from "react";
import { db } from "@/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Zap, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceStatus {
  stripeConnected: boolean;
  resendConnected: boolean;
  twilioConnected: boolean;
  fromEmail: string;
}

interface LogEntry {
  id: string;
  automationId: string;
  event: string;
  jobId?: string;
  invoiceId?: string;
  clientName?: string;
  amount?: number;
  createdAt: number;
  status: "success" | "error";
  message?: string;
}

interface AutomationToggles {
  auto_bill: boolean;
  updatedAt?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_ENDPOINT = "POST /api/jobs/complete";
const LOGS_COLLECTION = "automationLogs";
const SETTINGS_DOC = "settings/automations";

const FUTURE_AUTOMATIONS = [
  {
    name: "Review Multiplier",
    description:
      "Send a Google Review request via SMS 15 minutes after payment is processed.",
    blockers: ["Twilio SMS A2P registration", "Google Business API", "Review trigger webhook"],
  },
  {
    name: 'Weather "Skip" Logic',
    description:
      "Auto-reschedule all routes if rainfall exceeds 5mm/hr in customer service zones.",
    blockers: ["Weather API integration", "Scheduled background checker", "Auto-reschedule logic"],
  },
  {
    name: "Seasonal Upsell Bot",
    description:
      "Target active standard clients with aeration and mulch offers based on local season.",
    blockers: ["Campaign engine", "Segment targeting", "Seasonal calendar logic"],
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatTs(ts: number) {
  return new Date(ts).toLocaleString("en-AU", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export const AutomationsManager: React.FC = () => {
  // Toggle state
  const [isOn, setIsOn] = React.useState(false);
  const [togglesLoading, setTogglesLoading] = React.useState(true);

  // Service status from /api/automations/status
  const [serviceStatus, setServiceStatus] = React.useState<ServiceStatus | null>(null);
  const [serviceLoading, setServiceLoading] = React.useState(true);

  // Logs
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(true);

  // ── Load toggle from Firestore ──────────────────────────────────────────────
  React.useEffect(() => {
    const ref = doc(db, "settings", "automations");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AutomationToggles;
          setIsOn(!!data.auto_bill);
        } else {
          setIsOn(false);
        }
        setTogglesLoading(false);
      },
      (_err) => {
        setTogglesLoading(false);
      }
    );
    return unsub;
  }, []);

  // ── Fetch service status ────────────────────────────────────────────────────
  React.useEffect(() => {
    setServiceLoading(true);
    fetch("/api/automations/status")
      .then((r) => r.json())
      .then((data: ServiceStatus) => setServiceStatus(data))
      .catch(() => setServiceStatus(null))
      .finally(() => setServiceLoading(false));
  }, []);

  // ── Listen to real logs ─────────────────────────────────────────────────────
  React.useEffect(() => {
    setLogsLoading(true);
    const q = query(
      collection(db, LOGS_COLLECTION),
      where("automationId", "==", "auto_bill"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as LogEntry[]
        );
        setLogsLoading(false);
      },
      (_err) => {
        // Permission denied until firestore rules deployed — show empty state gracefully
        setLogs([]);
        setLogsLoading(false);
      }
    );
    return unsub;
  }, []);

  // ── Toggle handler ──────────────────────────────────────────────────────────
  const handleToggle = async () => {
    if (togglesLoading) return;
    const next = !isOn;
    setIsOn(next); // optimistic
    try {
      await setDoc(
        doc(db, "settings", "automations"),
        { auto_bill: next, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (err) {
      console.error("[AutomationsManager] Toggle save failed:", err);
      setIsOn(!next); // revert on failure
    }
  };

  // ── Badge ───────────────────────────────────────────────────────────────────
  const statusBadge = () => {
    if (serviceLoading || togglesLoading) return null;
    if (!isOn) {
      return (
        <Badge variant="secondary" className="text-[10px] h-5 px-2">
          PAUSED
        </Badge>
      );
    }
    if (
      !serviceStatus ||
      !serviceStatus.stripeConnected ||
      !serviceStatus.resendConnected
    ) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] h-5 px-2 border-amber-400 text-amber-600 bg-amber-50"
        >
          PARTIALLY CONFIGURED
        </Badge>
      );
    }
    return (
      <Badge className="text-[10px] h-5 px-2 bg-emerald-500 border-none text-white">
        LIVE
      </Badge>
    );
  };

  // ── Service row ─────────────────────────────────────────────────────────────
  const ServiceRow = ({
    label,
    connected,
    sublabel,
  }: {
    label: string;
    connected: boolean;
    sublabel?: string;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div>
        <span className="text-xs font-medium text-slate-700">{label}</span>
        {sublabel && (
          <span className="block text-[10px] text-slate-400">{sublabel}</span>
        )}
      </div>
      {connected ? (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
          <CheckCircle2 className="w-3 h-3" /> CONNECTED
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
          <XCircle className="w-3 h-3" /> MISSING
        </span>
      )}
    </div>
  );

  return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">

        {/* ── Header ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-ochre" />
            <h1 className="text-2xl font-black italic uppercase font-serif text-charcoal tracking-tight">
              Automation Hub
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Automated workflows running behind the scenes.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            ZERO-TOUCH INVOICING — the only live automation
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">

          {/* Card header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-charcoal">Zero-Touch Invoicing</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Auto-generate invoice and Stripe payment session when a technician
                marks a job complete. Triggered at{" "}
                <code className="font-mono bg-slate-100 px-1 rounded text-[10px]">
                  {TRIGGER_ENDPOINT}
                </code>
                .
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
              {statusBadge()}
              <Switch
                checked={isOn}
                onCheckedChange={handleToggle}
                disabled={togglesLoading}
              />
            </div>
          </div>

          {/* Service status */}
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Connected Services
            </p>
            {serviceLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking...
              </div>
            ) : (
              <div>
                <ServiceRow
                  label="Stripe"
                  sublabel="Payment sessions"
                  connected={serviceStatus?.stripeConnected ?? false}
                />
                <ServiceRow
                  label="Resend"
                  sublabel="Invoice emails"
                  connected={serviceStatus?.resendConnected ?? false}
                />
                <ServiceRow
                  label="Twilio"
                  sublabel="SMS notifications"
                  connected={serviceStatus?.twilioConnected ?? false}
                />
              </div>
            )}
          </div>

          {/* Config detail */}
          <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                From email
              </p>
              <p className="text-xs text-slate-700 font-mono mt-0.5">
                {serviceLoading ? "—" : (serviceStatus?.fromEmail ?? "—")}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Trigger
              </p>
              <p className="text-xs text-slate-700 font-mono mt-0.5">
                {TRIGGER_ENDPOINT}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                State
              </p>
              <p
                className={`text-xs font-bold mt-0.5 ${
                  isOn ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {togglesLoading ? "—" : isOn ? "Enabled" : "Paused"}
              </p>
            </div>
          </div>

          {/* Logs */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Recent Logs
            </p>
            {logsLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                <Clock className="w-3.5 h-3.5" />
                No logs yet. Logs appear here when this automation fires.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 p-3 rounded-xl text-xs border ${
                      log.status === "error"
                        ? "bg-red-50 border-red-100 text-red-700"
                        : "bg-emerald-50 border-emerald-100 text-emerald-700"
                    }`}
                  >
                    {log.status === "error" ? (
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {log.clientName ?? log.event}
                        {log.amount != null && (
                          <span className="ml-2 font-bold">
                            ${log.amount.toFixed(2)}
                          </span>
                        )}
                      </p>
                      {log.message && (
                        <p className="text-[10px] opacity-75 truncate">{log.message}</p>
                      )}
                    </div>
                    <span className="text-[10px] opacity-60 shrink-0 whitespace-nowrap">
                      {formatTs(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            FUTURE AUTOMATIONS — backlog only, not clickable
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Future Automations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Not built yet. Listed here as backlog only.
            </p>
          </div>

          {FUTURE_AUTOMATIONS.map((a) => (
            <div
              key={a.name}
              className="border border-slate-200 rounded-xl px-5 py-4 bg-slate-50 opacity-70"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-500">{a.name}</h3>
                <span className="text-[10px] border border-slate-300 text-slate-400 rounded px-2 py-0.5 font-bold uppercase tracking-wide">
                  NOT BUILT
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">{a.description}</p>
              <div className="space-y-1">
                {a.blockers.map((b) => (
                  <p key={b} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                    {b}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
  );
};

export default AutomationsManager;
