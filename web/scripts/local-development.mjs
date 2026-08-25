export function localDevelopmentEnvironment(mode, environment = process.env) {
    const frontendPort = validPort(environment.FRONTEND_PORT) || 3000;
    const backendPort = validPort(environment.BACKEND_PORT) || 3001;
    const port = mode === "frontend" ? frontendPort : mode === "backend" ? backendPort : validPort(environment.PORT) || 3000;
    const publicOrigin = httpOrigin(environment.VOZEB_PRO_LOCAL_PUBLIC_ORIGIN) || `http://localhost:${mode === "backend" ? frontendPort : port}`;
    const backendOrigin = httpOrigin(environment.VOZEB_PRO_BACKEND_ORIGIN) || `http://127.0.0.1:${backendPort}`;
    const internalOrigin = `http://127.0.0.1:${port}`;

    return {
        ...environment,
        PORT: String(port),
        HOSTNAME: environment.HOSTNAME?.trim() || "0.0.0.0",
        NEXT_PUBLIC_SITE_URL: publicOrigin,
        NEXT_DIST_DIR: environment.NEXT_DIST_DIR?.trim() || (mode === "frontend" ? ".next-dev-frontend" : mode === "backend" ? ".next-dev-backend" : ".next-dev"),
        VOZEB_PRO_INTERNAL_ORIGIN: internalOrigin,
        VOZEB_PRO_WORKER_API_ORIGIN: internalOrigin,
        ...(mode === "frontend" ? { VOZEB_PRO_BACKEND_ORIGIN: backendOrigin } : {}),
    };
}

function validPort(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : undefined;
}

function httpOrigin(value) {
    if (!value?.trim()) return "";
    try {
        const url = new URL(value.trim());
        return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "";
    } catch {
        return "";
    }
}
