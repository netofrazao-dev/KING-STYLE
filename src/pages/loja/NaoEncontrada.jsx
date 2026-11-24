import { Link } from "react-router-dom";

export default function NaoEncontrada() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="ks-heading text-8xl text-ksgold">404</p>
      <h1 className="ks-heading text-3xl">Página não encontrada</h1>
      <p className="text-sm text-kswhite/60">O endereço pode ter mudado ou o produto saiu de linha.</p>
      <Link to="/" className="btn-gold">Voltar para a loja</Link>
    </div>
  );
}
