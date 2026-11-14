import { useEffect, useMemo, useRef, useState } from 'react'
import type { Report } from './types'
import { indexReport, parseReport } from './lib/report'
import { Overview } from './views/Overview'
import { Sessions } from './views/Sessions'
import { Findings } from './views/Findings'
import { Events } from './views/Events'

export type Tab = 'overview' | 'sessions' | 'findings' | 'events'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'findings', label: 'Findings' },
  { id: 'events', label: 'Events' },
]

const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-report.json`

/** Optional: ?report=<url> loads a report from a URL instead of the sample. */
function initialReportUrl(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('report')
  return fromQuery || SAMPLE_URL
}

function initialTab(): Tab {
  const h = window.location.hash.replace('#', '') as Tab
  return TABS.some((t) => t.id === h) ? h : 'overview'
}

export default function App() {
  const [report, setReport] = useState<Report | null>(null)
  const [origin, setOrigin] = useState<'sample' | 'url' | 'file'>('sample')
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>(initialTab)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const url = initialReportUrl()
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${url} (HTTP ${r.status}).`)
        return r.json()
      })
      .then((raw) => {
        setReport(parseReport(raw))
        setOrigin(url === SAMPLE_URL ? 'sample' : 'url')
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    const onHash = () => setTab(initialTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (t: Tab) => {
    setTab(t)
    history.replaceState(null, '', `#${t}`)
    window.scrollTo({ top: 0 })
  }

  const idx = useMemo(() => (report ? indexReport(report) : null), [report])

  const loadFile = async (file: File) => {
    try {
      const parsed = parseReport(JSON.parse(await file.text()))
      setReport(parsed)
      setOrigin('file')
      setFileName(file.name)
      setError(null)
      go('overview')
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? `${file.name} is not valid JSON.`
          : `${file.name} can't be shown: ${(e as Error).message}`,
      )
    }
  }

  const loadSample = async () => {
    const raw = await fetch(SAMPLE_URL).then((r) => r.json())
    setReport(parseReport(raw))
    setOrigin('sample')
    setError(null)
  }

  const counts = report
    ? { findings: report.findings.length, sessions: report.sessions.length, events: report.events.length }
    : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <a className="brand" href="#overview" onClick={() => go('overview')}>
            <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <circle cx="9" cy="16" r="3.5" fill="var(--human)" />
              <circle cx="23" cy="16" r="3.5" fill="var(--agent-obo)" />
              <path d="M12.5 16h7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            TrailAnalyzer
          </a>

          <nav className="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="tabs__tab"
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  go(t.id)
                }}
              >
                {t.label}
                {counts && t.id !== 'overview' && <span className="tabs__n">{counts[t.id]}</span>}
              </a>
            ))}
          </nav>

          <div className="source">
            <span className={`source__badge source__badge--${origin}`}>
              {origin === 'sample' ? 'Sample data' : origin === 'file' ? fileName : 'Loaded from URL'}
            </span>
            {origin !== 'sample' && (
              <button type="button" className="btn btn--quiet btn--small" onClick={loadSample}>
                Back to sample
              </button>
            )}
            <button type="button" className="btn btn--primary btn--small" onClick={() => fileInput.current?.click()}>
              Open report
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) loadFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="alert" role="alert">
            <p>{error}</p>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        {!report || !idx ? (
          !error && <p className="loading muted">Loading report…</p>
        ) : (
          <>
            {tab === 'overview' && <Overview report={report} idx={idx} go={go} />}
            {tab === 'sessions' && <Sessions report={report} idx={idx} />}
            {tab === 'findings' && <Findings report={report} idx={idx} />}
            {tab === 'events' && <Events report={report} idx={idx} />}
          </>
        )}
      </main>

      <footer className="footer muted">
        <p>
          Reports stay in your browser; nothing is uploaded. Open a <code>report.json</code> written by the
          TrailAnalyzer CLI, or add <code>?report=&lt;url&gt;</code> to load one from a link.
        </p>
        <a href="https://github.com/iamtoyosee/TrailAnalyzer">Source on GitHub</a>
      </footer>
    </div>
  )
}
