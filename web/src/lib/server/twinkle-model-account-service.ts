import { getAuthSettings } from "@/lib/auth/store";
import { deleteTwinkleModelBinding, readTwinkleModelBinding, upsertTwinkleModelBinding, type StoredTwinkleModelApiKey, type TwinkleModelProviderPreference } from "@/lib/server/database/twinkle-model-binding-repository";
import { fetchSafeOutbound } from "@/lib/server/safe-outbound-fetch";
import { decryptSecretValue, encryptSecretValue } from "@/lib/server/secret-crypto";

type TwinkleTokenPair = { accessToken: string; refreshToken: string; expiresIn: number };
type TwinkleApiKey = { key: string; name: string; origin: string; status: string; templateId: string };

export class TwinkleModelAccountError extends Error {
    constructor(
        message: string,
        readonly status = 400,
    ) {
        super(message);
        this.name = "TwinkleModelAccountError";
    }
}

const bindingQueues = new Map<string, Promise<unknown>>();

export async function bindTwinkleModelAccount(input: { userId: string; email: string; password: string }) {
    return withBindingQueue(input.userId, async () => {
        const email = input.email.trim().toLowerCase();
        if (!email || !input.password) throw new TwinkleModelAccountError("请输入 Twinkle Model 邮箱和密码");
        const settings = await getAuthSettings();
        const baseUrl = settings.twinkleModel.baseUrl;
        const tokens = await login(baseUrl, email, input.password);
        const existing = await readTwinkleModelBinding(input.userId);
        const now = new Date().toISOString();
        const binding = await upsertTwinkleModelBinding({
            userId: input.userId,
            providerBaseUrl: baseUrl,
            accountEmail: email,
            accessTokenCiphertext: encryptSecretValue(tokens.accessToken),
            refreshTokenCiphertext: encryptSecretValue(tokens.refreshToken),
            accessTokenExpiresAt: expiresAt(tokens.expiresIn),
            status: "active",
            providerPreference: existing?.providerPreference || "twinkle-model",
            apiKeys: existing?.providerBaseUrl === baseUrl && existing.accountEmail === email ? existing.apiKeys : [],
            lastVerifiedAt: now,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
        });
        return publicBinding(binding, baseUrl);
    });
}

export async function getTwinkleModelBindingStatus(userId: string) {
    const [binding, settings] = await Promise.all([readTwinkleModelBinding(userId), getAuthSettings()]);
    return publicBinding(binding, settings.twinkleModel.baseUrl);
}

export async function setTwinkleModelProviderPreference(userId: string, providerPreference: TwinkleModelProviderPreference) {
    return withBindingQueue(userId, async () => {
        const binding = await readTwinkleModelBinding(userId);
        if (!binding && providerPreference === "twinkle-model") throw new TwinkleModelAccountError("请先绑定 Twinkle Model 账号", 409);
        if (!binding) return getTwinkleModelBindingStatus(userId);
        const updatedAt = new Date().toISOString();
        const updated = await upsertTwinkleModelBinding({ ...binding, providerPreference, updatedAt });
        const settings = await getAuthSettings();
        return publicBinding(updated, settings.twinkleModel.baseUrl);
    });
}

export async function unbindTwinkleModelAccount(userId: string) {
    await withBindingQueue(userId, () => deleteTwinkleModelBinding(userId));
    const settings = await getAuthSettings();
    return publicBinding(null, settings.twinkleModel.baseUrl);
}

export async function twinkleModelRoutingPreference(userId: string): Promise<TwinkleModelProviderPreference> {
    const [binding, settings] = await Promise.all([readTwinkleModelBinding(userId), getAuthSettings()]);
    if (!binding || binding.providerPreference !== "twinkle-model" || binding.status !== "active" || binding.providerBaseUrl !== settings.twinkleModel.baseUrl) return "twinkle-video";
    return "twinkle-model";
}

