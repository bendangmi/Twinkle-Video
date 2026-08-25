import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./responsive-helpers";

const PAGE_SIZE = 8;
const TIMESTAMP = "2026-08-11T00:00:00.000Z";

function couponTemplate(page: number, index: number) {
    return {
        id: `template-${page}-${index}`,
        code: `TEMPLATE-${page}-${index}`,
        name: `可领取活动 ${page}-${index}`,
        description: "浏览器分页回归",
        discountType: "fixed",
        discountValue: 500,
        minimumAmountCents: 0,
        maximumDiscountCents: 500,
        stackWithPromotion: true,
        claimable: true,
        enabled: true,
        startsAt: TIMESTAMP,
        endsAt: "2027-08-11T00:00:00.000Z",
        totalLimit: 100,
        perUserLimit: 1,
        issuedCount: 0,
        redeemedCount: 0,
        productIds: [],
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
    };
}

function claimedCoupon(page: number, index: number) {
    const template = couponTemplate(page, index);
    template.name = `已领取券页 ${page}-${index}`;
    return {
        id: `coupon-${page}-${index}`,
        templateId: template.id,
        userId: "e2e-user",
        status: "available",
        grantSource: "claim",
        claimedAt: TIMESTAMP,
        expiresAt: "2027-08-11T00:00:00.000Z",
        template,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
    };
}

async function mockCouponPages(page: Page) {
    const requests: Array<{ page: number; templatePage: number; includeTemplates: boolean }> = [];
    await page.route(/\/api\/billing\/coupons(?:\?.*)?$/, async (route) => {
        const query = new URL(route.request().url()).searchParams;
        const couponsPage = Number(query.get("page") || "1");
        const templatePage = Number(query.get("templatePage") || "1");
        const includeTemplates = query.get("includeTemplates") === "true";
        requests.push({ page: couponsPage, templatePage, includeTemplates });
        const templatePayload = includeTemplates
            ? {
                  templates: [couponTemplate(templatePage, 1)],
                  templatesTotal: PAGE_SIZE * 2,
                  templatePage,
                  templatePageSize: PAGE_SIZE,
              }
            : {};
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                code: 0,
                data: {
                    coupons: [claimedCoupon(couponsPage, 1)],
                    total: PAGE_SIZE * 2,
                    page: couponsPage,
                    pageSize: PAGE_SIZE,
                    ...templatePayload,
                },
                msg: "OK",
            }),
        });
    });
    return requests;
}

function referralCenter(referralsPage: number, rewardsPage: number) {
    return {
        program: {
            enabled: true,
            inviterPoints: 100,
            inviteeRewardType: "points",
            inviteePoints: 50,
            minimumPaidCents: 100,
            coolingOffDays: 7,
        },
        code: "E2E-REFERRAL",
        link: "http://127.0.0.1/register?ref=E2E-REFERRAL",
        stats: { clicks: 20, registrations: 16, qualified: 8, pending: 2, settled: 6, revoked: 0 },
        referrals: [{ id: `referral-${referralsPage}`, inviteeName: `受邀用户页 ${referralsPage}`, riskStatus: "clear", registeredAt: TIMESTAMP }],
        referralsTotal: PAGE_SIZE * 2,
        referralsPage,
        referralsPageSize: PAGE_SIZE,
        rewards: [
            {
                id: `reward-${rewardsPage}`,
                relationshipId: `relationship-${rewardsPage}`,
                beneficiaryUserId: "e2e-user",
                beneficiaryRole: "inviter",
                rewardType: "points",
                pointsAmount: rewardsPage * 100,
                triggerOrderId: `order-${rewardsPage}`,
                status: "settled",
                settleAfter: TIMESTAMP,
                reason: `奖励页 ${rewardsPage}`,
                createdAt: TIMESTAMP,
            },
        ],
        rewardsTotal: PAGE_SIZE * 2,
        rewardsPage,
        rewardsPageSize: PAGE_SIZE,
    };
}

async function mockReferralPages(page: Page) {
    const requests: Array<{ referralsPage: number; rewardsPage: number }> = [];
    await page.route(/\/api\/referrals(?:\?.*)?$/, async (route) => {
        const query = new URL(route.request().url()).searchParams;
        const referralsPage = Number(query.get("referralsPage") || "1");
        const rewardsPage = Number(query.get("rewardsPage") || "1");
        requests.push({ referralsPage, rewardsPage });
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ code: 0, data: referralCenter(referralsPage, rewardsPage), msg: "OK" }),
        });
    });
    return requests;
}

