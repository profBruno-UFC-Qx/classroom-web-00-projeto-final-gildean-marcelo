import { StrapiCrudService } from '@/api/StrapiCrudService'
import type { StrapiEntity, StrapiQueryParams } from '@/api/StrapiAdapters'
import type { UsuarioAttributes } from './UsuarioService'
import type { ItemPedidoAttributes } from './ItemPedidoService'


export const TipoEntrega = {
    Delivery: 'delivery',
    Retirada: 'retirada',
} as const
export type TipoEntrega = typeof TipoEntrega[keyof typeof TipoEntrega]

export const SituacaoPedido = {
    Recebido:   'recebido',
    Preparando: 'preparando',
    Pronto:     'pronto',
    Entregue:   'entregue',
    Cancelado:  'cancelado',
} as const
export type SituacaoPedido = typeof SituacaoPedido[keyof typeof SituacaoPedido]

export const FormaPagamento = {
    Pix:             'pix',
    CartaoNaEntrega: 'cartao_na_entrega',
} as const
export type FormaPagamento = typeof FormaPagamento[keyof typeof FormaPagamento]

export interface PedidoAttributes {
    tipo_entrega: TipoEntrega
    situacao: SituacaoPedido
    forma_pagamento: FormaPagamento
    total: number
    observacao_geral: string | null
    usuario: { data: StrapiEntity<UsuarioAttributes> | null }
    itens: { data: StrapiEntity<ItemPedidoAttributes>[] }
    createdAt: string
    updatedAt: string
}

export interface CreatePedidoDto {
    usuario: number
    tipo_entrega: TipoEntrega
    forma_pagamento: FormaPagamento
    total: number
    observacao_geral?: string
    situacao?: SituacaoPedido    
}

export interface UpdatePedidoDto {
    situacao?: SituacaoPedido    
    forma_pagamento?: FormaPagamento
    total?: number
    observacao_geral?: string | null
}

export type PedidoEntity = StrapiEntity<PedidoAttributes>

const POPULATE_KDS = ['usuario', 'itens', 'itens.produto'] as const

export class PedidoService extends StrapiCrudService<PedidoAttributes, CreatePedidoDto, UpdatePedidoDto> {

    constructor() {
        super('/api/pedidos')
    }

    async create(payload: CreatePedidoDto): Promise<PedidoEntity> {
        return super.create({
            situacao: SituacaoPedido.Recebido,
            ...payload
        })
    }

    async update(id: number, payload: UpdatePedidoDto): Promise<PedidoEntity> {
        return super.update(id, payload)
    }

    async getWithRelations(id: number): Promise<PedidoEntity> {
        return this.getById(id, { populate: [...POPULATE_KDS] })
    }

    async listParaKDS(){
        return this.list({
            filters: {
                situacao: { $in: [SituacaoPedido.Recebido, SituacaoPedido.Preparando] },
            },
            populate: [...POPULATE_KDS],
            sort: ['createdAt:asc'],
        })
    }

    async listByUsuario(usuarioId: number, params?: StrapiQueryParams<PedidoAttributes>){
        return this.list({
            ...params,
            filters: { ...params?.filters, usuario: { id: { $eq: usuarioId } } },
            populate: ['itens', 'itens.produto'],
            sort: ['createdAt:desc'],
        })
    }

    async listBySituacao(situacao: SituacaoPedido, params?: StrapiQueryParams<PedidoAttributes>){
        return this.list({
            ...params,
            filters: { ...params?.filters, situacao: { $eq: situacao }  },            
            sort: ['createdAt:asc'],
        })
    }

    async iniciarPreparo(id: number): Promise<PedidoEntity> {
        return this.update(id, { situacao: SituacaoPedido.Preparando })
    }

    async marcarPronto(id: number): Promise<PedidoEntity> {
        return this.update(id, { situacao: SituacaoPedido.Pronto })
    }

    async marcarEntregue(id: number): Promise<PedidoEntity> {
        return this.update(id, { situacao: SituacaoPedido.Entregue })
    }

    async cancelar(id: number): Promise<PedidoEntity> {
        return this.update(id, { situacao: SituacaoPedido.Cancelado })
    }

}

export const pedidoService = new PedidoService()