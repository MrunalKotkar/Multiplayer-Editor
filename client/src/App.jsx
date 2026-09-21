import Landing from './pages/Landing'
import Room from './pages/Room'

// Two routes total, so plain path parsing beats pulling in a router:
// "/" -> Landing, "/room/:id" -> Room.
function App () {
  const path = window.location.pathname
  const match = /^\/room\/([^/]+)\/?$/.exec(path)

  if (match) {
    return <Room roomId={decodeURIComponent(match[1])} />
  }
  return <Landing />
}

export default App
