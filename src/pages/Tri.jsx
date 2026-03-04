import { useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { buildApiUrl, buildAssetUrl } from '../config/api'

const conditionLabels = {
  perfect: 'Parfait etat',
  good: 'Bon etat',
  bad: 'Mauvais etat',
}

const conditionPenalty = {
  perfect: 0,
  good: 1,
  bad: 3,
}

const formatDate = (value) => {
  if (!value) return 'Jamais porte'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Jamais porte'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const getDaysSince = (value) => {
  if (!value) return 9999
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 9999
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

const buildCandidateScore = (item, useLowWear, useWornOut) => {
  const wearCount = Number(item?.wearCount || 0)
  const condition = String(item?.condition || 'good')
  const daysSince = getDaysSince(item?.lastWornAt)
  let score = 0

  if (useLowWear) {
    score += Math.max(0, 12 - Math.min(12, wearCount)) * 3
    score += Math.min(365, daysSince) / 20
  }

  if (useWornOut) {
    score += Number(conditionPenalty[condition] || 0) * 10
  }

  if (item?.laundryStatus === 'dirty') score += 1
  return score
}

function Tri() {
  const [garments, setGarments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [includeLowWear, setIncludeLowWear] = useState(true)
  const [includeWornOut, setIncludeWornOut] = useState(true)
  const [dismissedIds, setDismissedIds] = useState([])
  const [lastAction, setLastAction] = useState(null)
  const [drag, setDrag] = useState({ x: 0, active: false })
  const dragStartRef = useRef(null)

  useEffect(() => {
    const fetchGarments = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      setLoading(true)
      setError('')

      try {
        const res = await fetch(buildApiUrl('/api/garments?includeArchived=true'), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.details || data.error || data.message || 'Erreur chargement tri')
        }

        const data = await res.json()
        setGarments(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Erreur chargement tri')
      } finally {
        setLoading(false)
      }
    }

    fetchGarments()
  }, [])

  const activeGarments = useMemo(
    () => garments.filter((item) => !item?.isArchived),
    [garments]
  )

  const archivedGarments = useMemo(
    () => garments.filter((item) => item?.isArchived),
    [garments]
  )

  const candidates = useMemo(() => {
    const filtered = activeGarments
      .filter((item) => {
        const wearCount = Number(item?.wearCount || 0)
        const condition = String(item?.condition || 'good')
        const matchesLowWear = includeLowWear ? wearCount <= 5 : false
        const matchesWornOut = includeWornOut ? ['good', 'bad'].includes(condition) : false
        return (matchesLowWear || matchesWornOut) && !dismissedIds.includes(item._id)
      })
      .map((item) => ({
        item,
        score: buildCandidateScore(item, includeLowWear, includeWornOut),
      }))
      .sort((a, b) => b.score - a.score)

    return filtered.map((entry) => entry.item)
  }, [activeGarments, dismissedIds, includeLowWear, includeWornOut])

  const current = candidates[0] || null
  const next = candidates[1] || null
  const dragRotation = Math.max(-12, Math.min(12, drag.x / 18))

  const updateArchiveState = async (garmentId, archived) => {
    const token = localStorage.getItem('token')
    const res = await fetch(buildApiUrl(`/api/garments/${garmentId}/archive`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ archived }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.details || data.error || data.message || 'Erreur mise a jour tri')
    }

    return res.json()
  }

  const handleDecision = async (decision) => {
    if (!current) return

    if (decision === 'keep') {
      setDismissedIds((prev) => [...prev, current._id])
      setLastAction({ type: 'keep', garment: current })
      setDrag({ x: 0, active: false })
      return
    }

    try {
      const updated = await updateArchiveState(current._id, true)
      setGarments((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
      setLastAction({ type: 'archive', garment: current })
      setDrag({ x: 0, active: false })
    } catch (err) {
      setError(err.message || 'Erreur mise a jour tri')
    }
  }

  const handleUndo = async () => {
    if (!lastAction?.garment?._id) return

    try {
      if (lastAction.type === 'archive') {
        const updated = await updateArchiveState(lastAction.garment._id, false)
        setGarments((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
      } else if (lastAction.type === 'keep') {
        setDismissedIds((prev) => prev.filter((id) => id !== lastAction.garment._id))
      }

      setLastAction(null)
    } catch (err) {
      setError(err.message || 'Erreur annulation tri')
    }
  }

  const onPointerDown = (event) => {
    if (!current) return
    dragStartRef.current = event.clientX
    setDrag((prev) => ({ ...prev, active: true }))
  }

  const onPointerMove = (event) => {
    if (!dragStartRef.current) return
    const deltaX = event.clientX - dragStartRef.current
    setDrag({ x: deltaX, active: true })
  }

  const onPointerUp = async () => {
    if (!dragStartRef.current) return
    const finalX = drag.x
    dragStartRef.current = null

    if (finalX <= -110) {
      await handleDecision('archive')
      return
    }

    if (finalX >= 110) {
      await handleDecision('keep')
      return
    }

    setDrag({ x: 0, active: false })
  }

  return (
    <Layout title="Tri">
      <div className="panel tri-hero">
        <div className="section-title">
          <h2>Tri du dressing</h2>
          <div className="muted">Swipe a droite pour garder, a gauche pour ecarter.</div>
        </div>
        <div className="tri-toolbar">
          <label className="chip chip-toggle">
            <input type="checkbox" checked={includeLowWear} onChange={(event) => setIncludeLowWear(event.target.checked)} />
            Peu portes
          </label>
          <label className="chip chip-toggle">
            <input type="checkbox" checked={includeWornOut} onChange={(event) => setIncludeWornOut(event.target.checked)} />
            Uses
          </label>
          <span className="chip">{candidates.length} a trier</span>
          <span className="chip">{archivedGarments.length} ecartes</span>
          <button className="btn small ghost" type="button" onClick={handleUndo} disabled={!lastAction}>
            Annuler
          </button>
        </div>
        {error ? <div className="muted" style={{ color: '#b00020' }}>{error}</div> : null}
      </div>

      {loading ? <div className="panel"><div className="muted">Chargement...</div></div> : null}

      {!loading ? (
        <div className="tri-layout">
          <div className="panel tri-stack-panel">
            <div className="tri-stack">
              {next ? (
                <div className="tri-card tri-card-back" aria-hidden="true">
                  <img src={buildAssetUrl(next.imageUrl || next.cutoutUrl || next.originalUrl)} alt={next.title || next.category} className="tri-card-image" />
                </div>
              ) : null}

              {current ? (
                <button
                  type="button"
                  className={`tri-card tri-card-front ${drag.x <= -50 ? 'is-rejecting' : drag.x >= 50 ? 'is-keeping' : ''}`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  style={{ transform: `translateX(${drag.x}px) rotate(${dragRotation}deg)` }}
                >
                  <img src={buildAssetUrl(current.imageUrl || current.cutoutUrl || current.originalUrl)} alt={current.title || current.category} className="tri-card-image" />
                  <span className="tri-badge tri-badge-left">Ecarter</span>
                  <span className="tri-badge tri-badge-right">Garder</span>
                  <div className="tri-card-body">
                    <div className="section-title">
                      <strong>{current.title || 'Sans nom'}</strong>
                      <span className="chip">{current.category || 'Piece'}</span>
                    </div>
                    <div className="chips">
                      {current.color ? <span className="chip">{current.color}</span> : null}
                      {current.secondaryColor ? <span className="chip">{current.secondaryColor}</span> : null}
                      <span className="chip">{conditionLabels[current.condition || 'good'] || 'Bon etat'}</span>
                      <span className="chip">{Number(current.wearCount || 0)} port(s)</span>
                    </div>
                    <div className="tri-card-meta">
                      <span>Dernier port: {formatDate(current.lastWornAt)}</span>
                      <span>{current.laundryStatus === 'dirty' ? 'A laver' : 'Propre'}</span>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="tri-empty-state">
                  <strong>Plus rien a trier</strong>
                  <span className="muted">Ajuste les filtres ou restaure un vetement ecarte.</span>
                </div>
              )}
            </div>

            <div className="tri-actions">
              <button className="btn danger" type="button" onClick={() => handleDecision('archive')} disabled={!current}>
                Ecarter
              </button>
              <button className="btn primary" type="button" onClick={() => handleDecision('keep')} disabled={!current}>
                Garder
              </button>
            </div>
          </div>

          <div className="panel tri-side-panel">
            <div className="section-title">
              <h3>Pourquoi ces pieces</h3>
              <span className="chip">Aide au tri</span>
            </div>
            <div className="tri-insights">
              <div className="kpi">
                <div className="label">Peu portes</div>
                <div className="big">{activeGarments.filter((item) => Number(item?.wearCount || 0) <= 5).length}</div>
              </div>
              <div className="kpi">
                <div className="label">Mauvais etat</div>
                <div className="big">{activeGarments.filter((item) => item?.condition === 'bad').length}</div>
              </div>
              <div className="kpi">
                <div className="label">Ecartes</div>
                <div className="big">{archivedGarments.length}</div>
              </div>
            </div>
            <div className="muted">
              La pile cible d’abord les vetements peu portes et ceux en moins bon etat. Ecarter archive la piece sans la supprimer.
            </div>
            {archivedGarments.length ? (
              <div className="tri-archived-list">
                {archivedGarments.slice(0, 4).map((item) => (
                  <div className="tri-archived-item" key={item._id}>
                    <div className="tri-archived-meta">
                      <strong>{item.title || 'Sans nom'}</strong>
                      <span className="muted">{item.category || 'Piece'} · {conditionLabels[item.condition || 'good'] || 'Bon etat'}</span>
                    </div>
                    <button
                      className="btn small ghost"
                      type="button"
                      onClick={async () => {
                        try {
                          const updated = await updateArchiveState(item._id, false)
                          setGarments((prev) => prev.map((entry) => (entry._id === updated._id ? updated : entry)))
                        } catch (err) {
                          setError(err.message || 'Erreur restauration tri')
                        }
                      }}
                    >
                      Restaurer
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Layout>
  )
}

export default Tri
