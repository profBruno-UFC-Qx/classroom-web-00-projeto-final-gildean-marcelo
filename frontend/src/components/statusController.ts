import { pedidoService, SituacaoPedido } from '@/services/PedidoService'
import { getUsuarioLogado, verificarAcessoRestrito } from '@/utils/auth'
import { formatarMoeda, showModal } from '@/utils/ui'

if (!(await verificarAcessoRestrito())) {
  throw new Error('Acesso negado');
}

// ─── Modal Customizado ────────────────────────────────────────────────────────

function showConfirmModal(titulo: string, mensagem: string): Promise<boolean> {
  return new Promise(resolve => {
    const overlay  = document.getElementById('modal-overlay')!
    const iconEl   = document.getElementById('modal-icon')!
    const tituloEl = document.getElementById('modal-titulo')!
    const msgEl    = document.getElementById('modal-mensagem')!
    const acoesEl  = document.getElementById('modal-acoes')!

    iconEl.className = 'modal-icon modal-icon--aviso'
    iconEl.innerHTML = '<i class="ph-bold ph-warning"></i>'
    tituloEl.textContent = titulo
    msgEl.textContent = mensagem

    acoesEl.innerHTML = ''

    const btnConfirmar = document.createElement('button')
    btnConfirmar.className = 'modal-btn modal-btn--perigo'
    btnConfirmar.textContent = 'Sim, cancelar'
    btnConfirmar.onclick = () => { overlay.style.display = 'none'; resolve(true) }

    const btnVoltar = document.createElement('button')
    btnVoltar.className = 'modal-btn modal-btn--secundario'
    btnVoltar.textContent = 'Voltar'
    btnVoltar.onclick = () => { overlay.style.display = 'none'; resolve(false) }

    acoesEl.appendChild(btnConfirmar)
    acoesEl.appendChild(btnVoltar)

    overlay.style.display = 'flex'
    btnVoltar.focus()
  })
}


// Elementos do Rastreador
const trackerTitulo = document.getElementById('tracker-titulo')
const trackerPulse = document.getElementById('tracker-pulse')

// Elementos do Stepper
const steps = {
  [SituacaoPedido.Recebido]: { el: document.getElementById('step-recebido'), time: document.getElementById('time-recebido') },
  [SituacaoPedido.Preparando]: { el: document.getElementById('step-preparando'), time: document.getElementById('time-preparando') },
  [SituacaoPedido.Pronto]: { el: document.getElementById('step-pronto'), time: document.getElementById('time-pronto') },
}
const progresses = [
  document.getElementById('progress-1'),
  document.getElementById('progress-2')
]

// Elementos do Recibo
const badgeResumoId = document.getElementById('recibo-id')
const listaItens = document.getElementById('recibo-itens')
const spanSubtotal = document.getElementById('recibo-subtotal')
const spanTaxa = document.getElementById('recibo-taxa')
const spanTotal = document.getElementById('recibo-total-valor')

async function init() {

  let pedidoId: string | number = 0
  const urlParams = new URLSearchParams(window.location.search)
  const pedidoIdStr = urlParams.get('pedido_id')

  if (!pedidoIdStr) {
    const user = getUsuarioLogado()
    if (user) {
      try {
        const userKey = (user as any).documentId || user.id
        const response = await pedidoService.listByUsuario(userKey)

        const situacoesAtivas = [SituacaoPedido.Recebido, SituacaoPedido.Preparando, SituacaoPedido.Pronto]
        const pedidoAtivo = response.data.find(
          p => situacoesAtivas.includes((p as any).situacao)
        )
        if (pedidoAtivo) {
          pedidoId = (pedidoAtivo as any).documentId || pedidoAtivo.id
          window.history.replaceState(null, '', `?pedido_id=${pedidoId}`)
        }
      } catch (error) {
        console.error('Erro ao buscar pedidos ativos:', error)
      }
    }
  } else {
    pedidoId = /^\d+$/.test(pedidoIdStr) ? Number(pedidoIdStr) : pedidoIdStr
  }

  if (pedidoId === 0) {
    mostrarEmptyState()
    return
  }

  try {
    const pedido = await pedidoService.getWithRelations(pedidoId)
    renderizarPedido(pedido)
  } catch (error) {
    console.error('Erro ao buscar o pedido:', error)
    mostrarEmptyState()
  }
}

