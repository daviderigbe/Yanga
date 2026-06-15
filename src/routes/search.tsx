import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { ProductGrid } from "@/components/ProductCard";
import { Filter, X } from "lucide-react";

type Search = {
  q?: string;
  gender?: string;
  condition?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
};

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: (s.q as string) || undefined,
    gender: (s.gender as string) || undefined,
    condition: (s.condition as string) || undefined,
    categoryId: (s.categoryId as string) || undefined,
    minPrice: (s.minPrice as string) || undefined,
    maxPrice: (s.maxPrice as string) || undefined,
    sortBy: (s.sortBy as string) || undefined,
  }),
  component: SearchPage,
});

const CONDITIONS = ["NEW", "LIKE_NEW", "OPEN_BOX", "LIGHTLY_USED", "FAIRLY_USED", "HEAVILY_USED"];
const GENDERS = ["WOMEN", "MEN", "UNISEX"];
const SORTS = [
  { v: "createdAt", l: "Newest" },
  { v: "price_asc", l: "Price: low to high" },
  { v: "price_desc", l: "Price: high to low" },
];

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.q) params.set("search", search.q);
    if (search.gender) params.set("gender", search.gender);
    if (search.condition) params.set("condition", search.condition);
    if (search.categoryId) params.set("categoryId", search.categoryId);
    if (search.minPrice) params.set("minPrice", search.minPrice);
    if (search.maxPrice) params.set("maxPrice", search.maxPrice);
    if (search.sortBy) {
      if (search.sortBy === "price_asc") {
        params.set("sortBy", "basePrice");
        params.set("sortOrder", "asc");
      } else if (search.sortBy === "price_desc") {
        params.set("sortBy", "basePrice");
        params.set("sortOrder", "desc");
      } else params.set("sortBy", search.sortBy);
    }
    params.set("limit", "40");
    api<{ data: { items: Product[] } }>(`/api/products?${params.toString()}`)
      .then((r) => setItems(r.data?.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search]);

  const update = (patch: Partial<Search>) =>
    navigate({ to: "/search", search: { ...search, ...patch } as any });
  const clear = () => navigate({ to: "/search", search: {} as any });

  const Filters = (
    <div className="space-y-6">
      <Group title="Sort">
        <select
          value={search.sortBy ?? ""}
          onChange={(e) => update({ sortBy: e.target.value || undefined })}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Recommended</option>
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
      </Group>
      <Group title="Gender">
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Chip
              key={g}
              active={search.gender === g}
              onClick={() => update({ gender: search.gender === g ? undefined : g })}
            >
              {g}
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Condition">
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <Chip
              key={c}
              active={search.condition === c}
              onClick={() => update({ condition: search.condition === c ? undefined : c })}
            >
              {c.replace("_", " ")}
            </Chip>
          ))}
        </div>
      </Group>
      <Group title="Price (₦)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={search.minPrice ?? ""}
            onBlur={(e) => update({ minPrice: e.target.value || undefined })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={search.maxPrice ?? ""}
            onBlur={(e) => update({ maxPrice: e.target.value || undefined })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </Group>
      <button onClick={clear} className="text-sm font-semibold text-primary hover:underline">
        Clear all filters
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black md:text-4xl">
            {search.q ? <>Results for "{search.q}"</> : "Shop everything"}
          </h1>
          <p className="text-sm text-muted-foreground">{items?.length ?? 0} items</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-semibold lg:hidden"
        >
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">{Filters}</aside>
        <div>
          <ProductGrid products={items} loading={loading} empty="No items match your filters." />
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-full overflow-y-auto bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-black">Filters</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {Filters}
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}
function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-primary"}`}
    >
      {children}
    </button>
  );
}
