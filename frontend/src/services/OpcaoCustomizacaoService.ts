import { StrapiCrudService } from '@/api/StrapiCrudService'
import type { StrapiEntity, StrapiQueryParams } from '@/api/StrapiAdapters'
import type { GrupoCustomizacaoAttributes } from './GrupoCustomizacaoService'



export enum StatusOpcao {
    Ativo = 'ativo',
    Pausado = 'pausado',
}


export interface OpcaoCustomizacaoAttributes {
    nome: string
    preco_extra: number
    situacao: StatusOpcao
    
    grupo: { data: StrapiEntity<GrupoCustomizacaoAttributes> | null } //populada

    createdAt: number
    updatedAt: number
}


export interface CreateOpcaoCustomizacao {
    nome: string
    grupo: number
    preco_extra?: number
    situacao?: StatusOpcao    
}


export interface UpdateOpcaoCustomizacao {
    nome?: string
    grupo?: number
    preco_extra?: number
    situacao?: StatusOpcao    
}

export class OpcaoCustomizacaoService extends StrapiCrudService<
    OpcaoCustomizacaoAttributes,
    CreateOpcaoCustomizacao,
    UpdateOpcaoCustomizacao
> {

    constructor() {
        super('/api/opcao-customizacaos')
    }

    async create(payload: CreateOpcaoCustomizacao) {
        return super.create({
            preco_extra: 0,
            situacao: StatusOpcao.Ativo,
            ...payload,
        })
    }

    async update(id: number, payload: UpdateOpcaoCustomizacao) {
        return super.update(id, payload)
    }

    async listByGrupo(
        grupoId: number,
        params?: StrapiQueryParams<OpcaoCustomizacaoAttributes>
    ){

        return this.list({
            ...params,
            filters: {
                ...params?.filters,
                grupo: { id: { $eq: grupoId } },
                situacao: { $eq: StatusOpcao.Ativo }
            },
            sort: ['nome:asc'],
        })

    }

    async pausar(id: number){
        return this.update(id, { situacao: StatusOpcao.Pausado })
    }

    async reativar(id: number){
        return this.update(id, { situacao: StatusOpcao.Ativo })
    }

}


export const opcaoCustomizacaoService = new OpcaoCustomizacaoService()