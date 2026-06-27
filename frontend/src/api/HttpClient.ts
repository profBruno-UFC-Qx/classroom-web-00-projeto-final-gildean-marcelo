

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
    constructor(
        public readonly status: number, 
        public readonly body: unknown,
        message?: string
    ) {
        super(message ?? `HTTP error ${status}`)
        this.name = 'HttpError'
    }
}

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

    constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
        this.baseURL = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
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
        const token = this.getToken()
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
 
  private getToken(): string | null {    
    return localStorage.getItem('strapi_token')
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


const httpClient = new HttpClient('http://localhost:1337')

export default httpClient

