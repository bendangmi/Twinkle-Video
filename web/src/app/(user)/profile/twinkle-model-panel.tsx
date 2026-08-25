"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Input, Popconfirm, Radio, Spin } from "antd";
import { Link2, Unlink } from "lucide-react";

import { profileDangerButtonClass, profilePrimaryButtonClass, profileSecondaryButtonClass } from "./profile-elements";

type BindingStatus = {
    bound: boolean;
    accountEmail: string;
    status: "active" | "needs_rebind" | "unbound";
    providerPreference: "twinkle-model" | "twinkle-video";
    baseUrl: string;
    lastVerifiedAt?: string;
};

export function TwinkleModelPanel() {
    const { message } = App.useApp();
    const [status, setStatus] = useState<BindingStatus | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            const response = await fetch("/api/auth/twinkle-model", { cache: "no-store" });
            const payload = (await response.json()) as { data?: BindingStatus; error?: string };
            if (!response.ok || !payload.data) throw new Error(payload.error || "读取绑定状态失败");
            setStatus(payload.data);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "读取绑定状态失败");
        }
    };

    const bind = async () => {
        setSaving(true);
        try {
            const response = await fetch("/api/auth/twinkle-model", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
            const payload = (await response.json()) as { data?: BindingStatus; error?: string };
            if (!response.ok || !payload.data) throw new Error(payload.error || "绑定失败");
            setStatus(payload.data);
            setEmail("");
            setPassword("");
            message.success("Twinkle Model 已绑定");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "绑定失败");
        } finally {
            setSaving(false);
        }
    };

    const selectProvider = async (provider: BindingStatus["providerPreference"]) => {
        if (!status || provider === status.providerPreference) return;
        setSaving(true);
        try {
            const response = await fetch("/api/auth/twinkle-model", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
            const payload = (await response.json()) as { data?: BindingStatus; error?: string };
            if (!response.ok || !payload.data) throw new Error(payload.error || "切换失败");
            setStatus(payload.data);
            message.success(provider === "twinkle-model" ? "已优先使用 Twinkle Model" : "已切换到 Twinkle Video");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "切换失败");
        } finally {
            setSaving(false);
        }
    };

    const unbind = async () => {
        setSaving(true);
        try {
            const response = await fetch("/api/auth/twinkle-model", { method: "DELETE" });
            const payload = (await response.json()) as { data?: BindingStatus; error?: string };
            if (!response.ok || !payload.data) throw new Error(payload.error || "解绑失败");
            setStatus(payload.data);
            message.success("已解绑，并切换到 Twinkle Video");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "解绑失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-xl space-y-4 border-t border-stone-200 pt-5 dark:border-stone-800">
            <div>
                <h3 className="text-sm font-semibold text-stone-950 dark:text-white">Twinkle Model</h3>
                <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">绑定独立 Twinkle Model 账号并选择全局默认服务。账号密码只用于本次登录，不会保存。</p>
            </div>
            {!status ? (
                <Spin size="small" />
            ) : (
                <>
                    <Alert
                        type={status.status === "active" ? "success" : status.status === "needs_rebind" ? "warning" : "info"}
                        showIcon
                        message={status.bound ? (status.status === "active" ? `已绑定 ${status.accountEmail}` : "绑定已失效，请重新绑定") : "尚未绑定 Twinkle Model"}
                        description={`服务地址：${status.baseUrl}`}
                    />
                    <div className="overflow-x-auto">
                        <Radio.Group value={status.providerPreference} disabled={saving} onChange={(event) => void selectProvider(event.target.value)}>
                            <Radio.Button value="twinkle-model" disabled={!status.bound || status.status !== "active"}>
                                Twinkle Model（外部计费）
                            </Radio.Button>
                            <Radio.Button value="twinkle-video">Twinkle Video（本站积分）</Radio.Button>
                        </Radio.Group>
                    </div>
                    <div className="text-xs leading-5 text-stone-500 dark:text-stone-400">Twinkle Model 不可用时，创建任务会自动回退到 Twinkle Video，并按本站积分规则扣费。</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Twinkle Model 邮箱" autoComplete="off" disabled={saving} />
                        <Input.Password value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Twinkle Model 密码" autoComplete="new-password" disabled={saving} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="primary" className={profilePrimaryButtonClass} icon={<Link2 className="size-4" />} loading={saving} onClick={() => void bind()}>
                            {status.bound ? "重新绑定" : "绑定账号"}
                        </Button>
                        <Button className={profileSecondaryButtonClass} disabled={saving} onClick={() => void loadStatus()}>
                            刷新状态
                        </Button>
                        {status.bound ? (
                            <Popconfirm title="解绑 Twinkle Model？" description="解绑后将自动使用 Twinkle Video，并删除已保存的登录令牌和个人密钥。" okText="解绑" cancelText="取消" onConfirm={() => void unbind()}>
                                <Button danger className={profileDangerButtonClass} icon={<Unlink className="size-4" />} disabled={saving}>
                                    解绑
                                </Button>
                            </Popconfirm>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
}
