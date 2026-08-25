export function resolveBillingResultOrderReference(searchParams: Record<string, string | string[] | undefined>) {
    for (const key of ["orderId", "out_trade_no", "orderNo", "order_no"]) {
        const value = searchParams[key];
        const reference = (Array.isArray(value) ? value[0] : value)?.trim();
        if (reference) return reference;
    }
    return "";
}
