import { useEffect, useMemo, useState } from "react";
import "./App.css";

type BookingStatus = "Pending" | "Accepted" | "Scheduled" | "Completed" | "Cancelled";

type Booking = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  propertyType: string;
  lawnSize: string;
  serviceType: string;
  addOns: string[];
  preferredDate: string;
  notes: string;
  status: BookingStatus;
  adminNotes: string;
  assignedDate: string;
};

const STORAGE_KEY = "grassroots_mowing_bookings_v1";

const allowedServiceAreas = [
  "Mount Isa",
  "Mornington",
  "Healy",
  "Pioneer",
  "Townview",
  "Menzies",
  "The Gap",
  "Winston",
  "Miles End",
  "Parkside",
  "Ryan",
  "Soldiers Hill",
];

const serviceTypes = [
  "Standard lawn mowing",
  "Lawn mowing and whipper snipping",
  "Yard clean-up",
  "Regular maintenance",
  "Ride-on mowing",
  "Quote request",
];

const addOnOptions = [
  "Whipper snipping",
  "Green waste removal",
  "Edging",
  "Poisoning / weed control",
  "Blower clean-up",
  "Before and after photos",
];

const initialForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  suburb: "Mount Isa",
  propertyType: "Residential",
  lawnSize: "Medium",
  serviceType: "Standard lawn mowing",
  addOns: [] as string[],
  preferredDate: "",
  notes: "",
  consent: false,
};

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings: Booking[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function App() {
  const [page, setPage] = useState<"home" | "book" | "admin">("home");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setBookings(loadBookings());
  }, []);

  const pendingCount = useMemo(
    () => bookings.filter((booking) => booking.status === "Pending").length,
    [bookings]
  );

  function updateForm(field: keyof typeof initialForm, value: string | boolean | string[]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAddOn(addOn: string) {
    const next = form.addOns.includes(addOn)
      ? form.addOns.filter((item) => item !== addOn)
      : [...form.addOns, addOn];

    updateForm("addOns", next);
  }

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setMessage("Please add your name, phone number, and property address.");
      return;
    }

    if (!form.consent) {
      setMessage("Please tick the consent box before submitting.");
      return;
    }

    if (!allowedServiceAreas.includes(form.suburb)) {
      setMessage("That suburb is not currently listed in the GrassRoots service area.");
      return;
    }

    const booking: Booking = {
      id: `GR-${Date.now()}`,
      createdAt: new Date().toLocaleString("en-AU"),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      suburb: form.suburb,
      propertyType: form.propertyType,
      lawnSize: form.lawnSize,
      serviceType: form.serviceType,
      addOns: form.addOns,
      preferredDate: form.preferredDate,
      notes: form.notes.trim(),
      status: "Pending",
      adminNotes: "",
      assignedDate: "",
    };

    const nextBookings = [booking, ...bookings];
    setBookings(nextBookings);
    saveBookings(nextBookings);
    setForm(initialForm);
    setMessage("Booking submitted. GrassRoots Mowing Co will review it and contact you.");
    setPage("admin");
  }

  function updateBooking(id: string, updates: Partial<Booking>) {
    const nextBookings = bookings.map((booking) =>
      booking.id === id ? { ...booking, ...updates } : booking
    );

    setBookings(nextBookings);
    saveBookings(nextBookings);
  }

  function deleteBooking(id: string) {
    const nextBookings = bookings.filter((booking) => booking.id !== id);
    setBookings(nextBookings);
    saveBookings(nextBookings);
  }

  return (
    <main className="app-shell">
      <nav className="top-nav">
        <button className="brand-button" onClick={() => setPage("home")}>
          <span className="brand-mark">GR</span>
          <span>
            <strong>GrassRoots Mowing Co</strong>
            <small>Mount Isa lawn care</small>
          </span>
        </button>

        <div className="nav-actions">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("book")}>Book Now</button>
          <button onClick={() => setPage("admin")}>
            Admin {pendingCount > 0 ? `(${pendingCount})` : ""}
          </button>
        </div>
      </nav>

      {page === "home" && (
        <section className="hero-section">
          <div className="hero-card">
            <p className="eyebrow">GrassRoots Mowing Co</p>
            <h1>Simple mowing bookings for Mount Isa yards.</h1>
            <p className="hero-text">
              Book lawn mowing, whipper snipping, ride-on mowing, and yard clean-up work.
              This is the Stage 1 MVP: customer booking flow plus admin booking dashboard.
            </p>

            <div className="hero-actions">
              <button className="primary-button" onClick={() => setPage("book")}>
                Book a mowing job
              </button>
              <button className="secondary-button" onClick={() => setPage("admin")}>
                Open admin dashboard
              </button>
            </div>
          </div>

          <div className="system-card">
            <h2>Stage 1 active</h2>
            <ul>
              <li>Public booking form</li>
              <li>Service area validation</li>
              <li>Local booking storage</li>
              <li>Admin status control</li>
            </ul>
            <p>
              Later stages will add Firebase, Stripe, SMS, maps, weather, safety,
              inventory, and n8n automation.
            </p>
          </div>
        </section>
      )}

      {page === "book" && (
        <section className="page-card">
          <div className="section-heading">
            <p className="eyebrow">Customer Booking Hub</p>
            <h1>Book a GrassRoots mowing service</h1>
            <p>Fill this out as a customer would. The booking will appear in the admin dashboard.</p>
          </div>

          {message && <div className="notice">{message}</div>}

          <form className="booking-form" onSubmit={submitBooking}>
            <label>
              Customer name
              <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
            </label>

            <label>
              Phone number
              <input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
            </label>

            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
            </label>

            <label>
              Property address
              <input value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
            </label>

            <label>
              Suburb / area
              <select value={form.suburb} onChange={(e) => updateForm("suburb", e.target.value)}>
                {allowedServiceAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Property type
              <select value={form.propertyType} onChange={(e) => updateForm("propertyType", e.target.value)}>
                <option>Residential</option>
                <option>Commercial</option>
                <option>Rental property</option>
                <option>NDIS / support client</option>
                <option>Rural block</option>
              </select>
            </label>

            <label>
              Lawn size estimate
              <select value={form.lawnSize} onChange={(e) => updateForm("lawnSize", e.target.value)}>
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
                <option>Very large / ride-on required</option>
                <option>Unsure</option>
              </select>
            </label>

            <label>
              Service type
              <select value={form.serviceType} onChange={(e) => updateForm("serviceType", e.target.value)}>
                {serviceTypes.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Preferred date
              <input
                type="date"
                value={form.preferredDate}
                onChange={(e) => updateForm("preferredDate", e.target.value)}
              />
            </label>

            <div className="full-width">
              <p className="field-title">Add-on services</p>
              <div className="checkbox-grid">
                {addOnOptions.map((addOn) => (
                  <label key={addOn} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.addOns.includes(addOn)}
                      onChange={() => toggleAddOn(addOn)}
                    />
                    {addOn}
                  </label>
                ))}
              </div>
            </div>

            <label className="full-width">
              Notes
              <textarea
                rows={4}
                value={form.notes}
                placeholder="Access notes, dog warning, gate code, overgrown areas, preferred time, etc."
                onChange={(e) => updateForm("notes", e.target.value)}
              />
            </label>

            <label className="checkbox-row full-width consent">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => updateForm("consent", e.target.checked)}
              />
              I agree for GrassRoots Mowing Co to contact me about this booking.
            </label>

            <button className="primary-button full-width" type="submit">
              Submit booking
            </button>
          </form>
        </section>
      )}

      {page === "admin" && (
        <section className="page-card">
          <div className="section-heading">
            <p className="eyebrow">Admin Control Centre</p>
            <h1>Booking dashboard</h1>
            <p>
              This dashboard uses local browser storage for now. Firebase can be connected in the next patch.
            </p>
          </div>

          {message && <div className="notice">{message}</div>}

          {bookings.length === 0 ? (
            <div className="empty-state">
              <h2>No bookings yet</h2>
              <p>Submit a test booking first, then it will appear here.</p>
              <button className="primary-button" onClick={() => setPage("book")}>
                Create test booking
              </button>
            </div>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => (
                <article key={booking.id} className="booking-card">
                  <div className="booking-card-header">
                    <div>
                      <h2>{booking.name}</h2>
                      <p>{booking.address}, {booking.suburb}</p>
                    </div>
                    <span className={`status status-${booking.status.toLowerCase()}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="booking-details">
                    <p><strong>Phone:</strong> {booking.phone}</p>
                    <p><strong>Email:</strong> {booking.email || "Not supplied"}</p>
                    <p><strong>Service:</strong> {booking.serviceType}</p>
                    <p><strong>Property:</strong> {booking.propertyType}</p>
                    <p><strong>Lawn size:</strong> {booking.lawnSize}</p>
                    <p><strong>Preferred date:</strong> {booking.preferredDate || "Not supplied"}</p>
                    <p><strong>Add-ons:</strong> {booking.addOns.length ? booking.addOns.join(", ") : "None"}</p>
                    <p><strong>Customer notes:</strong> {booking.notes || "None"}</p>
                    <p><strong>Created:</strong> {booking.createdAt}</p>
                  </div>

                  <div className="admin-controls">
                    <label>
                      Status
                      <select
                        value={booking.status}
                        onChange={(e) =>
                          updateBooking(booking.id, { status: e.target.value as BookingStatus })
                        }
                      >
                        <option>Pending</option>
                        <option>Accepted</option>
                        <option>Scheduled</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    </label>

                    <label>
                      Assigned job date/time
                      <input
                        value={booking.assignedDate}
                        placeholder="Example: Friday 9:30am"
                        onChange={(e) => updateBooking(booking.id, { assignedDate: e.target.value })}
                      />
                    </label>

                    <label className="full-width">
                      Admin notes
                      <textarea
                        rows={3}
                        value={booking.adminNotes}
                        onChange={(e) => updateBooking(booking.id, { adminNotes: e.target.value })}
                      />
                    </label>

                    <button className="danger-button full-width" onClick={() => deleteBooking(booking.id)}>
                      Delete booking
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
