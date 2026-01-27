import { useEffect, useState } from "react";
import { Program, AnchorProvider, EventParser, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

import idlJson from "./idl/block_delivery.json";
const IDL = idlJson as Idl;

// 改成你 localnet 部署的 programId
const PROGRAM_ID = new PublicKey("AdScDF7jTLCmb3iP4ZPugb6kxDtix1U7pVRu99VDJwdy");

export default function App() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [events, setEvents] = useState<any[]>([]);
  const [provider, setProvider] = useState<AnchorProvider | null>(null);

  // 建立 provider 當 wallet 連線
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      setProvider(
        new AnchorProvider(connection, wallet as any, { commitment: "confirmed" })
      );
    } else {
      setProvider(null);
    }
  }, [connection, wallet]);

  // 訂閱 program events
  useEffect(() => {
    if (!provider) return;

    const program = new Program(IDL, provider);
    const parser = new EventParser(program.programId, program.coder);

    console.log("Listening program logs...");

    const subId = connection.onLogs(
      program.programId,
      (logs) => {
        if (!logs?.logs) return;
        for (const event of parser.parseLogs(logs.logs)) {
          console.log("Event:", event);
          setEvents((prev) => [...prev, event]);
        }
      },
      "confirmed"
    );

    return () => connection.removeOnLogsListener(subId);
  }, [provider, connection]);

  // createOrder 函數
  const createOrder = async () => {
    if (!provider || !wallet.publicKey) return;

    const program = new Program(IDL, provider);

    // Derive the PDA for the 'order' account
    const [orderPDA, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("order"),              // constant seed
        wallet.publicKey.toBuffer(),       // customer
      ],
      program.programId
    );

    try {
      const tx = await program.methods
        .createOrder(new BN(1000)) // example amount
        .accounts({
          order: orderPDA,
          customer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("CreateOrder tx:", tx);
    } catch (e) {
      console.error("CreateOrder failed:", e);
    }
  };


  return (
    <div style={{ padding: 24 }}>
      <h1>Block Delivery</h1>

      <WalletMultiButton />

      {wallet.connected && (
        <button style={{ marginTop: 12 }} onClick={() => wallet.disconnect()}>
          Disconnect Wallet
        </button>
      )}

      <h2 style={{ marginTop: 24 }}>📦 Anchor Events</h2>

      <button
        onClick={createOrder}
        disabled={!wallet.connected || !provider}
        style={{ margin: "12px 0" }}
      >
        Create Order
      </button>

      {events.length === 0 && <p>No events yet...</p>}

      {events.map((e, i) => (
        <pre key={i}>{JSON.stringify(e, null, 2)}</pre>
      ))}
    </div>
  );
}