function mostrarEmptyState() {
  const emptyState = document.getElementById('status-empty-state')
  const cabecalho = document.getElementById('status-cabecalho')
  const container = document.getElementById('status-container')

  if (emptyState) emptyState.style.display = 'flex'
  if (cabecalho) cabecalho.style.display = 'none'
  if (container) container.style.display = 'none'
}

function renderizarPedido(pedido: any) {
  const numPedido = pedido.id.toString().padStart(4, '0')

  // Atualiza cabeçalho
  const elTitulo = document.getElementById('status-titulo')
  const elSubtitulo = document.getElementById('status-subtitulo')
  if (elTitulo) elTitulo.textContent = `Pedido #DAN-${numPedido}`
  if (elSubtitulo) {
    const data = new Date(pedido.createdAt)
    elSubtitulo.textContent = `Realizado em ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }

  // Mostra o cabeçalho e o container
  const elCabecalho = document.getElementById('status-cabecalho')
  const elContainer = document.getElementById('status-container')
  if (elCabecalho) elCabecalho.style.display = 'block'
  if (elContainer) elContainer.style.display = 'flex'

  if (badgeResumoId) badgeResumoId.textContent = `#DAN-${numPedido}`

  // Renderizar itens do recibo
  if (listaItens && pedido.item_pedidos) {
    listaItens.innerHTML = ''
    let subtotal = 0

    const itens = Array.isArray(pedido.item_pedidos) ? pedido.item_pedidos : (pedido.item_pedidos.data || [])

    itens.forEach((item: any) => {
      const produto = item.produto || item.produto?.data
      if (!produto) return

      const precoItem = item.preco_unitario || produto.preco || 0
      subtotal += precoItem * item.quantidade

      const div = document.createElement('div')
      div.className = 'recibo-item'
      div.innerHTML = `
        <div class="recibo-item-left">
            <div class="recibo-item-qtd">${item.quantidade}x</div>
            <div>
                <h3 class="recibo-item-nome">${produto.nome || 'Produto'}</h3>
                <p class="recibo-item-desc">${produto.descricao || ''}</p>
            </div>
        </div>
        <div class="recibo-item-preco">${formatarMoeda(precoItem * item.quantidade)}</div>
      `
      listaItens.appendChild(div)
    })

    const taxa = 6.00
    if (spanSubtotal) spanSubtotal.textContent = formatarMoeda(subtotal)
    if (spanTaxa) spanTaxa.textContent = formatarMoeda(taxa)

    // Calcula o total real caso pedido.total venha vazio do Strapi
    const totalCalculado = subtotal + taxa
    const totalFinal = pedido.total || totalCalculado

    // Tenta re-buscar o elemento se estiver null, para garantir que ele renderiza
    const elTotal = spanTotal || document.getElementById('recibo-total-valor')
    if (elTotal) elTotal.textContent = formatarMoeda(totalFinal)
  }

  // Ações dos Botões
  const btnSuporte = document.getElementById('btn-suporte')
  const btnCancelar = document.getElementById('btn-cancelar')

  if (btnSuporte) {
    btnSuporte.onclick = () => {
      const numPedido = pedido.id.toString().padStart(4, '0')
      const msg = encodeURIComponent(`Olá, preciso de ajuda com o meu pedido #DAN-${numPedido}.`)
      window.open(`https://wa.me/5588999999999?text=${msg}`, '_blank')
    }
  }

  if (btnCancelar) {
    // Esconde o botão se o pedido já estiver cancelado ou entregue
    if (pedido.situacao === SituacaoPedido.Cancelado || pedido.situacao === SituacaoPedido.Entregue) {
      btnCancelar.style.display = 'none'
    } else {
      btnCancelar.onclick = async () => {
        const confirmado = await showConfirmModal(
          'Cancelar Pedido',
          'Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.'
        )
        if (confirmado) {
          try {
            btnCancelar.textContent = 'Cancelando...'
            const docId = pedido.documentId || pedido.id
            await pedidoService.update(docId, { situacao: SituacaoPedido.Cancelado })
            await showModal('Pedido Cancelado', 'Seu pedido foi cancelado com sucesso.', 'sucesso')
            window.location.reload()
          } catch (error: any) {
            console.error('Erro ao cancelar pedido:', error)
            if (error?.status === 403) {
              await showModal('Sem permissão', 'O sistema bloqueou o cancelamento. Tente falar com o suporte.', 'erro')
            } else {
              await showModal('Erro', 'Não foi possível cancelar o pedido. Tente falar com o suporte.', 'erro')
            }
            btnCancelar.textContent = 'Cancelar Pedido'
          }
        }
      }
    }
  }

  atualizarTimeline(pedido.situacao, pedido.createdAt)
}

function atualizarTimeline(situacaoAtual: SituacaoPedido, dataCriacao: string) {
  // Limpar status anteriores
  Object.values(steps).forEach(s => {
    if (s.el) s.el.className = 'stepper-item'
    if (s.time) s.time.textContent = '--:--'
  })
  progresses.forEach(p => { if (p) p.style.height = '0%' })

  if (trackerPulse) {
    trackerPulse.className = 'live-tracker_pulse'
    trackerPulse.style.display = 'block'
  }

  const horaFormatada = new Date(dataCriacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (steps[SituacaoPedido.Recebido]?.time) steps[SituacaoPedido.Recebido].time!.textContent = horaFormatada

  if (situacaoAtual === SituacaoPedido.Recebido) {
    if (trackerTitulo) trackerTitulo.textContent = 'Aguardando início'
    if (steps[SituacaoPedido.Recebido]?.el) steps[SituacaoPedido.Recebido].el!.classList.add('active')

  } else if (situacaoAtual === SituacaoPedido.Preparando) {
    if (trackerTitulo) trackerTitulo.textContent = 'Preparando seu pedido'
    if (steps[SituacaoPedido.Recebido]?.el) steps[SituacaoPedido.Recebido].el!.classList.add('completed')
    if (steps[SituacaoPedido.Preparando]?.el) steps[SituacaoPedido.Preparando].el!.classList.add('active')
    if (progresses[0]) progresses[0].style.height = '100%'
    if (steps[SituacaoPedido.Preparando]?.time) steps[SituacaoPedido.Preparando].time!.textContent = 'Agora'

  } else if (situacaoAtual === SituacaoPedido.Pronto || situacaoAtual === SituacaoPedido.Entregue) {
    if (trackerTitulo) trackerTitulo.textContent = situacaoAtual === SituacaoPedido.Pronto ? 'Saiu para entrega' : 'Pedido Entregue'

    if (situacaoAtual === SituacaoPedido.Entregue && trackerPulse) trackerPulse.className = 'live-tracker_pulse gray'
    if (situacaoAtual === SituacaoPedido.Pronto && trackerPulse) trackerPulse.className = 'live-tracker_pulse green'

    if (steps[SituacaoPedido.Recebido]?.el) steps[SituacaoPedido.Recebido].el!.classList.add('completed')
    if (steps[SituacaoPedido.Preparando]?.el) steps[SituacaoPedido.Preparando].el!.classList.add('completed')
    if (steps[SituacaoPedido.Pronto]?.el) steps[SituacaoPedido.Pronto].el!.classList.add('active')

    if (progresses[0]) progresses[0].style.height = '100%'
    if (progresses[1]) progresses[1].style.height = '100%'

    if (steps[SituacaoPedido.Pronto]?.time) {
      steps[SituacaoPedido.Pronto].time!.textContent = situacaoAtual === SituacaoPedido.Entregue ? 'Entregue' : 'A caminho'
    }

  } else if (situacaoAtual === SituacaoPedido.Cancelado) {
    if (trackerTitulo) {
      trackerTitulo.textContent = 'Pedido Cancelado'
      trackerTitulo.style.color = '#dc2626'
    }
    if (trackerPulse) trackerPulse.style.display = 'none'
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
