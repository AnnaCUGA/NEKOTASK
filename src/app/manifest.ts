import type { MetadataRoute } from "next";

/** App instalable: ícono en tu Samsung, accesos directos y "Compartir con NekoTask" */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NekoTask Studio",
    short_name: "NekoTask",
    description: "Tareas, hábitos, agua y calendario con Blanquita, Bizca, Mango y Ronro.",
    lang: "es-MX",
    start_url: "/?origen=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121212",
    theme_color: "#121212",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tomar agua", short_name: "+250 ml", url: "/?accion=agua&ml=250", icons: [{ src: "/iconos/atajo-agua.png", sizes: "96x96" }] },
      { name: "Nueva tarea", short_name: "Tarea", url: "/?accion=tarea", icons: [{ src: "/iconos/atajo-tarea.png", sizes: "96x96" }] },
      { name: "Preguntarle a Blanquita", short_name: "Blanquita", url: "/?seccion=asistente", icons: [{ src: "/iconos/atajo-blanquita.png", sizes: "96x96" }] },
      { name: "Calendario", short_name: "Calendario", url: "/?seccion=calendario", icons: [{ src: "/iconos/atajo-calendario.png", sizes: "96x96" }] },
    ],
    // aparece en el menú "Compartir" de Android (Samsung Notes, Chrome, WhatsApp…)
    share_target: {
      action: "/compartir",
      method: "GET",
      params: { title: "titulo", text: "texto", url: "enlace" },
    },
  } as MetadataRoute.Manifest;
}
