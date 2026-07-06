import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OncoTrack",
    short_name: "OncoTrack",
    description:
      "Tu evolución, tu medicación y tus citas — en un solo sitio, solo tuyo.",
    start_url: "/hoy",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c5cd4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
