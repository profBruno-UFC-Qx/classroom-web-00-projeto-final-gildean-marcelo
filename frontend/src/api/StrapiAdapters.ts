export interface StrapiSingle<T> {
    data: StrapiEntity<T>;
    meta: Record<string, unknown>;
}

export interface StrapiList<T> {
    data: StrapiEntity<T>[];
    meta: {
        pagination: {
            page: number;
            pageSize: number;
            pageCount: number;
            total: number;
        }
    }
}

export interface StrapiEntity<T> {
    id: number;
    attributes: T;
}

export interface StrapiQueryParams<T = Record<string, unknown>> {
    populate?: string | string[] | Record<string, unknown>
    filters?: Partial<Record<keyof T, unknown>> | Record<string, unknown>
    sort?: string | string[]
    pagination?: {
        page?: number
        pageSize?: number
    }
    fields?: (keyof T)[]
}

export interface PaginatedResult<T> {
    data: StrapiEntity<T>[]
    pagination: {
        page: number
        pageSize: number
        pageCount: number
        total: number
    }
}

export interface StrapiCrudAdapters<T, TCreate = Partial<T>> {
    create(payload: TCreate): Promise<StrapiEntity<T>>
    update(id: number, payload: Partial<T>): Promise<StrapiEntity<T>>
    delete(id: number): Promise<void>
    list(params?: StrapiQueryParams<T>): Promise<PaginatedResult<T>>
    getById(id: number, params?: Pick<StrapiQueryParams<T>, 'populate' | 'fields'>): Promise<StrapiEntity<T>>
}