import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, formatNGN, type Product } from "@/lib/api";

const POPULAR_TERMS = [
  "vintage dress",
  "denim jacket",
  "sneakers",
  "streetwear",
  "designer bags",
  "heels",
  "jeans",
  "workwear",
  "y2k",
  "men shoes",
  "women tops",
  "ankara",
];

export function SearchSuggestBox({
  compact,
  onSearch,
}: {
  compact?: boolean;
  onSearch?: () => void;
}) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const term = q.trim();
    setActiveIndex(-1);
    if (term.length < 2) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ search: term, limit: "6" });
      api<{ data: { items: Product[] } }>(`/api/products?${params.toString()}`)
        .then((response) => setProducts(response.data?.items ?? []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [q]);

  const searchTerms = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return POPULAR_TERMS.slice(0, 6);

    const fromProducts = products.flatMap((product) => [
      product.title,
      product.brand?.name,
      product.categories?.[0]?.category.name,
      product.color,
      product.size,
    ]);

    const terms = [q.trim(), ...POPULAR_TERMS, ...fromProducts]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter((value, index, values) => {
        const normalized = value.toLowerCase();
        return (
          normalized.includes(term) &&
          values.findIndex((item) => item.toLowerCase() === normalized) === index
        );
      });

    return terms.slice(0, 6);
  }, [products, q]);

  const actions = [
    ...searchTerms.map((term) => ({ type: "term" as const, label: term })),
    ...products.map((product) => ({ type: "product" as const, product, label: product.title })),
  ];

  const runSearch = (term = q.trim()) => {
    if (!term) return;
    setOpen(false);
    onSearch?.();
    navigate({ to: "/search", search: { q: term } as any });
  };

  const openProduct = (product: Product) => {
    setOpen(false);
    onSearch?.();
    navigate({ to: "/product/$id", params: { id: product.id } });
  };

  const selectAction = (index: number) => {
    const action = actions[index];
    if (!action) return runSearch();
    if (action.type === "product") openProduct(action.product);
    else runSearch(action.label);
  };

  return (
    <form
      ref={rootRef}
      onSubmit={(event) => {
        event.preventDefault();
        if (activeIndex >= 0) selectAction(activeIndex);
        else runSearch();
      }}
      className="relative w-full"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => Math.min(actions.length - 1, index + 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(-1, index - 1));
          }
          if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        placeholder={compact ? "Search…" : "Search styles, brands, sellers…"}
        className={`${compact ? "h-10" : "h-11"} w-full rounded-full border border-input bg-secondary/60 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-background`}
      />

      {open && (q.trim() || searchTerms.length > 0) && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {searchTerms.length > 0 && (
              <div className="py-1">
                {searchTerms.map((term, index) => (
                  <button
                    type="button"
                    key={term}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => runSearch(term)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                      activeIndex === index ? "bg-secondary" : "hover:bg-secondary"
                    }`}
                  >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{term}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {q.trim().length >= 2 && (
              <div className="border-t border-border py-2">
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Matching items
                </p>
                {loading ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>
                ) : products.length ? (
                  products.map((product, index) => {
                    const actionIndex = searchTerms.length + index;
                    const image = product.images?.[0]?.url;
                    return (
                      <button
                        type="button"
                        key={product.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => openProduct(product)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                          activeIndex === actionIndex ? "bg-secondary" : "hover:bg-secondary"
                        }`}
                      >
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                          {image && (
                            <img src={image} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{product.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {product.brand?.name ??
                              product.categories?.[0]?.category.name ??
                              "Afra B"}{" "}
                            · {formatNGN(product.basePrice)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-3 text-sm text-muted-foreground">No matching items yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
