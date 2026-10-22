import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("csv export", () => {
  it("neutralises cells a spreadsheet would run as formulas, keeps plain numbers", () => {
    const csv = toCsv([{ title: "t", header: ["a", "b", "c"], rows: [["=HYPERLINK(1)", "-12.5", "@sum"]] }]);
    expect(csv.split("\n")[2]).toBe("'=HYPERLINK(1),-12.5,'@sum");
  });
  it("quotes commas, quotes and line breaks", () => {
    const csv = toCsv([{ title: "t", header: ["a"], rows: [['Beta, "Inc."\nOttawa']] }]);
    expect(csv).toContain('"Beta, ""Inc.""\nOttawa"');
  });
});
