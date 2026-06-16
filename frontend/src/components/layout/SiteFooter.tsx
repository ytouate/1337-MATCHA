import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1550px] flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Matcha</p>
        <nav aria-label="Footer">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </nav>
      </div>
    </footer>
  );
}
