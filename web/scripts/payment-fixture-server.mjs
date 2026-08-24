import { createHash, createSign } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export function createPaymentFixtureServer(options = {}) {
    const requests = [];
    const server = createServer(async (request, response) => {
        try {
            const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
            const body = await readRequestBody(request);
            requests.push({ method: request.method || "GET", path: url.pathname, headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value || ""])), body });
            await handlePaymentRequest({ request, response, url, body, options });
        } catch (error) {
            sendJson(response, 500, { error: { message: error instanceof Error ? error.message : "payment fixture failed" } });
        }
    });
    return { server, requests };
}

async function handlePaymentRequest({ request, response, url, body, options }) {
    if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { ok: true });
    if (request.method === "GET" && url.pathname === "/payply/query") {
        return sendJson(response, 200, {
            data: {
                status: "succeeded",
                orderId: url.searchParams.get("orderId") || "",
                orderNo: url.searchParams.get("orderNo") || "",
                tradeId: url.searchParams.get("tradeId") || "payply_trade_fixture",
                paymentId: url.searchParams.get("paymentId") || "payply_payment_fixture",
                amountCents: 100,
                currency: "CNY",
                paidAt: new Date().toISOString(),
            },
        });
    }
    if (request.method === "GET" && url.pathname === "/payply/refund-query") return sendJson(response, 200, { data: { status: "succeeded", refundId: url.searchParams.get("refundId") || "payply_refund_fixture" } });
    if (request.method !== "POST") return sendJson(response, 405, { error: { message: "method not allowed" } });
    if (url.pathname === "/stripe/v1/checkout/sessions") return sendJson(response, 200, { id: "cs_fixture", url: "https://checkout.fixture/stripe", expires_at: Math.floor(Date.now() / 1000) + 1800 });
    if (url.pathname === "/stripe/v1/refunds") return sendJson(response, 200, { id: "re_fixture", status: "succeeded" });
    if (url.pathname === "/wechat/v3/pay/transactions/native") return sendJson(response, 200, { code_url: "weixin://wxpay/bizpayurl?pr=fixture" });
    if (url.pathname === "/wechat/v3/refund/domestic/refunds") return sendSignedWechat(response, { refund_id: "wx_refund_fixture", status: "SUCCESS" }, options.wechatPrivateKey);
    if (url.pathname === "/payply/checkout") return sendJson(response, 200, { data: { paymentUrl: "https://checkout.fixture/payply", tradeId: "payply_trade_fixture", paymentId: "payply_payment_fixture" } });
    if (url.pathname === "/payply/refund") return sendJson(response, 200, { data: { status: "success", refundId: "payply_refund_fixture" } });
    if (url.pathname === "/easypay/mapi.php") return handleEasyPayCheckout(response, body, options);
    if (url.pathname === "/easypay/api.php") return handleEasyPayApi(response, url, body, options);
    if (url.pathname === "/alipay/gateway.do") return handleAlipay(response, body, options.alipayPrivateKey);
    return sendJson(response, 404, { error: { message: `payment fixture route not found: ${url.pathname}` } });
}

function handleEasyPayCheckout(response, body, options) {
    const params = parseFormBody(body);
    if (!validateEasyPayRequest(params, options, true)) return sendJson(response, 400, { code: 0, msg: "invalid EasyPay request" });
    return sendJson(response, 200, { code: 1, msg: "success", trade_no: "easypay_trade_fixture", qrcode: "https://checkout.fixture/easypay-qr" });
}

