import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { Component as RC } from "react";
class RouteEB extends RC<{children: React.ReactNode},{e:string|null}> {
  state={e:null};
  static getDerivedStateFromError(err:Error){return{e:err.message+'\n'+err.stack};}
  render(){return this.state.e?<pre style={{color:'red',padding:16,whiteSpace:'pre-wrap',fontSize:11,background:'#fff'}}>{this.state.e}</pre>:this.props.children;}
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/context/auth";
import { ThemeProvider } from "@/context/theme";
import { CurrencyProvider } from "@/context/currency";
import Landing from "@/pages/landing";
import Login from "@/pages/login";

import Dashboard from "./pages/dashboard";
import SalesManager from "./pages/sales-manager";
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
import ProductDetail from "./pages/product-detail";
import PriceBooks from "./pages/price-books";
import PriceBookDetail from "./pages/price-book-detail";
import Cases from "./pages/cases";
import Quotes from "./pages/quotes";
import QuoteDetail from "./pages/quote-detail";
import Orders from "./pages/orders";
import Contracts from "./pages/contracts";
import ContractDetail from "./pages/contract-detail";
import Reports from "./pages/reports";
import Users from "./pages/users";
import Support from "./pages/support";
import AIAssistant from "./pages/ai-assistant";
import Campaigns from "./pages/campaigns";
import CampaignDetail from "./pages/campaign-detail";
import Approvals from "./pages/approvals";
import ApprovalsList from "./pages/approvals-list";
import AccessControl from "./pages/access-control";
import Integrations from "./pages/integrations";
import Organizations from "./pages/organizations";
import WebsiteVisitors from "./pages/website-visitors";
import ProductRulesAdmin from "./pages/product-rules";
import ProductBundles from "./pages/product-bundles";
import ClmTemplates from "./pages/clm-templates";
import ClmRenewals from "./pages/clm-renewals";
import ClmWorkflow from "./pages/clm-workflow";
import ClmNotifications from "./pages/clm-notifications";
import StimsDashboard from "./pages/stims-dashboard";
import StimsTargetCycles from "./pages/stims-target-cycles";
import StimsIncentivePlans from "./pages/stims-incentive-plans";
import StimsCalcRuns from "./pages/stims-calc-runs";
import StimsAdmin from "./pages/stims-admin";

// CPQ Module
import CpqDashboard from "./pages/cpq-dashboard";
import CpqGuidedSelling from "./pages/cpq-guided-selling";
import CpqProductConfigurator from "./pages/cpq-product-configurator";
import CpqQle from "./pages/cpq-qle";
import CpqPricing from "./pages/cpq-pricing";
import CpqAdmin from "./pages/cpq-admin";
import QuoteWorkflowAdmin from "./pages/quote-workflow-admin";

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
      <Route path="/login"><Redirect to="/dashboard" /></Route>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/sales-manager">{()=><RouteEB><SalesManager /></RouteEB>}</Route>
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
      <Route path="/website-visitors" component={WebsiteVisitors} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/product-bundles" component={ProductBundles} />
      <Route path="/price-books" component={PriceBooks} />
      <Route path="/price-books/:id" component={PriceBookDetail} />
      <Route path="/cases" component={Cases} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/quotes/:id" component={QuoteDetail} />
      <Route path="/orders" component={Orders} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/contracts/:id" component={ContractDetail} />
      <Route path="/reports" component={Reports} />
      <Route path="/users" component={Users} />
      <Route path="/support" component={Support} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route path="/admin/approvals" component={Approvals} />
      <Route path="/admin/access-control" component={AccessControl} />
      <Route path="/admin/integrations" component={Integrations} />
      <Route path="/admin/organizations" component={Organizations} />
      <Route path="/admin/product-rules" component={ProductRulesAdmin} />
      <Route path="/admin/quote-workflow" component={QuoteWorkflowAdmin} />
      <Route path="/approvals" component={ApprovalsList} />
      {/* CLM */}
      <Route path="/clm/templates" component={ClmTemplates} />
      <Route path="/clm/renewals" component={ClmRenewals} />
      <Route path="/clm/workflow" component={ClmWorkflow} />
      <Route path="/clm/notifications" component={ClmNotifications} />
      {/* STIMS */}
      <Route path="/stims/dashboard" component={StimsDashboard} />
      <Route path="/stims/target-cycles" component={StimsTargetCycles} />
      <Route path="/stims/incentive-plans" component={StimsIncentivePlans} />
      <Route path="/stims/calc-runs" component={StimsCalcRuns} />
      <Route path="/stims/admin" component={StimsAdmin} />
      {/* CPQ */}
      <Route path="/cpq" component={CpqDashboard} />
      <Route path="/cpq/guided-selling" component={CpqGuidedSelling} />
      <Route path="/cpq/configurator" component={CpqProductConfigurator} />
      <Route path="/cpq/qle" component={CpqQle} />
      <Route path="/cpq/qle/:quoteId" component={CpqQle} />
      <Route path="/cpq/pricing" component={CpqPricing} />
      <Route path="/cpq/admin" component={CpqAdmin} />
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
            <CurrencyProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AppContent />
              </WouterRouter>
              <Toaster />
            </CurrencyProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
