import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, discountedPrice, formatNGN, type Product } from "@/lib/api";
import { cartApi, productApi } from "@/lib/endpoints";
import { Heart, ShoppingBag, Shield, Truck, MessageCircle } from "lucide-react";
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
  const [more, setMore] = useState<Product[]>([]);

  useEffect(() => {
    setLoading(true);
    api<{ data: Product }>(`/api/products/${id}`)
      .then((r) => {
        setProduct(r.data);
        setLiked(!!r.data.isLiked);
        setActiveImg(0);
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
    try {
      await cartApi.add({ productId: id, quantity: 1 });
      notifyCartChanged();
      toast.success("Added to cart");
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

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">Loading…</div>
    );
  if (!product)
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center">Product not found.</div>;

  const price = discountedPrice(product.basePrice, product.discountPercent);

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

          <div className="flex gap-3 pt-2">
            <Button
              onClick={addToCart}
              className="h-12 flex-1 rounded-full text-base font-bold shadow-pop"
            >
              <ShoppingBag className="mr-2 h-5 w-5" /> Add to cart
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

          {/* Seller */}
          <Link
            to="/profile/$id"
            params={{ id: product.seller.id }}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-4 transition hover:border-primary"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 font-bold text-primary">
              {product.seller.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{product.seller.name}</p>
              <p className="text-xs text-muted-foreground">View seller's closet →</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full">
              <MessageCircle className="mr-1 h-4 w-4" /> Message
            </Button>
          </Link>

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
