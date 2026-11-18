export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error?: string
  code?: string
}