export async function resolveTwinkleModelChannelCredential(userId: string, input: { templateId?: string; defaultKeyName?: string; forceRefresh?: boolean }) {
    return withBindingQueue(userId, async () => {
        const settings = await getAuthSettings();
        let binding = await readTwinkleModelBinding(userId);
        if (!binding || binding.status !== "active") throw new TwinkleModelAccountError("Twinkle Model 账号未绑定或需要重新绑定", 409);
        if (binding.providerBaseUrl !== settings.twinkleModel.baseUrl) throw new TwinkleModelAccountError("Twinkle Model 地址已变更，请重新绑定账号", 409);

        const templateId = input.templateId?.trim() || "";
        if (templateId && !input.forceRefresh) {
            const cached = binding.apiKeys.find((item) => item.templateId === templateId);
            if (cached) return { apiKey: decryptSecretValue(cached.keyCiphertext), templateId: cached.templateId, templateName: cached.templateName };
        }

        const listed = await listActiveDefaultKeys(binding, input.defaultKeyName?.trim());
        binding = listed.binding;
        const matches = templateId ? listed.keys.filter((item) => item.templateId === templateId) : listed.keys.filter((item) => item.name === input.defaultKeyName?.trim());
        if (!templateId && !input.defaultKeyName?.trim()) throw new TwinkleModelAccountError("Twinkle Model 渠道缺少默认密钥名称", 400);
        if (matches.length > 1) throw new TwinkleModelAccountError(`Twinkle Model 中存在多个同名默认密钥“${input.defaultKeyName}”，请先处理重名`, 409);
        const matched = matches[0];
        if (!matched) throw new TwinkleModelAccountError(templateId ? "当前 Twinkle Model 账号没有该默认密钥，请检查密钥状态" : `未找到默认密钥“${input.defaultKeyName}”`, 404);

        const now = new Date().toISOString();
        const cached: StoredTwinkleModelApiKey = { templateId: matched.templateId, templateName: matched.name, keyCiphertext: encryptSecretValue(matched.key), updatedAt: now };
        const apiKeys = [...binding.apiKeys.filter((item) => item.templateId !== matched.templateId), cached];
        await upsertTwinkleModelBinding({ ...binding, apiKeys, lastVerifiedAt: now, updatedAt: now });
        return { apiKey: matched.key, templateId: matched.templateId, templateName: matched.name };
    });
}

async function listActiveDefaultKeys(binding: NonNullable<Awaited<ReturnType<typeof readTwinkleModelBinding>>>, search = "") {
    let current = binding;
    let accessToken = decryptSecretValue(current.accessTokenCiphertext);
    if (current.accessTokenExpiresAt && Date.parse(current.accessTokenExpiresAt) <= Date.now()) {
        current = await refreshBinding(current);
        accessToken = decryptSecretValue(current.accessTokenCiphertext);
    }
    let response = await listKeys(current.providerBaseUrl, accessToken, search);
    if (response.status === 401) {
        current = await refreshBinding(current);
        accessToken = decryptSecretValue(current.accessTokenCiphertext);
        response = await listKeys(current.providerBaseUrl, accessToken, search);
    }
    if (!response.ok) throw new TwinkleModelAccountError(providerError(response.payload, "获取 Twinkle Model 默认密钥失败"), response.status >= 500 ? 502 : response.status);
    return { binding: current, keys: response.keys.filter((item) => item.origin === "system_default" && item.status === "active") };
}

async function refreshBinding(binding: NonNullable<Awaited<ReturnType<typeof readTwinkleModelBinding>>>) {
    const refreshToken = decryptSecretValue(binding.refreshTokenCiphertext);
    try {
        const tokens = await refresh(binding.providerBaseUrl, refreshToken);
        const now = new Date().toISOString();
        return await upsertTwinkleModelBinding({
            ...binding,
            accessTokenCiphertext: encryptSecretValue(tokens.accessToken),
            refreshTokenCiphertext: encryptSecretValue(tokens.refreshToken),
            accessTokenExpiresAt: expiresAt(tokens.expiresIn),
            status: "active",
            lastVerifiedAt: now,
            updatedAt: now,
        });
    } catch (error) {
        const updatedAt = new Date().toISOString();
        await upsertTwinkleModelBinding({ ...binding, status: "needs_rebind", updatedAt });
        throw error instanceof TwinkleModelAccountError ? new TwinkleModelAccountError("Twinkle Model 登录已失效，请重新绑定", 409) : error;
    }
}

