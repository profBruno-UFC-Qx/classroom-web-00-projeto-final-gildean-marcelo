import { StrapiCrudService } from '@/api/StrapiCrudService'
import type { StrapiEntity, StrapiQueryParams } from '@/api/StrapiAdapters'
import httpClient from '@/api/HttpClient'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PerfilUsuario = {
  Cliente: 'cliente',
  Admin: 'admin',
  Cozinha: 'cozinha',
} as const
export type PerfilUsuario = typeof PerfilUsuario[keyof typeof PerfilUsuario]

// ─── Attributes ───────────────────────────────────────────────────────────────

export interface UsuarioAttributes {
  username: string      // nome visível
  email: string      // e-mail real do cliente
  whatsapp: string      // login do cliente (Unique)
  cpf: string
  endereco: string | null
  perfil: PerfilUsuario
  ativo: boolean     // substitui "status" (nome reservado no Strapi)
  foto: string | null
  blocked: boolean     // campo nativo do plugin
  confirmed: boolean     // campo nativo do plugin
  createdAt: string
  updatedAt: string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateUsuarioDto {
  username: string
  email: string
  password: string      // texto puro — Strapi faz o bcrypt
  whatsapp: string
  cpf: string
  endereco?: string
  perfil?: PerfilUsuario  // default: cliente
  ativo?: boolean        // default: true
  foto?: string | null
}

export interface UpdateUsuarioDto {
  username?: string
  email?: string
  password?: string
  whatsapp?: string
  cpf?: string
  endereco?: string | null
  perfil?: PerfilUsuario
  ativo?: boolean
  foto?: string | null
  blocked?: boolean
}

export interface LoginResponse {
  jwt: string
  user: { id: number } & Omit<UsuarioAttributes, 'createdAt' | 'updatedAt'>
}

export type UsuarioEntity = StrapiEntity<UsuarioAttributes>
type UsuarioRaw = { id: number } & UsuarioAttributes

// ─── Service ──────────────────────────────────────────────────────────────────

export class UsuarioService extends StrapiCrudService<UsuarioAttributes, CreateUsuarioDto, UpdateUsuarioDto> {

  constructor() {
    super('/api/users')
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<LoginResponse> {
    const { data } = await httpClient.post<LoginResponse>(
      '/api/auth/local',
      { identifier: username, password },
      { skipAuth: true }
    )
    return data
  }

  /**
   * Registro público do cliente.
   * Passo 1: cria conta com campos nativos via /register (skipAuth).
   * Passo 2: usa o JWT retornado pelo /register para complementar os campos
   *          customizados (whatsapp, cpf, perfil, ativo) via update().
   *
   * IMPORTANTE: whatsapp e cpf devem ser NOT REQUIRED no Content-Type Builder
   * do Strapi (Unique ✓, mas Required ✗) — o Strapi não aceita campos
   * customizados Required na rota /register.
   */
  async registrar(payload: CreateUsuarioDto): Promise<LoginResponse> {
    const { data } = await httpClient.post<LoginResponse>(
      '/api/auth/local/register',
      { username: payload.username, email: payload.email, password: payload.password },
      { skipAuth: true }
    )

    if (data.user.id) {
      // Salva o JWT do novo usuário temporariamente para autorizar o update()
      const tokenAnterior = localStorage.getItem('strapi_token')
      localStorage.setItem('strapi_token', data.jwt)

      try {
        await this.update(data.user.id, {
          whatsapp: payload.whatsapp,
          cpf: payload.cpf,
          endereco: payload.endereco ?? null,
          perfil: payload.perfil ?? PerfilUsuario.Cliente,
          ativo: payload.ativo ?? true,
        })
      } finally {
        // Restaura o token anterior (pode ser null se não havia sessão)
        if (tokenAnterior) {
          localStorage.setItem('strapi_token', tokenAnterior)
        } else {
          localStorage.removeItem('strapi_token')
        }
      }
    }

    return data
  }

  async me(): Promise<UsuarioEntity> {
    const { data } = await httpClient.get<UsuarioRaw>('/api/users/me')
    return this.toEntity(data)
  }

  // ── CRUD (/api/users retorna flat — sem wrapper { data: { id, attributes } }) ──

  async create(payload: CreateUsuarioDto): Promise<UsuarioEntity> {
    const { data } = await httpClient.post<UsuarioRaw>(this.url, payload)
    return this.toEntity(data)
  }

  async update(id: number, payload: UpdateUsuarioDto): Promise<UsuarioEntity> {
    const { data } = await httpClient.put<UsuarioRaw>(`${this.url}/${id}`, payload)
    return this.toEntity(data)
  }

  async delete(id: number): Promise<void> {
    await httpClient.delete(`${this.url}/${id}`)
  }

  async getById(id: number): Promise<UsuarioEntity> {
    const { data } = await httpClient.get<UsuarioRaw>(`${this.url}/${id}`)
    return this.toEntity(data)
  }

  async list(params?: StrapiQueryParams<UsuarioAttributes>) {
    const { data } = await httpClient.get<UsuarioRaw[]>(this.url, {
      params: this.buildQueryParams(params),
    })
    const entities = data.map(u => this.toEntity(u))
    return {
      data: entities,
      pagination: {
        page: params?.pagination?.page ?? 1,
        pageSize: params?.pagination?.pageSize ?? entities.length,
        pageCount: 1,
        total: entities.length,
      },
    }
  }

  // ── Métodos de negócio ────────────────────────────────────────────────────

  async listByPerfil(perfil: PerfilUsuario, params?: StrapiQueryParams<UsuarioAttributes>) {
    return this.list({
      ...params,
      filters: { ...params?.filters, perfil: { $eq: perfil } },
      sort: params?.sort ?? ['username:asc'],
    })
  }

  async listAtivos(params?: StrapiQueryParams<UsuarioAttributes>) {
    return this.list({
      ...params,
      filters: { ...params?.filters, ativo: { $eq: true } },
      sort: params?.sort ?? ['username:asc'],
    })
  }

  async findByWhatsapp(whatsapp: string): Promise<UsuarioEntity | null> {
    const { data } = await this.list({ filters: { whatsapp: { $eq: whatsapp } } })
    return data[0] ?? null
  }

  async desativar(id: number): Promise<UsuarioEntity> {
    return this.update(id, { ativo: false })
  }

  async reativar(id: number): Promise<UsuarioEntity> {
    return this.update(id, { ativo: true })
  }

  async trocarSenha(id: number, novaSenha: string): Promise<UsuarioEntity> {
    return this.update(id, { password: novaSenha })
  }

  private toEntity(raw: UsuarioRaw): UsuarioEntity {
    return raw as unknown as UsuarioEntity
  }
}

export const usuarioService = new UsuarioService()