import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addressApi, dispatchApi, historyApi, paymentApi, userApi } from "@/lib/endpoints";
import { formatNGN, unwrapItems } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FinancialSummary } from "@/components/FinancialSummary";
import { toast } from "sonner";
import {
  Banknote,
  Home,
  MapPin,
  Package,
  Receipt,
  Settings,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";

type Tab = "overview" | "addresses" | "orders" | "seller";

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: isTab(search.tab) ? search.tab : undefined,
  }),
  component: AccountPage,
});

interface Address {
  id: string;
  type?: string;
  street?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

interface OrderLike {
  id?: string;
  orderId?: string;
  status?: string;
  shipmentStatus?: string;
  totalAmount?: number | string;
  sellerPayoutAmount?: number | string;
  commissionAmount?: number | string;
  createdAt?: string;
}

const emptyAddress = {
  type: "SHIPPING",
  address: "",
  city: "",
  state: "Lagos",
  country: "Nigeria",
  zipCode: "",
  contactName: "",
  contactPhone: "",
  landmark: "",
  deliveryInstructions: "",
  latitude: "",
  longitude: "",
  isDefault: false,
};

function isTab(value: unknown): value is Tab {
  return value === "overview" || value === "addresses" || value === "orders" || value === "seller";
}

function extractOrders(response: unknown): OrderLike[] {
  const data = (response as any)?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.purchases)) return data.purchases;
  if (Array.isArray(data?.sales)) return data.sales;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.orders)) return data.data.orders;
  if (Array.isArray(data?.data?.purchases)) return data.data.purchases;
  if (Array.isArray(data?.data?.sales)) return data.data.sales;
  return [];
}

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? "overview");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [purchases, setPurchases] = useState<OrderLike[]>([]);
  const [sales, setSales] = useState<OrderLike[]>([]);
  const [wallet, setWallet] = useState<any>();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const [addressRes, purchaseRes, salesRes, walletRes] = await Promise.allSettled([
        addressApi.list(),
        historyApi.purchases({ limit: 50 }),
        historyApi.sales({ limit: 50 }),
        paymentApi.walletBalance(user.id),
      ]);
      if (addressRes.status === "fulfilled")
        setAddresses(unwrapItems<Address>(addressRes.value as any));
      if (purchaseRes.status === "fulfilled") setPurchases(extractOrders(purchaseRes.value));
      if (salesRes.status === "fulfilled") setSales(extractOrders(salesRes.value));
      if (walletRes.status === "fulfilled")
        setWallet((walletRes.value as any)?.data ?? walletRes.value);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (search.tab) setTab(search.tab);
  }, [search.tab]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        Loading account…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">My Afra B</p>
          <h1 className="font-display text-3xl font-black md:text-4xl">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={refresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
        <TabButton tab="overview" active={tab} setTab={setTab} icon={UserRound} label="Overview" />
        <TabButton tab="addresses" active={tab} setTab={setTab} icon={Home} label="Addresses" />
        <TabButton tab="orders" active={tab} setTab={setTab} icon={Receipt} label="Orders" />
        <TabButton tab="seller" active={tab} setTab={setTab} icon={Package} label="Seller" />
      </div>

      {tab === "overview" && (
        <Overview
          name={user.name}
          wallet={wallet}
          addressCount={addresses.length}
          purchaseCount={purchases.length}
          salesCount={sales.length}
        />
      )}
      {tab === "addresses" && <Addresses addresses={addresses} onChanged={refresh} />}
      {tab === "orders" && <Orders purchases={purchases} sales={sales} />}
      {tab === "seller" && <Seller addresses={addresses} userId={user.id} onChanged={refresh} />}
    </div>
  );
}

function Overview({
  name,
  wallet,
  addressCount,
  purchaseCount,
  salesCount,
}: {
  name: string;
  wallet: any;
  addressCount: number;
  purchaseCount: number;
  salesCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon={UserRound} label="Welcome" value={name} />
      <Metric icon={Home} label="Saved addresses" value={addressCount} />
      <Metric icon={Truck} label="Purchases" value={purchaseCount} />
      <Metric icon={Banknote} label="Sales" value={salesCount} />
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:col-span-2">
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-black">Wallet</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Seller payouts appear here after delivery is completed.
        </p>
        <FinancialSummary value={wallet} title="Wallet totals" compact />
      </div>
    </div>
  );
}

function Addresses({
  addresses,
  onChanged,
}: {
  addresses: Address[];
  onChanged: () => Promise<void>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-3">
        <SectionTitle
          title="Saved addresses"
          sub="Use shipping addresses for checkout and pickup addresses for selling."
        />
        {addresses.length ? (
          addresses.map((address) => (
            <AddressCard key={address.id} address={address} onChanged={onChanged} />
          ))
        ) : (
          <EmptyState text="No saved addresses yet." />
        )}
      </section>
      <AddressForm title="Add address" initial={emptyAddress} onSaved={onChanged} />
    </div>
  );
}

