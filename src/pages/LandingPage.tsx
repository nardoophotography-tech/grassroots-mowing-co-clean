import { useNavigate } from "react-router-dom";

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40 }}>
      <h1>Grassroots Mowing Co</h1>

      <p>Welcome to your booking system</p>

      <button
        onClick={() => navigate("/booking")}
        style={{
          padding: 12,
          background: "green",
          color: "white",
          fontWeight: "bold",
          border: "none",
          marginTop: 20,
        }}
      >
        Book Now
      </button>
    </div>
  );
};