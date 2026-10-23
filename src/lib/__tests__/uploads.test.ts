import { afterEach, describe, expect, it, vi } from "vitest";
import { StorageNotConfiguredError, isAllowedImageUrl, sniffImage, storeImage } from "../uploads";

const bytes = (...b: number[]) => Uint8Array.from([...b, ...new Array(Math.max(0, 16 - b.length)).fill(0)]);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("sniffImage (magic-byte validation)", () => {
  it("accepts JPEG, PNG and WebP", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ ext: "jpg", mime: "image/jpeg" });
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({ ext: "png", mime: "image/png" });
    expect(sniffImage(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP")))).toEqual({ ext: "webp", mime: "image/webp" });
  });

  it("rejects SVG (script risk), GIF, HTML, PDF, executables and text", () => {
    expect(sniffImage(Uint8Array.from(ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>')))).toBeNull();
    expect(sniffImage(Uint8Array.from(ascii("GIF89a......")))).toBeNull();
    expect(sniffImage(Uint8Array.from(ascii("<html><script>alert(1)</script>")))).toBeNull();
    expect(sniffImage(Uint8Array.from(ascii("%PDF-1.7 ......")))).toBeNull();
    expect(sniffImage(bytes(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
    expect(sniffImage(Uint8Array.from(ascii("just text, not an image")))).toBeNull();
  });

  it("rejects files that are too short or a RIFF that is not WebP", () => {
    expect(sniffImage(bytes(0xff, 0xd8))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
    expect(sniffImage(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WAVE")))).toBeNull();
  });
});

describe("isAllowedImageUrl", () => {
  afterEach(() => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
  });
  it("allows only server-generated upload paths without Cloudinary", () => {
    expect(isAllowedImageUrl("/uploads/0123456789abcdef0123456789abcdef.jpg")).toBe(true);
    for (const bad of ["/uploads/../etc/passwd", "/uploads/x.jpg", "https://evil.example.com/a.jpg", "javascript:alert(1)", "//evil.com/a.png", "/uploads/0123456789abcdef0123456789abcdef.svg"]) {
      expect(isAllowedImageUrl(bad)).toBe(false);
    }
  });
  it("allows only the configured Cloudinary account when set", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "mycloud";
    expect(isAllowedImageUrl("https://res.cloudinary.com/mycloud/image/upload/v1/samad-hardware/a.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://res.cloudinary.com/othercloud/image/upload/v1/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("http://res.cloudinary.com/mycloud/image/upload/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://res.cloudinary.com.evil.com/mycloud/image/upload/a.jpg")).toBe(false);
  });
});

describe("storeImage on a host without a writable disk", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("refuses to pretend to save when running on Vercel without Cloudinary", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("UPLOAD_DIR", "");
    await expect(storeImage(bytes(0xff, 0xd8, 0xff, 0xe0), { ext: "jpg", mime: "image/jpeg" })).rejects.toBeInstanceOf(StorageNotConfiguredError);
  });
});