function Seller({
  addresses,
  userId,
  onChanged,
}: {
  addresses: Address[];
  userId: string;
  onChanged: () => Promise<void>;
}) {
  const pickup = addresses.find((address) => address.type === "PICKUP");
  const [bank, setBank] = useState({ accountNumber: "", bankCode: "", accountName: "" });

  const saveBank = async () => {
    try {
      await userApi.saveBankDetails(clean(bank));
      toast.success("Bank details saved");
    } catch (error: any) {
      toast.error(error.message ?? "Could not save bank details");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <SectionTitle
          title="Seller setup"
          sub="A Lagos pickup address is required before buyers can checkout your items."
        />
        {pickup ? (
          <AddressCard address={pickup} onChanged={onChanged} />
        ) : (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            Add a pickup address with contact phone, latitude, and longitude. Without it, checkout
            can fail for buyers.
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-black">Payout bank</h3>
          </div>
          <div className="grid gap-3">
            <Field
              label="Account number"
              value={bank.accountNumber}
              onChange={(accountNumber) => setBank({ ...bank, accountNumber })}
            />
            <Field
              label="Bank code"
              value={bank.bankCode}
              onChange={(bankCode) => setBank({ ...bank, bankCode })}
            />
            <Field
              label="Account name"
              value={bank.accountName}
              onChange={(accountName) => setBank({ ...bank, accountName })}
            />
            <Button className="rounded-full" onClick={saveBank}>
              Save payout details
            </Button>
          </div>
        </div>
      </section>
      <AddressForm
        title={pickup ? "Update pickup address" : "Add pickup address"}
        initial={{
          ...emptyAddress,
          type: "PICKUP",
          state: "Lagos",
          contactName: "",
          contactPhone: "",
        }}
        addressId={pickup?.id}
        onSaved={onChanged}
      />
      <p className="hidden">{userId}</p>
    </div>
  );
}

function Orders({ purchases, sales }: { purchases: OrderLike[]; sales: OrderLike[] }) {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>();
  const [shipment, setShipment] = useState<any>();

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      setOrder(await paymentApi.order(orderId));
    } catch (error: any) {
      toast.error(error.message ?? "Could not load order");
    }
  };

  const loadShipment = async () => {
    if (!orderId) return;
    try {
      setShipment(await dispatchApi.shipment(orderId));
    } catch (error: any) {
      toast.error(error.message ?? "Shipment not available yet");
    }
  };

  const syncShipment = async () => {
    if (!orderId) return;
    try {
      setShipment(await dispatchApi.sync(orderId));
      toast.success("Shipment updated");
    } catch (error: any) {
      toast.error(error.message ?? "Could not sync shipment");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <OrderList title="Purchases" orders={purchases} empty="No purchases yet." />
      <OrderList title="Sales" orders={sales} empty="No sales yet." seller />
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card xl:col-span-2">
        <SectionTitle title="Track an order" sub="Check payment and delivery status." />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="Order ID"
            className="h-11 flex-1 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
          />
          <Button onClick={loadOrder}>Load order</Button>
          <Button variant="outline" onClick={loadShipment}>
            Shipment
          </Button>
          <Button variant="outline" onClick={syncShipment}>
            Sync
          </Button>
        </div>
        {(order || shipment) && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {order && <OrderDetail title="Order" value={order} />}
            {shipment && <OrderDetail title="Shipment" value={shipment} />}
          </div>
        )}
      </section>
    </div>
  );
}

function AddressForm({
  title,
  initial,
  addressId,
  onSaved,
}: {
  title: string;
  initial: typeof emptyAddress;
  addressId?: string;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = prepareAddressPayload(form);
      if (addressId) await addressApi.update(addressId, payload);
      else await addressApi.create(payload);
      toast.success("Address saved");
      await onSaved();
    } catch (error: any) {
      toast.error(error.message ?? "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-xl font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Type</span>
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            className="h-10 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
          >
            <option value="SHIPPING">Shipping</option>
            <option value="PICKUP">Pickup</option>
            <option value="BILLING">Billing</option>
          </select>
        </label>
        <Field
          label="Street address"
          value={form.address}
          onChange={(address) => setForm({ ...form, address })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="City" value={form.city} onChange={(city) => setForm({ ...form, city })} />
          <Field
            label="State"
            value={form.state}
            onChange={(state) => setForm({ ...form, state })}
          />
        </div>
        <Field
          label="Contact name"
          value={form.contactName}
          onChange={(contactName) => setForm({ ...form, contactName })}
        />
        <Field
          label="Contact phone"
          value={form.contactPhone}
          onChange={(contactPhone) => setForm({ ...form, contactPhone })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Latitude"
            value={form.latitude}
            onChange={(latitude) => setForm({ ...form, latitude })}
          />
          <Field
            label="Longitude"
            value={form.longitude}
            onChange={(longitude) => setForm({ ...form, longitude })}
          />
        </div>
        <Field
          label="Landmark"
          value={form.landmark}
          onChange={(landmark) => setForm({ ...form, landmark })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
          />
          Set as default
        </label>
        {form.type === "PICKUP" && (
          <p className="rounded-xl bg-secondary/70 p-3 text-xs text-muted-foreground">
            Pickup addresses must be in Lagos and include contact phone plus coordinates.
          </p>
        )}
        <Button className="rounded-full" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </Button>
      </div>
    </section>
  );
}

function AddressCard({ address, onChanged }: { address: Address; onChanged: () => Promise<void> }) {
  const remove = async () => {
    try {
      await addressApi.delete(address.id);
      toast.success("Address deleted");
      await onChanged();
    } catch (error: any) {
      toast.error(error.message ?? "Could not delete address");
    }
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
            {address.type ?? "Address"}
          </span>
          <h3 className="mt-3 font-semibold">{addressLabel(address)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {address.contactName} {address.contactPhone && `· ${address.contactPhone}`}
          </p>
          {address.type === "PICKUP" && (!address.latitude || !address.longitude) && (
            <p className="mt-2 text-xs font-semibold text-destructive">
              Pickup needs latitude and longitude.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={remove}>
          Delete
        </Button>
      </div>
    </article>
  );
}

function OrderList({
  title,
  orders,
  empty,
  seller,
}: {
  title: string;
  orders: OrderLike[];
  empty: string;
  seller?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <SectionTitle title={title} />
      <div className="mt-4 space-y-3">
        {orders.length ? (
          orders.map((order, index) => (
            <OrderCard key={order.id ?? order.orderId ?? index} order={order} seller={seller} />
          ))
        ) : (
          <EmptyState text={empty} />
        )}
      </div>
    </section>
  );
}

function OrderCard({ order, seller }: { order: OrderLike; seller?: boolean }) {
  return (
    <article className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{order.id ?? order.orderId ?? "Order"}</p>
          <p className="text-xs text-muted-foreground">
            {order.status ?? "Pending"} {order.shipmentStatus && `· ${order.shipmentStatus}`}
          </p>
        </div>
        {order.totalAmount && (
          <span className="font-display font-black text-primary">
            {formatNGN(order.totalAmount)}
          </span>
        )}
      </div>
      {seller && (
        <div className="mt-3">
          <FinancialSummary value={order} title="Seller payout" compact mode="seller" />
        </div>
      )}
    </article>
  );
}

function OrderDetail({ title, value }: { title: string; value: any }) {
  const data = value?.data ?? value;
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      <h3 className="font-display text-lg font-black">{title}</h3>
      <FinancialSummary value={data} title="Totals" compact />
      <dl className="mt-3 grid gap-2 text-sm">
        <Row label="Status" value={data?.status ?? data?.order?.status ?? "Unavailable"} />
        <Row
          label="Shipment"
          value={data?.shipmentStatus ?? data?.shipment?.status ?? "Unavailable"}
        />
        {data?.trackingUrl && (
          <a
            className="font-semibold text-primary hover:underline"
            href={data.trackingUrl}
            target="_blank"
            rel="noreferrer"
          >
            Track delivery
          </a>
        )}
      </dl>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <Icon className="mb-4 h-5 w-5 text-primary" />
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-black">{value}</p>
    </div>
  );
}

function TabButton({
  tab,
  active,
  setTab,
  icon: Icon,
  label,
}: {
  tab: Tab;
  active: Tab;
  setTab: (tab: Tab) => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={() => setTab(tab)}
      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${active === tab ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
      />
    </label>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-black">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function addressLabel(address: Address) {
  return [address.address ?? address.street, address.city, address.state]
    .filter(Boolean)
    .join(", ");
}

function clean<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== "" && item !== undefined && item !== null),
  ) as Partial<T>;
}

function prepareAddressPayload(value: typeof emptyAddress) {
  const payload: Record<string, unknown> = clean(value);
  if (payload.latitude) payload.latitude = Number(payload.latitude);
  if (payload.longitude) payload.longitude = Number(payload.longitude);

  if (payload.type === "PICKUP") {
    const state = String(payload.state ?? "")
      .trim()
      .toLowerCase();
    if (!["lagos", "lagos state", "lagos, nigeria"].includes(state))
      throw new Error("Pickup address must be in Lagos.");
    if (!payload.contactPhone) throw new Error("Pickup address needs a contact phone.");
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      throw new Error("Pickup address needs Lagos latitude and longitude.");
    }
  }
  return payload;
}
