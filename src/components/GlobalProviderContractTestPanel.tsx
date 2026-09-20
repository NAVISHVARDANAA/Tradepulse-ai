import {
  Ban,
  Braces,
  CheckCheck,
  CircleAlert,
  FlaskConical,
  LoaderCircle,
  Network,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getGlobalProviderContractTests,
  type GlobalProviderContractTests,
} from '../lib/queries/globalProviderContractTests'

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function safeError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Provider contract-test readiness is temporarily unavailable.'
}

export function GlobalProviderContractTestPanel() {
  const [laboratory, setLaboratory] = useState<GlobalProviderContractTests | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('official_statistics')

  useEffect(() => {
    let active = true
    void getGlobalProviderContractTests().then((next) => {
      if (!active) return
      setLaboratory(next)
      if (!next.suites.some((suite) => suite.sourceFamilyKey === selectedKey)) {
        setSelectedKey(next.suites[0]?.sourceFamilyKey ?? '')
      }
      setError(null)
    }).catch((loadError) => {
      if (active) setError(safeError(loadError))
    })
    return () => { active = false }
  }, [])

  const selectedSuite = useMemo(() => laboratory?.suites.find(
    (suite) => suite.sourceFamilyKey === selectedKey,
  ), [laboratory, selectedKey])
  const selectedFixtures = useMemo(() => laboratory?.fixtures.filter(
    (fixture) => fixture.sourceFamilyKey === selectedKey,
  ) ?? [], [laboratory, selectedKey])

  if (!laboratory) {
    return error
      ? <section className="panel certification-panel" role="alert"><CircleAlert /> {error}</section>
      : <section className="panel certification-panel" role="status"><LoaderCircle className="spinning" /> Loading provider-neutral contract specifications…</section>
  }

  return (
    <section className="panel certification-panel contract-test-panel">
      <div className="panel-header">
        <div><p className="eyebrow">World intelligence · Phase 8M</p><h2>Provider-neutral contract test readiness</h2></div>
        <span className="status-badge active"><ShieldCheck size={14} /> Specification only</span>
      </div>
      <p className="panel-description">
        Define deterministic adapter assertions and synthetic fixture specifications before any provider-specific endpoint, credential or payload may be considered.
      </p>

      <div className="certification-boundary" role="note">
        <Ban size={22} />
        <div>
          <strong>No provider payload is tested in Phase 8M</strong>
          <span>No provider, endpoint, credential or external observation exists. Fixture execution, candidate writes, release, training, publication and trading remain database-locked off.</span>
        </div>
        <small>{laboratory.status.executedTestCount} tests executed</small>
      </div>

      <div className="certification-summary" aria-label="Provider contract-test laboratory summary">
        <article><Network /><strong>{laboratory.status.contractSuiteCount}</strong><span>source-family suites</span><small>{laboratory.status.specificationOnlySuiteCount} specification only</small></article>
        <article><CheckCheck /><strong>{laboratory.status.assertionCount}</strong><span>canonical assertions</span><small>No automatic pass</small></article>
        <article><FlaskConical /><strong>{laboratory.status.syntheticFixtureCount}</strong><span>synthetic specifications</span><small>{laboratory.status.fixtureExecutionCount} executed</small></article>
        <article><Braces /><strong>v1</strong><span>neutral schema</span><small>No provider fields</small></article>
      </div>

      <div className="certification-workspace">
        <section className="certification-profile-board" aria-labelledby="contract-suite-title">
          <div className="certification-heading"><div><Network size={18} /><h3 id="contract-suite-title">Eight provider-neutral contract suites</h3></div><small>No provider identity stored</small></div>
          <div className="certification-profile-grid">
            {laboratory.suites.map((suite) => (
              <button type="button" className={suite.sourceFamilyKey === selectedKey ? 'selected' : ''} key={suite.sourceFamilyKey} onClick={() => setSelectedKey(suite.sourceFamilyKey)}>
                <span>{suite.sequenceNumber}</span><div><strong>{suite.sourceFamilyName}</strong><small>{readable(suite.sourceClass)}</small></div><em>{readable(suite.suiteStatus)}</em>
              </button>
            ))}
          </div>
        </section>

        <aside className="certification-detail" aria-labelledby="contract-fixture-title">
          <div className="certification-heading"><div><FlaskConical size={18} /><h3 id="contract-fixture-title">Synthetic fixture specifications</h3></div><small>Not executed</small></div>
          {selectedSuite ? <>
            <header><span>{selectedSuite.sequenceNumber}</span><div><strong>{selectedSuite.sourceFamilyName}</strong><small>{selectedSuite.schemaContractVersion}</small></div></header>
            <div className="contract-fixture-list">
              {selectedFixtures.map((fixture) => <article key={fixture.fixtureKey}>
                <strong>{readable(fixture.fixtureClass)}</strong>
                <small>{fixture.specification}</small>
                <em>{readable(fixture.expectedDisposition)} · {fixture.executionCount} runs</em>
              </article>)}
            </div>
          </> : <p>No contract suite is available.</p>}
        </aside>
      </div>

      <section className="certification-gate-board" aria-labelledby="contract-assertion-title">
        <div className="certification-heading"><div><ShieldCheck size={18} /><h3 id="contract-assertion-title">Ten fail-closed conformance assertions</h3></div><small>Every failure blocks writes and release</small></div>
        <ol>{laboratory.assertions.map((assertion) => <li key={assertion.assertionKey}><span>{assertion.sequenceNumber}</span><div><strong>{assertion.displayName}</strong><em>{readable(assertion.failureDisposition)}</em><small>{assertion.assertionRequirement}</small></div></li>)}</ol>
      </section>

      <p className="certification-footnote"><CircleAlert size={15} /> Synthetic fixtures are specifications, not observations. Phase 8M does not certify a provider or permit an endpoint test; a later provider-specific change still requires signed rights, privacy and security approval, isolated credentials, observed failure evidence and accountable human authorization.</p>
    </section>
  )
}
