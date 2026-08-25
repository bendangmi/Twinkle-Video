import { describe, expect, it } from "vitest";

import { resolveBillingResultOrderReference } from "./billing-result-order-reference";

describe("billing result order reference", () => {
    it("prefers the internal order ID", () => {
        expect(resolveBillingResultOrderReference({ orderId: " order-one ", out_trade_no: "VZ001" })).toBe("order-one");
    });

    it("accepts the EasyPay return order number", () => {
        expect(resolveBillingResultOrderReference({ out_trade_no: " VZ001 " })).toBe("VZ001");
    });
});
