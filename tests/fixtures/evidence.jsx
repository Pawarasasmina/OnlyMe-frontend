import {createRoot} from "react-dom/client";
import {useEffect,useState} from "react";
import MessageEvidencePreview from "../../src/components/admin/MessageEvidencePreview";
import "../../src/index.css";

function Fixture(){
  const [media,setMedia]=useState(null);
  useEffect(()=>{
    let urls=[];let cancelled=false;
    async function generate(){
      const wav=new ArrayBuffer(16044),view=new DataView(wav);
      const text=(offset,value)=>{[...value].forEach((char,i)=>view.setUint8(offset+i,char.charCodeAt(0)));};
      text(0,"RIFF");view.setUint32(4,16036,true);text(8,"WAVEfmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,"data");view.setUint32(40,16000,true);
      const audio=URL.createObjectURL(new Blob([wav],{type:"audio/wav"}));urls.push(audio);
      const canvas=document.createElement("canvas");canvas.width=160;canvas.height=160;document.body.appendChild(canvas);
      const ctx=canvas.getContext("2d");ctx.fillStyle="#258a7f";ctx.fillRect(0,0,160,160);
      const stream=canvas.captureStream(0),recorder=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp8"}),chunks=[];
      const done=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=resolve;});
      recorder.start();let frames=0;const timer=setInterval(()=>{ctx.fillStyle=++frames%2?"#258a7f":"#286a90";ctx.fillRect(0,0,160,160);stream.getVideoTracks()[0].requestFrame();},70);
      await new Promise(resolve=>setTimeout(resolve,1500));recorder.stop();await done;clearInterval(timer);stream.getTracks().forEach(track=>track.stop());canvas.remove();
      const video=URL.createObjectURL(new Blob(chunks,{type:"video/webm;codecs=vp8"}));urls.push(video);
      if(!cancelled)setMedia({audio,video,image:canvas.toDataURL()});
    }
    generate();return()=>{cancelled=true;urls.forEach(url=>URL.revokeObjectURL(url));};
  },[]);
  if(!media)return <p>Preparing evidence</p>;
  const legacy=new URLSearchParams(location.search).has("legacy");
  const report={snapshot:{...(legacy?{}:{evidenceVersion:1,frozenAt:"2026-11-25T10:00:00Z"}),messages:[{messageId:"photo",body:"Reported photo",disappearAfterSeconds:0,image:{url:media.image}},{messageId:"voice",body:"Reported voice",audio:{url:media.audio}},{messageId:"video",body:"Reported circle",video:{url:media.video}}]}};
  return <main style={{maxWidth:780,margin:"auto",padding:20,background:"white",color:"#0f172a"}}><h1>Captured evidence</h1><MessageEvidencePreview report={report}/></main>;
}
createRoot(document.getElementById("root")).render(<Fixture/>);
