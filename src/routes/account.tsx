import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addressApi,
  authApi,
  brandApi,
  catalogApi,
  dispatchApi,
  historyApi,
  messageApi,
  paymentApi,
  productApi,
  realtimeApi,
  uploadApi,
  userApi,
} from "@/lib/endpoints";
import { API_BASE, unwrapItems } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FinancialSummary } from "@/components/FinancialSummary";
import {
  BadgeDollarSign,
  Banknote,
  Boxes,
  Building2,
  CreditCard,
  Home,
  ImageUp,
  Lock,
  Mail,
  MessageCircle,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/account")({ component: AccountPage });

type Section =
  | "overview"
  | "profile"
  | "addresses"
  | "seller"
  | "messages"
  | "payments"
  | "catalog"
  | "uploads";

type RunState = {
  loading?: string;
  result?: unknown;
};

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("overview");
  const [state, setState] = useState<RunState>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setState({ loading: label });
    try {
      const result = await fn();
      setState({ result });
      toast.success(`${label} completed`);
      return result;
    } catch (error: any) {
      setState({ result: error?.data ?? { message: error?.message ?? "Request failed" } });
      toast.error(error?.message ?? "Request failed");
      return undefined;
    }
  };

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        Loading account…
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 font-display font-black text-primary">
              {user.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <nav className="grid gap-1">
            <SideButton
              id="overview"
              active={section}
              onClick={setSection}
              icon={Boxes}
              label="Overview"
            />
            <SideButton
              id="profile"
              active={section}
              onClick={setSection}
              icon={Settings}
              label="Profile"
            />
            <SideButton
              id="addresses"
              active={section}
              onClick={setSection}
              icon={Home}
              label="Addresses"
            />
            <SideButton
              id="seller"
              active={section}
              onClick={setSection}
              icon={Package}
              label="Seller"
            />
            <SideButton
              id="messages"
              active={section}
              onClick={setSection}
              icon={MessageCircle}
              label="Messages"
            />
            <SideButton
              id="payments"
              active={section}
              onClick={setSection}
              icon={Wallet}
              label="Payments"
            />
            <SideButton
              id="catalog"
              active={section}
              onClick={setSection}
              icon={Search}
              label="Catalog"
            />
            <SideButton
              id="uploads"
              active={section}
              onClick={setSection}
              icon={ImageUp}
              label="Uploads"
            />
          </nav>
        </div>
      </aside>

      <main className="min-w-0 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Production API coverage
          </p>
          <h1 className="font-display text-3xl font-black md:text-4xl">Account workbench</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage marketplace actions that require authentication. API target: {API_BASE}
          </p>
        </div>

        {section === "overview" && <Overview userId={user.id} run={run} />}
        {section === "profile" && <ProfileSecurity user={user} run={run} />}
        {section === "addresses" && <Addresses run={run} />}
        {section === "seller" && <SellerTools userId={user.id} run={run} />}
        {section === "messages" && <Messages run={run} />}
        {section === "payments" && <Payments userId={user.id} run={run} />}
        {section === "catalog" && <Catalog run={run} />}
        {section === "uploads" && <Uploads run={run} />}

        <ResultPanel state={state} />
      </main>
    </div>
  );
}

function Overview({ userId, run }: { userId: string; run: Runner }) {
  const actions = useMemo(
    () => [
      { label: "Refresh auth session", icon: ShieldCheck, fn: authApi.me },
      { label: "Refresh auth WS token", icon: Lock, fn: authApi.refreshWsToken },
      { label: "Get websocket token", icon: Lock, fn: realtimeApi.wsToken },
      { label: "Get unread messages", icon: Mail, fn: messageApi.unreadCount },
      { label: "Load addresses", icon: Home, fn: addressApi.list },
      { label: "Load purchases", icon: Truck, fn: () => historyApi.purchases({ limit: 10 }) },
      { label: "Load sales", icon: BadgeDollarSign, fn: () => historyApi.sales({ limit: 10 }) },
      { label: "Load wallet balance", icon: Wallet, fn: () => paymentApi.walletBalance(userId) },
      { label: "Load saved cards", icon: CreditCard, fn: paymentApi.cards },
      { label: "Load my brands", icon: Building2, fn: () => brandApi.mine({ limit: 10 }) },
      { label: "Load bank details", icon: Banknote, fn: userApi.bankDetails },
    ],
    [userId],
  );
  return <ActionGrid title="Quick checks" actions={actions} run={run} />;
}

