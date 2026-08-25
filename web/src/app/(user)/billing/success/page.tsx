import { BillingResultPage } from "../billing-result-page";
import { resolveBillingResultOrderReference } from "../billing-result-order-reference";

export default async function BillingSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <BillingResultPage mode="success" orderId={resolveBillingResultOrderReference(await searchParams)} />;
}
