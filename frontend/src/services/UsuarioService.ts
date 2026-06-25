import { StrapiCrudService } from '@/api/StrapiCrudService';
import type { StrapiEntity, StrapiQueryParams } from '@/api/StrapiAdapters'
import httpClient from '@/api/HttpClient'

export enum PerfilUsuario {
    Cliente = 'cliente',
    Admin = 'admin',
    Caixa = 'caixa',
    Cozinha = 'cozinha',
}


export interface UsuarioAttributes {
    username: string
    email: string
    whatsapp: string
    perfil: PerfilUsuario
    endereco_padrao: string | null
    ativo: boolean
    blocked: boolean
    confirmed: boolean
    createdAt: string
    updatedAt: string
}

export interface CreateUsuarioDto {
    username: string
    email: string
    password: string
    whatsapp: string
    perfil?: PerfilUsuario
    endereco_padrao?: string
    ativo?: boolean
}

export interface UpdateUsuarioDto {
    username?: string
    email?: string
    password?: string
    whatsapp?: string
    perfil?: PerfilUsuario
    endereco_padrao?: string | null
    ativo?: boolean  
    blocked?: boolean
}

export interface LoginResponse {
    jwt: string
    user: { id: number } & Omit<UsuarioAttributes, 'createdAt' | 'updatedAt'>
}

export type UsuarioEntity = StrapiEntity<UsuarioAttributes>

type UsuarioRaw = { id: number } & UsuarioAttributes

export class UsuarioService extends StrapiCrudService<UsuarioAttributes, CreateUsuarioDto> {

    constructor() {
        super('/api/users')
    }

    async login(username: string, password: string): Promise<LoginResponse> {
        const { data } = await httpClient.post<LoginResponse>(
            '/api/auth/local',
            { identifier: username, password },
            { skipAuth: true }
        )

        return data
    }

    async registrar(payload: CreateUsuarioDto): Promise<LoginResponse> {

        const { data } = await httpClient.post<LoginResponse>(
            '/api/auth/local/register',
            {
                username: payload.username,
                email: payload.email,
                password: payload.password,
            },
            { skipAuth: true }
        )

        if (data.user.id) {
            await this.update(data.user.id, {
                whatsapp: payload.whatsapp,
                perfil: payload.perfil ?? PerfilUsuario.Cliente,
                ativo: payload.ativo ?? true,
                endereco_padrao: payload.endereco_padrao ?? null,
            })
        }

        return data

    }

    async me(): Promise<UsuarioEntity> {

        const { data } = await httpClient.get<UsuarioRaw>('/api/users/me')

        return this.toEntity(data)

    }

    async create(payload: CreateUsuarioDto): Promise<UsuarioEntity> {
        const { data } = await httpClient.post<UsuarioRaw>(this.url, payload)
        return this.toEntity(data)
    }

    async update(id: number, payload: UpdateUsuarioDto): Promise<UsuarioEntity> {
        const { data } = await httpClient.put<UsuarioRaw>(
            `${this.url}/${id}`, 
            payload
        )
        return this.toEntity(data)
    }

    async delete(id: number): Promise<void> {
        await httpClient.delete(`${this.url}/${id}`)
    }

    async getById(id: number): Promise<UsuarioEntity> {
        const { data } = await httpClient.get<UsuarioRaw>(`${this.url}/${id}`)
        return this.toEntity(data)
    }


    /**
   * 
   * NOTA: /api/users devolve um array direto sem paginação nativa.
   * O objeto `pagination` retornado é calculado localmente com base
   * no total de itens recebidos — não reflete paginação server-side real.
   * 
   */
    async list(params?: StrapiQueryParams<UsuarioAttributes>){

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
            }
        }

    }

    async listByPerfil(
        perfil: PerfilUsuario,
        params?: StrapiQueryParams<UsuarioAttributes>
    ) {
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
        const { data } = await this.list({
            filters: { whatsapp: { $eq: whatsapp } },            
        })
        return data[0] ?? null
    }

    async desativar(id: number): Promise<UsuarioEntity> {
        return this.update(id, { ativo: false })
    }

    async reativar(id: number): Promise<UsuarioEntity> {
        return this.update(id, { ativo: true })
    }

    async trocarSenha(id: number, novaSenha: string): Promise<UsuarioEntity> {
        return this.update(id, { password: novaSenha})
    }    


    /**
   * Normaliza o objeto flat do /api/users para o formato StrapiEntity
   * que o resto do sistema (e os tipos) esperam.
   */
    private toEntity(raw: UsuarioRaw): UsuarioEntity {

        const { id, ...attributes } = raw
        return { id, attributes: attributes as UsuarioAttributes }
    }

}

export const usuarioService = new UsuarioService()


