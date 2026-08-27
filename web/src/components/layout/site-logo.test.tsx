import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteLogo } from "./site-logo";

describe("SiteLogo", () => {
    it("renders the configured backend logo without leaking the current page referrer", () => {
        const markup = renderToStaticMarkup(<SiteLogo logoUrl="https://cdn.example.com/brand.svg" className="size-8" />);

        expect(markup).toContain('src="https://cdn.example.com/brand.svg"');
        expect(markup).toContain('referrerPolicy="no-referrer"');
        expect(markup).not.toContain("url(/logo.svg)");
    });

    it("renders the supplied color image as the bundled mark", () => {
        const markup = renderToStaticMarkup(<SiteLogo logoUrl="/logo.jpg" className="size-8" />);

        expect(markup).toContain('src="/logo.jpg"');
        expect(markup).toContain("object-cover");
    });
});
