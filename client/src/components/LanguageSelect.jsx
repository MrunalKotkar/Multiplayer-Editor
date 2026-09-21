import { LANGUAGES } from '../lib/languages'

/**
 * @param {{ value: string, onChange: (id: string) => void }} props
 */
export default function LanguageSelect ({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.id} value={lang.id}>{lang.label}</option>
      ))}
    </select>
  )
}
