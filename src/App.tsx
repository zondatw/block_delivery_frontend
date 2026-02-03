import { useState } from "react";
import CustomerPage from "./pages/Customer";
import CourierPage from "./pages/Courier";

export default function App() {
  const [role, setRole] = useState<"customer" | "courier">("customer");

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>📦 Block Delivery DApp</h1>

      {/* Role selection */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <button
          onClick={() => setRole("customer")}
          style={{
            padding: "8px 16px",
            backgroundColor: role === "customer" ? "#4caf50" : "#e0e0e0",
            color: role === "customer" ? "#fff" : "#333",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Customer
        </button>
        <button
          onClick={() => setRole("courier")}
          style={{
            padding: "8px 16px",
            marginLeft: 8,
            backgroundColor: role === "courier" ? "#4caf50" : "#e0e0e0",
            color: role === "courier" ? "#fff" : "#333",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Courier
        </button>
      </div>

      {/* Main content */}
      <div
        style={{
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          backgroundColor: "#fafafa",
        }}
      >
        {role === "customer" ? <CustomerPage /> : <CourierPage />}
      </div>
    </div>
  );
}
