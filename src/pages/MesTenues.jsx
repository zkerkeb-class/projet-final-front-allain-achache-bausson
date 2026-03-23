import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { buildApiUrl } from '../config/api'
import OutfitCanvasPreview from '../components/OutfitCanvasPreview'
import { useToast } from '../context/ToastContext'
import PaginationControls from '../components/PaginationControls'

const outfitStatusOptions = [
  { value: 'active', label: 'Actives' },
  { value: 'retest', label: 'A retester' },
  { value: 'archived', label: 'Archivees' },
]

const outfitStatusLabels = {
  active: 'Active',
  retest: 'A retester',
  archived: 'Archivee',
}

const formatDate = (value) => {
  if (!value) return 'Jamais portee'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Jamais portee'
  return date.toLocaleDateString()
}

function MesTenues() {
  const navigate = useNavigate()
  const toast = useToast()
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [wearingId, setWearingId] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [statusFilter, setStatusFilter] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    const fetchOutfits = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      setLoading(true)
      setError('')

      try {
        const res = await fetch(buildApiUrl('/api/outfits'), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.details || data.error || data.message || 'Erreur chargement tenues')
        }

        const data = await res.json()
        setOutfits(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Erreur chargement tenues')
      } finally {
        setLoading(false)
      }
    }

    fetchOutfits()
  }, [])

  const handleDelete = async (outfit) => {
    const token = localStorage.getItem('token')
    if (!token) return

    if (!window.confirm(`Supprimer la tenue "${outfit.name}" ?`)) {
      return
    }

    setDeletingId(outfit._id)
    setError('')

    try {
      const res = await fetch(buildApiUrl(`/api/outfits/${outfit._id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur suppression tenue')
      }

      setOutfits((prev) => prev.filter((entry) => entry._id !== outfit._id))
      toast.success('Tenue supprimee.')
    } catch (err) {
      setError(err.message || 'Erreur suppression tenue')
      toast.error(err.message || 'Erreur suppression tenue')
    } finally {
      setDeletingId('')
    }
  }

  const handleTogglePublic = (outfit) => {
    handleMetaUpdate(outfit, { isPublic: !outfit.isPublic })
  }

  const handleWear = async (outfit) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setWearingId(outfit._id)
    setError('')

    try {
      const res = await fetch(buildApiUrl(`/api/outfits/${outfit._id}/wear`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur mise a jour tenue')
      }

      const data = await res.json()
      setOutfits((prev) => prev.map((entry) => (
        entry._id === outfit._id
          ? {
              ...entry,
              wearCount: Number(data.wearCount || 0),
              lastWornAt: data.wornAt || new Date().toISOString(),
            }
          : entry
      )))
      toast.success(`${data.updatedGarments || 0} vetement(s) envoyes dans Laverie.`)
    } catch (err) {
      setError(err.message || 'Erreur mise a jour tenue')
      toast.error(err.message || 'Erreur mise a jour tenue')
    } finally {
      setWearingId('')
    }
  }

  const handleMetaUpdate = async (outfit, updates) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setUpdatingId(outfit._id)
    setError('')

    try {
      const res = await fetch(buildApiUrl(`/api/outfits/${outfit._id}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur mise a jour tenue')
      }

      const saved = await res.json()
      setOutfits((prev) => prev.map((entry) => (entry._id === saved._id ? saved : entry)))

      if (Object.prototype.hasOwnProperty.call(updates, 'isFavorite')) {
        toast.success(updates.isFavorite ? 'Tenue ajoutee aux favoris.' : 'Tenue retiree des favoris.')
      } else if (Object.prototype.hasOwnProperty.call(updates, 'isPublic')) {
        toast.success(updates.isPublic ? 'Tenue rendue publique dans le lookbook.' : 'Tenue rendue privee.')
      } else if (updates.status) {
        toast.success(`Tenue marquee ${outfitStatusLabels[updates.status]?.toLowerCase() || 'mise a jour'}.`)
      }
    } catch (err) {
      setError(err.message || 'Erreur mise a jour tenue')
      toast.error(err.message || 'Erreur mise a jour tenue')
    } finally {
      setUpdatingId('')
    }
  }

  const visibleOutfits = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    const filtered = outfits.filter((outfit) => {
      const matchesSearch = !query || String(outfit.name || '').toLowerCase().includes(query)
      const status = String(outfit.status || 'active')
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      const matchesFavorite = !favoritesOnly || Boolean(outfit.isFavorite)
      return matchesSearch && matchesStatus && matchesFavorite
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''), 'fr')
      }

      if (sortBy === 'pieces') {
        return (Array.isArray(b.items) ? b.items.length : 0) - (Array.isArray(a.items) ? a.items.length : 0)
      }

      if (sortBy === 'wears') {
        return Number(b.wearCount || 0) - Number(a.wearCount || 0)
      }

      if (sortBy === 'last-worn') {
        return new Date(b.lastWornAt || 0) - new Date(a.lastWornAt || 0)
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  }, [deferredSearch, favoritesOnly, outfits, sortBy, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, favoritesOnly, sortBy, statusFilter])

  const resetFilters = () => {
    setSearch('')
    setSortBy('recent')
    setStatusFilter('all')
    setFavoritesOnly(false)
    setPage(1)
  }

  const mobileFilterCount = [
    search.trim(),
    statusFilter !== 'all' ? statusFilter : '',
    sortBy !== 'recent' ? sortBy : '',
    favoritesOnly ? 'favorite' : '',
  ].filter(Boolean).length

  const totalPages = Math.max(1, Math.ceil(visibleOutfits.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const paginatedOutfits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return visibleOutfits.slice(startIndex, startIndex + pageSize)
  }, [currentPage, pageSize, visibleOutfits])

  const totalPieces = useMemo(
    () => outfits.reduce((sum, outfit) => sum + (Array.isArray(outfit.items) ? outfit.items.length : 0), 0),
    [outfits]
  )

  const favoriteCount = useMemo(
    () => outfits.filter((outfit) => outfit.isFavorite).length,
    [outfits]
  )

  const retestCount = useMemo(
    () => outfits.filter((outfit) => outfit.status === 'retest').length,
    [outfits]
  )

  const archivedCount = useMemo(
    () => outfits.filter((outfit) => outfit.status === 'archived').length,
    [outfits]
  )

  const topWornOutfit = useMemo(() => {
    return [...outfits].sort((a, b) => Number(b.wearCount || 0) - Number(a.wearCount || 0))[0] || null
  }, [outfits])
  const outfitFilters = (
    <>
      <input
        type="text"
        placeholder="Rechercher une tenue"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        <option value="all">Tous les statuts</option>
        {outfitStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
        <option value="recent">Plus recentes</option>
        <option value="wears">Les plus portees</option>
        <option value="last-worn">Dernier port</option>
        <option value="name">Nom A-Z</option>
        <option value="pieces">Plus de pieces</option>
      </select>
      <label className="chip chip-toggle mobile-filter-chip">
        <input
          type="checkbox"
          checked={favoritesOnly}
          onChange={(event) => setFavoritesOnly(event.target.checked)}
        />
        Favoris seulement
      </label>
      <button className="btn small ghost mobile-filter-reset" type="button" onClick={resetFilters}>
        Reset filtres
      </button>
    </>
  )

  return (
    <Layout title="Mes tenues">
      <div className="panel">
        <div className="section-title">
          <h2>Mes tenues enregistrees</h2>
          <div className="muted">{loading ? 'Chargement...' : `${outfits.length} tenue(s)`}</div>
        </div>

        <div className="stat-kpis" style={{ marginBottom: '10px' }}>
          <div className="kpi">
            <div className="label">Tenues enregistrees</div>
            <div className="big">{loading ? '...' : outfits.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Favoris</div>
            <div className="big">{loading ? '...' : favoriteCount}</div>
          </div>
          <div className="kpi">
            <div className="label">A retester</div>
            <div className="big">{loading ? '...' : retestCount}</div>
          </div>
          <div className="kpi">
            <div className="label">Archivees</div>
            <div className="big">{loading ? '...' : archivedCount}</div>
          </div>
          <div className="kpi">
            <div className="label">Pieces cumulees</div>
            <div className="big">{loading ? '...' : totalPieces}</div>
          </div>
          <div className="kpi">
            <div className="label">Plus portee</div>
            <div className="big">{loading ? '...' : Number(topWornOutfit?.wearCount || 0)}</div>
            <div className="muted">{topWornOutfit?.name || 'Aucune tenue portee'}</div>
          </div>
        </div>

        <div className="mobile-toolbar-summary mobile-only" style={{ marginBottom: '10px' }}>
          <button className="btn" type="button" onClick={() => setShowMobileFilters(true)}>
            {mobileFilterCount ? `Filtres (${mobileFilterCount})` : 'Filtres'}
          </button>
          {favoritesOnly ? <span className="chip">Favoris</span> : null}
          {statusFilter !== 'all' ? <span className="chip">{outfitStatusLabels[statusFilter] || statusFilter}</span> : null}
        </div>

        <div className="wardrobe-toolbar desktop-only" style={{ gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(0, 1fr)) auto', marginBottom: '10px' }}>
          {outfitFilters}
        </div>

        {showMobileFilters ? (
          <div className="mobile-drawer-backdrop mobile-only" onClick={() => setShowMobileFilters(false)}>
            <div className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-drawer-header">
                <div>
                  <strong>Filtres tenues</strong>
                  <div className="muted">{visibleOutfits.length} resultat(s)</div>
                </div>
                <button className="btn small ghost" type="button" onClick={() => setShowMobileFilters(false)}>
                  Fermer
                </button>
              </div>
              <div className="mobile-drawer-body wardrobe-toolbar mobile-drawer-toolbar">
                {outfitFilters}
              </div>
              <div className="mobile-drawer-actions">
                <button className="btn small ghost" type="button" onClick={resetFilters}>
                  Tout reinitialiser
                </button>
                <button className="btn" type="button" onClick={() => setShowMobileFilters(false)}>
                  Voir les tenues
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <div className="muted" style={{ color: '#b00020' }}>{error}</div> : null}
        {!loading && !outfits.length ? (
          <div className="muted">Aucune tenue sauvegardee pour le moment. Cree-en une depuis l'onglet Tenues.</div>
        ) : !loading && !visibleOutfits.length ? (
          <div className="muted">Aucune tenue ne correspond a tes filtres.</div>
        ) : (
          <>
            <PaginationControls
              page={currentPage}
              pageSize={pageSize}
              pageSizeOptions={[6, 12, 24]}
              totalItems={visibleOutfits.length}
              label="tenues"
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
            />
            <div className="saved-outfit-grid">
            {paginatedOutfits.map((outfit) => {
              const isBusy = deletingId === outfit._id || wearingId === outfit._id || updatingId === outfit._id
              const wearCount = Number(outfit.wearCount || 0)
              const status = outfit.status || 'active'

              return (
                <article className="saved-outfit-card" key={outfit._id}>
                  <OutfitCanvasPreview items={outfit.items} />
                  <div className="saved-outfit-meta">
                    <div className="saved-outfit-header">
                      <strong>{outfit.name}</strong>
                      <button
                        className={`btn small ${outfit.isFavorite ? 'primary' : 'ghost'}`}
                        type="button"
                        onClick={() => handleMetaUpdate(outfit, { isFavorite: !outfit.isFavorite })}
                        disabled={isBusy}
                      >
                        {outfit.isFavorite ? 'Favori' : 'Ajouter favori'}
                      </button>
                    </div>
                    <div className="chips">
                      <span className={`chip outfit-status-chip ${status}`}>{outfitStatusLabels[status] || 'Active'}</span>
                      <span className="chip">{Array.isArray(outfit.items) ? outfit.items.length : 0} piece(s)</span>
                      <span className="chip">{wearCount} port(s)</span>
                    </div>
                    <div className="public-toggle">
                      <label>
                        <input
                          type="checkbox"
                          checked={outfit.isPublic || false}
                          onChange={() => handleTogglePublic(outfit)}
                          disabled={isBusy}
                        />
                        Rendre publique
                      </label>
                    </div>
                    <div className="muted">Cree le {outfit.createdAt ? new Date(outfit.createdAt).toLocaleDateString() : '-'}</div>
                    <div className="muted">Dernier port: {formatDate(outfit.lastWornAt)}</div>
                  </div>
                  <div className="row outfit-card-actions">
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => navigate('/tenues', { state: { editOutfitId: outfit._id } })}
                    >
                      Modifier dans le canvas
                    </button>
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => navigate('/tenues', { state: { duplicateOutfitId: outfit._id } })}
                    >
                      Dupliquer
                    </button>
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => handleWear(outfit)}
                      disabled={wearingId === outfit._id || deletingId === outfit._id}
                    >
                      {wearingId === outfit._id ? 'Mise a jour...' : "Porter aujourd'hui"}
                    </button>
                  </div>
                  <div className="row outfit-card-actions">
                    <button
                      className={`btn small ${status === 'active' ? 'primary' : 'ghost'}`}
                      type="button"
                      onClick={() => handleMetaUpdate(outfit, { status: 'active' })}
                      disabled={isBusy}
                    >
                      Active
                    </button>
                    <button
                      className={`btn small ${status === 'retest' ? 'primary' : 'ghost'}`}
                      type="button"
                      onClick={() => handleMetaUpdate(outfit, { status: 'retest' })}
                      disabled={isBusy}
                    >
                      A retester
                    </button>
                    <button
                      className={`btn small ${status === 'archived' ? 'primary' : 'ghost'}`}
                      type="button"
                      onClick={() => handleMetaUpdate(outfit, { status: 'archived' })}
                      disabled={isBusy}
                    >
                      Archiver
                    </button>
                    <button
                      className="btn small danger"
                      type="button"
                      onClick={() => handleDelete(outfit)}
                      disabled={deletingId === outfit._id || updatingId === outfit._id}
                    >
                      {deletingId === outfit._id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </article>
              )
            })}
            </div>
            <PaginationControls
              page={currentPage}
              pageSize={pageSize}
              pageSizeOptions={[6, 12, 24]}
              totalItems={visibleOutfits.length}
              label="tenues"
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
            />
          </>
        )}
      </div>
    </Layout>
  )
}

export default MesTenues
