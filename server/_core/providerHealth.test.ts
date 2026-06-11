import { beforeEach, describe, expect, it } from "vitest";
import {
  getProviderState,
  recordProviderFailure,
  recordProviderSuccess,
  shouldSkipProvider,
} from "./providerHealth";

describe("providerHealth", () => {
  const provider = "test_provider_health";

  beforeEach(async () => {
    await recordProviderSuccess(provider);
  });

  it("starts healthy", async () => {
    expect(await getProviderState(provider)).toBe("healthy");
    expect(await shouldSkipProvider(provider)).toBe(false);
  });

  it("opens circuit after repeated failures", async () => {
    for (let i = 0; i < 5; i++) {
      await recordProviderFailure(provider);
    }
    expect(await getProviderState(provider)).toBe("open");
    expect(await shouldSkipProvider(provider)).toBe(true);
  });

  it("recovers to healthy after success", async () => {
    await recordProviderFailure(provider);
    await recordProviderSuccess(provider);
    expect(await getProviderState(provider)).toBe("healthy");
  });
});
