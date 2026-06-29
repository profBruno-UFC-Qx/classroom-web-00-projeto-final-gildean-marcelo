import { carrinhoService, type ItemCarrinho } from '@/services/CarrinhoService'
import { pedidoService, type TipoEntrega, type FormaPagamento } from '@/services/PedidoService'
import { itemPedidoService } from '@/services/ItemPedidoService'
import { getUsuarioLogado, isAutenticado } from '@/utils/auth'
import { setLoading, showFeedback, formatarMoeda, sanitizeImageUrl } from '@/utils/ui'

const TAXA_ENTREGA = 6.00


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


function init() {
  preencherEndereco()
  renderizarItens()
  atualizarResumo()

  btnVoltar?.addEventListener('click', () => history.back())

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



function renderizarItens() {
  if (!listaItens) return

  const itens = carrinhoService.getItens()
  listaItens.innerHTML = ''

  if (itens.length === 0) {
    listaItens.innerHTML = `
      <div class="carrinho-vazio">
        <i class="ph ph-shopping-cart-simple"></i>
        <p>Seu carrinho está vazio.</p>
        <a href="index.html" class="btn btn--primary">Ver Cardápio</a>
      </div>
    `
    if (btnSubmit) btnSubmit.disabled = true
    return
  }

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

  const tipoEntrega = (form.querySelector<HTMLInputElement>('input[name="delivery_tipo"]:checked')?.value ?? 'delivery') as TipoEntrega
  const formaPagamento = (form.querySelector<HTMLInputElement>('input[name="payment_tipo"]:checked')?.value ?? 'pix') as FormaPagamento
  const observacao = form.querySelector<HTMLTextAreaElement>('.observacoes_input')?.value.trim() || undefined

  const subtotal = carrinhoService.calcularSubtotal()
  const total = subtotal + TAXA_ENTREGA

  setLoading(btnSubmit, true)

  try {
    const pedidoCriado = await pedidoService.create({
      usuario: usuario.id,
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
    window.location.href = `status.html?pedido_id=${pedidoId}`

  } catch {
    showFeedback(form, 'Erro ao enviar pedido. Verifique sua conexão e tente novamente.', 'erro')
  } finally {
    setLoading(btnSubmit, false)
  }
}

init()
