import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Dumacuuthang } from "../target/types/dumacuuthang";

import privateKey from "../key.json";
import * as web3 from "@solana/web3.js";
import { assert } from "chai";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("smc-pool-banking", () => {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);

  const program = anchor.workspace.Dumacuuthang as Program<Dumacuuthang>;
  const payer = web3.Keypair.fromSecretKey(Uint8Array.from(privateKey));
  const toKp = new web3.Keypair();
  const pool = web3.Keypair.generate();
  const poolAccount = web3.Keypair.generate();

  // it("Is stacking!", async () => {
  //   const mint = await createMint(
  //     provider.connection,
  //     payer,
  //     payer.publicKey,
  //     null,
  //     9
  //   );
  //   console.log("Mint Address: ", mint.toString());

  //   const userAta = await createAssociatedTokenAccount(
  //     provider.connection,
  //     payer,
  //     mint,
  //     payer.publicKey
  //   );
  //   console.log("userAta :>> ", userAta);

  //   const poolAta = await createAssociatedTokenAccount(
  //     provider.connection,
  //     payer,
  //     mint,
  //     toKp.publicKey
  //   );
  //   console.log("poolAta :>> ", poolAta);

  //   const mintAmount = 1000;
  //   await mintTo(
  //     provider.connection,
  //     payer,
  //     mint,
  //     userAta,
  //     payer.publicKey,
  //     mintAmount
  //   );
  //   console.log("mintAmount :>> ", mintAmount);

  //   await program.methods
  //     .initializePool()
  //     .accounts({
  //       pool: pool.publicKey,
  //       authority: payer.publicKey,
  //     })
  //     .signers([pool, payer])
  //     .rpc();

  //   await program.methods
  //     .initializePoolAccount()
  //     .accounts({
  //       userPoolAccount: poolAccount.publicKey,
  //       owner: payer.publicKey,
  //     })
  //     .signers([poolAccount, payer])
  //     .rpc();

  //   // Add token to whitelist
  //   await program.methods
  //     .addToken(mint)
  //     .accounts({
  //       pool: pool.publicKey,
  //       authority: payer.publicKey,
  //     })
  //     .signers([payer])
  //     .rpc();

  //   const stackingrAmount = new anchor.BN(500);
  //   await program.methods
  //     .staking(stackingrAmount)
  //     .accounts({
  //       userAta,
  //       poolAta,
  //       userPoolAccount: poolAccount.publicKey,
  //       pool: pool.publicKey,
  //       userAuthority: payer.publicKey,
  //     })
  //     .signers([payer])
  //     .rpc();
  //   console.log("stackingrAmount :>> ", stackingrAmount);

  //   const bankTokenBalance = await provider.connection.getTokenAccountBalance(
  //     poolAta
  //   );
  //   assert.strictEqual(
  //     bankTokenBalance.value.uiAmount,
  //     stackingrAmount.toNumber() / 1e9,
  //     "The pool token account should reflect the staked amount"
  //   );
  // });
});
