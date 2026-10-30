import {createContext, useContext, useEffect, useState} from 'react'
import {sampleJerseys} from '../data/sampleJerseys.js'
import {PUBLIC_JERSEY_FIELDS, sanityConfigured, sanityQuery} from '../lib/sanity.js'

const JerseysContext = createContext({jerseys: [], status: 'loading', error: ''})

// A small shop has tens of jerseys, so the whole visible catalog loads once; filters then run locally and instantly.
const CATALOG_QUERY = `*[_type == "jersey" && visible == true] | order(_createdAt desc){${PUBLIC_JERSEY_FIELDS}}`

export function JerseysProvider({children}) {
  const [state, setState] = useState(() => sanityConfigured
    ? {jerseys: [], status: 'loading', error: ''}
    : {jerseys: sampleJerseys, status: 'ready', error: ''})

  useEffect(() => {
    if (!sanityConfigured) return undefined
    const controller = new AbortController()
    sanityQuery(CATALOG_QUERY, {}, {signal: controller.signal})
      .then((jerseys) => setState({jerseys: jerseys || [], status: 'ready', error: ''}))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({jerseys: [], status: 'error', error: error.message})
      })
    return () => controller.abort()
  }, [])

  return <JerseysContext.Provider value={state}>{children}</JerseysContext.Provider>
}

export const useJerseys = () => useContext(JerseysContext)