function billingOrder(status: "pending" | "paid") {
    return {
        id: "e2e-sse-order",
        orderNo: "VZ-E2E-SSE-001",
        userId: "e2e-user",
        productKind: "points",
        status,
        subject: "E2E 支付结果",
        listAmountCents: 1000,
        promotionDiscountCents: 0,
        couponDiscountCents: 0,
        amountCents: 1000,
        currency: "CNY",
        pointsAmount: 100,
        dailyPoints: 0,
        periodDays: 0,
        quantity: 1,
        provider: "e2e",
        createdAt: TIMESTAMP,
        updatedAt: status === "paid" ? "2026-08-11T00:00:01.000Z" : TIMESTAMP,
    };
}

test("coupon wallet paginates claimable templates and owned coupons independently", async ({ page }) => {
    const requests = await mockCouponPages(page);
    await page.goto("/profile?section=coupons", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("可领取活动 1-1", { exact: true })).toBeVisible();
    await expect(page.getByText("已领取券页 1-1", { exact: true })).toBeVisible();
    const paginations = page.locator(".ant-pagination");
    await expect(paginations).toHaveCount(2);

    await paginations.nth(0).locator(".ant-pagination-next button").click();
    await expect(page.getByText("可领取活动 2-1", { exact: true })).toBeVisible();
    await expect(page.getByText("已领取券页 1-1", { exact: true })).toBeVisible();
    expect(requests).toContainEqual({ page: 1, templatePage: 2, includeTemplates: true });

    await paginations.nth(1).locator(".ant-pagination-next button").click();
    await expect(page.getByText("已领取券页 2-1", { exact: true })).toBeVisible();
    await expect(page.getByText("可领取活动 2-1", { exact: true })).toBeVisible();
    expect(requests.some((request) => request.page === 2 && !request.includeTemplates)).toBe(true);
    await expectNoHorizontalOverflow(page, "coupon wallet pagination");
});

test("referral progress and rewards retain separate server pages", async ({ page }) => {
    const requests = await mockReferralPages(page);
    await page.goto("/profile?section=referrals", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("受邀用户页 1", { exact: true })).toBeVisible();
    await expect(page.getByText(/奖励页 1/)).toBeVisible();
    const paginations = page.locator(".ant-pagination");
    await expect(paginations).toHaveCount(2);

    await paginations.nth(0).locator(".ant-pagination-next button").click();
    await expect(page.getByText("受邀用户页 2", { exact: true })).toBeVisible();
    await expect(page.getByText(/奖励页 1/)).toBeVisible();
    expect(requests).toContainEqual({ referralsPage: 2, rewardsPage: 1 });

    await paginations.nth(1).locator(".ant-pagination-next button").click();
    await expect(page.getByText(/奖励页 2/)).toBeVisible();
    await expect(page.getByText("受邀用户页 2", { exact: true })).toBeVisible();
    expect(requests).toContainEqual({ referralsPage: 2, rewardsPage: 2 });
    await expectNoHorizontalOverflow(page, "referral pagination");
});

test("billing result applies the paid SSE event and closes the subscription", async ({ page }) => {
    await page.addInitScript(() => {
        const trackedWindow = window as typeof window & { __billingSseStats?: { created: number; closed: number; active: number } };
        const NativeEventSource = window.EventSource;
        trackedWindow.__billingSseStats = { created: 0, closed: 0, active: 0 };
        class TrackedEventSource extends NativeEventSource {
            constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
                super(url, eventSourceInitDict);
                trackedWindow.__billingSseStats!.created += 1;
                trackedWindow.__billingSseStats!.active += 1;
            }

            override close() {
                const tracked = this as EventSource & { __billingTrackedClosed?: boolean };
                if (!tracked.__billingTrackedClosed) {
                    tracked.__billingTrackedClosed = true;
                    trackedWindow.__billingSseStats!.closed += 1;
                    trackedWindow.__billingSseStats!.active -= 1;
                }
                super.close();
            }
        }
        Object.defineProperty(window, "EventSource", { configurable: true, writable: true, value: TrackedEventSource });
    });

    let eventRequests = 0;
    await page.route(/\/api\/billing\/orders\/VZ-E2E-SSE-001\/check$/, async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, data: { order: billingOrder("pending") }, msg: "支付状态已更新" }) });
    });
    await page.route(/\/api\/billing\/orders\/e2e-sse-order\/events$/, async (route) => {
        eventRequests += 1;
        const serialize = (status: "pending" | "paid") => `data: ${JSON.stringify({ code: 0, data: { order: billingOrder(status) }, msg: "" })}\n\n`;
        await route.fulfill({
            status: 200,
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
            body: `${serialize("pending")}${serialize("paid")}`,
        });
    });

    await page.goto("/billing/success?out_trade_no=VZ-E2E-SSE-001", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "支付成功" })).toBeVisible();
    await expect(page.getByText("VZ-E2E-SSE-001", { exact: true })).toBeVisible();
    await expect(page.getByText("已支付", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "重新检查" })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __billingSseStats?: { created: number; closed: number; active: number } }).__billingSseStats)).toEqual({ created: 1, closed: 1, active: 0 });
    expect(eventRequests).toBe(1);
    await expectNoHorizontalOverflow(page, "billing paid result");
});

