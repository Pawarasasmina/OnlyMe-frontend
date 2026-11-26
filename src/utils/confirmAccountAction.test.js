import assert from "node:assert/strict";
import test from "node:test";
import { confirmAccountAction } from "./confirmAccountAction.js";

test("cancelled or invalid reasons never reach confirmation", async () => {
  for (const reason of [null, "", "  ", "ab"]) {
    assert.equal(await confirmAccountAction({ prompt: async () => reason, confirm: () => assert.fail("must not confirm") }, { title: "Suspend @test?" }), null);
  }
});
test("confirmation shows target and reason; cancellation prevents the action", async () => {
  for (const approved of [true, false]) {
    const result = await confirmAccountAction({ prompt: async () => "  Policy violation  ", confirm: async (options) => {
      assert.equal(options.title, "Suspend @test?");
      assert.match(options.description, /Reason: Policy violation/);
      return approved;
    } }, { title: "Suspend @test?" });
    assert.equal(result, approved ? "Policy violation" : null);
  }
});
