import { useEffect, useMemo, useState } from "react";
import { Program, AnchorProvider, EventParser, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import idlJson from "../idl/block_delivery.json";
const IDL = idlJson as Idl;

export default function CustomerPage() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [amount, setAmount] = useState("1000");
  const [events, setEvents] = useState<any[]>([]);

  // ----------------------------------------
  // Provider / Program
  // ----------------------------------------
  const provider = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(IDL, provider);
  }, [provider]);

  // ----------------------------------------
  // Event listener
  // ----------------------------------------
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
  // PDA (由合約 order_counter 自動生成)
  // ----------------------------------------
  const deriveOrderPda = async () => {
    if (!wallet.publicKey || !program) throw new Error("Wallet or program not ready");

    // fetch counter
    const [counterPda] = PublicKey.findProgramAddressSync([Buffer.from("order_counter")], program.programId);
    const counterAccount = await program.account.orderCounter.fetch(counterPda);
    const orderIdBN = counterAccount.nextId;

    const [orderPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("order"), new BN(orderIdBN).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    return { orderPda, orderIdBN };
  };

  // ----------------------------------------
  // createOrder
  // ----------------------------------------
  const createOrder = async () => {
    if (!program || !wallet.publicKey) return;

    const { orderPda, orderIdBN } = await deriveOrderPda();
    const amountBN = new BN(amount);

    try {
      const tx = await program.methods
        .createOrder(amountBN)
        .accounts({
          counter: (await PublicKey.findProgramAddressSync([Buffer.from("order_counter")], program.programId))[0],
          order: orderPda,
          customer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ createOrder tx:", tx);
      console.log("Order PDA:", orderPda.toBase58());
      console.log("Order ID:", orderIdBN.toString());
    } catch (err) {
      console.error("❌ createOrder failed:", err);
    }
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <WalletMultiButton />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label>Amount:</label>
        <input
          style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          onClick={createOrder}
          style={{ padding: "8px 16px", borderRadius: 4, backgroundColor: "#1976d2", color: "#fff", border: "none" }}
        >
          Create Order
        </button>
      </div>

      <div>
        <h3>📡 Events</h3>
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid #ddd",
            padding: 8,
            borderRadius: 6,
            backgroundColor: "#fff",
          }}
        >
          {events.length === 0 && <p style={{ color: "#999" }}>No events yet</p>}
          {events.map((e, i) => (
            <pre
              key={i}
              style={{
                fontSize: 12,
                backgroundColor: "#f5f5f5",
                padding: 4,
                borderRadius: 4,
                marginBottom: 4,
              }}
            >
              {JSON.stringify(e, null, 2)}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
}
