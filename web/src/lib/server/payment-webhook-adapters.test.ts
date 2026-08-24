import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { PaymentRuntimeConfig } from "./payment-config-store";
import { easyPaySign } from "./payment-easypay";
import { resolveWebhookAdapter } from "./payment-webhook-adapters";

const alipayKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const alipayPublicKey = alipayKeyPair.publicKey.export({ type: "spki", format: "pem" }).toString();

describe("Alipay payment webhook adapter", () => {
    it("verifies and parses the shared official/face-to-face callback", () => {
        const params = signedAlipayCallback();
        const parsed = resolveWebhookAdapter("alipay").parse("alipay", params.toString(), new Headers(), alipayConfig());

        expect(parsed).toMatchObject({
            signatureValid: true,
            status: "succeeded",
            eventType: "alipay.trade_success",
            orderId: "order-one",
            orderNo: "VZ001",
            providerTradeId: "2026072800000001",
            amountCents: 1299,
            currency: "CNY",
        });
    });

    it("rejects callback data changed after signing", () => {
        const params = signedAlipayCallback();
        params.set("total_amount", "0.01");

        const parsed = resolveWebhookAdapter("alipay").parse("alipay", params.toString(), new Headers(), alipayConfig());

        expect(parsed.signatureValid).toBe(false);
    });
});

describe("EasyPay payment webhook adapter", () => {
    it("verifies and parses the standard form callback", () => {
        const params = signedEasyPayCallback();
        const parsed = resolveWebhookAdapter("easypay").parse("easypay", params.toString(), new Headers(), easyPayConfig());

        expect(parsed).toMatchObject({
            signatureValid: true,
            status: "succeeded",
            eventType: "easypay.trade_success",
            orderNo: "VZ001",
            providerTradeId: "epay-trade-1",
            amountCents: 1299,
            currency: "CNY",
        });
    });

    it("rejects EasyPay callback data changed after signing", () => {
        const params = signedEasyPayCallback();
        params.set("money", "0.01");

        const parsed = resolveWebhookAdapter("easypay").parse("easypay", params.toString(), new Headers(), easyPayConfig());

        expect(parsed.signatureValid).toBe(false);
    });
});

function signedAlipayCallback() {
    const params = new URLSearchParams({
        app_id: "2026000000000000",
        sign_type: "RSA2",
        notify_id: "notify-one",
        trade_no: "2026072800000001",
        trade_status: "TRADE_SUCCESS",
        out_trade_no: "VZ001",
        passback_params: encodeURIComponent("order-one"),
        total_amount: "12.99",
        gmt_payment: "2026-07-28 16:20:00",
    });
    const content = [...params.entries()]
        .filter(([key, value]) => key !== "sign_type" && value !== "")
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");
    params.set("sign", createSign("RSA-SHA256").update(content, "utf8").sign(alipayKeyPair.privateKey, "base64"));
    return params;
}

function alipayConfig(): PaymentRuntimeConfig {
    return {
        saved: { providers: {} },
        providers: { alipay: { enabled: true, saved: true } },
        valuesByEnvName: {
            VOZEB_PRO_ALIPAY_MODE: "face_to_face",
            VOZEB_PRO_ALIPAY_APP_ID: "2026000000000000",
            VOZEB_PRO_ALIPAY_PUBLIC_KEY: alipayPublicKey,
        },
    };
}

function signedEasyPayCallback() {
    const params = new URLSearchParams({
        pid: "epay-pid",
        notify_id: "epay-notify-1",
        trade_no: "epay-trade-1",
        trade_status: "TRADE_SUCCESS",
        out_trade_no: "VZ001",
        money: "12.99",
        notify_time: "2026-07-28 16:20:00",
    });
    params.set("sign", easyPaySign(Object.fromEntries(params.entries()), "epay-pkey"));
    params.set("sign_type", "MD5");
    return params;
}

function easyPayConfig(): PaymentRuntimeConfig {
    return {
        saved: { providers: {} },
        providers: { easypay: { enabled: true, saved: true } },
        valuesByEnvName: { VOZEB_PRO_EASYPAY_PID: "epay-pid", VOZEB_PRO_EASYPAY_PKEY: "epay-pkey" },
    };
}
