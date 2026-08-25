import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getOrder: vi.fn(),
    verifyPayment: vi.fn(),
    completePayment: vi.fn(),
}));

vi.mock("@/lib/server/billing-service", () => ({
    getBillingOrderForUser: mocks.getOrder,
    completeBillingOrderPayment: mocks.completePayment,
}));
vi.mock("@/lib/server/payment-transaction-verification", () => ({ verifyPaymentTransaction: mocks.verifyPayment }));

import { checkBillingOrderPaymentForUser } from "./payment-status-service";

const order = { id: "order-one", orderNo: "VZ001", userId: "user-one", provider: "easypay", status: "pending", metadata: null };

describe("EasyPay order status checks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getOrder.mockResolvedValue(order);
    });

    it("completes a pending order after the provider confirms payment", async () => {
        mocks.verifyPayment.mockResolvedValue({
            verified: true,
            payment: { providerTradeId: "trade-one", providerPaymentId: "trade-one", amountCents: 100, currency: "CNY", paidAt: "2026-08-11T00:00:00.000Z", rawPayload: { status: "paid" } },
        });
        mocks.completePayment.mockResolvedValue({ order: { ...order, status: "paid" } });

        await expect(checkBillingOrderPaymentForUser("user-one", "VZ001")).resolves.toMatchObject({ status: "paid" });
        expect(mocks.verifyPayment).toHaveBeenCalledWith("easypay", expect.objectContaining({ orderId: "order-one", orderNo: "VZ001" }), order);
        expect(mocks.completePayment).toHaveBeenCalledWith(expect.objectContaining({ orderId: "order-one", provider: "easypay", verificationSource: "provider" }));
    });

    it("keeps the order pending when the provider has not confirmed payment", async () => {
        mocks.verifyPayment.mockResolvedValue({ verified: false, reason: "pending" });

        await expect(checkBillingOrderPaymentForUser("user-one", "order-one")).resolves.toBe(order);
        expect(mocks.completePayment).not.toHaveBeenCalled();
    });

    it("does not query unrelated payment providers", async () => {
        mocks.getOrder.mockResolvedValue({ ...order, provider: "stripe" });

        await expect(checkBillingOrderPaymentForUser("user-one", "order-one")).resolves.toMatchObject({ provider: "stripe" });
        expect(mocks.verifyPayment).not.toHaveBeenCalled();
    });
});
