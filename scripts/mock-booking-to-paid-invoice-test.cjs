const fs = require("fs");
const path = require("path");

const reportDir = path.join(process.cwd(), "MOCK-TEST-REPORTS");
fs.mkdirSync(reportDir, { recursive: true });

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, "-");
const reportPath = path.join(reportDir, `mock-booking-to-paid-invoice-${stamp}.json`);

const testLog = [];
const errors = [];

function log(step, status, details = {}) {
  const row = {
    time: new Date().toISOString(),
    step,
    status,
    details,
  };
  testLog.push(row);
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "ℹ️";
  console.log(`${icon} ${step}`);
  if (Object.keys(details).length) {
    console.log("   ", JSON.stringify(details, null, 2));
  }
}

function fail(step, details = {}) {
  errors.push({ step, details });
  log(step, "FAIL", details);
}

function pass(step, details = {}) {
  log(step, "PASS", details);
}

function assertEqual(step, actual, expected) {
  if (actual !== expected) {
    fail(step, { expected, actual });
    return false;
  }
  pass(step, { expected, actual });
  return true;
}

function assertTruthy(step, value, details = {}) {
  if (!value) {
    fail(step, { value, ...details });
    return false;
  }
  pass(step, details);
  return true;
}

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

console.log("");
console.log("====================================================");
console.log("GRASSROOTS MOCK TEST: BOOKING TO PAID INVOICE");
console.log("====================================================");
console.log("");

const mockDb = {
  clients: {},
  jobs: {},
  invoices: {},
  payments: {},
  notifications: [],
};

const mockBookingForm = {
  name: "David Mock Customer",
  phone: "+61404231448",
  email: "mock.customer@example.com",
  address: "3 Dot Street, Mount Isa QLD",
  suburb: "Mount Isa",
  clientType: "one_off",
  servicePackage: "residential_standard",
  serviceGrade: "Standard",
  schedule: "One-Off",
  preferredDate: "2026-06-10",
  timeSlot: "morning",
  basePrice: 150,
  addOns: [
    { id: "edges", name: "Edge Trimming", price: 15, selected: true },
    { id: "blowing", name: "Path Blowing", price: 10, selected: true },
  ],
  notes: "Mock full test booking.",
};

function createBookingRequest(data) {
  const bookingId = "mock-booking-" + Date.now();

  const addOnTotal = data.addOns
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.price, 0);

  const total = money(data.basePrice + addOnTotal);

  const booking = {
    id: bookingId,
    source: "mock_booking_test",
    customerName: data.name,
    clientName: data.name,
    clientPhone: data.phone,
    clientEmail: data.email,
    address: data.address,
    suburb: data.suburb,
    servicePackage: data.servicePackage,
    serviceGrade: data.serviceGrade,
    schedule: data.schedule,
    preferredDate: data.preferredDate,
    timeSlot: data.timeSlot,
    addOns: data.addOns.filter((item) => item.selected),
    price: total,
    status: "booking-created",
    createdAt: Date.now(),
  };

  return booking;
}

