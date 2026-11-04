import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BankReviewPage from "../../src/pages/admin/BankReviewPage";
import "../../src/index.css";
createRoot(document.getElementById("root")).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BankReviewPage /></QueryClientProvider>);
