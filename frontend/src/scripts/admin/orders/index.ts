import { PerfilUsuario } from "@/services/UsuarioService";
import { verificarAcessoAdmin } from "@/utils/auth";
import { initAdminTopbar } from "../shared/layout";
import { loadAndRender } from "./data";
import { attachFilterListeners, attachSearchListener } from "./filters";
import { attachModalListeners } from "./modal";

if (!verificarAcessoAdmin([PerfilUsuario.Admin])) {
  throw new Error("Acesso restrito a administradores.");
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

async function init(): Promise<void> {
  initAdminTopbar();
  attachSearchListener(loadAndRender);
  attachFilterListeners(loadAndRender);
  attachModalListeners(loadAndRender);
  await loadAndRender();
}

document.addEventListener("DOMContentLoaded", init);
