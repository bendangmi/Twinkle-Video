import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ processWebhook: vi.fn() }));

vi.mock("@/lib/server/payment-webhook-service", () => ({ processPaymentWebhook: mocks.processWebhook }));

import { GET, POST } from "./route";

describe("payment webhook route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.processWebhook.mockResolvedValue({ received: true, provider: "easypay", eventId: "event-one", eventType: "easypay.trade_success" });
    });

    it("accepts EasyPay GET notifications and acknowledges them as plain text", async () => {
        const response = await GET(new Request("https://app.test/api/billing/webhooks/easypay?out_trade_no=VZ001&trade_status=TRADE_SUCCESS&sign=signed"), {
            params: Promise.resolve({ provider: "easypay" }),
        });

        expect(response.headers.get("content-type")).toContain("text/plain");
        expect(await response.text()).toBe("success");
        expect(mocks.processWebhook).toHaveBeenCalledWith(expect.objectContaining({ provider: "easypay", rawBody: "out_trade_no=VZ001&trade_status=TRADE_SUCCESS&sign=signed" }));
    });

    it("acknowledges EasyPay POST notifications as plain text", async () => {
        const response = await POST(new Request("https://app.test/api/billing/webhooks/easypay", { method: "POST", body: "out_trade_no=VZ001" }), {
            params: Promise.resolve({ provider: "easypay" }),
        });

        expect(await response.text()).toBe("success");
    });

    it("asks EasyPay to retry when provider verification is pending", async () => {
        mocks.processWebhook.mockResolvedValue({ received: true, provider: "easypay", eventId: "event-one", eventType: "easypay.trade_success", pendingVerification: true });

        const response = await GET(new Request("https://app.test/api/billing/webhooks/easypay?out_trade_no=VZ001"), { params: Promise.resolve({ provider: "easypay" }) });

        expect(await response.text()).toBe("fail");
    });
});
