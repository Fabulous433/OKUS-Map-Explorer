import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MapPage from "@/pages/map-page";
import BackofficeDashboard from "@/pages/backoffice/dashboard";
import BackofficeWajibPajak from "@/pages/backoffice/wajib-pajak";
import BackofficeObjekPajak from "@/pages/backoffice/objek-pajak";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route path="/backoffice" component={BackofficeDashboard} />
      <Route path="/backoffice/wajib-pajak" component={BackofficeWajibPajak} />
      <Route path="/backoffice/objek-pajak" component={BackofficeObjekPajak} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
