const fs = require("fs");

const file = "src/App.tsx";
let code = fs.readFileSync(file, "utf8");

// Start public users on Book page instead of protected Dashboard
code = code.replace(
  'const [page, setPage] = useState<Page>("dashboard");',
  'const [page, setPage] = useState<Page>("book");'
);

// Make logo go to public Book page unless admin is unlocked
code = code.replace(
  'onClick={() => goToPage("dashboard")}',
  'onClick={() => isAdmin ? goToPage("dashboard") : setPage("book")}'
);

// Add emergency fallback if a protected page is requested while admin is locked
if (!code.includes("Emergency public fallback")) {
  code = code.replace(
    '{page === "login" && (',
    `{!isAdmin && isProtectedPage(page) && page !== "login" && (
        <section className="card login-card">
          {/* Emergency public fallback */}
          <div className="section-title">
            <p className="tag">Admin Locked</p>
            <h1>Admin login required</h1>
            <p>The business dashboard is protected. Public customers can still use the booking form.</p>
          </div>
          <div className="hero-actions">
            <button className="primary" onClick={() => setPage("login")}>Admin Login</button>
            <button className="secondary" onClick={() => setPage("book")}>Go to Booking Form</button>
          </div>
        </section>
      )}

      {page === "login" && (`
  );
}

fs.writeFileSync(file, code, "utf8");
console.log("Blank page fix applied.");
