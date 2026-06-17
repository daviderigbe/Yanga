import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { catalogApi, productApi, uploadApi } from "@/lib/endpoints";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export const Route = createFileRoute("/sell")({ component: SellPage });

interface CatalogOption {
  id: string;
  name: string;
}

function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [tags, setTags] = useState<CatalogOption[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    basePrice: "",
    condition: "LIKE_NEW",
    size: "",
    color: "",
    gender: "WOMEN",
    quantity: 1,
    status: "ACTIVE",
    categories: [] as string[],
    tags: [] as string[],
  });

  useEffect(() => {
    catalogApi
      .categories()
      .then((response) => setCategories(extractCatalogOptions(response, "categories")))
      .catch(() => setCategories([]));
    catalogApi
      .tags()
      .then((response) => setTags(extractCatalogOptions(response, "tags")))
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

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
      const imageUrls = files.length ? await uploadProductImages(files) : [];
      const r = (await productApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        categories: form.categories,
        size: form.size.trim(),
        gender: form.gender,
        color: form.color.trim(),
        condition: form.condition,
        tags: form.tags,
        basePrice: Number(form.basePrice),
        images: imageUrls,
        quantity: Number(form.quantity),
        status: form.status,
      })) as any;
      toast.success("Item listed!");
      const id = r?.data?.id ?? r?.data?.product?.id ?? r?.product?.id;
      if (id) navigate({ to: "/product/$id", params: { id } });
      else navigate({ to: "/profile/$id", params: { id: user.id } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const addFiles = (nextFiles: File[]) =>
    setFiles((current) => {
      const existing = new Set(
        current.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );
      const uniqueNext = nextFiles.filter(
        (file) => !existing.has(`${file.name}-${file.size}-${file.lastModified}`),
      );
      return [...current, ...uniqueNext].slice(0, 8);
    });
  const removeFile = (index: number) =>
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  const toggleArrayValue = (key: "categories" | "tags", id: string) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((value) => value !== id)
        : [...current[key], id],
    }));

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
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
              className="block w-full text-sm"
            />
            {!!files.length && (
              <p className="mt-2 text-xs text-muted-foreground">
                {files.length} photo{files.length > 1 ? "s" : ""} selected. You can add up to 8.
              </p>
            )}
          </div>
        </label>

        {!!previews.length && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {previews.map((preview, index) => (
              <div
                key={preview}
                className="relative aspect-square overflow-hidden rounded-2xl bg-muted"
              >
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow-soft hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

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
              min={0.01}
              step="0.01"
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

        <Field label="Categories">
          {categories.length ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleArrayValue("categories", category.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    form.categories.includes(category.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:border-primary"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
              Categories could not be loaded. You can still list the item.
            </p>
          )}
        </Field>

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

        {!!tags.length && (
          <Field label="Tags">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleArrayValue("tags", tag.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    form.tags.includes(tag.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:border-primary"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </Field>
        )}

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
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="input"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
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

async function uploadProductImages(files: File[]) {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "products");
      return uploadApi.single(fd);
    }),
  );
  const urls = uploads.flatMap(extractUploadUrls);
  if (!urls.length) throw new Error("Images uploaded, but no image URLs were returned");
  return urls;
}

function extractUploadUrls(response: any): string[] {
  const data = response?.data ?? response;
  const candidates = [
    data?.urls,
    data?.files,
    data?.items,
    data?.uploadedFiles,
    data?.results,
    Array.isArray(data) ? data : undefined,
  ].find(Array.isArray);

  if (candidates) {
    return candidates
      .map((item: any) =>
        typeof item === "string" ? item : (item?.url ?? item?.fileUrl ?? item?.location),
      )
      .filter(Boolean);
  }

  const single = data?.url ?? data?.fileUrl ?? data?.location;
  return single ? [single] : [];
}

function extractCatalogOptions(response: any, key: string): CatalogOption[] {
  const data = response?.data ?? response;
  const items = Array.isArray(data)
    ? data
    : (data?.items ?? data?.[key] ?? data?.data ?? data?.results ?? []);
  return Array.isArray(items) ? items.filter((item) => item?.id && item?.name) : [];
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
