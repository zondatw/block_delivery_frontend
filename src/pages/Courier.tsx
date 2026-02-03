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

    return () => {
      connection.removeOnLogsListener(subId);
    };
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

  // ----------------------------------------
  // UI
  // ----------------------------------------
  return (
    <div style={{ padding: 24 }}>
      <h1>🚴 Courier</h1>

      <WalletMultiButton />

      <div style={{ marginTop: 16 }}>
        <input
          style={{ width: 420 }}
          placeholder="Order account address (PDA)"
          value={orderAddress}
          onChange={(e) => setOrderAddress(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={acceptOrder}>Accept</button>
        <button onClick={completeOrder} style={{ marginLeft: 8 }}>
          Complete
        </button>
      </div>

      <h2 style={{ marginTop: 32 }}>📡 Events</h2>
      {events.length === 0 && <p>No events yet</p>}
      {events.map((e, i) => (
        <pre key={i}>{JSON.stringify(e, null, 2)}</pre>
      ))}
    </div>
  );
}
