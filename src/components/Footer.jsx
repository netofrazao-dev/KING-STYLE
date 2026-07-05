export default function Footer() {
  return (
    <footer className="border-t border-ksline bg-ksblack px-4 py-6 text-center">
      <p className="text-xs text-kswhite/50">
        © {new Date().getFullYear()} King Style. Todos os direitos reservados.
      </p>
      <p className="mt-1 text-xs text-kswhite/50">
        Desenvolvido por{" "}
        <a
          href="https://netofrazao-dev.github.io/Neto-Dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ksgold hover:text-ksgoldlight"
        >
          Neto Dev
        </a>
      </p>
    </footer>
  );
}
