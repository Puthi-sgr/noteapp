import { request } from './client'
import type {
  NoteCreateDto,
  NoteReadDto,
  NoteUpdateDto,
} from './types'

type ListNotesOptions = {
  search?: string
  sort?: 'createdAt' | 'updatedAt' | 'title'
  desc?: boolean
  skip?: number
  take?: number
}

const normalizeContent = <T extends { content?: string | null }>(payload: T) => ({
  ...payload,
  content: payload.content ?? null,
})

export const listNotes = async (options: ListNotesOptions = {}): Promise<NoteReadDto[]> => {
  return request<NoteReadDto[]>('/notes', {
    method: 'GET',
    query: {
      q: options.search,
      sort: options.sort,
      desc: options.desc,
      skip: options.skip,
      take: options.take,
    },
  })
}

export const getNote = async (id: number): Promise<NoteReadDto> => {
  return request<NoteReadDto>(`/notes/${id}`, {
    method: 'GET',
  })
}

export const createNote = async (payload: NoteCreateDto): Promise<NoteReadDto> => {
  return request<NoteReadDto>('/notes', {
    method: 'POST',
    body: normalizeContent(payload),
  })
}

export const updateNote = async (id: number, payload: NoteUpdateDto): Promise<void> => {
  await request<void>(`/notes/${id}`, {
    method: 'PUT',
    body: normalizeContent(payload),
  })
}

export const deleteNote = async (id: number): Promise<void> => {
  await request<void>(`/notes/${id}`, {
    method: 'DELETE',
  })
}