function convertBookingToJob(booking) {
  const jobId = "mock-job-" + Date.now();

  const job = {
    id: jobId,
    bookingId: booking.id,
    clientId: "mock-client-" + Date.now(),
    customerName: booking.customerName,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientEmail: booking.clientEmail,
    address: booking.address,
    suburb: booking.suburb,
    status: "scheduled",
    servicePackage: booking.servicePackage,
    serviceGrade: booking.serviceGrade,
    schedule: booking.schedule,
    timeSlot: booking.timeSlot,
    price: booking.price,
    paymentStatus: "pending",
    invoiceId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  mockDb.jobs[jobId] = job;

  return job;
}

function updateJobStatus(jobId, nextStatus) {
  const job = mockDb.jobs[jobId];

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const allowed = {
    scheduled: ["on-the-way", "completed"],
    "on-the-way": ["in-progress", "completed"],
    "in-progress": ["completed"],
    completed: ["invoiced_final"],
    invoiced_final: ["paid"],
    paid: [],
  };

  const current = job.status;
  const allowedNext = allowed[current] || [];

  if (!allowedNext.includes(nextStatus)) {
    throw new Error(`Invalid status move: ${current} → ${nextStatus}`);
  }

  job.status = nextStatus;
  job.updatedAt = Date.now();

  mockDb.notifications.push({
    type: "job-status",
    jobId,
    status: nextStatus,
    createdAt: Date.now(),
    mocked: true,
  });

  return job;
}

function completeJobAndCreateInvoice(jobId) {
  const job = updateJobStatus(jobId, "completed");

  const invoiceId = "mock-invoice-" + Date.now();
  const invoice = {
    id: invoiceId,
    jobId,
    clientName: job.clientName,
    clientPhone: job.clientPhone,
    clientEmail: job.clientEmail,
    subtotal: money(job.price),
    gst: money(job.price * 0.1),
    totalAmount: money(job.price * 1.1),
    status: "draft",
    sentAt: null,
    paidAt: null,
    createdAt: Date.now(),
  };

  mockDb.invoices[invoiceId] = invoice;

  job.invoiceId = invoiceId;
  job.status = "invoiced_final";
  job.paymentStatus = "unpaid";
  job.updatedAt = Date.now();

  return invoice;
}

function sendInvoice(invoiceId) {
  const invoice = mockDb.invoices[invoiceId];

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  invoice.status = "sent";
  invoice.sentAt = Date.now();

  mockDb.notifications.push({
    type: "invoice-sent",
    invoiceId,
    jobId: invoice.jobId,
    sms: "mock-sent",
    email: "mock-skipped",
    createdAt: Date.now(),
    mocked: true,
  });

  return invoice;
}

function recordPayment(invoiceId, method = "mock-payment") {
  const invoice = mockDb.invoices[invoiceId];

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const paymentId = "mock-payment-" + Date.now();

  const payment = {
    id: paymentId,
    invoiceId,
    jobId: invoice.jobId,
    amount: invoice.totalAmount,
    method,
    status: "successful",
    paidAt: Date.now(),
    mocked: true,
  };

  mockDb.payments[paymentId] = payment;

  invoice.status = "paid";
  invoice.paidAt = payment.paidAt;

  const job = mockDb.jobs[invoice.jobId];
  job.status = "paid";
  job.paymentStatus = "successful";
  job.paymentMethod = method;
  job.paymentDate = payment.paidAt;
  job.updatedAt = Date.now();

  mockDb.notifications.push({
    type: "payment-receipt",
    invoiceId,
    jobId: invoice.jobId,
    paymentId,
    sms: "mock-sent",
    email: "mock-skipped",
    createdAt: Date.now(),
    mocked: true,
  });

  return payment;
}

try {
  const booking = createBookingRequest(mockBookingForm);
  assertTruthy("1. Booking request created", booking.id, booking);

  const job = convertBookingToJob(booking);
  assertTruthy("2. Booking converted to job", job.id, job);
  assertEqual("3. Job starts as scheduled", job.status, "scheduled");

  updateJobStatus(job.id, "on-the-way");
  assertEqual("4. Start Transit moves job to on-the-way", mockDb.jobs[job.id].status, "on-the-way");

  updateJobStatus(job.id, "in-progress");
  assertEqual("5. Start On-Site Work moves job to in-progress", mockDb.jobs[job.id].status, "in-progress");

  const invoice = completeJobAndCreateInvoice(job.id);
  assertTruthy("6. Complete Job creates invoice", invoice.id, invoice);
  assertEqual("7. Job moves to invoiced_final", mockDb.jobs[job.id].status, "invoiced_final");
  assertEqual("8. Invoice starts as draft", invoice.status, "draft");

  sendInvoice(invoice.id);
  assertEqual("9. Invoice sent", mockDb.invoices[invoice.id].status, "sent");

  const payment = recordPayment(invoice.id, "mock-card-payment");
  assertTruthy("10. Payment recorded", payment.id, payment);
  assertEqual("11. Invoice marked paid", mockDb.invoices[invoice.id].status, "paid");
  assertEqual("12. Job marked paid", mockDb.jobs[job.id].status, "paid");
  assertEqual("13. Job paymentStatus successful", mockDb.jobs[job.id].paymentStatus, "successful");

  assertTruthy("14. Notifications created", mockDb.notifications.length >= 4, {
    count: mockDb.notifications.length,
    notifications: mockDb.notifications.map((n) => n.type),
  });

} catch (error) {
  fail("Mock test crashed", {
    message: error.message,
    stack: error.stack,
  });
}

const finalReport = {
  testName: "GrassRoots mock booking to paid invoice flow",
  mode: "MOCK_ONLY_NO_FIREBASE_NO_TWILIO_NO_STRIPE",
  createdAt: new Date().toISOString(),
  passed: errors.length === 0,
  errorCount: errors.length,
  errors,
  log: testLog,
  finalMockDb: mockDb,
};

fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

console.log("");
console.log("====================================================");
if (errors.length === 0) {
  console.log("✅ MOCK FULL FLOW TEST PASSED");
} else {
  console.log("❌ MOCK FULL FLOW TEST FAILED");
}
console.log("====================================================");
console.log(`Report saved to: ${reportPath}`);
console.log("");

if (errors.length > 0) {
  process.exit(1);
}
