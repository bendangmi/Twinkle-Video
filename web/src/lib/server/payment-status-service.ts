import { completeBillingOrderPayment, getBillingOrderForUser } from "@/lib/server/billing-service";
import { isAutomaticallyExpiredOrder } from "@/lib/server/billing-service-helpers";
import { normalizePaymentProvider } from "@/lib/payment-provider";
import { verifyPaymentTransaction } from "@/lib/server/payment-transaction-verification";

export async function checkBillingOrderPaymentForUser(userId: string, orderReference: string) {
    const order = await getBillingOrderForUser(userId, orderReference);
    const provider = normalizePaymentProvider(order.provider);
    if (provider !== "easypay" || (order.status !== "pending" && !isAutomaticallyExpiredOrder(order))) return order;

    const verification = await verifyPaymentTransaction(
        provider,
        {
            eventId: `status-check:${order.id}`,
            eventType: "easypay.status_check",
            orderId: order.id,
            orderNo: order.orderNo,
            status: "ignored",
            payload: { source: "user_status_check" },
            signatureValid: true,
        },
        order,
    );
    if (!verification.verified) return order;

    return (
        await completeBillingOrderPayment({
            orderId: order.id,
            provider,
            channel: "easypay.status_check",
            providerTradeId: verification.payment.providerTradeId,
            providerPaymentId: verification.payment.providerPaymentId,
            amountCents: verification.payment.amountCents,
            currency: verification.payment.currency,
            rawPayload: verification.payment.rawPayload,
            paidAt: verification.payment.paidAt,
            verificationSource: "provider",
        })
    ).order;
}
