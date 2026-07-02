export interface Role {
  value: string
  label: string
}

export interface EmployeeFormData {
  name:     string
  email:    string   // obrigatório pelo Users & Permissions do Strapi
  phone:    string
  cpf:      string
  address:  string
  role:     string   // valor do enum PerfilUsuario
  password: string
  isActive: boolean
}

export interface ValidationError {
  field:   string
  message: string
}

export interface CreateEmployeeResult {
  id:   string
  code: string   // ex.: "EMP-0007"
}

export interface EmployeeFormServicePort {
  getRoles(): Promise<Role[]>
  createEmployee(data: EmployeeFormData): Promise<CreateEmployeeResult>
}
