import test from "node:test";
import assert from "node:assert/strict";

function daysInclusive(start, end) {
  const a = Date.parse(start + "T00:00:00Z");
  const b = Date.parse(end + "T00:00:00Z");
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

test("contract duration is inclusive", () => {
  assert.equal(daysInclusive("2026-06-18", "2027-06-18"), 366);
});

test("same-day contract has one day", () => {
  assert.equal(daysInclusive("2026-06-18", "2026-06-18"), 1);
});
