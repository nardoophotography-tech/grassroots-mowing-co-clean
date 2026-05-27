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

function readField(data: Record<string, any>, keys: string[], fallback = '') {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '') {
      return String(data[key]);
    }
  }
  return fallback;
}

function normaliseJob(id: string, data: Record<string, any>): FirebaseJob {
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

function App() {
  const [jobs, setJobs] = useState<FirebaseJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'job_requests'),
      (snapshot) => {
        const firebaseJobs = snapshot.docs
          .map((doc) => normaliseJob(doc.id, doc.data()))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setJobs(firebaseJobs);
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

  const approvedCount = jobs.filter((job) => job.status === 'APPROVED').length;
  const pendingCount = jobs.filter((job) => job.status === 'PENDING').length;

  return (
    <div className="grassroots-app-container dashboard-mode">
      <img
        src="/assets/custom-3d-roots-bg.webp"
        className="artwork-root-bg"
        alt="GrassRoots background"
      />

      <main className="grassroots-dashboard-shell">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">GrassRoots Mowing Co.</p>
            <h1>Job Command Dashboard</h1>
            <p className="hero-copy">
              Firebase-connected job board for Mount Isa mowing work. Jobs saved by the ADK agent system appear here from the Firestore collection.
            </p>
          </div>

          <div className="hero-badge">
            <span>Firestore</span>
            <strong>job_requests</strong>
          </div>
        </section>

        <section className="dashboard-stats">
          <article>
            <span>Total Jobs</span>
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

        <section className="dashboard-controls">
          <div>
            <h2>Firebase Jobs</h2>
            <p>Live read from Firestore. No SMS, payment, or calendar action is triggered from this screen.</p>
          </div>

          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAID">Paid</option>
          </select>
        </section>

        {loading && (
          <div className="dashboard-message">
            Loading Firebase jobs...
          </div>
        )}

        {firebaseError && (
          <div className="dashboard-error">
            <h3>Firebase read issue</h3>
            <p>{firebaseError}</p>
            <p>
              If this says permission denied, Firestore rules need to allow this app to read job_requests.
            </p>
          </div>
        )}

        {!loading && !firebaseError && filteredJobs.length === 0 && (
          <div className="dashboard-message">
            No jobs found for this filter yet.
          </div>
        )}

        <section className="job-card-grid">
          {filteredJobs.map((job) => (
            <article className="job-card" key={job.id}>
              <div className="job-card-top">
                <div>
                  <h3>{job.customerName}</h3>
                  <p>{job.address}</p>
                </div>
                <span className={`status-pill status-${job.status.toLowerCase()}`}>
                  {job.status}
                </span>
              </div>

              <div className="job-detail-list">
                <p><strong>Service:</strong> {job.service}</p>
                <p><strong>Requested:</strong> {job.requestedDateTime}</p>
                <p><strong>Price:</strong> {job.priceQuote}</p>
                <p><strong>Phone:</strong> {job.phone}</p>
                <p><strong>Email:</strong> {job.email}</p>
                <p><strong>Yard:</strong> {job.yardSize}</p>
                <p><strong>Grass:</strong> {job.grassCondition}</p>
                <p><strong>Access:</strong> {job.accessNotes}</p>
                <p><strong>Photos:</strong> {job.photos}</p>
              </div>

              <div className="job-card-footer">
                <span>Job ID</span>
                <code>{job.id}</code>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
