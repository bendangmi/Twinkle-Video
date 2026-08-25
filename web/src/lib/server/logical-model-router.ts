import type { AuthSettings, LogicalModelCapability, SystemModelChannel } from "@/lib/auth/store";
import { channelModelCapability, resolveLogicalModelCapabilityProfile } from "@/lib/model-routing-config";
import { channelSupportsModel, rawModelName } from "./generation-channel";
import { filterHealthyRuntimeCandidates } from "./channel-runtime-health";
import { channelConnectionReady } from "@/lib/channel-protocol-registry";

export type ResolvedLogicalModel = {
    logicalModelId: string;
    upstreamModel: string;
    channelId: string;
    channel: SystemModelChannel;
    credentialMode: "system" | "twinkle-model";
    capabilityProfile?: ReturnType<typeof resolveLogicalModelCapabilityProfile>;
};
export type ModelProviderPreference = "twinkle-model" | "twinkle-video";

export function resolveLogicalModel(
    settings: Pick<AuthSettings, "logicalModels" | "systemChannels">,
    capability: LogicalModelCapability,
    requestedModelId: string,
    preferredChannelId = "",
    providerPreference: ModelProviderPreference = "twinkle-video",
): ResolvedLogicalModel | null {
    return resolveLogicalModelCandidates(settings, capability, requestedModelId, preferredChannelId, providerPreference)[0] || null;
}

export function resolveLogicalModelCandidates(
    settings: Pick<AuthSettings, "logicalModels" | "systemChannels">,
    capability: LogicalModelCapability,
    requestedModelId: string,
    preferredChannelId = "",
    providerPreference: ModelProviderPreference = "twinkle-video",
): ResolvedLogicalModel[] {
    const requested = rawModelName(requestedModelId);
    if (!requested) return [];
    const logical = settings.logicalModels.find((model) => model.enabled && model.capability === capability && model.id.toLowerCase() === requested.toLowerCase());
    if (logical) {
        const bindings = logical.bindings.filter((binding) => binding.enabled).sort((a, b) => a.priority - b.priority || (b.weight || 100) - (a.weight || 100) || a.id.localeCompare(b.id));
        const preferred = preferredChannelId ? bindings.find((binding) => binding.channelId === preferredChannelId) : undefined;
        const resolved: ResolvedLogicalModel[] = [];
        for (const binding of preferred ? [preferred, ...bindings.filter((item) => item !== preferred)] : bindings) {
            const channel = settings.systemChannels.find((item) => item.id === binding.channelId && item.enabled && channelConnectionReady(item) && channelSupportsModel(item.models, binding.upstreamModel));
            if (channel)
                resolved.push({
                    logicalModelId: logical.id,
                    upstreamModel: binding.upstreamModel,
                    channelId: channel.id,
                    channel,
                    credentialMode: "system",
                    capabilityProfile: resolveLogicalModelCapabilityProfile(binding, capability, channel, binding.upstreamModel),
                });
        }
        // Text planning tracks health per channel + upstream model in
        // text-planning-runtime. A channel-level cooldown must not hide a healthy
        // backup text model that shares the same gateway.
        return orderCandidatesByProvider(capability === "text" ? resolved : filterHealthyRuntimeCandidates(resolved, capability), providerPreference);
    }
    if (settings.logicalModels.length) return [];
    const ordered = preferredChannelId ? [...settings.systemChannels.filter((channel) => channel.id === preferredChannelId), ...settings.systemChannels.filter((channel) => channel.id !== preferredChannelId)] : settings.systemChannels;
    const resolved = ordered
        .filter((item) => item.enabled && channelConnectionReady(item) && channelSupportsModel(item.models, requested) && channelModelCapability(item, requested) === capability)
        .map((channel) => ({ logicalModelId: requested, upstreamModel: requested, channelId: channel.id, channel, credentialMode: "system" as const, capabilityProfile: resolveLogicalModelCapabilityProfile({}, capability, channel, requested) }));
    return orderCandidatesByProvider(capability === "text" ? resolved : filterHealthyRuntimeCandidates(resolved, capability), providerPreference);
}

export function orderCandidatesByProvider(candidates: ResolvedLogicalModel[], providerPreference: ModelProviderPreference) {
    if (providerPreference === "twinkle-video") return candidates.map((candidate) => ({ ...candidate, credentialMode: "system" as const }));
    return candidates.map((candidate) => ({ ...candidate, credentialMode: "twinkle-model" as const }));
}

export function resolveLogicalBillingModel(logicalModels: AuthSettings["logicalModels"], capability: LogicalModelCapability, channelId: string, upstreamModel: string, preferredLogicalModelId = "") {
    const matches = logicalModels.filter(
        (logical) => logical.enabled && logical.capability === capability && logical.bindings.some((binding) => binding.enabled && binding.channelId === channelId && channelSupportsModel([binding.upstreamModel], upstreamModel)),
    );
    return matches.find((logical) => logical.id.toLowerCase() === preferredLogicalModelId.trim().toLowerCase())?.id || matches[0]?.id || upstreamModel;
}
