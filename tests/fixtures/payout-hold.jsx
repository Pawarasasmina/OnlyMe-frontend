import React from "react";
import { createRoot } from "react-dom/client";
import AdminDialogProvider from "../../src/components/admin/AdminDialogProvider";
import FinanceUserPage from "../../src/pages/admin/FinanceUserPage";
import "../../src/index.css";
createRoot(document.getElementById("root")).render(<AdminDialogProvider><FinanceUserPage /></AdminDialogProvider>);
