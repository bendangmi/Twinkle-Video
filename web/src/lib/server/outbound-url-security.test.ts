import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));

import { isProxyRoutedIpAddress, isSafeOutboundUrl, resolveSafeOutboundTarget } from "./outbound-url-security";

describe("outbound url security", () => {
    beforeEach(() => {
        mocks.lookup.mockReset();
        vi.unstubAllEnvs();
    });

    it("resolves a public hostname once and returns the exact address to connect", async () => {
        mocks.lookup.mockResolvedValue([
            { address: "8.8.8.8", family: 4 },
            { address: "8.8.4.4", family: 4 },
        ]);

        await expect(resolveSafeOutboundTarget("https://provider.example/v1/models")).resolves.toMatchObject({ address: "8.8.8.8", family: 4 });
        expect(mocks.lookup).toHaveBeenCalledWith("provider.example", { all: true, verbatim: true });
    });

    it("prefers a validated IPv4 address when localhost resolves to both address families", async () => {
        vi.stubEnv("VOZEB_PRO_ALLOW_PRIVATE_UPSTREAMS", "1");
        vi.stubEnv("VOZEB_PRO_PRIVATE_UPSTREAM_HOSTS", "localhost");
        mocks.lookup.mockResolvedValue([
            { address: "::1", family: 6 },
            { address: "127.0.0.1", family: 4 },
        ]);

        await expect(resolveSafeOutboundTarget("http://localhost:5199/v1/models")).resolves.toMatchObject({ address: "127.0.0.1", family: 4 });
    });

    it("rejects mixed public and private DNS answers", async () => {
        mocks.lookup.mockResolvedValue([
            { address: "8.8.8.8", family: 4 },
            { address: "10.0.0.8", family: 4 },
        ]);
        await expect(isSafeOutboundUrl("https://provider.example/result")).resolves.toBe(false);
    });

    it("rejects documentation, benchmark, link-local, and multicast addresses", async () => {
        for (const address of ["192.0.2.1", "198.18.0.1", "198.51.100.2", "203.0.113.3", "169.254.169.254", "224.0.0.1"]) {
            await expect(isSafeOutboundUrl(`http://${address}/result`)).resolves.toBe(false);
        }
        await expect(isSafeOutboundUrl("http://[::ffff:127.0.0.1]/result")).resolves.toBe(false);
    });

    it("marks only benchmark-network addresses for proxy routing", () => {
        expect(isProxyRoutedIpAddress("198.18.0.113")).toBe(true);
        expect(isProxyRoutedIpAddress("198.20.0.113")).toBe(false);
        expect(isProxyRoutedIpAddress("8.8.8.8")).toBe(false);
    });

    it("allows exact private hosts only when explicitly enabled and never allows metadata addresses", async () => {
        vi.stubEnv("VOZEB_PRO_ALLOW_PRIVATE_UPSTREAMS", "1");
        vi.stubEnv("VOZEB_PRO_PRIVATE_UPSTREAM_HOSTS", "localhost,provider.internal,169.254.169.254");
        mocks.lookup.mockResolvedValue([{ address: "10.0.0.8", family: 4 }]);

        await expect(isSafeOutboundUrl("http://provider.internal:11434/v1/models")).resolves.toBe(true);
        await expect(isSafeOutboundUrl("http://localhost:11434/v1/models")).resolves.toBe(true);
        await expect(isSafeOutboundUrl("http://169.254.169.254/latest/meta-data")).resolves.toBe(false);
        await expect(isSafeOutboundUrl("http://metadata.google.internal/computeMetadata/v1")).resolves.toBe(false);
    });

    it("allows an explicitly authorized host on the benchmark network", async () => {
        vi.stubEnv("VOZEB_PRO_ALLOW_PRIVATE_UPSTREAMS", "1");
        vi.stubEnv("VOZEB_PRO_PRIVATE_UPSTREAM_HOSTS", "big-model.smart-agi.com");
        mocks.lookup.mockResolvedValue([{ address: "198.18.0.90", family: 4 }]);

        await expect(resolveSafeOutboundTarget("https://big-model.smart-agi.com/v1/models")).resolves.toMatchObject({ address: "198.18.0.90", family: 4 });
    });
});
