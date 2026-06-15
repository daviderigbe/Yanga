import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { ProductGrid } from "@/components/ProductCard";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/likes")({ component: LikesPage });

function LikesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setLoading(true);
    api<{ data: { items: Product[] } | Product[] }>(`/api/users/${user.id}/likes`)
      .then((r) =>
        setItems((Array.isArray((r as any).data) ? (r as any).data : (r as any).data?.items) ?? []),
      )
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 font-display text-4xl font-black">Your likes ❤️</h1>
      <ProductGrid
        products={items}
        loading={loading}
        empty="No favourites yet — start tapping hearts!"
      />
    </div>
  );
}
