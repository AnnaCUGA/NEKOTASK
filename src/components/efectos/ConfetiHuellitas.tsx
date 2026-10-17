"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { bus } from "@/lib/eventos";
import { IconoNeko } from "@/components/iconos/IconoNeko";

interface Particula { id: number; x: number; y: number; dx: number; dy: number; giro: number; color: string; tam: number; icono: "huella" | "corazon" | "estrella" }

const COLORES = ["#f472b6", "#a78bfa", "#67e8f9", "#f9a8d4", "#e8a85b", "#c4b5fd"];
let contador = 0;

/** Explosión de huellitas/corazones. Escucha `confeti` en el bus. */
export function ConfetiHuellitas() {
  const [particulas, setParticulas] = useState<Particula[]>([]);

  useEffect(() => {
    return bus.escuchar((e) => {
      if (e.tipo !== "confeti") return;
      const nuevas: Particula[] = Array.from({ length: 16 }, (_, i) => {
        const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
        const dist = 60 + Math.random() * 110;
        return {
          id: ++contador,
          x: e.x, y: e.y,
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist - 40,
          giro: (Math.random() - 0.5) * 220,
          color: e.color ?? COLORES[i % COLORES.length],
          tam: 14 + Math.random() * 12,
          icono: i % 5 === 0 ? "corazon" : i % 7 === 0 ? "estrella" : "huella",
        };
      });
      setParticulas((p) => [...p, ...nuevas]);
      const ids = new Set(nuevas.map((n) => n.id));
      setTimeout(() => setParticulas((p) => p.filter((x) => !ids.has(x.id))), 1300);
    });
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particulas.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: p.x, top: p.y, color: p.color, marginLeft: -p.tam / 2, marginTop: -p.tam / 2 }}
            initial={{ x: 0, y: 0, scale: 0.3, opacity: 1, rotate: 0 }}
            animate={{ x: p.dx, y: [0, p.dy, p.dy + 70], scale: [0.3, 1.1, 0.9], opacity: [1, 1, 0], rotate: p.giro }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <IconoNeko nombre={p.icono} tamano={p.tam} grosor={2.2} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
