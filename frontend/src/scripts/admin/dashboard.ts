/**
 * dashboard.ts — Danny's Fresh Market
 *
 * Requer Vite (ou tsc-alias) para resolver "@/".
 * HTML: <script type="module" src="../../scripts/admin/dashboard.ts">
 */

import { pedidoService, SituacaoPedido } from "@/services/PedidoService";
import { produtoService } from "@/services/ProdutoService";
import { usuarioService, PerfilUsuario } from "@/services/UsuarioService";
import { verificarAcessoAdmin } from "@/utils/auth";
import { initAdminTopbar } from "./shared/layout";

if (!verificarAcessoAdmin([PerfilUsuario.Admin])) {
  throw new Error("Acesso restrito a administradores.");
}

interface DashboardStats {
  pedidosHoje: number;
  emPreparo: number;
  produtosAtivos: number;
  funcionarios: number;
}

interface MetricConfig {
  icon: string;
  label: string;
  key: keyof DashboardStats;
}

const METRIC_CONFIGS: MetricConfig[] = [
  { icon: "receipt_long", label: "Pedidos Hoje", key: "pedidosHoje" },
  { icon: "soup_kitchen", label: "Em Preparo", key: "emPreparo" },
  { icon: "restaurant_menu", label: "Produtos Ativos", key: "produtosAtivos" },
  { icon: "group", label: "Funcionários", key: "funcionarios" },
];

function renderMetricsSkeleton(): void {
  const grid = document.getElementById("metrics-grid");
  if (!grid) return;
  grid.innerHTML = METRIC_CONFIGS.map(() => `<div class="metric-card metric-card--skeleton"></div>`).join("");
}

function renderMetrics(stats: DashboardStats): void {
  const grid = document.getElementById("metrics-grid");
  if (!grid) return;
  grid.innerHTML = METRIC_CONFIGS.map((c) => `
    <div class="metric-card">
      <div class="metric-card__header">
        <span class="material-symbols-outlined metric-card__icon" aria-hidden="true">${c.icon}</span>
        <span class="metric-card__label">${c.label}</span>
      </div>
      <span class="metric-card__value">${stats[c.key]}</span>
    </div>`).join("");
}

async function loadStats(): Promise<DashboardStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [pedidosHoje, emPreparo, produtosAtivos, funcionarios] = await Promise.all([
    pedidoService.list({
      filters: { createdAt: { $gte: startOfDay.toISOString() } },
      pagination: { page: 1, pageSize: 1 },
    }),
    pedidoService.listBySituacao(SituacaoPedido.Preparando, { pagination: { page: 1, pageSize: 1 } }),
    produtoService.listAtivos({ pagination: { page: 1, pageSize: 1 } }),
    usuarioService.listFuncionarios(),
  ]);

  return {
    pedidosHoje: pedidosHoje.pagination.total,
    emPreparo: emPreparo.pagination.total,
    produtosAtivos: produtosAtivos.pagination.total,
    funcionarios: funcionarios.pagination.total,
  };
}

async function init(): Promise<void> {
  initAdminTopbar();
  renderMetricsSkeleton();

  try {
    const stats = await loadStats();
    renderMetrics(stats);
  } catch (err) {
    console.error("[Dashboard] Falha ao carregar métricas:", err);
    renderMetrics({ pedidosHoje: 0, emPreparo: 0, produtosAtivos: 0, funcionarios: 0 });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => console.error("[Dashboard] init:", err));
});
