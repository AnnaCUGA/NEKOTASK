/**
 * Punto de entrada de la vista previa: monta el MISMO <Dashboard /> de la app
 * en una página HTML independiente (sin servidor de Next.js).
 */
import { createRoot } from "react-dom/client";
import { Dashboard } from "@/components/dashboard/Dashboard";

const raiz = document.getElementById("raiz");
if (raiz) createRoot(raiz).render(<Dashboard />);
