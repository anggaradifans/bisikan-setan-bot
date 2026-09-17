import assert from "node:assert/strict";
import test from "node:test";
import { advice, bisikan, getResponseList, greeting } from "../response/index.js";

test("response lists contain usable messages", () => {
  assert.ok(bisikan.length > 0);
  assert.ok(advice.length > 0);
  assert.match(getResponseList(["one", "two"]), /^one\ntwo\n$/);
});

test("greeting selects the appropriate salutation", () => {
  const hour = new Date().getHours();
  const expected = hour < 10 ? "Good morning" : hour < 20 ? "Good day" : "Good evening";
  assert.equal(greeting("<@123>"), `${expected}, <@123>`);
});
