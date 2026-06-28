/**
 * HttpClient — wrapper leve sobre o fetch nativo.
 *
 * Responsabilidades:
 *  - Serializar query params com bracket notation (compatível com Strapi/qs)
 *  - Injetar Content-Type e Authorization automaticamente
 *  - Lançar erros HTTP como instâncias de HttpError (com status + body)
 *  - Expor uma interface (get/post/put/delete) similar ao axios para que
 *    o StrapiCrudService não precise mudar nada
 */

export interface RequestConfig {
  params?: Record<string, unknown>
  headers?: Record<string, string>
  
  skipAuth?: boolean
}

export interface HttpResponse<T> {
  data: T
  status: number
}

export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(
    status: number,
    body: unknown,
    message?: string
  ) {
    super(message ?? `HTTP error ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

/**
 * Função responsável por fornecer o token de autenticação.
 * Injetada no construtor para desacoplar o HttpClient de qualquer
 * mecanismo de storage específico (localStorage, cookie, zustand, pinia…).
 */
export type TokenProvider = () => string | null | undefined

// ─── Serialização de query params (bracket notation) ───────────────────────
// Transforma:
//   { filters: { ativa: { $eq: true } }, pagination: { page: 1 } }
// em:
//   filters[ativa][$eq]=true&pagination[page]=1
//
// que é o formato que o Strapi espera.
function serializeParams(
  obj: Record<string, unknown>,
  prefix = ''
): string {
  const parts: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue

    const fullKey = prefix ? `${prefix}[${key}]` : key

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          parts.push(serializeParams(item as Record<string, unknown>, `${fullKey}[${index}]`))
        } else {
          parts.push(`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === 'object') {
      parts.push(serializeParams(value as Record<string, unknown>, fullKey))
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`)
    }
  }

  return parts.filter(Boolean).join('&')
}


class HttpClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private tokenProvider: TokenProvider

  constructor(
    baseURL: string,
    tokenProvider: TokenProvider = () => null,
    defaultHeaders: Record<string, string> = {}
  ) {
    this.baseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    this.tokenProvider = tokenProvider
    this.defaultHeaders = defaultHeaders
  }


  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    config: RequestConfig = {}
  ): Promise<HttpResponse<T>> {
    
    let url = `${this.baseURL}${path}`
    if (config.params && Object.keys(config.params).length > 0) {
      const qs = serializeParams(config.params)
      url = `${url}?${qs}`
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...config.headers,
    }

    if (!config.skipAuth) {
      const token = this.tokenProvider()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    let responseBody: unknown
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      responseBody = await response.json()
    } else {
      responseBody = await response.text()
    }

    if (!response.ok) {
      throw new HttpError(response.status, responseBody)
    }

    return { data: responseBody as T, status: response.status }
  }


  async get<T>(path: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, undefined, config)
  }

  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, body, config)
  }

  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, body, config)
  }

  async delete<T = void>(path: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path, undefined, config)
  }

  async patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', path, body, config)
  }
}

// ─── Instância singleton ─────────────────────────────────────────────────────
//
// Passe uma TokenProvider compatível com o seu mecanismo de auth.
// O HttpClient não importa nada de browser/node — fica totalmente agnóstico.
//
// Exemplos:
//
//   localStorage (browser, requer lib DOM no tsconfig):
//     () => localStorage.getItem('strapi_token'
//
//   Sem auth (público):
//     () => null

const httpClient = new HttpClient(
    //   Vite    → import.meta.env.VITE_API_URL
    //   import.meta.env.VITE_API_URL ?? 'http://localhost:1337',
    'http://localhost:1337',

  () => localStorage.getItem('strapi_token')
)

export default httpClient