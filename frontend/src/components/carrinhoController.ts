import { carrinhoService, type ItemCarrinho } from '@/services/CarrinhoService'
import { pedidoService, type TipoEntrega, type FormaPagamento } from '@/services/PedidoService'
import { itemPedidoService } from '@/services/ItemPedidoService'
import { getUsuarioLogado, setUsuarioLogado, isAutenticado } from '@/utils/auth'
import { usuarioService } from '@/services/UsuarioService'
import { setLoading, showFeedback, formatarMoeda, sanitizeImageUrl } from '@/utils/ui'

const TAXA_ENTREGA = 6.00

// Modal

type ModalTipo = 'aviso' | 'erro'

const ICONES: Record<ModalTipo, string> = {
  aviso: '<i class="ph-bold ph-map-pin-area"></i>',
  erro:  '<i class="ph-bold ph-x-circle"></i>',
}

function showModal(
  titulo: string,
  mensagem: string,
  tipo: ModalTipo = 'aviso',
  opcoes?: { labelOk?: string; labelAcao?: string; onAcao?: () => void }
): Promise<void> {
  return new Promise(resolve => {
    const overlay  = document.getElementById('modal-overlay')!
    const iconEl   = document.getElementById('modal-icon')!
    const tituloEl = document.getElementById('modal-titulo')!
    const msgEl    = document.getElementById('modal-mensagem')!
    const acoesEl  = document.getElementById('modal-acoes')!

    if (!overlay) { resolve(); return }

    iconEl.className = `modal-icon modal-icon--${tipo}`
    iconEl.innerHTML = ICONES[tipo]
    tituloEl.textContent = titulo
    msgEl.textContent = mensagem
    acoesEl.innerHTML = ''

    // Botão de ação opcional (ex: "Adicionar endereço")
    if (opcoes?.labelAcao && opcoes.onAcao) {
      const btnAcao = document.createElement('button')
      btnAcao.className = 'modal-btn modal-btn--primario'
      btnAcao.textContent = opcoes.labelAcao
      btnAcao.onclick = () => {
        overlay.style.display = 'none'
        opcoes.onAcao!()
        resolve()
      }
      acoesEl.appendChild(btnAcao)
    }

    const btnOk = document.createElement('button')
    btnOk.className = opcoes?.labelAcao ? 'modal-btn modal-btn--secundario' : 'modal-btn modal-btn--primario'
    btnOk.textContent = opcoes?.labelOk ?? 'Entendi'
    btnOk.onclick = () => { overlay.style.display = 'none'; resolve() }
    acoesEl.appendChild(btnOk)

    overlay.style.display = 'flex'
    acoesEl.querySelector<HTMLButtonElement>('.modal-btn')?.focus()
  })
}


if (!isAutenticado()) {
  window.location.replace('login.html')
}

const form = document.querySelector<HTMLFormElement>('#form-pedido')
const listaItens = document.querySelector<HTMLDivElement>('.lista-pedido_itens')
const displayEnderecoTexto = document.querySelector<HTMLParagraphElement>('#display_endereco_completo')
const inputEnderecoOculto = document.querySelector<HTMLInputElement>('#input_endereco_completo')
const btnVoltar = document.querySelector<HTMLButtonElement>('.header_voltar-btn')
const btnSubmit = form?.querySelector<HTMLButtonElement>('[type="submit"]')
const spanSubtotal = document.querySelector<HTMLSpanElement>('.resumo-subtotal')
const spanTaxa = document.querySelector<HTMLSpanElement>('.resumo-taxa')
const spanTotal = document.querySelector<HTMLSpanElement>('.resumo-total')

const btnEditEndereco = document.querySelector<HTMLButtonElement>('.endereco-card_editar-btn')
const viewModeEndereco = document.getElementById('endereco_view_mode')
const editModeEndereco = document.getElementById('endereco_edit_mode')
const inputEnderecoEdit = document.getElementById('input_endereco_edit') as HTMLInputElement
const btnSalvarEndereco = document.getElementById('btn_salvar_endereco') as HTMLButtonElement
const btnCancelarEndereco = document.getElementById('btn_cancelar_endereco') as HTMLButtonElement


function init() {
  preencherEndereco()
  renderizarItens()
  atualizarResumo()

  btnVoltar?.addEventListener('click', () => history.back())
  btnEditEndereco?.addEventListener('click', openEditEndereco)
  btnSalvarEndereco?.addEventListener('click', saveEndereco)
  btnCancelarEndereco?.addEventListener('click', cancelEditEndereco)

  form?.addEventListener('submit', handleSubmit)
}


