export type ProductStatus = 'active' | 'paused'

export interface Product {
  id:          number
  name:        string
  description: string
  category:    string        // nome para exibição
  categoryId:  number | null // id para filtragem/submissão
  price:       number
  status:      ProductStatus
  image:       string | null
}

export interface Category {
  id:   number
  name: string
}

/**
 * Dados que o formulário entrega para create / update.
 * imageFile: arquivo novo selecionado pelo usuário (null = sem mudança).
 * imageUrl:  URL atual da imagem (vinda da API ao editar).
 */
export interface ProductFormData {
  name:        string
  description: string
  categoryId:  number
  price:       number
  status:      ProductStatus
  imageFile:   File | null
  imageUrl:    string | null
}

export interface ProductFilters {
  search:     string
  categoryId: number | null
  status:     'all' | ProductStatus
}

export interface PaginatedResult<T> {
  data:    T[]
  total:   number
  page:    number
  perPage: number
}

export interface ProductMetrics {
  total:      number
  categories: number
  active:     number
  paused:     number
}

// ============================================================
// Interface do serviço — contrato usado pelo Controller
// ============================================================

export interface IProductService {
  getProducts(
    page: number,
    perPage: number,
    filters: ProductFilters,
  ): Promise<PaginatedResult<Product>>

  getProductById(id: number): Promise<Product>

  getCategories(): Promise<Category[]>

  createProduct(data: ProductFormData): Promise<Product>

  updateProduct(id: number, data: ProductFormData): Promise<Product>

  deleteProduct(id: number): Promise<void>

  getMetrics(): Promise<ProductMetrics>
}