function ProfileSecurity({ user, run }: { user: { id: string; email: string }; run: Runner }) {
  const [profile, setProfile] = useState({ name: "", userName: "", bio: "", phoneNumber: "" });
  const [bank, setBank] = useState({ accountNumber: "", bankCode: "", accountName: "" });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "" });
  const [emailCode, setEmailCode] = useState("");
  const [reset, setReset] = useState({ code: "", newPassword: "" });
  const [mobileOauth, setMobileOauth] = useState({
    provider: "google",
    idToken: "",
    accessToken: "",
  });

  return (
    <SectionShell title="Profile and security">
      <FormCard title="Edit profile" icon={UserRound}>
        <Field
          label="Name"
          value={profile.name}
          onChange={(name) => setProfile({ ...profile, name })}
        />
        <Field
          label="Username"
          value={profile.userName}
          onChange={(userName) => setProfile({ ...profile, userName })}
        />
        <Field
          label="Bio"
          value={profile.bio}
          onChange={(bio) => setProfile({ ...profile, bio })}
        />
        <Field
          label="Phone"
          value={profile.phoneNumber}
          onChange={(phoneNumber) => setProfile({ ...profile, phoneNumber })}
        />
        <Button
          onClick={() => run("Edit profile", () => userApi.editProfile(user.id, compact(profile)))}
        >
          Save profile
        </Button>
      </FormCard>

      <FormCard title="Bank details" icon={Banknote}>
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
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => run("Save bank details", () => userApi.saveBankDetails(compact(bank)))}
          >
            Save bank
          </Button>
          <Button variant="outline" onClick={() => run("Get bank details", userApi.bankDetails)}>
            Refresh
          </Button>
        </div>
      </FormCard>

      <FormCard title="Password and verification" icon={Lock}>
        <Field
          label="Current password"
          type="password"
          value={password.currentPassword}
          onChange={(currentPassword) => setPassword({ ...password, currentPassword })}
        />
        <Field
          label="New password"
          type="password"
          value={password.newPassword}
          onChange={(newPassword) => setPassword({ ...password, newPassword })}
        />
        <Button
          onClick={() =>
            run("Change password", () => userApi.changePassword(user.id, compact(password)))
          }
        >
          Change password
        </Button>
        <div className="grid gap-2 border-t border-border pt-4">
          <Field label="Email code" value={emailCode} onChange={setEmailCode} />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => run("Send verification code", () => authApi.sendEmailCode(user.email))}
            >
              Send code
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                run("Verify email", () =>
                  authApi.verifyEmail({ email: user.email, code: emailCode }),
                )
              }
            >
              Verify email
            </Button>
            <Button
              variant="outline"
              onClick={() => run("Resend code", () => authApi.resendEmailCode(user.email))}
            >
              Resend
            </Button>
          </div>
        </div>
        <div className="grid gap-2 border-t border-border pt-4">
          <Field
            label="Reset code"
            value={reset.code}
            onChange={(code) => setReset({ ...reset, code })}
          />
          <Field
            label="Reset password"
            type="password"
            value={reset.newPassword}
            onChange={(newPassword) => setReset({ ...reset, newPassword })}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => run("Request reset", () => authApi.requestPasswordReset(user.email))}
            >
              Request reset
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                run("Verify reset code", () =>
                  authApi.verifyResetCode({ email: user.email, code: reset.code }),
                )
              }
            >
              Verify reset
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                run("Reset password", () =>
                  authApi.resetPassword({
                    email: user.email,
                    code: reset.code,
                    newPassword: reset.newPassword,
                  }),
                )
              }
            >
              Reset password
            </Button>
          </div>
        </div>
      </FormCard>

      <ActionGrid
        title="Account toggles"
        actions={[
          {
            label: "Toggle bundle buying",
            icon: Boxes,
            fn: () => userApi.toggleBundleBuying(user.id),
          },
          {
            label: "Toggle unavailability",
            icon: Settings,
            fn: () => userApi.toggleUnavailability(user.id),
          },
          { label: "Deactivate account", icon: Lock, fn: () => userApi.deactivate(user.id) },
          { label: "Reactivate account", icon: ShieldCheck, fn: () => userApi.reactivate(user.id) },
        ]}
        run={run}
      />
      <FormCard title="Mobile OAuth token" icon={ShieldCheck}>
        <Field
          label="Provider"
          value={mobileOauth.provider}
          onChange={(provider) => setMobileOauth({ ...mobileOauth, provider })}
        />
        <Field
          label="ID token"
          value={mobileOauth.idToken}
          onChange={(idToken) => setMobileOauth({ ...mobileOauth, idToken })}
        />
        <Field
          label="Access token"
          value={mobileOauth.accessToken}
          onChange={(accessToken) => setMobileOauth({ ...mobileOauth, accessToken })}
        />
        <Button
          disabled={!mobileOauth.idToken}
          onClick={() =>
            run("Mobile OAuth", () =>
              authApi.mobileOauth(
                mobileOauth.provider as "google" | "apple",
                compact({
                  idToken: mobileOauth.idToken,
                  accessToken: mobileOauth.accessToken,
                }) as any,
              ),
            )
          }
        >
          Authenticate mobile token
        </Button>
      </FormCard>
    </SectionShell>
  );
}

