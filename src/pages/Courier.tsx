import { useEffect, useMemo, useState } from "react";
import { Program, AnchorProvider, EventParser, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";

import idlJson from "../idl/block_delivery.json";
const IDL = idlJson as Idl;

export default function CourierPage() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [orderAddress, setOrderAddress] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  const provider = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(IDL, provider);
  }, [provider]);

  // Event listener
  useEffect(() => {
    if (!program) return;

    const parser = new EventParser(program.programId, program.coder);
    const subId = connection.onLogs(
      program.programId,
      (logs) => {
        if (!logs.logs) return;
        for (const event of parser.parseLogs(logs.logs)) {
          setEvents((prev) => [...prev, event]);
        }
      },
      "confirmed"
    );

    return () => connection.removeOnLogsListener(subId);
  }, [program, connection]);

  // ----------------------------------------
  // Actions
  // ----------------------------------------
  const acceptOrder = async () => {
    if (!program || !wallet.publicKey) return;
    try {
      const orderPubkey = new PublicKey(orderAddress);
      const tx = await program.methods
        .acceptOrder()
        .accounts({
          order: orderPubkey,
          courier: wallet.publicKey,
        })
        .rpc();
      console.log("Accept tx:", tx);
    } catch (err) {
      console.error("Accept failed:", err);
    }
  };

  const completeOrder = async () => {
    if (!program || !wallet.publicKey) return;
    try {
      const orderPubkey = new PublicKey(orderAddress);
      const tx = await program.methods
        .completeOrder()
        .accounts({
          order: orderPubkey,
          courier: wallet.publicKey,
        })
        .rpc();
      console.log("Complete tx:", tx);
    } catch (err) {
      console.error("Complete failed:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <WalletMultiButton />

      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          placeholder="Order PDA"
          value={orderAddress}
          onChange={(e) => setOrderAddress(e.target.value)}
        />
        <button onClick={acceptOrder} style={{ padding: "8px 16px", borderRadius: 4, backgroundColor: "#1976d2", color: "#fff", border: "none" }}>Accept</button>
        <button onClick={completeOrder} style={{ padding: "8px 16px", borderRadius: 4, backgroundColor: "#4caf50", color: "#fff", border: "none" }}>Complete</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>📡 Events</h3>
        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #ddd", padding: 8, borderRadius: 6, backgroundColor: "#fff" }}>
          {events.length === 0 && <p style={{ color: "#999" }}>No events yet</p>}
          {events.map((e, i) => (
            <pre key={i} style={{ fontSize: 12, backgroundColor: "#f5f5f5", padding: 4, borderRadius: 4, marginBottom: 4 }}>
              {JSON.stringify(e, null, 2)}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
}
