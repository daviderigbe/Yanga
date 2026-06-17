import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, discountedPrice, formatNGN, type Product } from "@/lib/api";
import { cartApi, productApi } from "@/lib/endpoints";
import { Heart, ShoppingBag, Shield, Truck, MessageCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ProductGrid } from "@/components/ProductCard";
import { notifyCartChanged } from "@/lib/cart-events";

export const Route = createFileRoute("/product/$id")({ component: ProductPage });

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [liked, setLiked] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [more, setMore] = useState<Product[]>([]);

  useEffect(() => {
    setLoading(true);
    api<{ data: Product }>(`/api/products/${id}`)
      .then((r) => {
        setProduct(r.data);
        setLiked(!!r.data.isLiked);
        setActiveImg(0);
        setQuantity(isProductSoldOut(r.data) ? 0 : 1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
    api<{ data: { items: Product[] } | Product[] }>("/api/products/recommended?limit=10")
      .then((r) =>
        setMore((Array.isArray((r as any).data) ? (r as any).data : (r as any).data?.items) ?? []),
      )
      .catch(() => {});
  }, [id]);

  const addToCart = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (isProductSoldOut(product)) {
      toast.error("This product is out of stock");
      return;
    }
    try {
      await cartApi.add({ productId: id, quantity });
      notifyCartChanged();
      toast.success(`${quantity} item${quantity > 1 ? "s" : ""} added to cart`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    try {
      if (nextLiked) await productApi.like(id);
      else await productApi.unlike(id);
    } catch (error: any) {
      setLiked((v) => !v);
      toast.error(error.message ?? "Could not update like");
    }
  };

  const messageSeller = () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (product?.seller.id === user.id) {
      toast("This is your listing");
      return;
    }
    navigate({
      to: "/messages",
      search: {
        userId: product?.seller.id,
        productId: product?.id,
        name: product?.seller.name,
      } as any,
    });
  };

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">Loading…</div>
    );
  if (!product)
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center">Product not found.</div>;

  const price = discountedPrice(product.basePrice, product.discountPercent);
  const stock = stockCount(product);
  const soldOut = isProductSoldOut(product);
  const maxQuantity = stock ?? 10;
  const lowStock = !soldOut && stock !== undefined && stock <= 2;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
            {product.images?.[activeImg] && (
              <img
                src={product.images[activeImg].url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.images.map((im, i) => (
                <button
                  key={im.id}
                  onClick={() => setActiveImg(i)}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 ${i === activeImg ? "border-primary" : "border-transparent"}`}
                >
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {product.brand?.name ?? product.categories?.[0]?.category.name ?? "Afra B"}
            </p>
            <h1 className="font-display text-3xl font-black md:text-4xl">{product.title}</h1>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-black text-primary">
              {formatNGN(price)}
            </span>
            {!!product.discountPercent && (
              <>
                <span className="text-muted-foreground line-through">
                  {formatNGN(product.basePrice)}
                </span>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                  -{product.discountPercent}%
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {product.size && (
              <span className="rounded-full bg-secondary px-3 py-1">Size {product.size}</span>
            )}
            {product.condition && (
              <span className="rounded-full bg-secondary px-3 py-1">
                {product.condition.replace("_", " ")}
              </span>
            )}
            {product.color && (
              <span className="rounded-full bg-secondary px-3 py-1">{product.color}</span>
            )}
            {product.gender && (
              <span className="rounded-full bg-secondary px-3 py-1">{product.gender}</span>
            )}
          </div>

          <p className="text-sm text-foreground/80">{product.description}</p>

          {soldOut ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
              This product is sold out.
            </div>
          ) : lowStock ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
              Only {stock} left in stock.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <div className="inline-flex h-12 items-center justify-between rounded-full border border-input bg-background">
              <button
                onClick={() => setQuantity((value) => Math.max(soldOut ? 0 : 1, value - 1))}
                disabled={soldOut || quantity <= 1}
                className="grid h-12 w-12 place-items-center rounded-full hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={soldOut || quantity >= maxQuantity}
                className="grid h-12 w-12 place-items-center rounded-full hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={addToCart}
              disabled={soldOut}
              className="h-12 flex-1 rounded-full text-base font-bold shadow-pop"
            >
              <ShoppingBag className="mr-2 h-5 w-5" /> {soldOut ? "Sold out" : "Add to cart"}
            </Button>
            <Button
              onClick={toggleLike}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
            >
              <Heart className={liked ? "fill-destructive text-destructive" : ""} />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-4">
            <Link
              to="/profile/$id"
              params={{ id: product.seller.id }}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                {product.seller.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{product.seller.name}</p>
                <p className="text-xs text-muted-foreground">View seller's closet</p>
              </div>
            </Link>
            <Button variant="outline" size="sm" className="rounded-full" onClick={messageSeller}>
              <MessageCircle className="mr-1 h-4 w-4" /> Message
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3">
              <Shield className="h-4 w-4 text-primary" /> Buyer protection
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3">
              <Truck className="h-4 w-4 text-primary" /> Naija delivery
            </div>
          </div>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="mb-6 font-display text-2xl font-black">You might also like</h2>
        <ProductGrid products={more} />
      </section>
    </div>
  );
}

function stockCount(product: Product | null) {
  const stock = product?.quantity ?? (product as any)?.stock ?? (product as any)?.availableQuantity;
  return typeof stock === "number" ? stock : undefined;
}

function isProductSoldOut(product: Product | null) {
  const stock = stockCount(product);
  return product?.status === "SOLD" || product?.isAvailable === false || stock === 0;
}