function handleEasyPayApi(response, url, body, options) {
    const params = parseFormBody(body);
    const action = url.searchParams.get("act") || params.get("act");
    if (action === "order") {
        if (params.get("pid") !== options.easypayPid || params.get("key") !== options.easypayPkey) return sendJson(response, 400, { code: 0, msg: "invalid EasyPay credentials" });
        return sendJson(response, 200, { code: 1, trade_status: "TRADE_SUCCESS", out_trade_no: params.get("out_trade_no"), trade_no: "easypay_trade_fixture", money: "12.99" });
    }
    if (action === "refund") {
        if (params.get("pid") !== options.easypayPid || params.get("key") !== options.easypayPkey) return sendJson(response, 400, { code: 0, msg: "invalid EasyPay credentials" });
        return sendJson(response, 200, { code: 1, msg: "success" });
    }
    return sendJson(response, 400, { code: 0, msg: "unsupported EasyPay action" });
}

function parseFormBody(body) {
    return new URLSearchParams(body.toString("utf8"));
}

function validateEasyPayRequest(params, options, requireSignature) {
    if (params.get("pid") !== options.easypayPid || params.get("key")) return false;
    if (!params.get("money") || !params.get("out_trade_no")) return false;
    return !requireSignature || params.get("sign") === easyPaySign(params, options.easypayPkey);
}

function easyPaySign(params, pkey) {
    const content = [...params.entries()]
        .filter(([key, value]) => key !== "sign" && key !== "sign_type" && key !== "key" && value !== "")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");
    return createHash("md5").update(`${content}${pkey}`).digest("hex");
}

function handleAlipay(response, body, privateKey) {
    if (!privateKey) throw new Error("Alipay fixture private key is required");
    const params = new URLSearchParams(body.toString("utf8"));
    const bizContent = parseObject(params.get("biz_content"));
    if (params.get("method") === "alipay.trade.precreate") {
        const result = { code: "10000", msg: "Success", out_trade_no: bizContent.out_trade_no, trade_no: "alipay_trade_fixture", qr_code: "https://checkout.fixture/alipay-qr" };
        return sendSignedAlipay(response, "alipay_trade_precreate_response", result, privateKey);
    }
    if (params.get("method") === "alipay.trade.refund") {
        const result = { code: "10000", msg: "Success", out_trade_no: bizContent.out_trade_no, trade_no: bizContent.trade_no, out_request_no: bizContent.out_request_no };
        return sendSignedAlipay(response, "alipay_trade_refund_response", result, privateKey);
    }
    return sendJson(response, 400, { error: { message: "unsupported Alipay method" } });
}

function sendSignedAlipay(response, key, result, privateKey) {
    const sign = createSign("RSA-SHA256").update(JSON.stringify(result), "utf8").sign(privateKey, "base64");
    sendJson(response, 200, { [key]: result, sign });
}

function sendSignedWechat(response, result, privateKey) {
    if (!privateKey) throw new Error("WeChat fixture private key is required");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = "wechat-fixture-response";
    const rawBody = JSON.stringify(result);
    const signature = createSign("RSA-SHA256").update(`${timestamp}\n${nonce}\n${rawBody}\n`, "utf8").sign(privateKey, "base64");
    sendJson(response, 200, result, {
        "wechatpay-timestamp": timestamp,
        "wechatpay-nonce": nonce,
        "wechatpay-signature": signature,
        "wechatpay-serial": "fixture-platform-serial",
    });
}

async function readRequestBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    return Buffer.concat(chunks);
}

function parseObject(value) {
    try {
        const parsed = JSON.parse(value || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function sendJson(response, status, value, headers = {}) {
    const bytes = Buffer.from(JSON.stringify(value));
    response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": bytes.length, "cache-control": "no-store", ...headers });
    response.end(bytes);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
    const port = Number(process.env.VOZEB_PRO_PAYMENT_FIXTURE_PORT) || 4020;
    const host = process.env.VOZEB_PRO_PAYMENT_FIXTURE_HOST || "127.0.0.1";
    const fixture = createPaymentFixtureServer({ alipayPrivateKey: process.env.VOZEB_PRO_PAYMENT_FIXTURE_ALIPAY_PRIVATE_KEY });
    fixture.server.listen(port, host, () => console.log(`Payment fixture ready at http://${host}:${port}`));
}
