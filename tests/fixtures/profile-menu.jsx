import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {VisitorMoreSheet} from '../../src/pages/social/UnifiedProfilePage';
import '../../src/index.css';
function Fixture(){const [open,setOpen]=useState(true);return <div className="social-center-scroll" style={{width:440,margin:'auto'}}><VisitorMoreSheet isOpen={open} onClose={()=>setOpen(false)} profile={{username:'arjun',displayName:'Arjun Mehta',ownerUserId:'recipient'}} /></div>;}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Fixture /></MemoryRouter></QueryClientProvider>);
