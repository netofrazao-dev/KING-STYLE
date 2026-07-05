import ProductGallery from "../components/ProductGallery";

export default function Home() {
  return (
    <main>
      <section className="border-b border-ksline bg-ksblack px-4 py-20 text-center">
        <p className="mb-3 text-xs uppercase tracking-widest2 text-ksgold">
          Streetwear premium
        </p>
        <h1 className="ks-heading text-4xl text-kswhite sm:text-6xl">
          VISTA A <span className="text-ksgold">ATITUDE</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-kswhite/70">
          Peças autorais em preto, branco e dourado. Pedido direto pelo WhatsApp,
          sem burocracia.
        </p>
      </section>

      <section className="mx-auto max-w-6xl">
        <ProductGallery />
      </section>
    </main>
  );
}
