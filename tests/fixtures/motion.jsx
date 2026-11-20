import React, { useState } from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter, useLocation, useNavigate} from "react-router-dom";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {AuthContext} from "../../src/context/AuthContext";
import AiThinking from "../../src/components/publication/AiThinking";
import {useSurfaceTurn} from "../../src/hooks/useSurfaceTurn";
import {useRouteMotion} from "../../src/hooks/useRouteMotion";
import "../../src/index.css";
function Fixture(){
 const [chapter,setChapter]=useState(0),[busy,setBusy]=useState(false);
 const turn=useSurfaceTurn(true,`chapter-${chapter}`,chapter,"page");
 const location=useLocation(),navigate=useNavigate(),route=useRouteMotion(location.pathname);
 return <div style={{width:"min(550px,100%)",margin:"auto",color:"white"}}><nav><button onClick={()=>setBusy(x=>!x)}>Toggle AI</button><button onClick={()=>{turn.directionRef.current=1;setChapter(c=>c+1);}}>Next chapter</button><button onClick={()=>navigate(location.pathname.endsWith("next")?"/tests/fixtures/motion.html":"/tests/fixtures/motion.html/next")}>Next screen</button></nav><main ref={route}><article ref={turn.surfaceRef} style={{height:300,background:"#1a2a3a"}}>Chapter {chapter}</article>{busy?<AiThinking label="Preparing your words"/>:null}</main></div>;
}
createRoot(document.getElementById("root")).render(<AuthContext.Provider value={{user:{id:"test",role:"fan"}}}><QueryClientProvider client={new QueryClient()}><BrowserRouter><Fixture/></BrowserRouter></QueryClientProvider></AuthContext.Provider>);
