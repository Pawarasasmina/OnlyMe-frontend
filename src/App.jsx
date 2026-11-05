import { useLanguage as __useUiLanguage } from "./hooks/useLanguage.js";
import AppRoutes from "./routes/AppRoutes";
import AppDialogProvider from "./components/shared/AppDialogProvider";

function App() {
  __useUiLanguage();
  return <><AppRoutes /><AppDialogProvider /></>;
}

export default App;
