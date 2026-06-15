import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
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
        .then((r) =>
          setProducts(
            (Array.isArray((r as any).data) ? (r as any).data : (r as any).data?.items) ?? [],
          ),
        )
        .catch(() => setProducts([])),
    ]).finally(() => setLoading(false));
  }, [id]);

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
              onClick={() => toast("Messaging is available from Account workbench")}
            >
              Message
            </Button>
          </div>
        )}
      </header>

      <h2 className="mb-6 font-display text-2xl font-black">Closet</h2>
      <ProductGrid products={products} loading={loading} empty="Nothing listed yet." />
    </div>
  );
}
