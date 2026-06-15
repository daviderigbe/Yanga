import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { productApi } from "@/lib/endpoints";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/sell")({ component: SellPage });

function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    basePrice: "",
    condition: "LIKE_NEW",
    size: "",
    color: "",
    gender: "WOMEN",
    quantity: 1,
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-black">Log in to sell</h1>
        <p className="mt-2 text-muted-foreground">Create a free account to list items.</p>
        <Button className="mt-6 rounded-full" onClick={() => navigate({ to: "/login" })}>
          Log in
        </Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      files.forEach((f) => fd.append("images", f));
      const r = (await productApi.create(fd)) as any;
      toast.success("Item listed!");
      const id = r?.data?.id;
      if (id) navigate({ to: "/product/$id", params: { id } });
      else navigate({ to: "/profile/$id", params: { id: user.id } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl font-black">Sell an item</h1>
      <p className="mt-1 text-muted-foreground">Snap, list, sell. It takes a minute.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Photos
          </span>
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center transition hover:border-primary">
            <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm"
            />
            {!!files.length && (
              <p className="mt-2 text-xs text-muted-foreground">{files.length} file(s) selected</p>
            )}
          </div>
        </label>

        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="input"
            placeholder="e.g. Vintage Levi's 501"
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="input min-h-[100px] py-3"
            placeholder="Tell buyers about it"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₦)">
            <input
              required
              type="number"
              min={1}
              value={form.basePrice}
              onChange={(e) => update("basePrice", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => update("quantity", parseInt(e.target.value || "1"))}
              className="input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Size">
            <input
              value={form.size}
              onChange={(e) => update("size", e.target.value)}
              className="input"
              placeholder="M / 32 / 42…"
            />
          </Field>
          <Field label="Color">
            <input
              value={form.color}
              onChange={(e) => update("color", e.target.value)}
              className="input"
              placeholder="Red"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Condition">
            <select
              value={form.condition}
              onChange={(e) => update("condition", e.target.value)}
              className="input"
            >
              {["NEW", "LIKE_NEW", "OPEN_BOX", "LIGHTLY_USED", "FAIRLY_USED", "HEAVILY_USED"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              className="input"
            >
              {["WOMEN", "MEN", "UNISEX"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
        </div>

        <Button
          type="submit"
          disabled={busy}
          size="lg"
          className="h-12 w-full rounded-full text-base font-bold shadow-pop"
        >
          {busy ? "Listing…" : "List item"}
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