function Addresses({ run }: { run: Runner }) {
  const [addressId, setAddressId] = useState("");
  const [form, setForm] = useState({
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
  });
  return (
    <SectionShell title="Addresses">
      <ActionGrid
        title="Address data"
        actions={[
          { label: "Get all addresses", icon: Home, fn: () => addressApi.list() },
          {
            label: "Get shipping addresses",
            icon: Truck,
            fn: () => addressApi.list({ type: "SHIPPING" }),
          },
          {
            label: "Get pickup addresses",
            icon: Package,
            fn: () => addressApi.list({ type: "PICKUP" }),
          },
          { label: "Get Nigerian states", icon: Tags, fn: addressApi.states },
        ]}
        run={run}
      />
      <FormCard title="Create or update address" icon={Home}>
        <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
          Seller pickup addresses must use type PICKUP, state Lagos, and include contact phone,
          latitude, and longitude. Buyer checkout uses a SHIPPING address.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                type: "PICKUP",
                state: "Lagos",
                country: "Nigeria",
              }))
            }
          >
            Use seller pickup preset
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                type: "SHIPPING",
                country: "Nigeria",
              }))
            }
          >
            Use buyer shipping preset
          </Button>
        </div>
        <Field label="Address ID for update/delete" value={addressId} onChange={setAddressId} />
        {Object.entries(form).map(([key, value]) =>
          typeof value === "boolean" ? (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              />
              Default address
            </label>
          ) : (
            <Field
              key={key}
              label={labelize(key)}
              value={String(value)}
              onChange={(next) => setForm({ ...form, [key]: next })}
            />
          ),
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => run("Add address", () => addressApi.create(prepareAddressPayload(form)))}
          >
            Add
          </Button>
          <Button
            variant="outline"
            disabled={!addressId}
            onClick={() =>
              run("Update address", () => addressApi.update(addressId, prepareAddressPayload(form)))
            }
          >
            Update
          </Button>
          <Button
            variant="outline"
            disabled={!addressId}
            onClick={() => run("Delete address", () => addressApi.delete(addressId))}
          >
            Delete
          </Button>
        </div>
      </FormCard>
    </SectionShell>
  );
}

