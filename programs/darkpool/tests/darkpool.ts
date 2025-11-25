import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Darkpool } from "../target/types/darkpool";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("darkpool", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Darkpool as Program<Darkpool>;
  const admin = provider.wallet as anchor.Wallet;

  // Test accounts
  let baseMint: PublicKey;
  let quoteMint: PublicKey;
  let market: PublicKey;
  let user1: Keypair;
  let user2: Keypair;
  let user1BaseAccount: PublicKey;
  let user1QuoteAccount: PublicKey;
  let user2BaseAccount: PublicKey;
  let user2QuoteAccount: PublicKey;

  before(async () => {
    // Create test mints
    baseMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      9
    );
    quoteMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      9
    );

    // Create test users
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    // Airdrop SOL to users
    const airdrop1 = await provider.connection.requestAirdrop(
      user1.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    const airdrop2 = await provider.connection.requestAirdrop(
      user2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdrop1);
    await provider.connection.confirmTransaction(airdrop2);

    // Create token accounts for users
    user1BaseAccount = await createAccount(
      provider.connection,
      user1,
      baseMint,
      user1.publicKey
    );
    user1QuoteAccount = await createAccount(
      provider.connection,
      user1,
      quoteMint,
      user1.publicKey
    );
    user2BaseAccount = await createAccount(
      provider.connection,
      user2,
      baseMint,
      user2.publicKey
    );
    user2QuoteAccount = await createAccount(
      provider.connection,
      user2,
      quoteMint,
      user2.publicKey
    );

    // Mint tokens to users
    await mintTo(
      provider.connection,
      admin.payer,
      baseMint,
      user1BaseAccount,
      admin.publicKey,
      1000 * 10 ** 9 // 1000 tokens
    );
    await mintTo(
      provider.connection,
      admin.payer,
      quoteMint,
      user1QuoteAccount,
      admin.publicKey,
      1000 * 10 ** 9 // 1000 tokens
    );
    await mintTo(
      provider.connection,
      admin.payer,
      baseMint,
      user2BaseAccount,
      admin.publicKey,
      1000 * 10 ** 9 // 1000 tokens
    );
    await mintTo(
      provider.connection,
      admin.payer,
      quoteMint,
      user2QuoteAccount,
      admin.publicKey,
      1000 * 10 ** 9 // 1000 tokens
    );
  });

  it("Initializes config", async () => {
    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await program.methods
      .initializeConfig(admin.publicKey)
      .accounts({
        config,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const configAccount = await program.account.config.fetch(config);
    expect(configAccount.admin.toString()).to.equal(
      admin.publicKey.toString()
    );
  });

  it("Creates a market", async () => {
    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );
    market = marketPda;

    const [baseVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        Buffer.from("base"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    const [quoteVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        Buffer.from("quote"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await program.methods
      .createMarket(baseMint, quoteMint)
      .accounts({
        config,
        market: marketPda,
        admin: admin.publicKey,
        baseMint,
        quoteMint,
        baseVault,
        quoteVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const marketAccount = await program.account.market.fetch(marketPda);
    expect(marketAccount.baseMint.toString()).to.equal(baseMint.toString());
    expect(marketAccount.quoteMint.toString()).to.equal(quoteMint.toString());
  });

  it("Places and cancels an order", async () => {
    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    const [baseVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        Buffer.from("base"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    const [quoteVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        Buffer.from("quote"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    const nonce = new anchor.BN(1);
    const [orderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        marketPda.toBuffer(),
        user1.publicKey.toBuffer(),
        nonce.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const amountIn = new anchor.BN(100 * 10 ** 9); // 100 tokens
    const minAmountOut = new anchor.BN(95 * 10 ** 9); // 95 tokens

    // Get initial balances
    const initialQuoteBalance = await getAccount(
      provider.connection,
      user1QuoteAccount
    );
    const initialVaultBalance = await getAccount(
      provider.connection,
      quoteVault
    ).catch(() => ({ amount: BigInt(0) }));

    // Place a bid order (buying base with quote)
    await program.methods
      .placeOrder(
        { bid: {} },
        amountIn,
        minAmountOut,
        nonce
      )
      .accounts({
        order: orderPda,
        owner: user1.publicKey,
        market: marketPda,
        userBaseAccount: user1BaseAccount,
        userQuoteAccount: user1QuoteAccount,
        baseVault,
        quoteVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Check order was created
    const orderAccount = await program.account.order.fetch(orderPda);
    expect(orderAccount.owner.toString()).to.equal(user1.publicKey.toString());
    expect(orderAccount.side.bid).to.be.true;
    expect(orderAccount.amountIn.toNumber()).to.equal(amountIn.toNumber());
    expect(orderAccount.status.open).to.be.true;

    // Check tokens were transferred to vault
    const vaultBalanceAfter = await getAccount(provider.connection, quoteVault);
    expect(Number(vaultBalanceAfter.amount)).to.equal(
      Number(initialVaultBalance.amount) + amountIn.toNumber()
    );

    // Cancel the order
    await program.methods
      .cancelOrder()
      .accounts({
        order: orderPda,
        owner: user1.publicKey,
        market: marketPda,
        userBaseAccount: user1BaseAccount,
        userQuoteAccount: user1QuoteAccount,
        baseVault,
        quoteVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();

    // Check order was cancelled
    const cancelledOrder = await program.account.order.fetch(orderPda);
    expect(cancelledOrder.status.cancelled).to.be.true;

    // Check tokens were returned
    const finalVaultBalance = await getAccount(provider.connection, quoteVault);
    expect(Number(finalVaultBalance.amount)).to.equal(
      Number(initialVaultBalance.amount)
    );
  });

  it("Settles a batch of two orders", async () => {
    const [config] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    const [baseVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        Buffer.from("base"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    const [quoteVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        Buffer.from("quote"),
        baseMint.toBuffer(),
        quoteMint.toBuffer(),
      ],
      program.programId
    );

    // Place bid order (user1 buying base with quote)
    const bidNonce = new anchor.BN(2);
    const [bidOrderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        marketPda.toBuffer(),
        user1.publicKey.toBuffer(),
        bidNonce.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const bidAmountIn = new anchor.BN(100 * 10 ** 9); // 100 quote tokens
    const bidMinAmountOut = new anchor.BN(90 * 10 ** 9); // 90 base tokens

    await program.methods
      .placeOrder({ bid: {} }, bidAmountIn, bidMinAmountOut, bidNonce)
      .accounts({
        order: bidOrderPda,
        owner: user1.publicKey,
        market: marketPda,
        userBaseAccount: user1BaseAccount,
        userQuoteAccount: user1QuoteAccount,
        baseVault,
        quoteVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Place ask order (user2 selling base for quote)
    const askNonce = new anchor.BN(1);
    const [askOrderPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order"),
        marketPda.toBuffer(),
        user2.publicKey.toBuffer(),
        askNonce.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const askAmountIn = new anchor.BN(90 * 10 ** 9); // 90 base tokens
    const askMinAmountOut = new anchor.BN(95 * 10 ** 9); // 95 quote tokens

    await program.methods
      .placeOrder({ ask: {} }, askAmountIn, askMinAmountOut, askNonce)
      .accounts({
        order: askOrderPda,
        owner: user2.publicKey,
        market: marketPda,
        userBaseAccount: user2BaseAccount,
        userQuoteAccount: user2QuoteAccount,
        baseVault,
        quoteVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Get initial balances
    const initialUser1Base = await getAccount(
      provider.connection,
      user1BaseAccount
    );
    const initialUser2Quote = await getAccount(
      provider.connection,
      user2QuoteAccount
    );
    const initialBaseVault = await getAccount(provider.connection, baseVault);
    const initialQuoteVault = await getAccount(provider.connection, quoteVault);

    // Create fill
    // bidOrder is Bid: buying base with quote, put in 100 quote
    // askOrder is Ask: selling base for quote, put in 90 base
    // When matched:
    // - bidOrder.owner (user1) receives base (90 base from ask)
    // - askOrder.owner (user2) receives quote (100 quote from bid)
    // So for bidOrder: amountIn = 100 (quote it put in), amountOut = 90 (base it receives)
    // For askOrder: amountIn = 90 (base it put in), amountOut = 100 (quote it receives)
    const fill = {
      order: bidOrderPda,
      counterparty: askOrderPda,
      amountIn: bidAmountIn, // 100 quote tokens (from bid order)
      amountOut: askAmountIn, // 90 base tokens (from ask order)
    };

    // Settle batch
    // Note: In a real implementation, we'd need to pass the order accounts and owner token accounts
    // as remaining accounts. For this test, we'll need to structure it properly.
    // This is a simplified version - the actual implementation would need proper account ordering.
    await program.methods
      .settleBatch([fill], Buffer.from("arcium-signature"))
      .accounts({
        config,
        admin: admin.publicKey,
        market: marketPda,
        baseVault,
        quoteVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: bidOrderPda, isSigner: false, isWritable: true },
        { pubkey: askOrderPda, isSigner: false, isWritable: true },
        { pubkey: user1BaseAccount, isSigner: false, isWritable: true },
        { pubkey: user1QuoteAccount, isSigner: false, isWritable: true },
        { pubkey: user2BaseAccount, isSigner: false, isWritable: true },
        { pubkey: user2QuoteAccount, isSigner: false, isWritable: true },
      ])
      .rpc();

    // Check orders were updated
    const bidOrder = await program.account.order.fetch(bidOrderPda);
    const askOrder = await program.account.order.fetch(askOrderPda);

    expect(bidOrder.filledAmountIn.toNumber()).to.equal(bidAmountIn.toNumber());
    expect(askOrder.filledAmountIn.toNumber()).to.equal(askAmountIn.toNumber());
    expect(bidOrder.status.filled || bidOrder.status.partiallyFilled).to.be.true;
    expect(askOrder.status.filled || askOrder.status.partiallyFilled).to.be.true;

    // Check vault balances decreased
    const finalBaseVault = await getAccount(provider.connection, baseVault);
    const finalQuoteVault = await getAccount(provider.connection, quoteVault);

    expect(Number(finalBaseVault.amount)).to.equal(
      Number(initialBaseVault.amount) - askAmountIn.toNumber()
    );
    expect(Number(finalQuoteVault.amount)).to.equal(
      Number(initialQuoteVault.amount) - bidAmountIn.toNumber()
    );

    // Check user balances increased
    const finalUser1Base = await getAccount(provider.connection, user1BaseAccount);
    const finalUser2Quote = await getAccount(provider.connection, user2QuoteAccount);

    expect(Number(finalUser1Base.amount)).to.equal(
      Number(initialUser1Base.amount) + askAmountIn.toNumber()
    );
    expect(Number(finalUser2Quote.amount)).to.equal(
      Number(initialUser2Quote.amount) + bidAmountIn.toNumber()
    );
  });
});

