import axios from 'axios'

import { API_BASE_URL } from '../config'

export type ApiResponse<T> = {
  message: string
  data: T
  meta?: {
    total: number
    page: number
    pages: number
    size: number
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
