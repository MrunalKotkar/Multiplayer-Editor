import { useCallback, useEffect, useState } from 'react'

const KEY = 'language'
const DEFAULT_LANGUAGE = 'javascript'

/**
 * The selected language lives in the shared Y.Map, so changing it in one
 * tab updates every other client in the room live, same as the text itself.
 * `meta` is null until the room's Yjs connection has been set up.
 *
 * @param {import('yjs').Map<any> | undefined} meta
 */
export function useSharedLanguage (meta) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE)

  useEffect(() => {
    if (!meta) return
    const onChange = () => setLanguageState(meta.get(KEY) || DEFAULT_LANGUAGE)
    meta.observe(onChange)
    onChange()
    return () => meta.unobserve(onChange)
  }, [meta])

  const setLanguage = useCallback((next) => {
    meta?.set(KEY, next)
  }, [meta])

  return [language, setLanguage]
}