function SellerTools({ userId, run }: { userId: string; run: Runner }) {
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [imageId, setImageId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [brand, setBrand] = useState({
    name: "",
    description: "",
    contactAddress: "",
    businessPhoneNumber: "",
    logoUrl: "",
  });
  const [product, setProduct] = useState({
    title: "",
    description: "",
    basePrice: "",
    quantity: "1",
    status: "ACTIVE",
  });
  const [review, setReview] = useState({ rating: "5", comment: "" });

  return (
    <SectionShell title="Seller tools">
      <ActionGrid
        title="Seller reads"
        actions={[
          { label: "My products", icon: Package, fn: () => userApi.products(userId) },
          { label: "Sold products", icon: Truck, fn: () => userApi.soldProducts(userId) },
          { label: "Product reviews", icon: MessageCircle, fn: () => userApi.reviews(userId) },
          { label: "Verified brands", icon: Building2, fn: () => brandApi.verified({ limit: 20 }) },
          { label: "My brands", icon: Building2, fn: () => brandApi.mine({ limit: 20 }) },
        ]}
        run={run}
      />
      <FormCard title="Brand operations" icon={Building2}>
        <Field label="Brand ID" value={brandId} onChange={setBrandId} />
        {Object.entries(brand).map(([key, value]) => (
          <Field
            key={key}
            label={labelize(key)}
            value={value}
            onChange={(next) => setBrand({ ...brand, [key]: next })}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => run("Save brand draft", () => brandApi.registerDraft(compact(brand)))}
          >
            Draft brand
          </Button>
          <Button
            variant="outline"
            disabled={!brandId}
            onClick={() => run("Get brand", () => brandApi.get(brandId))}
          >
            Get
          </Button>
          <Button
            variant="outline"
            disabled={!brandId}
            onClick={() => run("Update brand", () => brandApi.update(brandId, compact(brand)))}
          >
            Update
          </Button>
          <Button
            variant="outline"
            disabled={!brandId}
            onClick={() => run("Submit verification", () => brandApi.submitVerification(brandId))}
          >
            Submit
          </Button>
          <Button
            variant="outline"
            disabled={!brandId}
            onClick={() => run("Delete brand", () => brandApi.delete(brandId))}
          >
            Delete
          </Button>
        </div>
      </FormCard>
      <FormCard title="Product management" icon={Package}>
        <Field label="Product ID" value={productId} onChange={setProductId} />
        <Field label="Image ID" value={imageId} onChange={setImageId} />
        <Field label="Category ID" value={categoryId} onChange={setCategoryId} />
        <Field label="Tag ID" value={tagId} onChange={setTagId} />
        {Object.entries(product).map(([key, value]) => (
          <Field
            key={key}
            label={labelize(key)}
            value={value}
            onChange={(next) => setProduct({ ...product, [key]: next })}
          />
        ))}
        <div className="grid gap-2 rounded-xl bg-secondary/50 p-3">
          <Field
            label="Review rating"
            value={review.rating}
            onChange={(rating) => setReview({ ...review, rating })}
          />
          <Field
            label="Review comment"
            value={review.comment}
            onChange={(comment) => setReview({ ...review, comment })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              run("Update product", () => productApi.update(productId, compact(product)))
            }
            disabled={!productId}
          >
            Update product
          </Button>
          <Button
            variant="outline"
            disabled={!productId}
            onClick={() => run("Delete product", () => productApi.delete(productId))}
          >
            Delete
          </Button>
          <Button
            variant="outline"
            disabled={!productId}
            onClick={() =>
              run("Add product image", () =>
                productApi.addImage(productId, { url: imageId, order: 0 }),
              )
            }
          >
            Add image URL
          </Button>
          <Button
            variant="outline"
            disabled={!productId || !imageId}
            onClick={() =>
              run("Remove product image", () => productApi.removeImage(productId, imageId))
            }
          >
            Remove image
          </Button>
          <Button
            variant="outline"
            disabled={!productId}
            onClick={() =>
              run("Reorder images", () =>
                productApi.reorderImages(productId, { imageIds: imageId ? [imageId] : [] }),
              )
            }
          >
            Reorder
          </Button>
          <Button
            variant="outline"
            disabled={!productId}
            onClick={() =>
              run("Create review", () =>
                productApi.review(
                  productId,
                  compact({ rating: Number(review.rating), comment: review.comment }),
                ),
              )
            }
          >
            Review
          </Button>
          <Button
            variant="outline"
            disabled={!categoryId}
            onClick={() => run("Products by category", () => productApi.byCategory(categoryId))}
          >
            Category feed
          </Button>
          <Button
            variant="outline"
            disabled={!tagId}
            onClick={() => run("Products by tag", () => productApi.byTag(tagId))}
          >
            Tag feed
          </Button>
        </div>
      </FormCard>
    </SectionShell>
  );
}

function Messages({ run }: { run: Runner }) {
  const [userId, setUserId] = useState("");
  const [body, setBody] = useState("");
  return (
    <SectionShell title="Messages">
      <ActionGrid
        title="Message inbox"
        actions={[
          { label: "Get conversations", icon: MessageCircle, fn: messageApi.conversations },
          { label: "Unread count", icon: Mail, fn: messageApi.unreadCount },
        ]}
        run={run}
      />
      <FormCard title="Conversation" icon={MessageCircle}>
        <Field label="User ID" value={userId} onChange={setUserId} />
        <Field label="Message" value={body} onChange={setBody} />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!userId}
            onClick={() => run("Get conversation", () => messageApi.conversation(userId))}
          >
            Load
          </Button>
          <Button
            disabled={!userId || !body}
            variant="outline"
            onClick={() =>
              run("Send message", () => messageApi.send({ receiverId: userId, content: body }))
            }
          >
            Send
          </Button>
          <Button
            disabled={!userId}
            variant="outline"
            onClick={() => run("Mark read", () => messageApi.markRead(userId))}
          >
            Mark read
          </Button>
        </div>
      </FormCard>
    </SectionShell>
  );
}

function Payments({ userId, run }: { userId: string; run: Runner }) {
  const [cardId, setCardId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reference, setReference] = useState("");
  const [addressId, setAddressId] = useState("");
  const [productId, setProductId] = useState("");
  const [shipmentId, setShipmentId] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("READY_FOR_PICKUP");
  const [card, setCard] = useState({
    cardNumber: "",
    brand: "VISA",
    expiryMonth: "",
    expiryYear: "",
  });
  const [withdraw, setWithdraw] = useState({
    amount: "",
    accountNumber: "",
    bankCode: "",
    accountName: "",
  });

  return (
    <SectionShell title="Payments, wallet, and history">
      <ActionGrid
        title="Payment reads"
        actions={[
          { label: "Saved cards", icon: CreditCard, fn: paymentApi.cards },
          { label: "Supported banks", icon: Banknote, fn: paymentApi.banks },
          { label: "Wallet balance", icon: Wallet, fn: () => paymentApi.walletBalance(userId) },
          { label: "Purchase history", icon: Truck, fn: () => historyApi.purchases({ limit: 20 }) },
          {
            label: "Sales history",
            icon: BadgeDollarSign,
            fn: () => historyApi.sales({ limit: 20 }),
          },
        ]}
        run={run}
      />
      <FormCard title="Cards" icon={CreditCard}>
        <Field label="Card ID" value={cardId} onChange={setCardId} />
        {Object.entries(card).map(([key, value]) => (
          <Field
            key={key}
            label={labelize(key)}
            value={value}
            onChange={(next) => setCard({ ...card, [key]: next })}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("Save card", () => paymentApi.saveCard(numberize(card)))}>
            Save card
          </Button>
          <Button
            variant="outline"
            disabled={!cardId}
            onClick={() => run("Set default card", () => paymentApi.defaultCard(cardId))}
          >
            Set default
          </Button>
          <Button
            variant="outline"
            disabled={!cardId}
            onClick={() => run("Delete card", () => paymentApi.deleteCard(cardId))}
          >
            Delete card
          </Button>
        </div>
      </FormCard>
      <FormCard title="Orders and wallet" icon={Wallet}>
        <Field label="Product ID" value={productId} onChange={setProductId} />
        <Field label="Address ID" value={addressId} onChange={setAddressId} />
        <Field label="Order ID" value={orderId} onChange={setOrderId} />
        <Field label="Shipment ID" value={shipmentId} onChange={setShipmentId} />
        <Field label="Shipment status" value={shipmentStatus} onChange={setShipmentStatus} />
        <Field label="Payment reference" value={reference} onChange={setReference} />
        {Object.entries(withdraw).map(([key, value]) => (
          <Field
            key={key}
            label={labelize(key)}
            value={value}
            onChange={(next) => setWithdraw({ ...withdraw, [key]: next })}
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!productId || !addressId}
            onClick={() =>
              run("Create order", () =>
                paymentApi.createOrder({
                  buyerId: userId,
                  addressId,
                  items: [{ productId, quantity: 1 }],
                  callbackUrl: window.location.origin + "/checkout/verify",
                  deliveryServiceLevel: "STANDARD",
                }),
              )
            }
          >
            Create order
          </Button>
          <Button
            variant="outline"
            disabled={!orderId}
            onClick={() => run("Get order", () => paymentApi.order(orderId))}
          >
            Get order
          </Button>
          <Button
            variant="outline"
            disabled={!orderId || !reference}
            onClick={() =>
              run("Verify payment", () => paymentApi.verifyOrder({ orderId, reference }))
            }
          >
            Verify
          </Button>
          <Button
            variant="outline"
            disabled={!addressId}
            onClick={() =>
              run("Delivery quote", () =>
                dispatchApi.quote({ addressId, itemCount: 1, serviceLevel: "STANDARD" }),
              )
            }
          >
            Delivery quote
          </Button>
          <Button
            variant="outline"
            disabled={!orderId}
            onClick={() => run("Get shipment", () => dispatchApi.shipment(orderId))}
          >
            Get shipment
          </Button>
          <Button
            variant="outline"
            disabled={!orderId}
            onClick={() => run("Sync shipment", () => dispatchApi.sync(orderId))}
          >
            Sync shipment
          </Button>
          <Button
            variant="outline"
            disabled={!orderId}
            onClick={() => run("Create dispatch", () => dispatchApi.create(orderId))}
          >
            Create dispatch
          </Button>
          <Button
            variant="outline"
            disabled={!orderId}
            onClick={() => run("Cancel dispatch", () => dispatchApi.cancel(orderId))}
          >
            Cancel dispatch
          </Button>
          <Button
            variant="outline"
            disabled={!shipmentId}
            onClick={() =>
              run("Update shipment status", () =>
                dispatchApi.updateShipmentStatus(shipmentId, { status: shipmentStatus }),
              )
            }
          >
            Update shipment
          </Button>
          <Button
            variant="outline"
            disabled={!withdraw.amount}
            onClick={() =>
              run("Withdraw", () =>
                paymentApi.withdraw({
                  userId,
                  amount: Number(withdraw.amount),
                  bankDetails: compact({
                    accountNumber: withdraw.accountNumber,
                    bankCode: withdraw.bankCode,
                    accountName: withdraw.accountName,
                  }),
                }),
              )
            }
          >
            Withdraw
          </Button>
          <Button
            variant="outline"
            disabled={!withdraw.amount}
            onClick={() =>
              run("Withdraw saved", () =>
                paymentApi.withdrawSaved({ userId, amount: Number(withdraw.amount) }),
              )
            }
          >
            Withdraw saved
          </Button>
        </div>
      </FormCard>
    </SectionShell>
  );
}

function Catalog({ run }: { run: Runner }) {
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [q, setQ] = useState("");
  return (
    <SectionShell title="Catalog discovery">
      <ActionGrid
        title="Public catalog"
        actions={[
          { label: "Categories", icon: Tags, fn: catalogApi.categories },
          { label: "Tags", icon: Tags, fn: catalogApi.tags },
          { label: "Vendors", icon: Building2, fn: () => catalogApi.vendors({ limit: 20 }) },
          { label: "Top vendors", icon: Building2, fn: () => catalogApi.topVendors({ limit: 20 }) },
          { label: "Trending", icon: Package, fn: () => productApi.trending({ limit: 20 }) },
          { label: "Newest", icon: Package, fn: () => productApi.newest({ limit: 20 }) },
          { label: "On sale", icon: Package, fn: () => productApi.onSale({ limit: 20 }) },
          { label: "Recommended", icon: Package, fn: () => productApi.recommended({ limit: 20 }) },
          { label: "Most liked", icon: Package, fn: () => productApi.mostLiked({ limit: 20 }) },
          { label: "Best selling", icon: Package, fn: () => productApi.bestSelling({ limit: 20 }) },
          {
            label: "Followed users feed",
            icon: Package,
            fn: () => productApi.followed({ limit: 20 }),
          },
        ]}
        run={run}
      />
      <FormCard title="Search and filtered feeds" icon={Search}>
        <Field label="Search" value={q} onChange={setQ} />
        <Field label="Category ID" value={categoryId} onChange={setCategoryId} />
        <Field label="Tag ID" value={tagId} onChange={setTagId} />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              run("Unified search", () => catalogApi.search({ q, type: "products", limit: 20 }))
            }
          >
            Search
          </Button>
          <Button
            variant="outline"
            disabled={!categoryId}
            onClick={() => run("Category products", () => productApi.byCategory(categoryId))}
          >
            Category products
          </Button>
          <Button
            variant="outline"
            disabled={!tagId}
            onClick={() => run("Tag products", () => productApi.byTag(tagId))}
          >
            Tag products
          </Button>
        </div>
      </FormCard>
    </SectionShell>
  );
}

function Uploads({ run }: { run: Runner }) {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [folder, setFolder] = useState("products");
  const [filename, setFilename] = useState("");
  const [deleteTarget, setDeleteTarget] = useState("");

  const singleForm = () => {
    const fd = new FormData();
    if (file) fd.append("file", file);
    if (folder) fd.append("folder", folder);
    return fd;
  };

  const multipleForm = () => {
    const fd = new FormData();
    Array.from(files ?? []).forEach((item) => fd.append("files", item));
    if (folder) fd.append("folder", folder);
    return fd;
  };

  return (
    <SectionShell title="Uploads">
      <FormCard title="S3 uploads" icon={ImageUp}>
        <Field label="Folder" value={folder} onChange={setFolder} />
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Single file</span>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Multiple files</span>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
        </label>
        <Field label="Presigned filename" value={filename} onChange={setFilename} />
        <Field label="URL or key to delete" value={deleteTarget} onChange={setDeleteTarget} />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!file}
            onClick={() => run("Upload single", () => uploadApi.single(singleForm()))}
          >
            Upload single
          </Button>
          <Button
            variant="outline"
            disabled={!files?.length}
            onClick={() => run("Upload multiple", () => uploadApi.multiple(multipleForm()))}
          >
            Upload multiple
          </Button>
          <Button
            variant="outline"
            disabled={!filename}
            onClick={() =>
              run("Create presigned URL", () => uploadApi.presignedUrl({ filename, folder }))
            }
          >
            Presigned URL
          </Button>
          <Button
            variant="outline"
            disabled={!deleteTarget}
            onClick={() =>
              run("Delete upload", () =>
                uploadApi.delete(
                  deleteTarget.startsWith("http") ? { url: deleteTarget } : { key: deleteTarget },
                ),
              )
            }
          >
            Delete file
          </Button>
        </div>
      </FormCard>
    </SectionShell>
  );
}

type Runner = (label: string, fn: () => Promise<unknown>) => Promise<unknown>;
type Action = { label: string; icon: React.ElementType; fn: () => Promise<unknown> };

function SideButton({
  id,
  active,
  onClick,
  icon: Icon,
  label,
}: {
  id: Section;
  active: Section;
  onClick: (id: Section) => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
        active === id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function ActionGrid({ title, actions, run }: { title: string; actions: Action[]; run: Runner }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 font-display text-lg font-black">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => run(action.label, action.fn)}
            className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
              <action.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FormCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-display text-lg font-black">{title}</h3>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
      />
    </label>
  );
}

function ResultPanel({ state }: { state: RunState }) {
  const payload = state.loading ? { loading: state.loading } : state.result;
  if (!payload) return null;
  const items = unwrapItems<any>(payload as any);
  return (
    <div className="rounded-2xl border border-border bg-foreground p-4 text-background shadow-card">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h3 className="font-display text-lg font-black">Latest response</h3>
        {!!items.length && <span className="text-xs opacity-70">{items.length} item(s)</span>}
      </div>
      <FinancialSummary value={payload} title="Financial summary" />
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== "" && item !== undefined && item !== null),
  ) as Partial<T>;
}

function numberize<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(compact(value)).map(([key, item]) => {
      if (key.toLowerCase().includes("month") || key.toLowerCase().includes("year")) {
        return [key, Number(item)];
      }
      return [key, item];
    }),
  );
}

function normalizeAddress(value: Record<string, unknown>) {
  const cleaned = compact(value);
  return Object.fromEntries(
    Object.entries(cleaned).map(([key, item]) => {
      if (key === "latitude" || key === "longitude") return [key, Number(item)];
      return [key, item];
    }),
  );
}

function prepareAddressPayload(value: Record<string, unknown>) {
  const payload = normalizeAddress(value);
  if (payload.type === "PICKUP") {
    const state = String(payload.state ?? "")
      .trim()
      .toLowerCase();
    const hasAllowedLagosName = ["lagos", "lagos state", "lagos, nigeria"].includes(state);
    if (!hasAllowedLagosName) {
      throw new Error("Pickup address state must be Lagos.");
    }
    if (!payload.contactPhone) {
      throw new Error("Pickup address needs a contact phone.");
    }
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      throw new Error("Pickup address needs latitude and longitude coordinates in Lagos.");
    }
  }
  return payload;
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
