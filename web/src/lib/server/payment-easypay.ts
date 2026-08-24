import { createHash, timingSafeEqual } from "node:crypto";

export const EASY_PAY_PAYMENT_MODES = ["qrcode", "popup"] as const;
export type EasyPayPaymentMode = (typeof EASY_PAY_PAYMENT_MODES)[number];

export function normalizeEasyPayApiBase(value: string) {
    const text = value.trim();
    if (!text) return "";
    try {
        const parsed = new URL(text);
        parsed.search = "";
        parsed.hash = "";
        parsed.pathname = trimEasyPayEndpointPath(parsed.pathname);
        return parsed.toString().replace(/\/+$/, "");
    } catch {
        return trimEasyPayEndpointPath(text).replace(/\/+$/, "");
    }
}

export function easyPaySign(params: Record<string, string>, pkey: string) {
    const content = Object.keys(params)
        .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== "")
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");
    return createHash("md5").update(`${content}${pkey}`).digest("hex");
}

export function verifyEasyPaySign(params: Record<string, string>, pkey: string, signature: string) {
    const expected = Buffer.from(easyPaySign(params, pkey), "utf8");
    const actual = Buffer.from(signature.trim().toLowerCase(), "utf8");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isEasyPaySuccessCode(value: unknown) {
    return value === 1 || String(value || "").trim() === "1";
}

export function normalizeEasyPayStatus(value: unknown): "succeeded" | "pending" | "failed" {
    const status = String(value ?? "")
        .trim()
        .toUpperCase();
    if (["1", "SUCCESS", "TRADE_SUCCESS", "TRADE_FINISHED", "PAID", "SUCCEEDED", "COMPLETED", "OK"].includes(status)) return "succeeded";
    if (["0", "FAILED", "FAIL", "TRADE_CLOSED", "TRADE_FAILED", "CLOSED", "CANCELLED", "CANCELED", "PAYERROR"].includes(status)) return "failed";
    return "pending";
}

export function normalizeEasyPayPaymentType(value: unknown) {
    const type = String(value ?? "")
        .trim()
        .toLowerCase();
    return type === "wxpay" || type === "wechat" || type === "wechatpay" || type === "weixin" ? "wxpay" : "alipay";
}

export function normalizeEasyPayPaymentMode(value: unknown): EasyPayPaymentMode {
    return String(value ?? "")
        .trim()
        .toLowerCase() === "popup"
        ? "popup"
        : "qrcode";
}

export function resolveEasyPayChannelId(paymentType: string, config: Record<string, string>) {
    const key = normalizeEasyPayPaymentType(paymentType) === "wxpay" ? "cidWxpay" : "cidAlipay";
    return config[key]?.trim() || config.cid?.trim() || "";
}

function trimEasyPayEndpointPath(path: string) {
    const normalized = path.trim().replace(/\/+$/, "");
    const lower = normalized.toLowerCase();
    for (const endpoint of ["/submit.php", "/mapi.php", "/api.php"]) {
        if (lower.endsWith(endpoint)) return normalized.slice(0, -endpoint.length).replace(/\/+$/, "");
    }
    return normalized;
}
