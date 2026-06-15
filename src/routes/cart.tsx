import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { discountedPrice, formatNGN, unwrapItems } from "@/lib/api";
import { addressApi, cartApi, paymentApi } from "@/lib/endpoints";
import { Minus, Plus, Trash2, ShoppingBag, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { FinancialSummary } from "@/components/FinancialSummary";
import { notifyCartChanged } from "@/lib/cart-events";

export const Route = createFileRoute("/cart")({ component: CartPage });

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    basePrice: string | number;
    discountPercent?: number;
    images: { url: string }[];
    size?: string;
    sellerId?: string;
    seller?: { id: string; name?: string; userName?: string };
  };
}

interface Address {
  id: string;
  type?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  contactName?: string;
  contactPhone?: string;
  isDefault?: boolean;
}

function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [checkoutSellerId, setCheckoutSellerId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<unknown>();
  const [paymentUrl, setPaymentUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    cartApi
      .get()
      .then((r) => {
        const nextItems = unwrapItems<CartItem>(r as any);
        setItems(nextItems);
        const firstSeller = sellerIdFor(nextItems[0]);
        if (firstSeller) setCheckoutSellerId(firstSeller);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    addressApi
      .list({ type: "SHIPPING" })
      .then((r: any) => {
        const next = unwrapItems<Address>(r);
        setAddresses(next);
        const selected = next.find((a) => a.isDefault)?.id ?? next[0]?.id ?? "";
        setAddressId((current) => current || selected);
      })
      .catch(() => setAddresses([]));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    load();
  }, [user, authLoading]);

  const remove = async (id: string) => {
    try {
      await cartApi.removeItem(id);
      setItems((x) => x.filter((i) => i.id !== id));
      notifyCartChanged();
      toast.success("Removed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) return remove(id);
    try {
      await cartApi.updateItem(id, { quantity });
      setItems((x) => x.map((item) => (item.id === id ? { ...item, quantity } : item)));
      notifyCartChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const clear = async () => {
    try {
      await cartApi.clear();
      setItems([]);
      notifyCartChanged();
      toast.success("Cart cleared");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sellerGroups = groupBySeller(items);
  const selectedItems =
    sellerGroups.find((group) => group.sellerId === checkoutSellerId)?.items ??
    sellerGroups[0]?.items ??
    [];

  const startCheckout = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!addressId) {
      toast.error("Add or select a shipping address before checkout");
      navigate({ to: "/account" });
      return;
    }
    if (!selectedItems.length) {
      toast.error("Select a seller group to checkout");
      return;
    }
    setCheckingOut(true);
    setCheckoutResult(undefined);
    setPaymentUrl("");
    try {
      const response: any = await paymentApi.createOrder({
        items: selectedItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        addressId,
        callbackUrl: `${window.location.origin}/checkout/verify`,
        deliveryServiceLevel: "STANDARD",
      });
      const data = response?.data ?? response;
      const orderId = data?.order?.id ?? data?.orderId ?? data?.id;
      const reference =
        data?.payment?.reference ??
        data?.reference ??
        data?.paymentReference ??
        data?.paystack?.reference;
      const paymentUrl =
        data?.payment?.authorizationUrl ??
        data?.payment?.authorization_url ??
        data?.authorizationUrl ??
        data?.authorization_url ??
        data?.paymentUrl ??
        data?.payment_url ??
        data?.paystack?.authorization_url ??
        data?.paystack?.authorizationUrl;

      if (orderId || reference) {
        localStorage.setItem(
          "afrab_checkout_pending",
          JSON.stringify({ orderId, reference, createdAt: Date.now() }),
        );
      }
      if (!paymentUrl) throw new Error("Payment URL was not returned by checkout");
      setCheckoutResult(response);
      setPaymentUrl(paymentUrl);
      toast.success("Checkout prepared");
    } catch (e: any) {
      const message = e.message ?? "Could not start checkout";
      if (message.toLowerCase().includes("pickup address")) {
        toast.error(
          "Seller pickup address is missing or invalid. The seller needs a Lagos PICKUP address with phone and coordinates.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 font-display text-4xl font-black">Your bag</h1>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !items.length ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-display text-xl font-bold">Your bag is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Find something fresh.</p>
          <Link
            to="/search"
            className="mt-5 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Browse items
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.map((i) => {
              const price = discountedPrice(i.product.basePrice, i.product.discountPercent);
              return (
                <div key={i.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
                  <Link
                    to="/product/$id"
                    params={{ id: i.product.id }}
                    className="block h-28 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-muted"
                  >
                    {i.product.images?.[0] && (
                      <img
                        src={i.product.images[0].url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Link>
                  <div className="flex-1">
                    <Link
                      to="/product/$id"
                      params={{ id: i.product.id }}
                      className="font-semibold hover:underline"
                    >
                      {i.product.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {i.product.size && `Size ${i.product.size}`}
                    </p>
                    <div className="mt-3 inline-flex items-center rounded-full border border-input bg-background">
                      <button
                        onClick={() => updateQuantity(i.id, i.quantity - 1)}
                        className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                      <button
                        onClick={() => updateQuantity(i.id, i.quantity + 1)}
                        className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 font-display font-bold text-primary">
                      {formatNGN(price * i.quantity)}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(i.id)}
                    className="self-start rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-bold">Order summary</h2>
            {sellerGroups.length > 1 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                This cart has items from multiple sellers. Checkout one seller at a time.
              </div>
            )}
            <div className="space-y-2">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Seller order</span>
                <select
                  value={checkoutSellerId || sellerGroups[0]?.sellerId || ""}
                  onChange={(e) => setCheckoutSellerId(e.target.value)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {sellerGroups.map((group) => (
                    <option key={group.sellerId} value={group.sellerId}>
                      {group.sellerName} · {group.items.length} item(s)
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">Shipping address</span>
                <select
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select address</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {addressLabel(address)}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                to="/account"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" /> Manage addresses
              </Link>
            </div>
            {checkoutResult ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <FinancialSummary value={checkoutResult} title="Checkout total" compact />
              </div>
            ) : (
              <div className="rounded-2xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                Delivery, service fee, and payment total are calculated by the backend when checkout
                starts.
              </div>
            )}
            <div className="space-y-2 rounded-2xl bg-secondary/60 p-3 text-sm">
              <Row k="Selected items" v={`${selectedItems.length}`} />
              <Row k="Delivery and service fees" v="Backend calculated" />
              <Row k="Paystack charge" v="Shown after checkout is prepared" />
            </div>
            <Button
              className="w-full rounded-full"
              size="lg"
              disabled={checkingOut || !selectedItems.length}
              onClick={() => {
                if (paymentUrl) window.location.href = paymentUrl;
                else void startCheckout();
              }}
            >
              {checkingOut
                ? "Preparing checkout…"
                : paymentUrl
                  ? "Continue to Paystack"
                  : "Prepare checkout"}
            </Button>
            <Button variant="outline" className="w-full rounded-full" onClick={clear}>
              Clear cart
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}

function addressLabel(address: Address) {
  return [address.address ?? address.street, address.city, address.state]
    .filter(Boolean)
    .join(", ");
}

function sellerIdFor(item?: CartItem) {
  return item?.product.seller?.id ?? item?.product.sellerId ?? "unknown-seller";
}

function groupBySeller(items: CartItem[]) {
  const groups = new Map<string, { sellerId: string; sellerName: string; items: CartItem[] }>();
  for (const item of items) {
    const sellerId = sellerIdFor(item);
    const sellerName = item.product.seller?.name ?? item.product.seller?.userName ?? "Seller";
    const group = groups.get(sellerId) ?? { sellerId, sellerName, items: [] };
    group.items.push(item);
    groups.set(sellerId, group);
  }
  return [...groups.values()];
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
