import { readJsonDataFile, writeJsonDataFile } from "@/lib/server/data-adapter";
import { ensurePostgresSchema, getDatabaseProvider, postgresQuery, type QueryExecutor } from "@/lib/server/database/postgres";

export type TwinkleModelProviderPreference = "twinkle-model" | "twinkle-video";
export type TwinkleModelBindingStatus = "active" | "needs_rebind";

export type StoredTwinkleModelApiKey = {
    templateId: string;
    templateName: string;
    keyCiphertext: string;
    updatedAt: string;
};

export type StoredTwinkleModelBinding = {
    userId: string;
    providerBaseUrl: string;
    accountEmail: string;
    accessTokenCiphertext: string;
    refreshTokenCiphertext: string;
    accessTokenExpiresAt?: string;
    status: TwinkleModelBindingStatus;
    providerPreference: TwinkleModelProviderPreference;
    apiKeys: StoredTwinkleModelApiKey[];
    lastVerifiedAt?: string;
    createdAt: string;
    updatedAt: string;
};

export type TwinkleModelBindingDatabase = { version: 1; bindings: StoredTwinkleModelBinding[] };

export const TWINKLE_MODEL_BINDINGS_FILE = "twinkle-model-bindings.json";
let mutationQueue = Promise.resolve();

export async function readTwinkleModelBinding(userId: string) {
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        const result = await postgresQuery("SELECT * FROM twinkle_model_bindings WHERE user_id = $1", [userId]);
        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }
    const db = await readFileDatabase();
    return db.bindings.find((item) => item.userId === userId) || null;
}

export async function upsertTwinkleModelBinding(binding: StoredTwinkleModelBinding) {
    const value = normalizeBinding(binding);
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        return upsertPostgresBinding({ query: postgresQuery }, value);
    }
    return mutateFileDatabase((db) => {
        const index = db.bindings.findIndex((item) => item.userId === value.userId);
        if (index >= 0) db.bindings[index] = value;
        else db.bindings.push(value);
        return value;
    });
}

export async function deleteTwinkleModelBinding(userId: string) {
    if (getDatabaseProvider() === "postgres") {
        await ensurePostgresSchema();
        await postgresQuery("DELETE FROM twinkle_model_bindings WHERE user_id = $1", [userId]);
        return;
    }
    await mutateFileDatabase((db) => {
        db.bindings = db.bindings.filter((item) => item.userId !== userId);
    });
}

export async function readTwinkleModelBindingBackup(executor?: QueryExecutor): Promise<TwinkleModelBindingDatabase> {
    if (getDatabaseProvider() === "postgres") {
        if (!executor) throw new Error("PostgreSQL Twinkle Model binding snapshots require an explicit backup transaction");
        const result = await executor.query("SELECT * FROM twinkle_model_bindings ORDER BY user_id");
        return { version: 1, bindings: result.rows.map(mapRow) };
    }
    return readFileDatabase();
}

export async function writeTwinkleModelBindingBackup(data: TwinkleModelBindingDatabase, executor?: QueryExecutor) {
    const normalized = normalizeDatabase(data);
    if (getDatabaseProvider() === "postgres") {
        if (!executor) throw new Error("Full PostgreSQL Twinkle Model binding writes require an explicit backup transaction");
        await executor.query("DELETE FROM twinkle_model_bindings");
        await upsertTwinkleModelBindingBackup(normalized, executor);
        return;
    }
    await writeJsonDataFile(TWINKLE_MODEL_BINDINGS_FILE, normalized);
}

export async function upsertTwinkleModelBindingBackup(data: TwinkleModelBindingDatabase, executor: QueryExecutor) {
    for (const binding of normalizeDatabase(data).bindings) await upsertPostgresBinding(executor, binding);
}

async function readFileDatabase(): Promise<TwinkleModelBindingDatabase> {
    const value = await readJsonDataFile<Partial<TwinkleModelBindingDatabase>>(TWINKLE_MODEL_BINDINGS_FILE, { version: 1, bindings: [] });
    return normalizeDatabase(value);
}

async function mutateFileDatabase<T>(mutator: (db: TwinkleModelBindingDatabase) => T | Promise<T>) {
    const run = mutationQueue.then(async () => {
        const db = await readFileDatabase();
        const result = await mutator(db);
        await writeJsonDataFile(TWINKLE_MODEL_BINDINGS_FILE, db);
        return result;
    });
    mutationQueue = run.then(
        () => undefined,
        () => undefined,
    );
    return run;
}

