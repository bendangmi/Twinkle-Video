import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_SITE_SETTINGS } from "@/lib/auth/store";

describe("default Twinkle Video brand assets", () => {
    it("uses the supplied image for every default brand entry", () => {
        expect(DEFAULT_SITE_SETTINGS.title).toBe("Twinkle Video");
        expect(DEFAULT_SITE_SETTINGS.logoUrl).toBe("/logo.jpg");
        expect(DEFAULT_SITE_SETTINGS.iconUrl).toBe("/icon.svg");
    });

    it("keeps the web and docs copies identical to the supplied image", async () => {
        const [webLogo, docsLogo] = await Promise.all([readFile(resolve(process.cwd(), "public/logo.jpg")), readFile(resolve(process.cwd(), "../docs/public/logo.jpg"))]);

        expect(docsLogo.equals(webLogo)).toBe(true);
    });

    it("ships newly designed vector logo and icon assets", async () => {
        const [logo, icon] = await Promise.all([readFile(resolve(process.cwd(), "public/logo.svg"), "utf8"), readFile(resolve(process.cwd(), "public/icon.svg"), "utf8")]);

        expect(logo).toContain("Twinkle Video");
        expect(icon).toContain("Twinkle Video");
        expect(logo).toContain('id="gold"');
        expect(icon).toContain('id="g"');
    });
});
