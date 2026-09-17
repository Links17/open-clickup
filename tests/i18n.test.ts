import { describe, it, expect } from "vitest";
import { DEFAULT_LOCALE, displayLabel, translate, zh, en } from "@/lib/i18n";

describe("i18n", () => {
  it("defaults to Chinese", () => {
    expect(DEFAULT_LOCALE).toBe("zh");
    expect(translate(zh, "nav.home")).toBe("首页");
  });

  it("interpolates vars and falls back to the key", () => {
    expect(translate(zh, "modules.layerCount", { count: 3 })).toBe("3 个分层");
    expect(translate(en, "modules.layerCount", { count: 3 })).toBe("3 layer(s)");
    expect(translate(zh, "missing.key")).toBe("missing.key");
  });

  it("leaves unknown stored names unchanged", () => {
    const t = (key: string) => translate(zh, key);
    expect(displayLabel(t, "List")).toBe("列表");
    expect(displayLabel(t, "My custom field")).toBe("My custom field");
  });
});
