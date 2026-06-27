import { StrapiCrudService } from '@/api/StrapiCrudService'
import type { StrapiEntity, StrapiQueryParams } from '@/api/StrapiAdapters'
import type { OpcaoCustomizacaoAttributes } from './OpcaoCustomizacaoService'


export enum TipoEscolha {
    Radio = 'radio', 
    Checkbox = 'checkbox' 
}

export interface GrupoCustomizacaoAttributes {
    nome: string
    tipo_escolha: TipoEscolha
    min_escolhas: number
    max_escolhas: number

    //populadas
    produto: { data: StrapiEntity<{ nome : string }> | null }
    opcoes: { data: StrapiEntity<OpcaoCustomizacaoAttributes>[] }

    createdAt: string
    updatedAt: string

}

export interface CreateGrupoCustomizacao {
    nome: string
    tipo_escolha: TipoEscolha
    min_escolhas: number
    max_escolhas: number
    produto?: number | null
}

export interface UpdateGrupoCustomizacao {
    nome?: string
    tipo_escolha?: TipoEscolha
    min_escolhas?: number
    max_escolhas?: number
    produto?: number | null
}

export class GrupoCustomizacaoService extends StrapiCrudService<
    GrupoCustomizacaoAttributes,
    CreateGrupoCustomizacao,
    UpdateGrupoCustomizacao
> {

    constructor(){
        super('/api/grupo-customizacaos')
    }

    async update(id:number, payload: UpdateGrupoCustomizacao) {
        return super.update(id, payload)
    }

    async getWithOpcoes( id: number ) {
        return this.getById(id, { populate: ['opcoes'] })
    }

    async listByProduto(
        produtoId: number,
        params?: StrapiQueryParams<GrupoCustomizacaoAttributes>
    ) {
        
        return this.list({
            ...params,
            filters: {
                ...params?.filters,
                produto: { id: { $eq: produtoId } }
            },
            populate: ['opcoes'],
        })

    }

    async listGlobais( params?: StrapiQueryParams<GrupoCustomizacaoAttributes> ) {
        
        return this.list({
            ...params,
            filters: {
                ...params?.filters,
                produto: { id: { $null: true } }
            },
            populate: ['opcoes'],
        })

    }

}

export const grupoCustomizacaoService = new GrupoCustomizacaoService()