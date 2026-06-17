import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { productApi } from "@/lib/endpoints";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id_/edit")({ component: EditProductPage });

const CONDITIONS = ["NEW", "OPEN_BOX", "LIKE_NEW", "LIGHTLY_USED", "FAIRLY_USED", "HEAVILY_USED"];
const GENDERS = ["WOMEN", "MEN", "UNISEX"];
const STATUSES = ["ACTIVE", "DRAFT", "SOLD"];

function EditProductPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    basePrice: "",
    discountPercent: 0,
    quantity: 1,
    condition: "LIKE_NEW",
    status: "ACTIVE",
    size: "",
    gender: "WOMEN",
    color: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    setLoading(true);
    api<{ data: Product }>(`/api/products/${id}`)
      .then((response) => {
        const nextProduct = response.data;
        setProduct(nextProduct);
        setForm({
          title: nextProduct.title ?? "",
          description: nextProduct.description ?? "",
          basePrice: String(nextProduct.basePrice ?? ""),
          discountPercent: nextProduct.discountPercent ?? 0,
          quantity: (nextProduct as any).quantity ?? 1,
          condition: nextProduct.condition ?? "LIKE_NEW",
          status: nextProduct.status ?? "ACTIVE",
          size: nextProduct.size ?? "",
          gender: nextProduct.gender ?? "WOMEN",
          color: nextProduct.color ?? "",
        });
      })
      .catch(() => {
        toast.error("Could not load listing");
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [authLoading, id, navigate, user]);

  const isOwner = Boolean(user && product?.seller?.id === user.id);

  const update = (key: string, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwner) {
      toast.error("You can only edit your own listings");
      return;
    }
    setSaving(true);
    try {
      await productApi.update(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        basePrice: Number(form.basePrice),
        discountPercent: Number(form.discountPercent),
        quantity: Number(form.quantity),
        condition: form.condition,
        status: form.status,
        size: form.size.trim(),
        gender: form.gender,
        color: form.color.trim(),
      });
      toast.success("Listing updated");
      navigate({ to: "/product/$id", params: { id } });
    } catch (error: any) {
      toast.error(error.message ?? "Could not update listing");
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-muted-foreground">Loading listing…</div>
    );
  }

  if (!product) {
    return <div className="mx-auto max-w-2xl px-4 py-16">Listing not found.</div>;
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-black">This listing is not yours</h1>
        <p className="mt-2 text-muted-foreground">Only the seller can edit this product.</p>
        <Link to="/product/$id" params={{ id }}>
          <Button className="mt-6 rounded-full">Back to product</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black">Edit listing</h1>
          <p className="mt-1 text-muted-foreground">Update product details and availability.</p>
        </div>
        <Link to="/product/$id" params={{ id }}>
          <Button variant="outline" className="rounded-full">
            View
          </Button>
        </Link>
      </div>

      <form onSubmit={save} className="space-y-5">
        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            className="input"
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className="input min-h-[100px] py-3"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₦)">
            <input
              required
              type="number"
              min={0.01}
              step="0.01"
              value={form.basePrice}
              onChange={(event) => update("basePrice", event.target.value)}
              className="input"
            />
          </Field>
          <Field label="Discount (%)">
            <input
              type="number"
              min={0}
              max={90}
              step={1}
              value={form.discountPercent}
              onChange={(event) =>
                update("discountPercent", clampNumber(event.target.value, 0, 90))
              }
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(event) => update("quantity", parseInt(event.target.value || "0"))}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Condition">
            <select
              value={form.condition}
              onChange={(event) => update("condition", event.target.value)}
              className="input"
            >
              {CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
              className="input"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Size">
            <input
              value={form.size}
              onChange={(event) => update("size", event.target.value)}
              className="input"
            />
          </Field>
          <Field label="Color">
            <input
              value={form.color}
              onChange={(event) => update("color", event.target.value)}
              className="input"
            />
          </Field>
        </div>
        <Field label="Gender">
          <select
            value={form.gender}
            onChange={(event) => update("gender", event.target.value)}
            className="input"
          >
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </Field>
        <Button
          type="submit"
          disabled={saving}
          size="lg"
          className="h-12 w-full rounded-full text-base font-bold shadow-pop"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <style>{`.input { width:100%; height:44px; border-radius:12px; border:1px solid var(--input); background:var(--background); padding:0 14px; font-size:14px; outline:none; transition:border-color .15s; }
        .input:focus { border-color: var(--primary); }
        textarea.input { padding-top:10px; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function clampNumber(value: string, min: number, max: number) {
  const next = Number(value);
  if (Number.isNaN(next)) return min;
  return Math.min(max, Math.max(min, next));
}
