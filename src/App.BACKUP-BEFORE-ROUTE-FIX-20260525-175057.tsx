import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import './index.css';

type FirebaseJob = {
  id: string;
  customerName: string;
  address: string;
  service: string;
  status: string;
  requestedDateTime: string;
  priceQuote: string;
  phone: string;
  email: string;
  accessNotes: string;
  grassCondition: string;
  yardSize: string;
  photos: string;
  createdAt: string;
};

function valueToText(value: unknown): string {
  if (value === undefined || value === null) return '';

  if (typeof value === 'object') {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };

    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().toLocaleString('en-AU');
    }

    if (typeof maybeTimestamp.seconds === 'number') {
      return new Date(maybeTimestamp.seconds * 1000).toLocaleString('en-AU');
    }
  }

  return String(value).trim();
}

function readField(data: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = valueToText(data[key]);
    if (value) return value;
  }

  return fallback;
}

function normaliseJob(id: string, data: Record<string, unknown>): FirebaseJob {
  return {
    id,
    customerName: readField(data, ['customer_name', 'customerName', 'clientName', 'name'], 'Unknown customer'),
    address: readField(data, ['address', 'siteAddress', 'propertyAddress'], 'No address recorded'),
    service: readField(data, ['service', 'service_requested', 'serviceRequested'], 'No service recorded'),
    status: readField(data, ['status'], 'PENDING').toUpperCase(),
    requestedDateTime: readField(data, ['requested_date_time', 'requestedDateTime', 'preferredDateTime', 'scheduledDate'], 'No date/time recorded'),
    priceQuote: readField(data, ['price_quote', 'priceQuote', 'approvedPrice', 'price'], 'No price recorded'),
    phone: readField(data, ['phone', 'clientPhone', 'customerPhone'], 'No phone recorded'),
    email: readField(data, ['email', 'clientEmail', 'customerEmail'], 'No email recorded'),
    accessNotes: readField(data, ['access_notes', 'accessNotes', 'access'], 'No access notes'),
    grassCondition: readField(data, ['grass_condition', 'grassCondition', 'grassHeight'], 'No grass condition'),
    yardSize: readField(data, ['yard_size', 'yardSize'], 'No yard size'),
    photos: readField(data, ['photos'], 'No photo note'),
    createdAt: readField(data, ['created_at', 'createdAt'], ''),
  };
}

function createDraftMessage(job: FirebaseJob): string {
  return `Hi ${job.customerName}, this is Dave from GrassRoots Mowing Co.

Your mowing job has been reviewed.

Address: ${job.address}
Service: ${job.service}
Preferred time: ${job.requestedDateTime}
Approved price: ${job.priceQuote}

I will confirm the final schedule before locking anything in.

Thanks,
Dave
GrassRoots Mowing Co.`;
}