async function login(baseUrl: string, email: string, password: string) {
    const response = await panelRequest(baseUrl, "/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (!response.ok) throw new TwinkleModelAccountError(providerError(response.payload, "Twinkle Model 登录失败，请检查邮箱和密码"), response.status >= 500 ? 502 : response.status);
    return parseTokenPair(response.payload);
}

async function refresh(baseUrl: string, refreshToken: string) {
    const response = await panelRequest(baseUrl, "/api/v1/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
    if (!response.ok) throw new TwinkleModelAccountError(providerError(response.payload, "Twinkle Model 登录已失效，请重新绑定"), response.status >= 500 ? 502 : response.status);
    return parseTokenPair(response.payload);
}

async function listKeys(baseUrl: string, accessToken: string, search: string) {
    const keys: TwinkleApiKey[] = [];
    let page = 1;
    let pages = 1;
    let payload: unknown;
    let status = 200;
    do {
        const query = new URLSearchParams({ page: String(page), page_size: "1000", ...(search ? { search } : {}) });
        const response = await panelRequest(baseUrl, `/api/v1/keys?${query}`, { headers: { authorization: `Bearer ${accessToken}` } });
        payload = response.payload;
        status = response.status;
        if (!response.ok) return { ok: false as const, status, payload, keys: [] as TwinkleApiKey[] };
        const data = envelopeData(payload);
        const items = Array.isArray(data?.items) ? data.items : [];
        keys.push(...items.map(parseApiKey).filter((item): item is TwinkleApiKey => Boolean(item)));
        pages = positiveInteger(data?.pages) || page;
        page += 1;
    } while (page <= pages);
    return { ok: true as const, status, payload, keys };
}

async function panelRequest(baseUrl: string, path: string, init: RequestInit) {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    try {
        const response = await fetchSafeOutbound(new URL(path, `${baseUrl}/`), { ...init, headers, cache: "no-store", redirect: "error" });
        const payload = await response.json().catch(() => null);
        const code = payload && typeof payload === "object" ? Number((payload as Record<string, unknown>).code) : NaN;
        return { ok: response.ok && (!Number.isFinite(code) || code === 0), status: response.status, payload };
    } catch {
        throw new TwinkleModelAccountError("无法连接 Twinkle Model，请检查服务地址", 502);
    }
}

function parseTokenPair(payload: unknown): TwinkleTokenPair {
    const data = envelopeData(payload);
    const accessToken = text(data?.access_token);
    const refreshToken = text(data?.refresh_token);
    const expiresIn = positiveInteger(data?.expires_in);
    if (!accessToken || !refreshToken || !expiresIn) throw new TwinkleModelAccountError("Twinkle Model 登录响应缺少有效令牌", 502);
    return { accessToken, refreshToken, expiresIn };
}

function parseApiKey(value: unknown): TwinkleApiKey | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    const key = text(item.key);
    const templateId = text(item.template_id);
    if (!key || !templateId) return null;
    return { key, templateId, name: text(item.name), origin: text(item.origin), status: text(item.status) };
}

function publicBinding(binding: Awaited<ReturnType<typeof readTwinkleModelBinding>>, configuredBaseUrl: string) {
    const addressChanged = Boolean(binding && binding.providerBaseUrl !== configuredBaseUrl);
    return {
        bound: Boolean(binding),
        accountEmail: binding ? maskEmail(binding.accountEmail) : "",
        status: binding ? (addressChanged ? "needs_rebind" : binding.status) : "unbound",
        providerPreference: binding?.providerPreference || "twinkle-video",
        baseUrl: configuredBaseUrl,
        lastVerifiedAt: binding?.lastVerifiedAt,
    } as const;
}

function envelopeData(payload: unknown): Record<string, unknown> | undefined {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
    const data = (payload as Record<string, unknown>).data;
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : undefined;
}

function providerError(payload: unknown, fallback: string) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return fallback;
    const message = text((payload as Record<string, unknown>).message);
    return message && message.toLowerCase() !== "success" ? message.slice(0, 300) : fallback;
}

function maskEmail(email: string) {
    const [name, domain] = email.split("@");
    if (!domain) return "***";
    return `${name.slice(0, 2)}***@${domain}`;
}

function expiresAt(expiresIn: number) {
    return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function positiveInteger(value: unknown) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function text(value: unknown) {
    return typeof value === "string" ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

async function withBindingQueue<T>(userId: string, operation: () => Promise<T>) {
    const previous = bindingQueues.get(userId) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    bindingQueues.set(userId, current);
    try {
        return await current;
    } finally {
        if (bindingQueues.get(userId) === current) bindingQueues.delete(userId);
    }
}
