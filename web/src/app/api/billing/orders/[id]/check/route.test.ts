import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    checkPayment: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/server/payment-status-service", () => ({ checkBillingOrderPaymentForUser: mocks.checkPayment }));
vi.mock("@/lib/server/billing-service", () => ({ isBillingInputError: vi.fn(() => false) }));

import { POST } from "./route";

describe("POST /api/billing/orders/[id]/check", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getCurrentUser.mockResolvedValue({ id: "user-one" });
        mocks.checkPayment.mockResolvedValue({ id: "order-one", orderNo: "VZ001", status: "paid" });
    });

    it("checks an owned order by EasyPay order number", async () => {
        const response = await POST(new Request("https://app.test/api/billing/orders/VZ001/check", { method: "POST" }), { params: Promise.resolve({ id: "VZ001" }) });

        expect(await response.json()).toEqual({ code: 0, data: { order: { id: "order-one", orderNo: "VZ001", status: "paid" } }, msg: "支付状态已更新" });
        expect(mocks.checkPayment).toHaveBeenCalledWith("user-one", "VZ001");
    });

    it("requires authentication", async () => {
        mocks.getCurrentUser.mockResolvedValue(null);

        const response = await POST(new Request("https://app.test/api/billing/orders/VZ001/check", { method: "POST" }), { params: Promise.resolve({ id: "VZ001" }) });

        expect(response.status).toBe(401);
        expect(mocks.checkPayment).not.toHaveBeenCalled();
    });
});
