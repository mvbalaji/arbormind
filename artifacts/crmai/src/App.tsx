import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/context/auth";
import { ThemeProvider } from "@/context/theme";
import Landing from "@/pages/landing";
import Login from "@/pages/login";

import Dashboard from "./pages/dashboard";
import Contacts from "./pages/contacts";
import ContactDetail from "./pages/contact-detail";
import Leads from "./pages/leads";
import LeadDetail from "./pages/lead-detail";
import Accounts from "./pages/accounts";
import AccountDetail from "./pages/account-detail";
import Opportunities from "./pages/opportunities";
import OpportunityDetail from "./pages/opportunity-detail";
import Activities from "./pages/activities";
import Products from "./pages/products";
import Cases from "./pages/cases";
import Quotes from "./pages/quotes";
import QuoteDetail from "./pages/quote-detail";
import Orders from "./pages/orders";
import Reports from "./pages/reports";
import Users from "./pages/users";
import Support from "./pages/support";
import AIAssistant from "./pages/ai-assistant";
import Campaigns from "./pages/campaigns";
import CampaignDetail from "./pages/campaign-detail";
import Approvals from "./pages/approvals";
import ApprovalsList from "./pages/approvals-list";
import AccessControl from "./pages/access-control";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function CRMRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/contacts/:id" component={ContactDetail} />
      <Route path="/leads" component={Leads} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/accounts/:id" component={AccountDetail} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />
      <Route path="/activities" component={Activities} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/campaigns/:id" component={CampaignDetail} />
      <Route path="/products" component={Products} />
      <Route path="/cases" component={Cases} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/quotes/:id" component={QuoteDetail} />
      <Route path="/orders" component={Orders} />
      <Route path="/reports" component={Reports} />
      <Route path="/users" component={Users} />
      <Route path="/support" component={Support} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route path="/admin/approvals" component={Approvals} />
      <Route path="/admin/access-control" component={AccessControl} />
      <Route path="/approvals" component={ApprovalsList} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="arbormind.in" className="w-12 h-12 shadow-lg" />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <CRMRoutes />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppContent />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
