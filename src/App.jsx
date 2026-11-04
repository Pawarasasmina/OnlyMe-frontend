import { useLanguage as __useUiLanguage } from "./hooks/useLanguage.js";
import AppRoutes from "./routes/AppRoutes";

function App() {
  __useUiLanguage();
  return <AppRoutes />;
}

export default App;