function preencherEndereco() {
  const usuario = getUsuarioLogado()
  const endereco = (usuario as Record<string, unknown>)?.['endereco'] as string | null

  if (displayEnderecoTexto) {
    displayEnderecoTexto.textContent = endereco || 'Endereço não cadastrado'
  }
  if (inputEnderecoOculto) {
    inputEnderecoOculto.value = endereco || ''
  }
}

function openEditEndereco() {
  if (viewModeEndereco && editModeEndereco && inputEnderecoEdit) {
    viewModeEndereco.style.display = 'none'
    editModeEndereco.style.display = 'block'
    inputEnderecoEdit.value = inputEnderecoOculto?.value || ''
    inputEnderecoEdit.focus()
  }
}

function saveEndereco() {
  const novoEndereco = inputEnderecoEdit?.value.trim() || ''
  if (novoEndereco === '') {
    showModal('Endereço vazio', 'Por favor, preencha o endereço antes de salvar.', 'aviso')
    return
  }

  if (inputEnderecoOculto) inputEnderecoOculto.value = novoEndereco
  if (displayEnderecoTexto) displayEnderecoTexto.textContent = novoEndereco

  closeEditEndereco()
}

function cancelEditEndereco() {
  closeEditEndereco()
}

function closeEditEndereco() {
  if (viewModeEndereco && editModeEndereco) {
    viewModeEndereco.style.display = 'block'
    editModeEndereco.style.display = 'none'
  }
}



function renderizarItens() {
  if (!listaItens) return

  const itens = carrinhoService.getItens()
  listaItens.innerHTML = ''

  const emptyState = document.getElementById('carrinho-empty-state')
  const contentState = document.getElementById('carrinho-content')
  const tituloDesktop = document.querySelector<HTMLHeadingElement>('.carrinho_titulo-desktop')
  const tituloMobile = document.querySelector<HTMLHeadingElement>('.header_titulo-mobile')

  if (itens.length === 0) {
    if (emptyState) emptyState.style.display = 'flex'
    if (contentState) contentState.style.display = 'none'
    if (tituloDesktop) tituloDesktop.style.display = 'none'
    if (tituloMobile) tituloMobile.style.display = 'none'
    if (btnSubmit) btnSubmit.disabled = true
    return
  }

  if (emptyState) emptyState.style.display = 'none'
  if (contentState) contentState.style.display = 'contents'
  if (tituloDesktop) tituloDesktop.style.display = ''
  if (tituloMobile) tituloMobile.style.display = ''

  if (btnSubmit) btnSubmit.disabled = false

  itens.forEach(item => {
    const article = criarElementoItem(item)
    listaItens.appendChild(article)
  })
}

function criarElementoItem(item: ItemCarrinho): HTMLElement {
  const imgUrl = sanitizeImageUrl(item.imagem_url)
  const article = document.createElement('article')
  article.className = 'carrinho-item'
  article.dataset['produtoId'] = String(item.produtoId)

  article.innerHTML = `
    <img src="${imgUrl}" alt="${item.nome}" class="carrinho-item_img">
    <div class="carrinho-item_detalhes">
      <input type="hidden" name="produto_id[]" value="${item.produtoId}">
      <div class="carrinho-item_header">
        <h3 class="carrinho-item_titulo">${item.nome}</h3>
        <span class="carrinho-item_preco">${formatarMoeda(item.preco * item.quantidade)}</span>
      </div>
      <div class="carrinho-item_acoes">
        <div class="controle-quantidade">
          <button type="button" class="controle-quantidade_btn btn-diminuir" aria-label="Diminuir quantidade">
            <i class="ph ph-minus"></i>
          </button>
          <input type="number" name="quantidade[]" class="controle-quantidade_input"
            value="${item.quantidade}" min="1" max="99" aria-label="Quantidade" readonly>
          <button type="button" class="controle-quantidade_btn btn-aumentar" aria-label="Aumentar quantidade">
            <i class="ph ph-plus"></i>
          </button>
        </div>
        <button type="button" class="carrinho-item_remover-btn btn-remover" aria-label="Remover item do carrinho">
          <i class="ph ph-trash"></i> Remover
        </button>
      </div>
    </div>
  `


  article.querySelector('.btn-aumentar')?.addEventListener('click', () => {
    carrinhoService.alterarQuantidade(item.produtoId, item.quantidade + 1)
    item.quantidade += 1

    const preco = article.querySelector<HTMLSpanElement>('.carrinho-item_preco')
    const input = article.querySelector<HTMLInputElement>('.controle-quantidade_input')
    if (preco) preco.textContent = formatarMoeda(item.preco * item.quantidade)
    if (input) input.value = String(item.quantidade)
    atualizarResumo()
  })


  article.querySelector('.btn-diminuir')?.addEventListener('click', () => {
    if (item.quantidade <= 1) {
      removerItem(item.produtoId, article)
      return
    }
    carrinhoService.alterarQuantidade(item.produtoId, item.quantidade - 1)
    item.quantidade -= 1
    const preco = article.querySelector<HTMLSpanElement>('.carrinho-item_preco')
    const input = article.querySelector<HTMLInputElement>('.controle-quantidade_input')
    if (preco) preco.textContent = formatarMoeda(item.preco * item.quantidade)
    if (input) input.value = String(item.quantidade)
    atualizarResumo()
  })

  article.querySelector('.btn-remover')?.addEventListener('click', () => {
    removerItem(item.produtoId, article)
  })

  return article
}

