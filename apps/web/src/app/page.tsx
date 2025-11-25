export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">ArcSilence</p>
        <h1>Arcium Dark Pool on Solana</h1>
        <p className="lede">
          Connect wallet and place private orders (coming soon).
        </p>
        <p className="body">
          Orderflow and matching will run inside Arcium&apos;s encrypted compute.
          Settlement happens on Solana via settle_batch instructions.
        </p>
      </section>
    </main>
  );
}
