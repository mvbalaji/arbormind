import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "./pages/dashboard";
import Contacts from "./pages/contacts";
import Leads from "./pages/leads";
import Accounts from "./pages/accounts";
import Opportunities from "./pages/opportunities";
import Activities from "./pages/activities";
import Products from "./pages/products";
import Cases from "./pages/cases";
import Quotes from "./pages/quotes";
import Reports from "./pages/reports";
import Users from "./pages/users";
import AIAssistant from "./pages/ai-assistant";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/leads" component={Leads} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/activities" component={Activities} />
      <Route path="/products" component={Products} />
      <Route path="/cases" component={Cases} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/reports" component={Reports} />
      <Route path="/users" component={Users} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
