import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rumo ao TJSP",
    short_name: "Rumo TJSP",
    description: "Estudos para Escrevente Técnico Judiciário do TJ-SP",
    start_url: "/",
    display: "standalone",
    background_color: "#F6EEF2",
    theme_color: "#C11574",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
