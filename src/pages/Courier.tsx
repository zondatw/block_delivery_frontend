import { useState } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";

import idlJson from "../idl/block_delivery.json";
const IDL = idlJson as Idl;

export default function CourierPage() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // ✅ 直接輸入 order PDA
  const [orderAddress, setOrderAddress] = useState("");

  const provider =
    wallet.connected && wallet.publicKey
      ? new AnchorProvider(connection, wallet as any, {
          commitment: "confirmed",
        })
      : null;

  const program = provider ? new Program(IDL, provider) : null;

  const acceptOrder = async () => {
    if (!program || !wallet.publicKey) return;

    const orderPubkey = new PublicKey(orderAddress);

    await program.methods
      .acceptOrder()
      .accounts({
        order: orderPubkey,
        courier: wallet.publicKey,
      })
      .rpc();
  };

  const completeOrder = async () => {
    if (!program || !wallet.publicKey) return;

    const orderPubkey = new PublicKey(orderAddress);

    await program.methods
      .completeOrder()
      .accounts({
        order: orderPubkey,
        courier: wallet.publicKey,
      })
      .rpc();
  };

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
    </div>
  );
}