async function upsertPostgresBinding(executor: QueryExecutor, value: StoredTwinkleModelBinding) {
    const result = await executor.query(
        `INSERT INTO twinkle_model_bindings (
            user_id, provider_base_url, account_email, access_token_ciphertext, refresh_token_ciphertext,
            access_token_expires_at, status, provider_preference, api_keys, last_verified_at, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
         ON CONFLICT (user_id) DO UPDATE SET
            provider_base_url = EXCLUDED.provider_base_url,
            account_email = EXCLUDED.account_email,
            access_token_ciphertext = EXCLUDED.access_token_ciphertext,
            refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
            access_token_expires_at = EXCLUDED.access_token_expires_at,
            status = EXCLUDED.status,
            provider_preference = EXCLUDED.provider_preference,
            api_keys = EXCLUDED.api_keys,
            last_verified_at = EXCLUDED.last_verified_at,
            updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
            value.userId,
            value.providerBaseUrl,
            value.accountEmail,
            value.accessTokenCiphertext,
            value.refreshTokenCiphertext,
            value.accessTokenExpiresAt || null,
            value.status,
            value.providerPreference,
            JSON.stringify(value.apiKeys),
            value.lastVerifiedAt || null,
            value.createdAt,
            value.updatedAt,
        ],
    );
    return mapRow(result.rows[0]);
}

function normalizeDatabase(value: Partial<TwinkleModelBindingDatabase>): TwinkleModelBindingDatabase {
    return { version: 1, bindings: Array.isArray(value.bindings) ? value.bindings.map(normalizeBinding).filter((item) => item.userId) : [] };
}

function normalizeBinding(value: Partial<StoredTwinkleModelBinding>): StoredTwinkleModelBinding {
    const now = new Date().toISOString();
    return {
        userId: text(value.userId, 200),
        providerBaseUrl: text(value.providerBaseUrl, 2000),
        accountEmail: text(value.accountEmail, 320).toLowerCase(),
        accessTokenCiphertext: text(value.accessTokenCiphertext, 20_000),
        refreshTokenCiphertext: text(value.refreshTokenCiphertext, 20_000),
        ...(validDate(value.accessTokenExpiresAt) ? { accessTokenExpiresAt: value.accessTokenExpiresAt } : {}),
        status: value.status === "needs_rebind" ? "needs_rebind" : "active",
        providerPreference: value.providerPreference === "twinkle-video" ? "twinkle-video" : "twinkle-model",
        apiKeys: Array.isArray(value.apiKeys) ? value.apiKeys.map(normalizeApiKey).filter((item) => item.templateId && item.keyCiphertext) : [],
        ...(validDate(value.lastVerifiedAt) ? { lastVerifiedAt: value.lastVerifiedAt } : {}),
        createdAt: validDate(value.createdAt) ? value.createdAt! : now,
        updatedAt: validDate(value.updatedAt) ? value.updatedAt! : now,
    };
}

function normalizeApiKey(value: Partial<StoredTwinkleModelApiKey>): StoredTwinkleModelApiKey {
    return {
        templateId: text(value.templateId, 120),
        templateName: text(value.templateName, 120),
        keyCiphertext: text(value.keyCiphertext, 20_000),
        updatedAt: validDate(value.updatedAt) ? value.updatedAt! : new Date().toISOString(),
    };
}

function mapRow(row: Record<string, unknown>): StoredTwinkleModelBinding {
    return normalizeBinding({
        userId: String(row.user_id || ""),
        providerBaseUrl: String(row.provider_base_url || ""),
        accountEmail: String(row.account_email || ""),
        accessTokenCiphertext: String(row.access_token_ciphertext || ""),
        refreshTokenCiphertext: String(row.refresh_token_ciphertext || ""),
        accessTokenExpiresAt: dateText(row.access_token_expires_at),
        status: row.status as TwinkleModelBindingStatus,
        providerPreference: row.provider_preference as TwinkleModelProviderPreference,
        apiKeys: jsonArray(row.api_keys),
        lastVerifiedAt: dateText(row.last_verified_at),
        createdAt: dateText(row.created_at),
        updatedAt: dateText(row.updated_at),
    });
}

function jsonArray(value: unknown) {
    if (Array.isArray(value)) return value as StoredTwinkleModelApiKey[];
    if (typeof value !== "string") return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function text(value: unknown, maxLength: number) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validDate(value: unknown): value is string {
    return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function dateText(value: unknown) {
    if (value instanceof Date) return value.toISOString();
    return typeof value === "string" ? value : undefined;
}
