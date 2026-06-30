import type { StrapiQueryParams } from '@/api/StrapiAdapters'
import httpClient from '@/api/HttpClient'

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum PerfilUsuario {
  Cliente = 'cliente',
  Admin   = 'admin',
  Cozinha = 'cozinha',
}

// ─── Attributes ───────────────────────────────────────────────────────────────

export interface UsuarioAttributes {
  username:   string
  email:      string
  whatsapp:   string
  cpf:        string
  endereco:   string | null
  perfil:     PerfilUsuario
  ativo:      boolean
  // ── ADIÇÃO ──────────────────────────────────────────────────────────────────
  // Campo customizado: indica se o funcionário está em turno ativo.
  // ⚠️  Strapi: Content-Type Builder → User → Add field:
  //     Name: emServico | Type: Boolean | Default: false | Required: false
  // ────────────────────────────────────────────────────────────────────────────
  emServico?: boolean
  blocked:    boolean
  confirmed:  boolean
  createdAt:  string
  updatedAt:  string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateUsuarioDto {
  username:   string
  email:      string
  password:   string
  whatsapp:   string
  cpf:        string
  endereco?:  string
  perfil?:    PerfilUsuario
  ativo?:     boolean
  emServico?: boolean   // ← ADIÇÃO
}

export interface UpdateUsuarioDto {
  username?:  string
  email?:     string
  password?:  string
  whatsapp?:  string
  cpf?:       string
  endereco?:  string | null
  perfil?:    PerfilUsuario
  ativo?:     boolean
  emServico?: boolean   // ← ADIÇÃO
  blocked?:   boolean
}

export interface LoginResponse {
  jwt:  string
  user: { id: number } & Omit<UsuarioAttributes, 'createdAt' | 'updatedAt'>
}

export type UsuarioEntity = { id: number } & UsuarioAttributes
type UsuarioRaw = { id: number } & UsuarioAttributes

// ─── Service ──────────────────────────────────────────────────────────────────
//
// Não estende StrapiCrudService: o endpoint /api/users (plugin
// users-permissions) NÃO segue o formato padrão do Strapi
// ({ data: { id, documentId, ... } }), é uma resposta flat sem
// documentId. Reaproveitar a base genérica geraria incompatibilidade
// de tipos no retorno de create/update/getById/list, então a classe
// é autossuficiente — todos os métodos abaixo já eram reescritos mesmo.

export class UsuarioService {

  protected readonly url: string

  constructor() {
    this.url = '/api/users'
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
      const tokenAnterior = localStorage.getItem('strapi_token')
      localStorage.setItem('strapi_token', data.jwt)

      try {
        await this.update(data.user.id, {
          whatsapp: payload.whatsapp,
          cpf:      payload.cpf,
          endereco: payload.endereco ?? null,
          perfil:   payload.perfil   ?? PerfilUsuario.Cliente,
          ativo:    payload.ativo    ?? true,
        })
      } finally {
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

  // ── CRUD (flat — sem wrapper { data: { id, attributes } }) ────────────────

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
        page:      params?.pagination?.page     ?? 1,
        pageSize:  params?.pagination?.pageSize ?? entities.length,
        pageCount: 1,
        total:     entities.length,
      },
    }
  }

  // ── Métodos de negócio ────────────────────────────────────────────────────

  async listByPerfil(perfil: PerfilUsuario, params?: StrapiQueryParams<UsuarioAttributes>) {
    return this.list({
      ...params,
      filters: { ...params?.filters, perfil: { $eq: perfil } },
      sort:    params?.sort ?? ['username:asc'],
    })
  }

  async listAtivos(params?: StrapiQueryParams<UsuarioAttributes>) {
    return this.list({
      ...params,
      filters: { ...params?.filters, ativo: { $eq: true } },
      sort:    params?.sort ?? ['username:asc'],
    })
  }

  /**
   * Lista apenas funcionários (Admin + Cozinha), excluindo clientes.
   * Usado pelo painel admin de equipe.
   * Passe pageSize alto para buscar todos de uma vez (paginação feita
   * no front, porque /api/users não retorna meta.pagination real).
   */
  async listFuncionarios(params?: StrapiQueryParams<UsuarioAttributes>) {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        perfil: { $ne: PerfilUsuario.Cliente },
      },
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

  // ── ADIÇÕES para controle de turno ────────────────────────────────────────
  // Requer campo emServico (Boolean, default: false) no Content-Type Builder.

  async marcarEmServico(id: number): Promise<UsuarioEntity> {
    return this.update(id, { emServico: true })
  }

  async encerrarServico(id: number): Promise<UsuarioEntity> {
    return this.update(id, { emServico: false })
  }

  // ─────────────────────────────────────────────────────────────────────────

  private toEntity(raw: UsuarioRaw): UsuarioEntity {
    return raw
  }

  protected buildQueryParams(
    params?: StrapiQueryParams<UsuarioAttributes>
  ): Record<string, unknown> | undefined {
    if (!params) return undefined

    const query: Record<string, unknown> = {}

    if (params.filters) query['filters'] = params.filters
    if (params.populate) query['populate'] = params.populate
    if (params.sort) query['sort'] = params.sort
    if (params.fields) query['fields'] = params.fields
    if (params.pagination) query['pagination'] = params.pagination

    return query
  }
}

export const usuarioService = new UsuarioService()