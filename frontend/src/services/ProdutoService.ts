import { StrapiCrudService } from '@/api/StrapiCrudService';
import type { StrapiQueryParams, StrapiEntity } from '@/api/StrapiAdapters';
import type { CategoriaAttributes } from './CategoriaService'
import type { GrupoCustomizacaoAttributes } from './GrupoCustomizacaoService'

export enum StatusProduto {
    Ativo = 'ativo',
    Pausado = 'pausado',
}

export interface ProdutoAttributes {
    nome: string
    descricao: string | null
    preco_base: number
    imagem_url: string | null
    situacao: StatusProduto


    //populadas
    categoria: { data: StrapiEntity<CategoriaAttributes> | null }
    grupos: { data: StrapiEntity<GrupoCustomizacaoAttributes>[] }
    createdAt: number
    updatedAt: number
}


export interface CreateProdutoDto {
    nome: string
    categoria: number
    preco_base: number
    descricao?: string
    imagem_url?: string
    situacao?: StatusProduto
}


export interface UpdateProdutoDto {
    nome?: string
    categoria?: number
    preco_base?: number
    descricao?: string | null
    imagem_url?: string | null
    situacao?: StatusProduto
}


export class ProdutoService extends StrapiCrudService<ProdutoAttributes, CreateProdutoDto, UpdateProdutoDto> {

    constructor(){
        super('/api/produtos')
    }

    async create( payload: CreateProdutoDto ) {
        return super.create({
            ...payload,
            situacao: payload.situacao ?? StatusProduto.Ativo
        })
    }

    async update(id: number, payload: UpdateProdutoDto) {
        return super.update(id, payload)
    }

    async getWithRelations( id : number ) {
        return this.getById(id, {
            populate: ['categoria', 'grupos', 'grupos.opcoes'],
        })
    }

    async listByCategoria(
        categoriaId: number,
        params?:StrapiQueryParams<ProdutoAttributes>
    ) {

        return this.list({
            ...params,
            filters: {
                ...params?.filters,
                situacao: { $eq: StatusProduto.Ativo },
                categoria: { id: { $eq: categoriaId } }
            },
            sort: ['nome:asc'],
            populate: ['categoria'],
        })

    }

    async listAtivos(        
        params?:StrapiQueryParams<ProdutoAttributes>
    ) {

        return this.list({
            ...params,
            filters: {
                ...params?.filters,
                situacao: { $eq: StatusProduto.Ativo }                
            },
            sort: ['nome:asc'],
            populate: ['categoria'],
        })

    }

    async pausar(id:number) {
        return this.update(id, { situacao: StatusProduto.Pausado })
    }

    async reativa(id:number) {
        return this.update(id, { situacao: StatusProduto.Ativo })
    }

}

export const produtoService = new ProdutoService();