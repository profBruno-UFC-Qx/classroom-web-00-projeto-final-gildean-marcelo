import { verificarAcessoAdmin } from "@/utils/auth";
import { PerfilUsuario } from "@/services/UsuarioService";
import { initAdminTopbar } from "../shared/layout";
import { OrderService } from "./service";
import { state } from "./state";
import { renderBoard } from "./board";
import { updateClock, tickTimers, pollOrders, POLL_INTERVAL_MS } from "./polling";

if (!verificarAcessoAdmin([PerfilUsuario.Admin, PerfilUsuario.Cozinha])) {
  throw new Error("Acesso restrito à equipe da cozinha/administração.");
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

async function init(): Promise<void> {
  try {
    state.orders = await OrderService.getOrders();
  } catch (err) {
    console.error("[KDS] Falha ao carregar pedidos:", err);
    // TODO: exibir estado de erro no board
  }

  renderBoard();
  updateClock();
  initAdminTopbar();

  // Tick de 1s para clock + timers
  setInterval(() => {
    updateClock();
    tickTimers();
  }, 1_000);

  // Poll de 30s para novos pedidos
  setInterval(pollOrders, POLL_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", init);
