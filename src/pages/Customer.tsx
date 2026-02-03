// src/pages/App.tsx
import { useEffect, useMemo, useState } from "react";
import { AnchorProvider, BN, EventParser, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import idlJson from "../idl/block_delivery.json";
const IDL = idlJson as Idl;

export default function App() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [events, setEvents] = useState<any[]>([]);
  const [amount, setAmount] = useState("1000");

  // -----------------------
  // Provider / Program
  // -----------------------
  const provider = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(IDL, provider);
  }, [provider]);

  // -----------------------
  // Event listener
  // -----------------------
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

    return () => {
      connection.removeOnLogsListener(subId);
    };
  }, [program, connection]);

  // -----------------------
  // Derive PDA using order_id
  // -----------------------
  const deriveOrderPda = async (orderId: BN) => {
    if (!program || !wallet.publicKey) throw new Error("Wallet or program not ready");

    const orderIdBuf = orderId.toArrayLike(Buffer, "le", 8);
    return PublicKey.findProgramAddress(
      [Buffer.from("order"), wallet.publicKey.toBuffer(), orderIdBuf],
      program.programId
    );
  };

  // -----------------------
  // Create order (contract generates order_id)
  // -----------------------
  const createOrder = async () => {
    if (!program || !wallet.publicKey) return;

    const amountBN = new BN(amount);

    try {
      // call createOrder, order_id 由合約透過 counter 自動生成
      const tx = await program.methods
        .createOrder(amountBN)
        .accounts({
          customer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ createOrder tx:", tx);
    } catch (err) {
      console.error("❌ createOrder failed:", err);
    }
  };

  // -----------------------
  // UI
  // -----------------------
  return (
    <div style={{ padding: 24 }}>
      <h1>📦 Block Delivery</h1>

      <WalletMultiButton />

      <div style={{ marginTop: 16 }}>
        <div>
          <label>Amount: </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={createOrder} disabled={!wallet.connected}>
            Create Order
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>📡 Events</h2>
      {events.length === 0 && <p>No events yet</p>}
      {events.map((e, i) => (
        <pre key={i}>{JSON.stringify(e, null, 2)}</pre>
      ))}
    </div>
  );
}
