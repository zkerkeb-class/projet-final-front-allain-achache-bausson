import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { buildApiUrl, buildAssetUrl } from '../config/api'
import { useToast } from '../context/ToastContext'

const dayOptions = [1, 3, 7, 14, 30]

const formatDate = (value) => {
  if (!value) return 'Jamais porte'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Jamais porte'
  return date.toLocaleDateString()
}

const formatAge = (item) => {
  const sourceDate = item?.purchaseDate || item?.createdAt
  if (!sourceDate) return 'Age inconnu'

  const start = new Date(sourceDate)
  if (Number.isNaN(start.getTime())) return 'Age inconnu'

  const diffDays = Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)))
  if (diffDays < 30) return `${diffDays} j`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mois`
  return `${Math.floor(diffDays / 365)} an(s)`
}

const conditionLabels = {
  perfect: 'Parfait etat',
  good: 'Bon etat',
  bad: 'Mauvais etat',
}

function LaundryCard({ item, actions, extra }) {
  const src = buildAssetUrl(item.imageUrl || item.cutoutUrl || item.originalUrl)
  const isDirty = item.laundryStatus === 'dirty'

  return (
    <div className={`kard laundry-card${isDirty ? ' is-dirty' : ' is-clean'}`}>
      <div className={`thumb ${item.category || ''}`}>
        {src ? <img src={src} alt={item.title || item.category} loading="lazy" /> : null}
      </div>
      <div className="kard-head">
        <strong>{item.title || 'Sans nom'}</strong>
        <div className="chips">
          <span className={`chip laundry-badge ${isDirty ? 'dirty' : 'clean'}`}>
            {isDirty ? 'sale' : 'propre'}
          </span>
          {item.category ? <span className="chip">{item.category}</span> : null}
        </div>
      </div>
      <div className="meta-list">
        <div className="muted">Couleur: {[item.color, item.secondaryColor].filter(Boolean).join(' / ') || '-'}</div>
        <div className="muted">Etat: {conditionLabels[item.condition || 'good'] || 'Bon etat'}</div>
        <div className="muted">Age: {formatAge(item)}</div>
        <div className="muted">Dernier lavage: {formatDate(item.lastWashedAt)}</div>
        <div className="muted">Ports depuis lavage: {item.wearCountSinceWash || 0}</div>
        <div className="muted">Dernier porte: {formatDate(item.lastWornAt)}</div>
        <div className="muted">Ports: {item.wearCount || 0}</div>
        {extra}
      </div>
      <div className="row laundry-actions">
        {actions}
      </div>
    </div>
  )
}

function Machine() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [days, setDays] = useState(3)
  const [selectedRecentIds, setSelectedRecentIds] = useState([])
  const [pendingAction, setPendingAction] = useState('')

  useEffect(() => {
    const fetchItems = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      setLoading(true)
      setError('')

      try {
        const res = await fetch(buildApiUrl('/api/garments'), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.details || data.error || data.message || 'Erreur chargement machine')
        }

        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Erreur chargement machine')
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  const recentItems = useMemo(() => {
    const threshold = new Date()
    threshold.setHours(0, 0, 0, 0)
    threshold.setDate(threshold.getDate() - days)

    return items
      .filter((item) => item.lastWornAt && new Date(item.lastWornAt) >= threshold)
      .sort((a, b) => new Date(b.lastWornAt) - new Date(a.lastWornAt))
  }, [days, items])

  const dirtyItems = useMemo(
    () => items.filter((item) => item.laundryStatus === 'dirty'),
    [items]
  )

  const cleanItems = useMemo(
    () => items.filter((item) => item.laundryStatus !== 'dirty'),
    [items]
  )

  const averageWearsSinceWash = useMemo(() => {
    if (!items.length) return 0
    const total = items.reduce((sum, item) => sum + Number(item.wearCountSinceWash || 0), 0)
    return Math.round((total / items.length) * 10) / 10
  }, [items])

  useEffect(() => {
    setSelectedRecentIds((prev) => prev.filter((id) => recentItems.some((item) => item._id === id)))
  }, [recentItems])

  const replaceItem = (updated) => {
    setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
  }

  const updateLaundryStatus = async (id, status, options = {}) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const { silent = false, previousStatus = '' } = options

    setPendingAction(`${id}:${status}`)
    setError('')

    try {
      const res = await fetch(buildApiUrl(`/api/garments/${id}/laundry`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur mise a jour linge')
      }

      const updated = await res.json()
      replaceItem(updated)
      if (!silent) {
        toast.success(status === 'dirty' ? 'Vetement passe au sale.' : 'Vetement lave.', previousStatus ? {
          actionLabel: 'Annuler',
          onAction: () => updateLaundryStatus(id, previousStatus, { silent: true }),
        } : {})
      }
    } catch (err) {
      setError(err.message || 'Erreur mise a jour linge')
      toast.error(err.message || 'Erreur mise a jour linge')
    } finally {
      setPendingAction('')
    }
  }

  const markAsWorn = async (id, options = {}) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const { silent = false, previousLastWornAt = null, previousWearCount = 0 } = options

    setPendingAction(`${id}:wear`)
    setError('')

    try {
      const res = await fetch(buildApiUrl(`/api/garments/${id}/wear`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          silent
            ? {
                wornAt: previousLastWornAt || new Date().toISOString(),
                clearLastWornAt: !previousLastWornAt,
                increment: previousWearCount,
              }
            : {}
        ),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur mise a jour port')
      }

      const updated = await res.json()
      replaceItem(updated)
      if (!silent) {
        const item = items.find((entry) => entry._id === id)
        const nextWearCount = Number(item?.wearCount || 0) - Number(updated.wearCount || 0)
        toast.success("Vetement marque comme porte aujourd'hui.", {
          actionLabel: 'Annuler',
          onAction: () => markAsWorn(id, {
            silent: true,
            previousLastWornAt,
            previousWearCount: nextWearCount,
          }),
        })
      }
    } catch (err) {
      setError(err.message || 'Erreur mise a jour port')
      toast.error(err.message || 'Erreur mise a jour port')
    } finally {
      setPendingAction('')
    }
  }

  const bulkLaundryUpdate = async (ids, status) => {
    const token = localStorage.getItem('token')
    if (!token || !ids.length) return

    setPendingAction(`bulk:${status}`)
    setError('')

    try {
      const res = await fetch(buildApiUrl('/api/garments/laundry/bulk'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, status }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur mise a jour groupee')
      }

      setItems((prev) => prev.map((item) => (
        ids.includes(item._id)
          ? { ...item, laundryStatus: status }
          : item
      )))

      if (status === 'dirty') {
        setSelectedRecentIds([])
      }
      toast.success(status === 'dirty' ? 'Selection envoyee au sale.' : 'Selection marquee comme lavee.')
    } catch (err) {
      setError(err.message || 'Erreur mise a jour groupee')
      toast.error(err.message || 'Erreur mise a jour groupee')
    } finally {
      setPendingAction('')
    }
  }

  const toggleRecentSelection = (id) => {
    setSelectedRecentIds((prev) => (
      prev.includes(id)
        ? prev.filter((entry) => entry !== id)
        : [...prev, id]
    ))
  }

  return (
    <Layout title="Laverie">
      <div className="panel">
        <div className="stat-kpis" style={{ marginBottom: '10px' }}>
          <div className="kpi">
            <div className="label">Portes recemment</div>
            <div className="big">{loading ? '...' : recentItems.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Au sale</div>
            <div className="big">{loading ? '...' : dirtyItems.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Propres</div>
            <div className="big">{loading ? '...' : cleanItems.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Selectionnes</div>
            <div className="big">{selectedRecentIds.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Ports / lavage</div>
            <div className="big">{loading ? '...' : averageWearsSinceWash}</div>
          </div>
        </div>

        <div className="section-title">
          <h2>Dernieres affaires portees</h2>
          <div className="row" style={{ gap: '6px' }}>
            <label className="chip">
              Depuis
              <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
                {dayOptions.map((value) => (
                  <option key={value} value={value}>{value} jour(s)</option>
                ))}
              </select>
            </label>
            <button className="btn" type="button" onClick={() => setSelectedRecentIds(recentItems.map((item) => item._id))} disabled={!recentItems.length}>
              Tout cocher
            </button>
            <button className="btn" type="button" onClick={() => setSelectedRecentIds([])} disabled={!selectedRecentIds.length}>
              Tout decocher
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => bulkLaundryUpdate(selectedRecentIds, 'dirty')}
              disabled={!selectedRecentIds.length || pendingAction === 'bulk:dirty'}
            >
              Mettre au sale
            </button>
          </div>
        </div>

        {error ? <div className="muted" style={{ color: '#b00020' }}>{error}</div> : null}
        <div className="muted" style={{ marginBottom: '10px' }}>
          {loading ? 'Chargement...' : `${recentItems.length} vetement(s) portes dans les ${days} derniers jours`}
        </div>

        <div className="laundry-grid recent">
          {recentItems.length ? recentItems.map((item) => (
            <LaundryCard
              key={item._id}
              item={item}
              extra={(
                <label className="chip">
                  <input
                    type="checkbox"
                    checked={selectedRecentIds.includes(item._id)}
                    onChange={() => toggleRecentSelection(item._id)}
                  />
                  selectionner
                </label>
              )}
          actions={(
                <>
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => updateLaundryStatus(item._id, 'dirty', { previousStatus: item.laundryStatus })}
                    disabled={pendingAction === `${item._id}:dirty`}
                  >
                    Mettre au sale
                  </button>
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => markAsWorn(item._id, {
                      previousLastWornAt: item.lastWornAt || null,
                      previousWearCount: -1,
                    })}
                    disabled={pendingAction === `${item._id}:wear`}
                  >
                    Porter aujourd'hui
                  </button>
                </>
              )}
            />
          )) : (
            <div className="muted">Aucun vetement porte recemment.</div>
          )}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="panel laundry-zone dirty">
          <div className="section-title">
            <h2>Sale</h2>
            <div className="row" style={{ gap: '6px' }}>
              <button
                className="btn"
                type="button"
                onClick={() => bulkLaundryUpdate(dirtyItems.map((item) => item._id), 'clean')}
                disabled={!dirtyItems.length || pendingAction === 'bulk:clean'}
              >
                Tout laver
              </button>
            </div>
          </div>
          <div className="muted" style={{ marginBottom: '10px' }}>
            Les pieces ici attendent un lavage avant de revenir dans les tenues propres.
          </div>
          <div className="laundry-grid">
            {dirtyItems.length ? dirtyItems.map((item) => (
              <LaundryCard
                key={item._id}
                item={item}
                actions={(
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => updateLaundryStatus(item._id, 'clean', { previousStatus: item.laundryStatus })}
                    disabled={pendingAction === `${item._id}:clean`}
                  >
                    Laver
                  </button>
                )}
              />
            )) : (
              <div className="muted">Aucun vetement sale pour le moment.</div>
            )}
          </div>
        </div>

        <div className="panel laundry-zone clean">
          <div className="section-title">
            <h2>Propre</h2>
            <div className="row" style={{ gap: '6px' }}>
              <button
                className="btn"
                type="button"
                onClick={() => bulkLaundryUpdate(cleanItems.map((item) => item._id), 'dirty')}
                disabled={!cleanItems.length || pendingAction === 'bulk:dirty'}
              >
                Tout mettre au sale
              </button>
            </div>
          </div>
          <div className="muted" style={{ marginBottom: '10px' }}>
            Ces pieces sont disponibles pour composer les tenues et le generateur filtre `Propre`.
          </div>
          <div className="laundry-grid">
            {cleanItems.length ? cleanItems.map((item) => (
              <LaundryCard
                key={item._id}
                item={item}
                actions={(
                  <>
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => markAsWorn(item._id, {
                        previousLastWornAt: item.lastWornAt || null,
                        previousWearCount: -1,
                      })}
                      disabled={pendingAction === `${item._id}:wear`}
                    >
                      Porter aujourd'hui
                    </button>
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => updateLaundryStatus(item._id, 'dirty', { previousStatus: item.laundryStatus })}
                      disabled={pendingAction === `${item._id}:dirty`}
                    >
                      Mettre au sale
                    </button>
                  </>
                )}
              />
            )) : (
              <div className="muted">Aucun vetement propre disponible.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Machine
