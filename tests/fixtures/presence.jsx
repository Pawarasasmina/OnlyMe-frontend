import React from "react";
import { createRoot } from "react-dom/client";
import WallStoryPersonItem from "../../src/components/stories/WallStoryPersonItem";
import "../../src/index.css";
import "../../src/styles/storyEnhancements.css";
import "../../src/styles/presenceMotion.css";
const status = {presetKey:"at_seen", label:"At seen", color:"#9CCBFF"};
createRoot(document.getElementById("root")).render(<>{["new","viewed","empty"].map(state => <div key={state} data-testid={state}><WallStoryPersonItem group={{user:{id:"person",name:"Lina"},stories:state!=="empty"?[{id:"story"}]:[],hasUnseenStories:state==="new",activeStatus:state!=="empty"?status:null}} onOpenStory={()=>{}} /></div>)}</>);
