import test from "node:test";
import assert from "node:assert/strict";
import { prependCreatedWallPosts } from "./wallCreatedPosts.js";
test("confirmed publications stay first despite recommendation refetch order and are not duplicated", () => {
  const created={id:"new",text:"latest"};
  const result=prependCreatedWallPosts([{id:"old"},{id:"new",text:"server"},{id:"share-new"}], [created]);
  assert.deepEqual(result.map(post=>post.id),["new","old","share-new"]);
  assert.equal(result[0].text,"latest");
});
test("multiple new notes retain newest-first order",()=>{
  assert.deepEqual(prependCreatedWallPosts([{id:"first"}], [{id:"second"}]).map(post=>post.id),["second","first"]);
});
