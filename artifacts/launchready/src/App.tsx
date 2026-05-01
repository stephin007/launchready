import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PrdView from "@/pages/prd-view";
import AdminDashboard from "@/pages/admin-dashboard";
import SharedPrd from "@/pages/shared-prd";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#5e6ad2",
    colorForeground: "#f7f8f8",
    colorMutedForeground: "#8a8f98",
    colorDanger: "#ef4444",
    colorBackground: "#0f1011",
    colorInput: "rgba(255,255,255,0.08)",
    colorInputForeground: "#f7f8f8",
    colorNeutral: "rgba(255,255,255,0.08)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0f1011] border border-[rgba(255,255,255,0.08)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#f7f8f8]",
    headerSubtitle: "text-[#8a8f98]",
    socialButtonsBlockButtonText: "text-[#f7f8f8]",
    formFieldLabel: "text-[#d0d6e0]",
    footerActionLink: "text-[#7170ff] hover:text-[#828fff]",
    footerActionText: "text-[#8a8f98]",
    dividerText: "text-[#62666d]",
    identityPreviewEditButton: "text-[#7170ff]",
    formFieldSuccessText: "text-[#10b981]",
    alertText: "text-[#f7f8f8]",
    logoBox: "flex justify-center",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton: "border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#f7f8f8]",
    formButtonPrimary: "bg-[#5e6ad2] hover:bg-[#7170ff] text-white",
    formFieldInput: "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.12)] text-[#f7f8f8]",
    footerAction: "bg-[rgba(255,255,255,0.02)]",
    dividerLine: "bg-[rgba(255,255,255,0.08)]",
    alert: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]",
    otpCodeFieldInput: "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.12)] text-[#f7f8f8]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-base)] px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-base)] px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/generate" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function GeneratePage() {
  return (
    <>
      <Show when="signed-in">
        <Home />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AdminPage() {
  return (
    <>
      <Show when="signed-in">
        <AdminDashboard />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your LaunchReady account",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Start building your product roadmap",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/generate" component={GeneratePage} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/prd/:id" component={PrdView} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/share/:token" component={SharedPrd} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
