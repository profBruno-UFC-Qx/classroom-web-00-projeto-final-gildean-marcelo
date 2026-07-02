import { StatusProduto, type ProdutoAttributes } from '@/services/ProdutoService'
import type { CategoriaAttributes } from '@/services/CategoriaService'
import type { StrapiEntity } from '@/api/StrapiAdapters'
import type { Category, Product, ProductStatus } from './types'

import { sanitizeImageUrl } from '@/utils/ui'

// Strapi v5: StrapiEntity<T> = T & { id, documentId } — sem wrapper "attributes".
// Os campos do Content Type ficam direto na entidade.
export function mapProduto(entity: StrapiEntity<ProdutoAttributes>): Product {
  // categoria é populada como objeto flat (StrapiEntity<CategoriaAttributes>)
  const cat = entity.categoria
  return {
    id:          entity.id,
    name:        entity.nome,
    description: entity.descricao ?? '',
    category:    cat?.nome ?? '—',
    categoryId:  cat?.id ?? null,
    price:       entity.preco,
    status:      entity.situacao === StatusProduto.Ativo ? 'active' : 'paused',
    image:       sanitizeImageUrl(entity.imagem_url),
  }
}

export function mapCategoria(entity: StrapiEntity<CategoriaAttributes>): Category {
  // Strapi v5 flat: nome fica direto na entidade
  return { id: entity.id, name: entity.nome }
}

export function toStrapiStatus(s: ProductStatus): StatusProduto {
  return s === 'active' ? StatusProduto.Ativo : StatusProduto.Pausado
}