function App() {
  const [jobs, setJobs] = useState<FirebaseJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'job_requests'),
      (snapshot) => {
        const firebaseJobs = snapshot.docs
          .map((doc) => normaliseJob(doc.id, doc.data()))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setJobs(firebaseJobs);
        setSelectedJobId((current) => current || firebaseJobs[0]?.id || '');
        setLoading(false);
        setFirebaseError('');
      },
      (error) => {
        console.error('Firebase job_requests read failed:', error);
        setFirebaseError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredJobs = useMemo(() => {
    if (selectedStatus === 'ALL') return jobs;
    return jobs.filter((job) => job.status === selectedStatus);
  }, [jobs, selectedStatus]);

  const selectedJob = useMemo(() => {
    return jobs.find((job) => job.id === selectedJobId) || filteredJobs[0] || jobs[0];
  }, [jobs, filteredJobs, selectedJobId]);

  const approvedCount = jobs.filter((job) => job.status === 'APPROVED').length;
  const pendingCount = jobs.filter((job) => job.status === 'PENDING').length;
  const draftMessage = selectedJob ? createDraftMessage(selectedJob) : '';

  async function copyDraftMessage() {
    if (!draftMessage) return;

    try {
      await navigator.clipboard.writeText(draftMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      alert('Copy failed. Highlight the draft message and copy it manually.');
    }
  }

  return (
    <div className="app-shell">
      <aside className="brand-rail">
        <div className="brand-mark">GR</div>
        <div>
          <p className="brand-small">GrassRoots</p>
          <h1>Mowing Co.</h1>
          <p className="brand-location">Mount Isa, QLD</p>
        </div>
      </aside>

      <main className="dashboard">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Firebase-connected command centre</p>
            <h2>Job Dashboard</h2>
            <p>
              Jobs saved by the ADK agent system appear here from Firestore. This screen is safe for testing:
              no SMS, no Stripe payment, and no calendar update is triggered.
            </p>
          </div>

          <div className="hero-status">
            <span>Live collection</span>
            <strong>job_requests</strong>
          </div>
        </section>

        <section className="stat-grid">
          <article>
            <span>Total jobs</span>
            <strong>{jobs.length}</strong>
          </article>
          <article>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </article>
          <article>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </article>
        </section>

        <section className="workbench">
          <section className="job-list-panel">
            <div className="panel-header">
              <div>
                <h3>Job board</h3>
                <p>Click a job to view details and prepare a customer message.</p>
              </div>

              <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                <option value="ALL">All statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            {loading && <div className="safe-message">Loading Firebase jobs...</div>}

            {firebaseError && (
              <div className="error-box">
                <h4>Firebase read issue</h4>
                <p>{firebaseError}</p>
              </div>
            )}

            {!loading && !firebaseError && filteredJobs.length === 0 && (
              <div className="safe-message">No jobs found for this filter.</div>
            )}

            <div className="job-card-list">
              {filteredJobs.map((job) => (
                <button
                  type="button"
                  className={`job-card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <div className="job-card-top">
                    <div>
                      <h4>{job.customerName}</h4>
                      <p>{job.address}</p>
                    </div>
                    <span className={`status-pill status-${job.status.toLowerCase()}`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="job-card-summary">
                    <span>{job.service}</span>
                    <strong>{job.priceQuote}</strong>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-panel">
            {selectedJob ? (
              <>
                <div className="panel-header">
                  <div>
                    <h3>{selectedJob.customerName}</h3>
                    <p>{selectedJob.address}</p>
                  </div>
                  <span className={`status-pill status-${selectedJob.status.toLowerCase()}`}>
                    {selectedJob.status}
                  </span>
                </div>

                <div className="detail-grid">
                  <p><strong>Service</strong><span>{selectedJob.service}</span></p>
                  <p><strong>Requested</strong><span>{selectedJob.requestedDateTime}</span></p>
                  <p><strong>Price</strong><span>{selectedJob.priceQuote}</span></p>
                  <p><strong>Phone</strong><span>{selectedJob.phone}</span></p>
                  <p><strong>Email</strong><span>{selectedJob.email}</span></p>
                  <p><strong>Yard size</strong><span>{selectedJob.yardSize}</span></p>
                  <p><strong>Grass condition</strong><span>{selectedJob.grassCondition}</span></p>
                  <p><strong>Access</strong><span>{selectedJob.accessNotes}</span></p>
                  <p><strong>Photos</strong><span>{selectedJob.photos}</span></p>
                </div>

                <div className="safe-actions">
                  <button type="button">View job</button>
                  <button type="button">Prepare schedule note</button>
                  <button type="button">Prepare payment note</button>
                </div>

                <div className="draft-panel">
                  <div className="panel-header tight">
                    <div>
                      <h3>Customer message draft</h3>
                      <p>Draft only. Nothing is sent from this screen.</p>
                    </div>
                    <button type="button" onClick={copyDraftMessage}>
                      {copied ? 'Copied' : 'Copy draft'}
                    </button>
                  </div>

                  <pre>{draftMessage}</pre>
                </div>

                <div className="job-id-box">
                  <strong>Firestore document ID</strong>
                  <code>{selectedJob.id}</code>
                </div>
              </>
            ) : (
              <div className="safe-message">Select a job to view details.</div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
