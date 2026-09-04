import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { IdleResume } from "@/components/idle-resume";
import { ProductTour } from "@/components/product-tour";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Remaindr";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Set crypto target holdings, see capital remaining, and plan a DCA path.",
      },
      { name: "theme-color", content: "#05060a" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("remaindr-space-bg")==="0")document.documentElement.classList.add("space-off")}catch(e){}`,
          }}
        />
        <div className="space-field" aria-hidden>
          <div className="space-shot" />
          <div className="supernova" />
          <div className="space-vignette" />
        </div>
        <div className="relative z-10">
          <PreviewHostBridge />
          <AuthProvider>
            <IdleResume />
            <ProductTour />
            <Outlet />
          </AuthProvider>
        </div>
        <Scripts />
      </body>
    </html>
  ),
});
