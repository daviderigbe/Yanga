import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Heart,
  Search,
  ShoppingBag,
  Plus,
  User as UserIcon,
  LogOut,
  Menu,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { unwrapItems } from "@/lib/api";
import { cartApi } from "@/lib/endpoints";
import { CART_CHANGED_EVENT } from "@/lib/cart-events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) {
      setCartCount(0);
      return;
    }

    const loadCartCount = () => {
      cartApi
        .get()
        .then((response) => {
          const items = unwrapItems<{ quantity?: number }>(response as any);
          setCartCount(items.reduce((total, item) => total + (item.quantity ?? 1), 0));
        })
        .catch(() => setCartCount(0));
    };

    loadCartCount();
    window.addEventListener(CART_CHANGED_EVENT, loadCartCount);
    return () => window.removeEventListener(CART_CHANGED_EVENT, loadCartCount);
  }, [user]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q } as any });
  };

  const NavLink = ({ to, children, params }: any) => (
    <Link
      to={to}
      params={params}
      className="text-sm font-medium text-foreground/80 transition hover:text-primary"
      activeProps={{ className: "text-primary" }}
    >
      {children}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:gap-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary font-display text-lg font-black text-primary-foreground shadow-soft">
            A
          </div>
          <span className="hidden font-display text-lg font-extrabold tracking-tight sm:block">
            Afra<span className="text-primary">B</span>
          </span>
        </Link>

        <form onSubmit={submit} className="relative ml-2 hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search styles, brands, sellers…"
            className="h-11 w-full rounded-full border border-input bg-secondary/60 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-background"
          />
        </form>

        <nav className="hidden items-center gap-5 lg:flex">
          <NavLink to="/search">Shop</NavLink>
          <Link
            to="/search"
            search={{ gender: "WOMEN" } as any}
            className="text-sm font-medium text-foreground/80 hover:text-primary"
          >
            Women
          </Link>
          <Link
            to="/search"
            search={{ gender: "MEN" } as any}
            className="text-sm font-medium text-foreground/80 hover:text-primary"
          >
            Men
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link to="/sell" className="hidden md:inline-flex">
            <Button size="sm" className="gap-1.5 rounded-full font-semibold shadow-soft">
              <Plus className="h-4 w-4" /> Sell
            </Button>
          </Link>
          <Link
            to="/likes"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
            aria-label="Likes"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-black leading-none text-destructive-foreground ring-2 ring-background">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/account" })}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Account workbench
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/profile/$id", params: { id: user.id } })}
                >
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/likes" })}>
                  <Heart className="mr-2 h-4 w-4" /> Likes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/sell" })}>
                  <Plus className="mr-2 h-4 w-4" /> Sell an item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="ml-1">
              <Button variant="outline" size="sm" className="rounded-full">
                Log in
              </Button>
            </Link>
          )}
          <button
            onClick={() => setOpenMenu((v) => !v)}
            className="ml-1 grid h-10 w-10 place-items-center rounded-full hover:bg-secondary lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile search + menu */}
      <div className="border-t border-border/60 bg-background/85 px-4 py-2 md:hidden">
        <form onSubmit={submit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-10 w-full rounded-full border border-input bg-secondary/60 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-background"
          />
        </form>
      </div>

      {openMenu && (
        <div className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <div className="flex flex-wrap gap-3">
            <Link
              to="/search"
              onClick={() => setOpenMenu(false)}
              className="rounded-full bg-secondary px-3 py-1.5 text-sm"
            >
              Shop all
            </Link>
            <Link
              to="/search"
              search={{ gender: "WOMEN" } as any}
              onClick={() => setOpenMenu(false)}
              className="rounded-full bg-secondary px-3 py-1.5 text-sm"
            >
              Women
            </Link>
            <Link
              to="/search"
              search={{ gender: "MEN" } as any}
              onClick={() => setOpenMenu(false)}
              className="rounded-full bg-secondary px-3 py-1.5 text-sm"
            >
              Men
            </Link>
            <Link
              to="/sell"
              onClick={() => setOpenMenu(false)}
              className="rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              + Sell
            </Link>
            {user && (
              <Link
                to="/account"
                onClick={() => setOpenMenu(false)}
                className="rounded-full bg-secondary px-3 py-1.5 text-sm"
              >
                Account
              </Link>
            )}
          </div>
        </div>
      )}
      <span className="hidden">{path}</span>
    </header>
  );
}
