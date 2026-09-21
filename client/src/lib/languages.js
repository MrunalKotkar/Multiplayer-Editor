import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'

export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', extension: () => javascript() },
  { id: 'python', label: 'Python', extension: () => python() }
]

export function languageExtension (id) {
  const found = LANGUAGES.find((l) => l.id === id)
  return (found || LANGUAGES[0]).extension()
}
