import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-auto pt-12 pb-2">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Remaindr is a planning tool, not a broker, advisor, or exchange. Not financial, tax, or legal advice.
      </p>
      <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Link to="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
          Terms
        </Link>
        <Link to="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
          Privacy
        </Link>
        <Link to="/contact" className="underline-offset-4 hover:text-foreground hover:underline">
          Contact
        </Link>
      </nav>
    </footer>
  );
}
