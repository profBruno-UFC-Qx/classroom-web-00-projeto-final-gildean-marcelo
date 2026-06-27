import { StrapiCrudService } from '@/api/StrapiCrudService';
import type { StrapiQueryParams } from '@/api/StrapiAdapters';


export enum StatusCategoria {
    Ativo = 'ativo',
    Pausado = 'pausado',
}

export interface CategoriaAttributes {
    nome: string
    ordem_exibicao: number
    situacao: StatusCategoria
    createdAt: string
    updatedAt: string
}


export interface CreateCategoriaDto {
    nome: string
    ordem_exibicao: number
    situacao?: StatusCategoria
}

export interface UpdateCategoriaDto {
    nome?: string
    ordem_exibicao?: number
    situacao?: StatusCategoria
}


export class CategoriaService extends StrapiCrudService<CategoriaAttributes, CreateCategoriaDto, UpdateCategoriaDto> {

    constructor() {
        super('/api/categorias')
    }

    async create(payload: CreateCategoriaDto) {
        return super.create({
            ...payload,
            situacao: payload.situacao ?? StatusCategoria.Ativo,
        })
    }

    async update(id: number, payload: UpdateCategoriaDto) {
        return super.update(id, payload)
    }

    async listAtivas(params?: StrapiQueryParams<CategoriaAttributes>) {
        return this.list({
            ...params,
            filters: { ...params?.filters, situacao: { $eq: StatusCategoria.Ativo } },
            sort: ['ordem_exibicao:asc']
        })
    }

    async pausar(id:number) {
        return this.update(id, { situacao: StatusCategoria.Pausado })
    }

    async reativar(id:number) {
        return this.update(id, { situacao: StatusCategoria.Ativo })
    }

}


export const categoriaService = new CategoriaService()