import { useEffect, useMemo, useState } from "react";
import {
  AnchorProvider,
  BN,
  EventParser,
  Program,
} from "@coral-xyz/anchor";
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
  const [orderId, setOrderId] = useState("1");
  const [amount, setAmount] = useState("1000");

  // ----------------------------------------
  // Provider / Program
  // ----------------------------------------
  const provider = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
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

    const parser = new EventParser(
      program.programId,
      program.coder
    );

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
  // PDA (order_id 必須放進 seed)
  // ----------------------------------------
  const deriveOrderPda = async (orderId: BN) => {
    if (!wallet.publicKey || !program) {
      throw new Error("wallet / program not ready");
    }

    const orderIdBuf = orderId.toArrayLike(
      Buffer,
      "le",
      8
    );

    return PublicKey.findProgramAddress(
      [
        Buffer.from("order"),
        wallet.publicKey.toBuffer(),
        orderIdBuf,
      ],
      program.programId
    );
  };

  // ----------------------------------------
  // createOrder(order_id, amount)
  // ----------------------------------------
  const createOrder = async () => {
    if (!program || !wallet.publicKey) return;

    const orderIdBN = new BN(orderId);
    const amountBN = new BN(amount);

    const [orderPda] = await deriveOrderPda(orderIdBN);

    try {
      const tx = await program.methods
        .createOrder(orderIdBN, amountBN)
        .accounts({
          order: orderPda,
          customer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ createOrder tx:", tx);
    } catch (err) {
      console.error("❌ createOrder failed:", err);
    }
  };

  // ----------------------------------------
  // completeOrder(order_id)
  // ----------------------------------------
  const completeOrder = async () => {
    if (!program || !wallet.publicKey) return;

    const orderIdBN = new BN(orderId);
    const [orderPda] = await deriveOrderPda(orderIdBN);

    try {
      const tx = await program.methods
        .completeOrder()
        .accounts({
          order: orderPda,
          customer: wallet.publicKey,
        })
        .rpc();

      console.log("✅ completeOrder tx:", tx);
    } catch (err) {
      console.error("❌ completeOrder failed:", err);
    }
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------
  return (
    <div style={{ padding: 24 }}>
      <h1>📦 Block Delivery</h1>

      <WalletMultiButton />

      <div style={{ marginTop: 16 }}>
        <div>
          <label>Order ID: </label>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <label>Amount: </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={createOrder}
            disabled={!wallet.connected}
          >
            Create Order
          </button>

          <button
            onClick={completeOrder}
            disabled={!wallet.connected}
            style={{ marginLeft: 12 }}
          >
            Complete Order
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
