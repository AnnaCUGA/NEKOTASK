"use client";

import { motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

/** Hoja modal: sube desde abajo en el celular y aparece centrada en escritorio. Usar dentro de <AnimatePresence>. */
export function Hoja({ children, alCerrar, ancho = "max-w-lg" }: { children: ReactNode; alCerrar: () => void; ancho?: string }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [alCerrar]);
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={alCerrar} />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className={`fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[85vh] ${ancho} overflow-y-auto rounded-[22px] border border-noche-600 bg-noche-800 p-4 shadow-neon sm:bottom-auto sm:top-[10vh]`}
      >
        {children}
      </motion.div>
    </>
  );
}

export const campo =
  "w-full rounded-xl border border-noche-600 bg-noche-900 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-violeta/60";
