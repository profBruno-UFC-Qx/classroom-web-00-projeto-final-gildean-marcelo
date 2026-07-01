export type EmployeeStatus = 'on-duty' | 'active' | 'inactive'

export interface Employee {
  id:     string
  name:   string
  code:   string
  avatar: string
  role:   string
  email:  string
  phone:  string
  status: EmployeeStatus
}

export interface TeamStats {
  total:    number
  active:   number
  onDuty:   number
  inactive: number
}

export interface PaginatedResult<T> {
  data:       T[]
  total:      number
  page:       number
  perPage:    number
  totalPages: number
}

export interface EmployeeServicePort {
  getEmployees(page: number, perPage: number): Promise<PaginatedResult<Employee>>
  getStats(): Promise<TeamStats>
  searchEmployees(query: string, page: number, perPage: number): Promise<PaginatedResult<Employee>>
  deleteEmployee(id: string): Promise<void>
}
