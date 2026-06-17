import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Recycle, Truck } from "lucide-react";
import { api, type Product } from "@/lib/api";
import { ProductGrid } from "@/components/ProductCard";
import { SearchSuggestBox } from "@/components/SearchSuggestBox";

export const Route = createFileRoute("/")({ component: Index });

function useProducts(path: string) {
  const [data, setData] = useState<Product[] | undefined>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api<{ data: { items: Product[] } | Product[] }>(path)
      .then((r) => {
        if (cancel) return;
        const items = Array.isArray((r as any).data) ? (r as any).data : (r as any).data?.items;
        setData(items ?? []);
      })
      .catch(() => !cancel && setData([]))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [path]);
  return { data, loading };
}

function Index() {
  const trending = useProducts("/api/products/trending?limit=10");
  const newest = useProducts("/api/products/newest?limit=10");
  const onSale = useProducts("/api/products/on-sale?limit=5");

  return (
    <div>
      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="absolute inset-0 bg-grain opacity-50" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Pre‑loved · Original · One‑of‑a‑kind
            </span>
            <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tight text-balance md:text-7xl">
              Africa's closet.
              <br />
              <span className="text-primary">Sold by you.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Hunt vintage finds, drop your fits, and earn from your wardrobe. Afra B is the fashion
              marketplace built for us.
            </p>
            <div className="max-w-xl">
              <SearchSuggestBox />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-pop transition hover:scale-[1.02]"
              >
                Start shopping <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-6 py-3 text-sm font-bold text-foreground transition hover:bg-foreground hover:text-background"
              >
                Sell an item
              </Link>
            </div>
            <div className="flex gap-6 pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Recycle className="h-4 w-4 text-primary" /> 0% waste
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-primary" /> Naija‑wide delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Trusted sellers
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <HeroTile
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600"
                  tag="DRESSES"
                  tall
                />
                <HeroTile
                  src="https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600"
                  tag="JEANS"
                />
              </div>
              <div className="space-y-4 pt-10">
                <HeroTile
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600"
                  tag="TOPS"
                />
                <HeroTile
                  src="https://images.unsplash.com/photo-1605812860427-4024433a70fd?auto=format&fit=crop&w=600"
                  tag="SHOES"
                  tall
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee categories */}
      <section className="border-b border-border bg-primary py-3 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 text-xs font-bold uppercase tracking-[0.25em]">
          <span>★ Vintage</span>
          <span>★ Y2K</span>
          <span>★ Streetwear</span>
          <span>★ Afropunk</span>
          <span>★ Designer</span>
          <span>★ Workwear</span>
          <span>★ Resale</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeader title="🔥 Trending now" sub="What everyone's coppin' this week" />
        <ProductGrid products={trending.data} loading={trending.loading} />
      </section>

      {!!onSale.data?.length && (
        <section className="bg-accent/40">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <SectionHeader title="On sale" sub="Markdowns straight from the seller" />
            <ProductGrid products={onSale.data} loading={onSale.loading} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeader title="Just dropped" sub="Freshly listed in the last 48h" />
        <ProductGrid products={newest.data} loading={newest.loading} />
      </section>

      {/* Sell CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 text-primary-foreground md:p-16">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary-glow/40 blur-3xl" />
          <div className="relative max-w-xl space-y-4">
            <h2 className="font-display text-4xl font-black md:text-5xl">
              Got clothes you don't wear?
            </h2>
            <p className="text-primary-foreground/80">
              List in 60 seconds. Set your price. Get paid when it sells.
            </p>
            <Link
              to="/sell"
              className="inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-bold text-foreground shadow-pop"
            >
              Start selling <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-3xl font-black md:text-4xl">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      <Link
        to="/search"
        className="hidden text-sm font-semibold text-primary hover:underline sm:inline-flex"
      >
        See all →
      </Link>
    </div>
  );
}

function HeroTile({ src, tag, tall }: { src: string; tag: string; tall?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-card ${tall ? "aspect-[3/4]" : "aspect-square"}`}
    >
      <img src={src} alt="" className="h-full w-full object-cover" />
      <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold tracking-wider">
        {tag}
      </span>
    </div>
  );
}
