export async function deleteGenerationLog(id: string) {
    const normalizedId = id.trim();
    if (!normalizedId) throw new Error("生成记录 ID 不能为空");

    const response = await fetch("/api/generation-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [normalizedId] }),
        cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as { deleted?: unknown; error?: string; msg?: string } | null;
    if (!response.ok) throw new Error(payload?.error || payload?.msg || "删除生成记录失败");
    return typeof payload?.deleted === "number" ? payload.deleted : 0;
}
