import { useState } from "react";
import CustomerPage from "./pages/Customer";
import CourierPage from "./pages/Courier";

function App() {
  const [role, setRole] = useState<"customer" | "courier">("customer");

  return (
    <div>
      <div style={{ padding: 12 }}>
        <button onClick={() => setRole("customer")}>Customer</button>
        <button onClick={() => setRole("courier")} style={{ marginLeft: 8 }}>
          Courier
        </button>
      </div>

      {role === "customer" ? <CustomerPage /> : <CourierPage />}
    </div>
  );
}

export default App;
