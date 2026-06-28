import { categoriaService } from '@/services/CategoriaService'
import { produtoService, type ProdutoAttributes } from '@/services/ProdutoService'
import { carrinhoService } from '@/services/CarrinhoService'
import { formatarMoeda } from '@/utils/ui'
import type { StrapiEntity } from '@/api/StrapiAdapters'

const categoriasList = document.querySelector<HTMLUListElement>('.categorias_list')
const catalogoGrid = document.querySelector<HTMLDivElement>('.catalogo_grid')
const destaqueCard = document.querySelector<HTMLElement>('.destaque-card')
const sectionDestaque = document.querySelector<HTMLElement>('.destaque')


let currentCategoriaId: number | null = null



async function init() {
  if (!categoriasList || !catalogoGrid) {
    console.error('[vitrineController] Contêineres de catálogo/categoria não encontrados no DOM.')
    return
  }

  await carregarCategorias()
  await carregarProdutos()
}

//Categorias

async function carregarCategorias() {
  try {
    const response = await categoriaService.listAtivas()
    const categorias = response.data

    categoriasList!.innerHTML = ''


    const btnTodos = document.createElement('button')
    btnTodos.className = 'categorias_btn categorias_btn--active'
    btnTodos.textContent = 'Todos'
    btnTodos.addEventListener('click', () => {
      atualizarCategoriaAtiva(null, btnTodos)
    })

    const liTodos = document.createElement('li')
    liTodos.className = 'categorias_item'
    liTodos.appendChild(btnTodos)
    categoriasList!.appendChild(liTodos)

    categorias.forEach(cat => {
      const btn = document.createElement('button')
      btn.className = 'categorias_btn'
      btn.textContent = cat.attributes.nome
      btn.addEventListener('click', () => {
        atualizarCategoriaAtiva(cat.id, btn)
      })

      const li = document.createElement('li')
      li.className = 'categorias_item'
      li.appendChild(btn)
      categoriasList!.appendChild(li)
    })
  } catch (error) {
    console.error('Erro ao carregar categorias', error)
  }
}

async function atualizarCategoriaAtiva(categoriaId: number | null, btnAtivo: HTMLButtonElement) {
  const botoes = categoriasList!.querySelectorAll('.categorias_btn')
  botoes.forEach(b => b.classList.remove('categorias_btn--active'))
  btnAtivo.classList.add('categorias_btn--active')


  currentCategoriaId = categoriaId
  await carregarProdutos()
}

// Produtos 

async function carregarProdutos() {
  try {
    let produtos: StrapiEntity<ProdutoAttributes>[] = []

    if (currentCategoriaId === null) {
      const response = await produtoService.listAtivos()
      produtos = response.data
    } else {
      const response = await produtoService.listByCategoria(currentCategoriaId)
      produtos = response.data
    }

    renderizarCatalogo(produtos)

    if (currentCategoriaId === null && sectionDestaque && destaqueCard) {
      if (produtos.length > 0) {
        sectionDestaque.style.display = 'block'
        renderizarDestaque(produtos[0])
      } else {
        sectionDestaque.style.display = 'none'
      }
    } else if (sectionDestaque) {
      sectionDestaque.style.display = 'none'
    }

  } catch (error) {
    console.error('Erro ao carregar produtos', error)
    catalogoGrid!.innerHTML = '<p>Erro ao carregar os produtos.</p>'
  }
}

function renderizarCatalogo(produtos: StrapiEntity<ProdutoAttributes>[]) {
  catalogoGrid!.innerHTML = ''

  if (produtos.length === 0) {
    catalogoGrid!.innerHTML = '<p>Nenhum produto encontrado.</p>'
    return
  }

  produtos.forEach(produto => {
    const article = document.createElement('article')
    article.className = 'produto-card'

    const imgUrl = produto.attributes.imagem_url || 'https://placehold.co/400x300/e2e8f0/64748b?text=Sem+Imagem'

    article.innerHTML = `
      <img src="${imgUrl}" alt="${produto.attributes.nome}" class="produto-card_img">
      <div class="produto-card_content">
          <h3 class="produto-card_titulo">${produto.attributes.nome}</h3>
          <p class="produto-card_descricao">${produto.attributes.descricao || ''}</p>
          <div class="produto-card_footer">
              <span class="produto-card_preco">${formatarMoeda(produto.attributes.preco)}</span>
              <button class="produto-card_add-btn" aria-label="Adicionar ${produto.attributes.nome}" data-id="${produto.id}">
                  <i class="ph ph-plus"></i>
              </button>
          </div>
      </div>
    `

    const btnAdd = article.querySelector<HTMLButtonElement>('.produto-card_add-btn')
    btnAdd?.addEventListener('click', () => {
      adicionarAoCarrinho(btnAdd, produto)
    })

    catalogoGrid!.appendChild(article)
  })
}

function renderizarDestaque(produto: StrapiEntity<ProdutoAttributes>) {
  if (!destaqueCard) return

  const imgUrl = produto.attributes.imagem_url || 'https://placehold.co/600x400/e2e8f0/64748b?text=Sem+Imagem'

  destaqueCard.innerHTML = `
    <div class="destaque-card_img-container">
        <span class="destaque-card_tag">
            <i class="ph-fill ph-star"></i> Mais Pedido
        </span>
        <img src="${imgUrl}" alt="${produto.attributes.nome}" class="destaque-card_img">
    </div>
    <div class="destaque-card_content">
        <h3 class="destaque-card_titulo">${produto.attributes.nome}</h3>
        <p class="destaque-card_descricao">${produto.attributes.descricao || ''}</p>
        <div class="destaque-card_footer">
            <span class="destaque-card_preco">${formatarMoeda(produto.attributes.preco)}</span>
            <button class="btn btn--primary" id="btn-add-destaque" data-id="${produto.id}">
                <i class="ph ph-shopping-cart"></i> Adicionar ao Pedido
            </button>
        </div>
    </div>
  `

  const btnAdd = destaqueCard.querySelector<HTMLButtonElement>('#btn-add-destaque')
  btnAdd?.addEventListener('click', () => {
    if (btnAdd) adicionarAoCarrinho(btnAdd, produto)
  })
}


function adicionarAoCarrinho(btn: HTMLButtonElement, produto: StrapiEntity<ProdutoAttributes>) {
  carrinhoService.adicionarItem({
    produtoId: produto.id,
    nome: produto.attributes.nome,
    preco: produto.attributes.preco,
    imagem_url: produto.attributes.imagem_url,
  })

  // Feedback visual no botão
  const iconeOriginal = btn.innerHTML
  btn.innerHTML = '<i class="ph ph-check"></i>'
  btn.disabled = true
  setTimeout(() => {
    btn.innerHTML = iconeOriginal
    btn.disabled = false
  }, 1200)
}

init()
