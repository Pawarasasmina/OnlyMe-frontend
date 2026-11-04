import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import WalletPage from '../../src/pages/social/WalletPage';
import '../../src/index.css';
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><div style={{width:'min(100%,440px)',margin:'auto'}}><WalletPage /></div></MemoryRouter></QueryClientProvider>);
