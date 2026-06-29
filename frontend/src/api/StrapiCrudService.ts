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

        const { data } = await httpClient.put<StrapiSingle<T>>(
            `${this.url}/${id}`, 
            { data: payload }
        )

        return data.data
    }

    async delete(id: number | string): Promise<void> {
        await httpClient.delete(`${this.url}/${id}`)
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