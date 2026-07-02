// Estrutura de um item no carrinho
export interface ItemCarrinho {
  produtoId: number
  nome: string
  preco: number
  imagem_url: string | null
  quantidade: number
}

const CHAVE_CARRINHO = 'dannys_carrinho'

function lerCarrinho(): ItemCarrinho[] {
  try {
    const raw = localStorage.getItem(CHAVE_CARRINHO)
    return raw ? (JSON.parse(raw) as ItemCarrinho[]) : []
  } catch {
    return []
  }
}

function salvarCarrinho(itens: ItemCarrinho[]): void {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens))
}

export const carrinhoService = {
  getItens(): ItemCarrinho[] {
    return lerCarrinho()
  },

  adicionarItem(novo: Omit<ItemCarrinho, 'quantidade'>): void {
    const itens = lerCarrinho()
    const existente = itens.find(i => i.produtoId === novo.produtoId)
    if (existente) {
      existente.quantidade += 1
    } else {
      itens.push({ ...novo, quantidade: 1 })
    }
    salvarCarrinho(itens)
  },

  removerItem(produtoId: number): void {
    const itens = lerCarrinho().filter(i => i.produtoId !== produtoId)
    salvarCarrinho(itens)
  },

  alterarQuantidade(produtoId: number, quantidade: number): void {
    const itens = lerCarrinho()
    const item = itens.find(i => i.produtoId === produtoId)
    if (!item) return
    if (quantidade <= 0) {
      salvarCarrinho(itens.filter(i => i.produtoId !== produtoId))
    } else {
      item.quantidade = quantidade
      salvarCarrinho(itens)
    }
  },

  calcularSubtotal(): number {
    return lerCarrinho().reduce((acc, i) => acc + i.preco * i.quantidade, 0)
  },

  contarItens(): number {
    return lerCarrinho().reduce((acc, i) => acc + i.quantidade, 0)
  },

  limpar(): void {
    localStorage.removeItem(CHAVE_CARRINHO)
  },
}
