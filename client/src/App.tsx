import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MapPage from "@/pages/map-page";
import BackofficeDashboard from "@/pages/backoffice/dashboard";
import BackofficeWajibPajak from "@/pages/backoffice/wajib-pajak";
import BackofficeWajibPajakDetail from "@/pages/backoffice/wajib-pajak-detail";
import BackofficeObjekPajak from "@/pages/backoffice/objek-pajak";
import BackofficeObjekPajakDetail from "@/pages/backoffice/objek-pajak-detail";
import BackofficeMasterData from "@/pages/backoffice/master-data";
import BackofficeDataTools from "@/pages/backoffice/data-tools";
import BackofficeLogin from "@/pages/backoffice/login";
import BackofficeBatasWilayah from "@/pages/backoffice/batas-wilayah";
import { AuthProvider } from "@/lib/auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route path="/backoffice/login" component={BackofficeLogin} />
      <Route path="/backoffice" component={BackofficeDashboard} />
      <Route path="/backoffice/wajib-pajak/:id" component={BackofficeWajibPajakDetail} />
      <Route path="/backoffice/wajib-pajak" component={BackofficeWajibPajak} />
      <Route path="/backoffice/objek-pajak/:id" component={BackofficeObjekPajakDetail} />
      <Route path="/backoffice/objek-pajak" component={BackofficeObjekPajak} />
      <Route path="/backoffice/master-data" component={BackofficeMasterData} />
      <Route path="/backoffice/batas-wilayah" component={BackofficeBatasWilayah} />
      <Route path="/backoffice/data-tools" component={BackofficeDataTools} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