function removerItem(produtoId: number, elemento: HTMLElement) {
  carrinhoService.removerItem(produtoId)
  elemento.remove()
  atualizarResumo()

  if (carrinhoService.getItens().length === 0) {
    renderizarItens()
  }
}


function atualizarResumo() {
  const subtotal = carrinhoService.calcularSubtotal()
  const total = subtotal + TAXA_ENTREGA

  if (spanSubtotal) spanSubtotal.textContent = formatarMoeda(subtotal)
  if (spanTaxa) spanTaxa.textContent = formatarMoeda(TAXA_ENTREGA)
  if (spanTotal) spanTotal.textContent = formatarMoeda(total)
}


async function handleSubmit(e: SubmitEvent) {
  e.preventDefault()
  if (!form || !btnSubmit) return

  showFeedback(form, null)

  const itens = carrinhoService.getItens()
  if (itens.length === 0) {
    showFeedback(form, 'Adicione ao menos um item ao carrinho.', 'erro')
    return
  }

  const usuario = getUsuarioLogado()
  if (!usuario) {
    window.location.replace('login.html')
    return
  }

  // Atualiza os dados do usuário se vieram incompletos do login/registro
  let u = usuario as Record<string, any>
  if (u.endereco === undefined) {
    try {
      const freshUser = await usuarioService.me()
      setUsuarioLogado(freshUser)
      u = freshUser as Record<string, any>
      // Atualiza o input oculto com o endereço real vindo do banco
      if (inputEnderecoOculto && u.endereco) {
        inputEnderecoOculto.value = u.endereco
      }
    } catch (e) {
      console.error('Erro ao buscar dados atualizados do usuário:', e)
    }
  }

  const tipoEntrega = (form.querySelector<HTMLInputElement>('input[name="delivery_tipo"]:checked')?.value ?? 'delivery') as TipoEntrega
  const formaPagamento = (form.querySelector<HTMLInputElement>('input[name="payment_tipo"]:checked')?.value ?? 'pix') as FormaPagamento
  const observacao = form.querySelector<HTMLTextAreaElement>('.observacoes_input')?.value.trim() || undefined

  if (tipoEntrega === 'delivery') {
    if (!inputEnderecoOculto?.value || inputEnderecoOculto.value.trim() === '') {
      await showModal(
        'Endereço de entrega não informado',
        'Para pedidos com Delivery, é necessário informar um endereço de entrega.',
        'aviso',
        {
          labelAcao: 'Adicionar endereço',
          onAcao: () => {
            // Abre o modo de edição do endereço automaticamente
            const btnEditar = document.querySelector<HTMLButtonElement>('.endereco-card_editar-btn')
            btnEditar?.click()
          }
        }
      )
      return
    }
  }

  const subtotal = carrinhoService.calcularSubtotal()
  const total = subtotal + TAXA_ENTREGA

  setLoading(btnSubmit, true)

  try {
    const pedidoCriado = await pedidoService.create({
      users_permissions_user: (usuario as any).documentId || usuario.id,
      endereco_entrega: inputEnderecoOculto?.value || undefined,
      tipo_entrega: tipoEntrega,
      forma_pagamento: formaPagamento,
      total,
      observacao_geral: observacao,
    })

    const pedidoId = pedidoCriado.id

    await itemPedidoService.createMany(
      itens.map(item => ({
        pedido: pedidoId,
        produto: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario_cobrado: item.preco,
      }))
    )

    carrinhoService.limpar()
    const pedidoIdentifier = (pedidoCriado as any).documentId || pedidoId
    window.location.href = `status.html?pedido_id=${pedidoIdentifier}`

  } catch (error: any) {
    console.error('[CARRINHO ERRO]', error)
    const errBody = error?.body ? JSON.stringify(error.body) : (error?.message || JSON.stringify(error))
    console.error('Erro detalhado:', errBody)
    showFeedback(form, 'Erro ao enviar pedido. Verifique sua conexão e tente novamente.', 'erro')
  } finally {
    setLoading(btnSubmit, false)
  }
}

init()
