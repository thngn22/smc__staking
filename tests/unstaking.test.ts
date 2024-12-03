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
  const fromKp = new web3.Keypair();
  const poolAccount = web3.Keypair.generate();
  const stock_reward = web3.Keypair.generate();

  it("Is withdraw!", async () => {
    // Initialize user pool account
    await program.methods
      .initializePoolAccount()
      .accounts({
        userPoolAccount: poolAccount.publicKey,
        owner: payer.publicKey,
      })
      .signers([poolAccount, payer])
      .rpc();

    await program.methods
      .initializePoolAccount()
      .accounts({
        userPoolAccount: stock_reward.publicKey,
        owner: payer.publicKey,
      })
      .signers([stock_reward, payer])
      .rpc();

    /**
     * Logic mintToken
     * 1. mint the token to staking
     * 2. create 2 ata for user and pool
     * 3. MintTo user
     * 4. Add mintToken to whitelist
     * 5. transfer mintToken from userAta to poolAta with staking function
     */
    //Step 1: mint the token to staking
    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      9
    );
    console.log("mint :>> ", mint.toString());

    //Step 2: create 2 ata for user and pool
    const userAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      payer.publicKey
    );
    const poolAta = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      fromKp.publicKey
    );

    //Step 3: MintTo user
    const mintAmount = 1000; // Mint 1000 tokens to user
    await mintTo(
      provider.connection,
      payer,
      mint,
      userAta,
      payer.publicKey,
      mintAmount
    );
    console.log("mintAmount :>> ", mintAmount);

    //Step 4: Add mintToken to whitelist

    //Step 5: Staking mintToken into the pool
    const stakingAmount = new anchor.BN(200);
    await program.methods
      .staking(stakingAmount)
      .accounts({
        userAta,
        poolAta,
        userPoolAccount: poolAccount.publicKey,
        userAuthority: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    // Assert pool account balance after Staking
    let poolTokenBalance = await provider.connection.getTokenAccountBalance(
      poolAta
    );
    assert.strictEqual(
      poolTokenBalance.value.uiAmount,
      stakingAmount.toNumber() / 1e9,
      "The pool token account should reflect the Stakinged amount"
    );
    console.log("poolTokenBalance before with draw :>> ", poolTokenBalance);

    await program.methods
      .staking(stakingAmount)
      .accounts({
        userAta,
        poolAta,
        userPoolAccount: poolAccount.publicKey,
        userAuthority: payer.publicKey,
      })
      .signers([payer])
      .rpc();

    // Assert pool account balance after Staking
    let userTokenBalance = await provider.connection.getTokenAccountBalance(
      userAta
    );
    console.log("userTokenBalance before with draw :>> ", userTokenBalance);

    /**
     * Logic rewardToken
     * 1. mint the token to unstaking
     * 2. create 2 ata for user and pool
     * 3. MintTo pool
     * 4. Add rewardToken to whitelist
     * 5. transfer rewardToken from poolAta to userAta with unstaking function
     */

    //Step 1: mint the token to unstaking
    const tokenReward = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      9
    );
    console.log("tokenReward :>> ", tokenReward.toString());

    //Step 2: create 2 ata for user and pool
    const poolATA_reward = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenReward,
      fromKp.publicKey
    );
    const userATA_reward = await createAssociatedTokenAccount(
      provider.connection,
      payer,
      tokenReward,
      payer.publicKey
    );

    //Step 3: MintTo pool
    const tokenRewardAmount = 1000; // Mint 1000 tokens to user
    await mintTo(
      provider.connection,
      payer,
      tokenReward,
      poolATA_reward,
      payer.publicKey,
      tokenRewardAmount
    );
    console.log("tokenRewardAmount :>> ", tokenRewardAmount);

    let balanceUserReward = await provider.connection.getTokenAccountBalance(
      userATA_reward
    );
    let balancePoolReward = await provider.connection.getTokenAccountBalance(
      poolATA_reward
    );
    console.log("balance userReward before unstaking :>> ", balanceUserReward);
    console.log("balance poolReward before unstaking :>> ", balancePoolReward);

    //Step 4: Add rewardToken to whitelist

    //Step 5: transfer rewardToken from poolAta to userAta with unstaking function
    const withdrawAmount = new anchor.BN(300);
    await program.methods
      .unstaking(withdrawAmount)
      .accounts({
        userAta: userATA_reward,
        poolAta: poolATA_reward,
        userPoolAccount: stock_reward.publicKey,
        poolAuthority: fromKp.publicKey,
      })
      .signers([fromKp]) // The pool authority signs the withdraw
      .rpc();

    balanceUserReward = await provider.connection.getTokenAccountBalance(
      userATA_reward
    );
    balancePoolReward = await provider.connection.getTokenAccountBalance(
      poolATA_reward
    );
    console.log("balance userReward after unstaking :>> ", balanceUserReward);
    console.log("balance poolReward after unstaking :>> ", balancePoolReward);

    // /**
    //  * Login withdraw
    //  */
    // // Withdraw from the pool // Withdraw 300 tokens
    // await program.methods
    //   .withdraw(withdrawAmount)
    //   .accounts({
    //     userAta,
    //     poolAta,
    //     userPoolAccount: poolAccount.publicKey,
    //     pool: pool.publicKey,
    //     poolAuthority: fromKp.publicKey,
    //   })
    //   .signers([fromKp]) // The pool authority signs the withdraw
    //   .rpc();

    // // Assert pool account balance after withdrawal
    // poolTokenBalance = await provider.connection.getTokenAccountBalance(
    //   poolAta
    // );
    // assert.strictEqual(
    //   poolTokenBalance.value.uiAmount,
    //   (stakingAmount.toNumber() - withdrawAmount.toNumber()) / 1e9,
    //   "The pool token account should reflect the withdrawn amount"
    // );

    // // Assert user ATA balance after withdrawal
    // userTokenBalance = await provider.connection.getTokenAccountBalance(
    //   userAta
    // );
    // const rewardAmount = withdrawAmount.toNumber() / 100; // 1% reward
    // assert.strictEqual(
    //   userTokenBalance.value.uiAmount,
    //   (stakingAmount.toNumber() - withdrawAmount.toNumber() + rewardAmount) /
    //     1e9,
    //   "The user token account should reflect the withdrawn amount and rewards"
    // );

    // console.log(`Reward amount: ${rewardAmount}`);
  });
});
