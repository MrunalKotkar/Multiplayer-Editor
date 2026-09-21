import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { go } from '@codemirror/lang-go'
import { rust } from '@codemirror/lang-rust'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'

export const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', extension: () => javascript() },
  { id: 'typescript', label: 'TypeScript', extension: () => javascript({ typescript: true }) },
  { id: 'python', label: 'Python', extension: () => python() },
  { id: 'go', label: 'Go', extension: () => go() },
  { id: 'rust', label: 'Rust', extension: () => rust() },
  { id: 'cpp', label: 'C++', extension: () => cpp() },
  { id: 'java', label: 'Java', extension: () => java() }
]

export function languageExtension (id) {
  const found = LANGUAGES.find((l) => l.id === id)
  return (found || LANGUAGES[0]).extension()
}
