import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { yCollab } from 'y-codemirror.next'
import { languageExtension } from '../lib/languages'

/**
 * CodeMirror 6, bound directly to the shared Y.Text via y-codemirror.next's
 * yCollab extension. Every keystroke here becomes a Yjs update broadcast to
 * the room; every remote update re-renders through the same binding, and
 * yCollab's remote-selection layer draws everyone else's caret + name tag.
 *
 * @param {{ ytext: import('yjs').Text, awareness: any, language: string }} props
 */
export default function CollabEditor ({ ytext, awareness, language }) {
  const hostRef = useRef(null)
  const viewRef = useRef(null)
  const languageCompartment = useRef(new Compartment())

  // Mount once per (ytext, awareness) pair — i.e. once per room.
  useEffect(() => {
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        languageCompartment.current.of(languageExtension(language)),
        yCollab(ytext, awareness)
      ]
    })
    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytext, awareness])

  // Reconfigure just the language extension in place, so switching JS/Python
  // doesn't tear down and rebuild the yCollab binding (which would drop
  // local undo history and momentarily desync the cursor layer).
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: languageCompartment.current.reconfigure(languageExtension(language))
    })
  }, [language])

  return <div ref={hostRef} className="h-full w-full" />
}
