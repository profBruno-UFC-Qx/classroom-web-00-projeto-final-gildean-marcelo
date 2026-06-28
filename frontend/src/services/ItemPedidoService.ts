import { StrapiCrudService } from '@/api/StrapiCrudService'
import type { StrapiEntity } from '@/api/StrapiAdapters'
import type { ProdutoAttributes } from './ProdutoService'

export interface ItemPedidoAttributes {
    quantidade: number
    preco_unitario_cobrado: number
    pedido: { data: StrapiEntity<{ total: number }> | null}
    produto: { data: StrapiEntity<ProdutoAttributes> | null}
    createdAt: string
    updatedAt: string
}


export interface CreateItemPedidoDto {
    pedido: number
    produto: number
    quantidade: number
    preco_unitario_cobrado: number    
}

export interface UpdateItemPedidoDto {    
    quantidade?: number
    preco_unitario_cobrado?: number    
}

export type ItemPedidoEntity = StrapiEntity<ItemPedidoAttributes>

export class ItemPedidoService extends StrapiCrudService<
    ItemPedidoAttributes, 
    CreateItemPedidoDto, 
    UpdateItemPedidoDto
> {
    
    constructor(){
        super('/api/item-pedidos')
    }

    async update(id:number, payload: UpdateItemPedidoDto): Promise<ItemPedidoEntity>{
        return super.update(id, payload)
    }

    async getWithProduto(id:number): Promise<ItemPedidoEntity>{
        return this.getById(id, { populate: ['produto']})
    }

    async listByPedido(pedidoId: number){
        return this.list({
            filters: { pedido: { id: { $eq: pedidoId } } },
            populate: ['produto'],
            sort: ['createdAt:asc'],
        })
    }
    
    async createMany(itens: CreateItemPedidoDto[]): Promise<ItemPedidoEntity[]> {
        return Promise.all(itens.map(item => this.create(item)))
    }

}

export const itemPedidoService = new ItemPedidoService()