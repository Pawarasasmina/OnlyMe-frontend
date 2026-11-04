import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {AuthContext} from '../../src/context/AuthContext';
import SettingsPayments from '../../src/pages/settings/SettingsPayments';
import '../../src/index.css';
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthContext.Provider value={{user:{id:"owner"}}}><MemoryRouter><main className="settings-index-page" style={{width:'min(100%,440px)',margin:'auto'}}><SettingsPayments /></main></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
