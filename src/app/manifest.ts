import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OncoTrack",
    short_name: "OncoTrack",
    description:
      "Tu evolución, tu medicación y tus citas — en un solo sitio, solo tuyo.",
    start_url: "/hoy",
    display: "standalone",
    background_color: "#f7f3ee",
    theme_color: "#5fb6a6",
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
