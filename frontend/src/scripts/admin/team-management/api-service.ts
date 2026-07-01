import { usuarioService } from '@/services/UsuarioService'
import { toEmployee } from './mappers'
import type { Employee, EmployeeServicePort, PaginatedResult, TeamStats } from './types'

class ApiEmployeeService implements EmployeeServicePort {
  /**
   * Cache em memória com TTL de 30 s.
   *
   * Por que paginação client-side?
   * /api/users não retorna meta.pagination real; list() sempre retorna
   * total = length da página corrente. Para equipes de até ~1000 pessoas,
   * buscar todos de uma vez e paginar no front é a abordagem pragmática.
   * Para equipes maiores, implemente um endpoint customizado no Strapi
   * com paginação server-side e substitua fetchAllStaff().
   */
  private cache: { employees: Employee[]; updatedAt: number } | null = null
  private readonly CACHE_TTL_MS = 30_000
  private pendingFetch: Promise<Employee[]> | null = null

  private async fetchAllStaff(): Promise<Employee[]> {
    const now = Date.now()
    if (this.cache && now - this.cache.updatedAt < this.CACHE_TTL_MS) {
      return this.cache.employees
    }
    // Deduplica chamadas simultâneas (ex: loadEmployees + getStats em init)
    if (this.pendingFetch) return this.pendingFetch

    this.pendingFetch = usuarioService
      .listFuncionarios({
        sort:       ['username:asc'],
        pagination: { page: 1, pageSize: 1000 },
      })
      .then(result => {
        const employees  = result.data.map(toEmployee)
        this.cache       = { employees, updatedAt: Date.now() }
        this.pendingFetch = null
        return employees
      })
      .catch(err => {
        this.pendingFetch = null
        throw err
      })

    return this.pendingFetch
  }

  invalidateCache(): void {
    this.cache        = null
    this.pendingFetch = null
  }

  async getEmployees(page: number, perPage: number): Promise<PaginatedResult<Employee>> {
    const all   = await this.fetchAllStaff()
    const start = (page - 1) * perPage
    return {
      data:       all.slice(start, start + perPage),
      total:      all.length,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(all.length / perPage)),
    }
  }

  async getStats(): Promise<TeamStats> {
    // Lê do cache (populado por getEmployees) — sem nova requisição
    const all = await this.fetchAllStaff()
    return {
      total:    all.length,
      active:   all.filter(e => e.status !== 'inactive').length,
      onDuty:   all.filter(e => e.status === 'on-duty').length,
      inactive: all.filter(e => e.status === 'inactive').length,
    }
  }

  async searchEmployees(query: string, page: number, perPage: number): Promise<PaginatedResult<Employee>> {
    const all = await this.fetchAllStaff()
    const q   = query.toLowerCase()
    const filtered = all.filter(e =>
      e.name.toLowerCase().includes(q)                                      ||
      e.role.toLowerCase().includes(q)                                      ||
      e.email.toLowerCase().includes(q)                                     ||
      e.code.toLowerCase().includes(q)                                      ||
      e.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    )
    const start = (page - 1) * perPage
    return {
      data:       filtered.slice(start, start + perPage),
      total:      filtered.length,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    // Soft-delete: desativa o funcionário sem apagar do banco.
    // Para exclusão permanente: usuarioService.delete(Number(id))
    await usuarioService.desativar(Number(id))
    this.invalidateCache()
  }
}

export const employeeService: EmployeeServicePort = new ApiEmployeeService()
