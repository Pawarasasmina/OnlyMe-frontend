import {AuthContext} from "../../src/context/AuthContext";
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import ProfileDream, {GiftPicker} from '../../src/components/profile/ProfileDream';
import '../../src/index.css';
const gifts=Array.from({length:24},(_,i)=>({id:`gift-${i}`,key:`gift-${i}`,name:`Gift ${i}`,stars:5,imageUrl:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',category:{id:'feelings',name:'Feelings'}}));
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><AuthContext.Provider value={{user:{id:"demo-user"}}}><MemoryRouter><div className="social-center-scroll" style={{width:440,margin:'auto'}}>{new URLSearchParams(location.search).has("profile") ? <ProfileDream capabilities={{isOwner:false}} profile={{username:"arjun",displayName:"Arjun Mehta",isCreator:true}} role="creator" /> : <GiftPicker creatorName="Arjun Mehta" dream={{id:'dream',photo:{url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="250" height="140"/>'},title:'Field guide',reason:'Build together',receivedStars:new URLSearchParams(location.search).has('funded')?1500:0,goalStars:1500,supporterCount:0,quietSupporterCount:0,supporters:[]}} gifts={gifts} onClose={()=>{}} onSent={()=>{}} />}</div></MemoryRouter></AuthContext.Provider></QueryClientProvider>);
