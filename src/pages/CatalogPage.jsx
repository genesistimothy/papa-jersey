import {useEffect, useMemo} from 'react'
import {useSearchParams} from 'react-router-dom'
import JerseyCard from '../components/JerseyCard.jsx'
import {SHOP_NAME} from '../config.js'
import {useJerseys} from '../hooks/useJerseys.jsx'
import {filterAndSort, KIT_TYPES, SORTS, uniqueValues, VERSIONS} from '../lib/jersey.js'

const FILTER_KEYS = ['q', 'team', 'league', 'type', 'version', 'sort']

export default function CatalogPage() {
  const {jerseys, status, error} = useJerseys()
  const [params, setParams] = useSearchParams()
  const criteria = useMemo(() => Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) || ''])), [params])

  useEffect(() => {
    document.title = `${SHOP_NAME} | Jersey Bola Original`
  }, [])

  const leagues = useMemo(() => uniqueValues(jerseys, 'league'), [jerseys])
  // Team options follow the chosen league so the list stays short.
  const teams = useMemo(
    () => uniqueValues(criteria.league ? jerseys.filter((jersey) => jersey.league === criteria.league) : jerseys, 'team'),
    [jerseys, criteria.league],
  )
  const results = useMemo(() => filterAndSort(jerseys, criteria), [jerseys, criteria])

  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, {replace: true})
  }
  const activeCount = ['team', 'league', 'type', 'version', 'q'].filter((key) => criteria[key]).length

  return (
    <>
      <section className="catalog-tools" aria-label="Cari dan filter jersey">
        <label className="search">
          <span className="visually-hidden">Cari jersey</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input
            type="search"
            placeholder="Cari nama, tim, atau musim"
            value={criteria.q}
            onChange={(event) => update({q: event.target.value})}
            enterKeyHint="search"
          />
        </label>

        <div className="chips" role="group" aria-label="Tipe jersey">
          <button type="button" className="chip" aria-pressed={!criteria.type} onClick={() => update({type: ''})}>Semua</button>
          {KIT_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              aria-pressed={criteria.type === option.value}
              onClick={() => update({type: criteria.type === option.value ? '' : option.value})}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="selects">
          <label>
            <span>Liga</span>
            <select value={criteria.league} onChange={(event) => update({league: event.target.value, team: ''})}>
              <option value="">Semua liga</option>
              {leagues.map((league) => <option key={league}>{league}</option>)}
            </select>
          </label>
          <label>
            <span>Tim</span>
            <select value={criteria.team} onChange={(event) => update({team: event.target.value})}>
              <option value="">Semua tim</option>
              {teams.map((team) => <option key={team}>{team}</option>)}
            </select>
          </label>
          <label>
            <span>Versi</span>
            <select value={criteria.version} onChange={(event) => update({version: event.target.value})}>
              <option value="">Semua versi</option>
              {VERSIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Urutkan</span>
            <select value={criteria.sort || 'newest'} onChange={(event) => update({sort: event.target.value === 'newest' ? '' : event.target.value})}>
              {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="result-bar" aria-live="polite">
          <span>{status === 'ready' ? `${results.length} jersey` : ''}</span>
          {activeCount > 0 && (
            <button type="button" className="link-button" onClick={() => setParams(criteria.sort ? {sort: criteria.sort} : {}, {replace: true})}>
              Hapus filter
            </button>
          )}
        </div>
      </section>

      {status === 'error' && <p className="notice">{error} Coba muat ulang halaman.</p>}

      <section className="grid" aria-busy={status === 'loading'}>
        {status === 'loading'
          ? Array.from({length: 6}, (_, index) => <div key={index} className="card card-skeleton" aria-hidden="true"><div className="card-media" /><div className="card-body" /></div>)
          : results.map((jersey, index) => <JerseyCard key={jersey.id} jersey={jersey} eager={index < 4} />)}
      </section>

      {status === 'ready' && !results.length && (
        <p className="notice">Belum ada jersey yang cocok. Coba ubah kata kunci atau filter.</p>
      )}
    </>
  )
}
