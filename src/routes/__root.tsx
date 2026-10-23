import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-black text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">That page doesn't exist or moved.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Back to shop
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yanga — Buy & Sell Thrift Fashion in Nigeria" },
      {
        name: "description",
        content:
          "Yanga is Nigeria's marketplace for pre‑loved and unique fashion. Discover one‑of‑a‑kind clothes and shoes, or turn your closet into cash.",
      },
      { property: "og:title", content: "Yanga — Buy & Sell Thrift Fashion in Nigeria" },
      {
        property: "og:description",
        content:
          "Yanga is Nigeria's marketplace for pre‑loved and unique fashion. Discover one‑of‑a‑kind clothes and shoes, or turn your closet into cash.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Yanga — Buy & Sell Thrift Fashion in Nigeria" },
      {
        name: "twitter:description",
        content:
          "Yanga is Nigeria's marketplace for pre‑loved and unique fashion. Discover one‑of‑a‑kind clothes and shoes, or turn your closet into cash.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f5906f2a-6e78-4e59-9bf4-ff142af1bdcc/id-preview-0c91987b--ecee0787-8ecc-4add-abee-d337e5e6111f.lovable.app-1777926967847.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f5906f2a-6e78-4e59-9bf4-ff142af1bdcc/id-preview-0c91987b--ecee0787-8ecc-4add-abee-d337e5e6111f.lovable.app-1777926967847.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
