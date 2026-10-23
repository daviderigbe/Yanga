import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, discountedPrice, formatNGN, type Product } from "@/lib/api";
import { userApi } from "@/lib/endpoints";
import { ProductGrid } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/$id")({ component: ProfilePage });

interface ProfileUser {
  id: string;
  name: string;
  userName?: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
}

function ProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [u, setU] = useState<ProfileUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<{ data: ProfileUser }>(`/api/users/${id}`)
        .then((r) => setU(r.data))
        .catch(() => {}),
      api<{ data: { items: Product[] } | Product[] }>(`/api/users/${id}/products`)
        .then(async (r) => {
          const initial = extractProducts(r);
          if (user?.id !== id) {
            setProducts(initial);
            return;
          }

          const statuses = ["ACTIVE", "DRAFT", "SOLD"] as const;
          const results = await Promise.all(
            statuses.map((status) =>
              api<{ data: { items: Product[] } | Product[] }>(
                `/api/users/${id}/products?status=${status}&limit=50`,
              )
                .then(extractProducts)
                .catch(() => []),
            ),
          );
          setProducts(uniqueProducts(results.flat().length ? results.flat() : initial));
        })
        .catch(() => setProducts([])),
    ]).finally(() => setLoading(false));
  }, [id, user?.id]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-10 flex flex-col items-center gap-4 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-primary text-3xl font-black text-primary-foreground shadow-pop">
          {u?.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="font-display text-3xl font-black">{u?.name ?? "Seller"}</h1>
          {u?.userName && <p className="text-sm text-muted-foreground">@{u.userName}</p>}
        </div>
        {u?.bio && <p className="max-w-xl text-foreground/80">{u.bio}</p>}
        <div className="flex gap-6 text-sm">
          <span>
            <b>{products.length}</b> <span className="text-muted-foreground">items</span>
          </span>
          {typeof u?.followersCount === "number" && (
            <span>
              <b>{u.followersCount}</b> <span className="text-muted-foreground">followers</span>
            </span>
          )}
        </div>
        {user && user.id !== id && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              className="rounded-full"
              onClick={async () => {
                try {
                  if (following) {
                    await userApi.unfollow(id);
                    setFollowing(false);
                    toast.success("Unfollowed seller");
                  } else {
                    await userApi.follow(id);
                    setFollowing(true);
                    toast.success("Following seller");
                  }
                } catch (error: any) {
                  toast.error(error.message ?? "Could not update follow");
                }
              }}
            >
              {following ? "Following" : "Follow seller"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                navigate({ to: "/messages", search: { userId: id, name: u?.name } as any })
              }
            >
              Message
            </Button>
          </div>
        )}
      </header>

      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-black">
          {user?.id === id ? "My listings" : "Closet"}
        </h2>
        {user?.id === id && (
          <Link to="/sell">
            <Button className="rounded-full">List another item</Button>
          </Link>
        )}
      </div>
      {user?.id === id ? (
        <SellerListings products={products} loading={loading} />
      ) : (
        <ProductGrid products={products} loading={loading} empty="Nothing listed yet." />
      )}
    </div>
  );
}

function SellerListings({ products, loading }: { products: Product[]; loading: boolean }) {
  if (loading) return <ProductGrid products={undefined} loading empty="Loading listings…" />;
  if (!products.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-12 text-center">
        <p className="font-display text-xl font-bold">Nothing listed yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your active, draft, and sold listings will appear here.
        </p>
        <Link
          to="/sell"
          className="mt-5 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
        >
          List an item
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => {
        const image = product.images?.[0]?.url;
        const price = discountedPrice(product.basePrice, product.discountPercent);
        return (
          <div key={product.id}>
            <Link to="/product/$id" params={{ id: product.id }} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                {image ? (
                  <img
                    src={image}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No image
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {product.status}
                </span>
              </div>
            </Link>
            <div className="mt-3 space-y-2">
              <div>
                <p className="font-display text-base font-semibold">{formatNGN(price)}</p>
                <p className="truncate text-sm text-foreground/80">{product.title}</p>
              </div>
              <Link to="/product/$id/edit" params={{ id: product.id }}>
                <Button variant="outline" size="sm" className="w-full rounded-full">
                  Edit listing
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function extractProducts(response: any): Product[] {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  return data?.items ?? data?.products ?? [];
}

function uniqueProducts(products: Product[]) {
  return [...new Map(products.map((product) => [product.id, product])).values()];
}
