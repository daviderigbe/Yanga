import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { discountedPrice, formatNGN, type Product } from "@/lib/api";
import { productApi } from "@/lib/endpoints";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!product.isLiked);
  const [busy, setBusy] = useState(false);
  const img = product.images?.[0]?.url;
  const price = discountedPrice(product.basePrice, product.discountPercent);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!user) {
      toast.error("Log in to save products to your likes");
      navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    const nextLiked = !liked;
    setLiked((v) => !v);
    try {
      if (nextLiked) await productApi.like(product.id);
      else await productApi.unlike(product.id);
    } catch (error: any) {
      setLiked((v) => !v);
      toast.error(error.message ?? "Could not update like");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link to="/product/$id" params={{ id: product.id }} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        {img ? (
          <img
            src={img}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        {!!product.discountPercent && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive-foreground">
            -{product.discountPercent}%
          </span>
        )}
        <button
          onClick={toggleLike}
          aria-label={liked ? "Unlike" : "Like"}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/80 backdrop-blur-sm transition hover:scale-110 hover:bg-background"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              liked ? "fill-destructive text-destructive" : "text-foreground",
            )}
          />
        </button>
      </div>
      <div className="mt-3 space-y-0.5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-semibold">{formatNGN(price)}</span>
          {!!product.discountPercent && (
            <span className="text-xs text-muted-foreground line-through">
              {formatNGN(product.basePrice)}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-foreground/80">{product.title}</p>
        <p className="text-xs text-muted-foreground">
          {product.size && <>Size {product.size} · </>}
          {product.condition?.replace("_", " ").toLowerCase()}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  loading,
  empty,
}: {
  products?: Product[];
  loading?: boolean;
  empty?: string;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }
  if (!products?.length)
    return (
      <p className="py-16 text-center text-muted-foreground">{empty ?? "Nothing here yet."}</p>
    );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
