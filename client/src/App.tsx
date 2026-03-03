import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MapPage from "@/pages/map-page";
import WajibPajakPage from "@/pages/wajib-pajak-page";
import ObjekPajakPage from "@/pages/objek-pajak-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route path="/wajib-pajak" component={WajibPajakPage} />
      <Route path="/objek-pajak" component={ObjekPajakPage} />
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
