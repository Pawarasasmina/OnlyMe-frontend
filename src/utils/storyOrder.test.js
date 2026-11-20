import test from "node:test";
import assert from "node:assert/strict";
import { newestStoriesFirst } from "./storyOrder.js";
test("all stories play newest first regardless of viewed state and API order", () => {
 const old={id:"old",createdAt:"2026-11-20T08:00:00Z",viewed:false};
 const latest={id:"latest",createdAt:"2026-11-20T10:00:00Z",viewed:true};
 const middle={id:"middle",createdAt:"2026-11-20T09:00:00Z",viewed:false};
 const source=[old,latest,middle];
 assert.deepEqual(newestStoriesFirst(source).map(x=>x.id),["latest","middle","old"]);
 assert.deepEqual(source,[old,latest,middle]);
});
test("ties and legacy undated stories use most recently appended first",()=>{
 assert.deepEqual(newestStoriesFirst([{id:1},{id:2}]).map(x=>x.id),[2,1]);
 assert.deepEqual(newestStoriesFirst([]),[]);
});