test("EasyPay QR checkout stays on the QR page and completes through status check", async ({ page }) => {
    const pendingOrder = {
        ...billingOrder("pending"),
        id: "e2e-easypay-order",
        orderNo: "VZ-E2E-EASYPAY-001",
        provider: "easypay",
        subject: "E2E 易支付二维码",
        amountCents: 100,
        listAmountCents: 100,
    };
    const paidOrder = { ...pendingOrder, status: "paid", paidAt: TIMESTAMP, updatedAt: "2026-08-11T00:00:01.000Z" };
    const product = {
        id: "e2e-easypay-product",
        productKind: "points",
        name: "易支付测试积分包",
        description: "验证二维码支付流程",
        amountCents: 100,
        currency: "CNY",
        pointsAmount: 10,
        dailyPoints: 0,
        periodDays: 0,
        enabled: true,
        sortOrder: 1,
        pricing: { listUnitAmountCents: 100, saleUnitAmountCents: 100, discountCents: 0 },
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
    };

    await page.route(/\/api\/billing\/products$/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, data: { products: [product], paymentProviders: ["easypay"] }, msg: "OK" }) }));
    await page.route(/\/api\/billing\/coupons(?:\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, data: { coupons: [], total: 0, page: 1, pageSize: 50 }, msg: "OK" }) }));
    await page.route(/\/api\/billing\/quotes$/, (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ code: 0, data: { quote: { productId: product.id, quantity: 1, listAmountCents: 100, promotionDiscountCents: 0, couponDiscountCents: 0, payableAmountCents: 100, pricingSnapshot: null } }, msg: "OK" }),
        }),
    );
    await page.route(/\/api\/billing\/orders$/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, data: { order: pendingOrder }, msg: "订单已创建" }) }));
    await page.route(/\/api\/billing\/orders\/e2e-easypay-order\/checkout$/, (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                code: 0,
                data: { checkout: { provider: "easypay", orderId: pendingOrder.id, orderNo: pendingOrder.orderNo, kind: "qr", url: "https://pay.example/qr/e2e", qrContent: "https://pay.example/qr/e2e" } },
                msg: "支付参数已创建",
            }),
        }),
    );
    await page.route(/\/api\/billing\/orders\/e2e-easypay-order\/events$/, (route) =>
        route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" }, body: `data: ${JSON.stringify({ code: 0, data: { order: pendingOrder }, msg: "" })}\n\n` }),
    );
    await page.route(/\/api\/billing\/orders\/e2e-easypay-order\/check$/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 0, data: { order: paidOrder }, msg: "支付状态已更新" }) }));

    await page.goto(`/billing/checkout?product=${product.id}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "确认订单并继续支付" }).click();

    await expect(page.getByRole("heading", { name: "支付订单已创建" })).toBeVisible();
    await expect(page.getByText(`订单号 ${pendingOrder.orderNo}`, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "检查支付结果" })).toBeVisible();
    await expect(page.getByRole("button", { name: "前往支付" })).toHaveCount(0);
    await page.getByRole("button", { name: "检查支付结果" }).click();

    await expect(page.getByRole("heading", { name: "支付成功" })).toBeVisible();
    await expect(page.getByText(pendingOrder.orderNo, { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, "EasyPay QR checkout result");
});
