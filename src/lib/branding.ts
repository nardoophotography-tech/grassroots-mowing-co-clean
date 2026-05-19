export type BrandingSettings = {
  businessName: string;
  heroSubtitle: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  logoUrl: string;
};

export const defaultBranding: BrandingSettings = {
  businessName: "GrassRoots Mowing Co",
  heroSubtitle:
    "Professional lawn care services for Mount Isa and surrounding areas.",
  primaryButtonText: "BOOK NOW",
  secondaryButtonText: "ADMIN LOGIN",
  logoUrl: "/GR logo thumbnail app_v4.png",
};