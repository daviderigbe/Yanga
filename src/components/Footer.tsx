import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary font-display text-lg font-black text-primary-foreground">
              A
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Afra<span className="text-primary">B</span>
            </span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Africa's marketplace for second‑life fashion. Buy, sell, repeat.
          </p>
        </div>
        <Col title="Shop">
          <Link to="/search">All items</Link>
          <Link to="/search" search={{ gender: "WOMEN" } as any}>
            Women
          </Link>
          <Link to="/search" search={{ gender: "MEN" } as any}>
            Men
          </Link>
        </Col>
        <Col title="Sell">
          <Link to="/sell">List an item</Link>
          <Link to="/sell">Seller hub</Link>
        </Col>
        <Col title="Help">
          <a href="#">Support</a>
          <a href="#">Trust & safety</a>
          <a href="#">Terms</a>
        </Col>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Afra B. Made in Lagos.
      </div>
    </footer>
  );
}
function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">{title}</h4>
      <div className="flex flex-col gap-2 text-sm text-foreground/80 [&_a:hover]:text-primary">
        {children}
      </div>
    </div>
  );
}
