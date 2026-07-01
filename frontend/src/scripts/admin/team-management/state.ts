export interface AppState {
  currentPage:    number
  perPage:        number
  searchQuery:    string
  totalEmployees: number
  totalPages:     number
}

export const state: AppState = { currentPage: 1, perPage: 4, searchQuery: '', totalEmployees: 0, totalPages: 1 }
