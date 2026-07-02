import type {
    StrapiCrudAdapters,
    StrapiEntity,
    StrapiList,
    StrapiSingle,
    StrapiQueryParams,
    PaginatedResult,
} from './StrapiAdapters'
import httpClient from './HttpClient'

export class StrapiCrudService<T, TCreate = Partial<T>, TUpdate = Partial<TCreate>> implements StrapiCrudAdapters<T, TCreate, TUpdate> {

    protected readonly url: string

    constructor(url: string) {
        this.url = url.startsWith('/') ? url : `/${url}`
    }

    async create(payload: TCreate): Promise<StrapiEntity<T>> {

        const { data } = await httpClient.post<StrapiSingle<T>>(this.url, { 
            data: payload 
        })

        return data.data

    }

    async update(id: number | string, payload: TUpdate): Promise<StrapiEntity<T>> {
        const documentId = await this.resolveDocumentId(id)

        const { data } = await httpClient.put<StrapiSingle<T>>(
            `${this.url}/${documentId}`,
            { data: payload }
        )

        return data.data
    }

    async delete(id: number | string): Promise<void> {
        const documentId = await this.resolveDocumentId(id)
        await httpClient.delete(`${this.url}/${documentId}`)
    }

    /**
     * Strapi 5 não aceita o id numérico interno na URL de update/delete,
     * só o documentId. Quando recebemos um id numérico (caso comum: telas
     * admin que mapeiam StrapiEntity.id para a UI), resolvemos o documentId
     * real via filtro antes de montar a URL — mesma estratégia já usada em
     * getById().
     */
    private async resolveDocumentId(id: number | string): Promise<string> {
        if (typeof id === 'string') return id

        const queryParams: StrapiQueryParams<T> = { filters: { id: { $eq: id } } as any }
        const listRes = await this.list(queryParams)
        if (listRes.data.length === 0) throw new Error(`Entity with id ${id} not found`)
        return listRes.data[0].documentId
    }

    async list(params?: StrapiQueryParams<T>): Promise<PaginatedResult<T>> {
        const { data } = await httpClient.get<StrapiList<T>>(this.url, {
            params: this.buildQueryParams(params),
        })
    
        return {
            data: data.data,
            pagination: data.meta.pagination,
        }
    }

    async getById(
        id: number | string,
        params?: Pick<StrapiQueryParams<T>, 'populate' | 'fields'>
    ): Promise<StrapiEntity<T>> {
        if (typeof id === 'number') {
            // Strapi 5 does not support numeric IDs in the REST URL by default.
            // We use a filter query to find the document by its internal numeric ID.
            const queryParams: StrapiQueryParams<T> = { ...params };
            queryParams.filters = { ...queryParams.filters, id: { $eq: id } } as any;
            const listRes = await this.list(queryParams);
            if (listRes.data.length === 0) throw new Error(`Entity with id ${id} not found`);
            return listRes.data[0];
        }

        const { data } = await httpClient.get<StrapiSingle<T>>(`${this.url}/${id}`, 
            { params: this.buildQueryParams(params) }
        )

        return data.data
    }

    protected buildQueryParams(
        params?: StrapiQueryParams<T>
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