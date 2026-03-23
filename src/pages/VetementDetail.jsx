import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import OutfitCanvasPreview from '../components/OutfitCanvasPreview'
import { apiFetch, buildAssetUrl, readApiError } from '../config/api'

const formatPrice = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${amount.toFixed(2)} EUR` : 'Non renseigne'
}

const formatDate = (value) => {
  if (!value) return 'Non renseignee'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non renseignee'
  return date.toLocaleDateString()
}

const getPricePerWear = (garment) => {
  const price = Number(garment?.price)
  const wearCount = Math.max(0, Number(garment?.wearCount || 0))
  if (!Number.isFinite(price)) return 'Non calcule'
  if (wearCount <= 0) return `${price.toFixed(2)} EUR / port`
  return `${(price / wearCount).toFixed(2)} EUR / port`
}

const conditionLabels = {
  perfect: 'Parfait etat',
  good: 'Bon etat',
  bad: 'Mauvais etat',
}

function VetementDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [garment, setGarment] = useState(null)
  const [outfits, setOutfits] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token || !id) return

      setLoading(true)
      setError('')

      try {
        const currentYear = new Date().getFullYear()
        const [garmentsRes, outfitsRes, currentPlansRes, previousPlansRes] = await Promise.all([
          apiFetch('/api/garments'),
          apiFetch('/api/outfits'),
          apiFetch(`/api/calendar?year=${currentYear}`),
          apiFetch(`/api/calendar?year=${currentYear - 1}`),
        ])

        for (const response of [garmentsRes, outfitsRes, currentPlansRes, previousPlansRes]) {
          if (!response.ok) {
            throw new Error(await readApiError(response, 'Erreur chargement fiche vetement'))
          }
        }

        const garmentsData = await garmentsRes.json()
        const outfitsData = await outfitsRes.json()
        const currentPlans = await currentPlansRes.json()
        const previousPlans = await previousPlansRes.json()

        const currentGarment = (Array.isArray(garmentsData) ? garmentsData : []).find((item) => item._id === id) || null
        setGarment(currentGarment)
        setOutfits(Array.isArray(outfitsData) ? outfitsData : [])
        setPlans([...(Array.isArray(currentPlans) ? currentPlans : []), ...(Array.isArray(previousPlans) ? previousPlans : [])])
      } catch (err) {
        setError(err.message || 'Erreur chargement fiche vetement')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const relatedOutfits = useMemo(() => {
    if (!garment?._id) return []

    return outfits.filter((outfit) =>
      (Array.isArray(outfit.items) ? outfit.items : []).some((entry) => {
        const garmentId = entry?.garment?._id || entry?.garment
        return garmentId === garment._id
      })
    )
  }, [garment?._id, outfits])

  const usageHistory = useMemo(() => {
    if (!garment?._id) return []

    return plans
      .filter((plan) => {
        if (!plan?.outfit || !plan?.wearLoggedAt) return false
        return (Array.isArray(plan.outfit.items) ? plan.outfit.items : []).some((entry) => {
          const garmentId = entry?.garment?._id || entry?.garment
          return garmentId === garment._id
        })
      })
      .map((plan) => ({
        id: `${plan.date}-${plan.outfit?._id || 'outfit'}`,
        date: plan.wornAt || plan.date,
        outfitName: plan.outfit?.name || 'Tenue sans nom',
        outfit: plan.outfit,
      }))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [garment?._id, plans])

  const imageSrc = garment ? buildAssetUrl(garment.imageUrl || garment.cutoutUrl || garment.originalUrl) : ''

  return (
    <Layout title={garment?.title || 'Fiche vetement'}>
      <div className="row" style={{ marginBottom: '10px' }}>
        <button className="btn small ghost" type="button" onClick={() => navigate('/dressing')}>
          Retour dressing
        </button>
        {garment ? <Link className="chip" to={`/dressing/${garment._id}`}>Fiche</Link> : null}
      </div>

      {loading ? <div className="muted">Chargement...</div> : null}
      {error ? <div className="muted" style={{ color: '#b00020' }}>{error}</div> : null}
      {!loading && !error && !garment ? <div className="muted">Vetement introuvable.</div> : null}

      {garment ? (
        <>
          <div className="grid cols-2" style={{ marginBottom: '12px' }}>
            <div className="panel">
              <div className={`thumb ${garment.category || ''} garment-detail-thumb`}>
                {imageSrc ? <img src={imageSrc} alt={garment.title || garment.category} /> : null}
              </div>
            </div>

            <div className="panel">
              <div className="section-title">
                <h2>{garment.title || 'Sans nom'}</h2>
                <span className="chip">{garment.category || 'Categorie inconnue'}</span>
              </div>
              <div className="chips" style={{ marginBottom: '10px' }}>
                {garment.color ? <span className="chip">{garment.color}</span> : null}
                {garment.secondaryColor ? <span className="chip">{garment.secondaryColor}</span> : null}
                <span className="chip">{conditionLabels[garment.condition || 'good'] || 'Bon etat'}</span>
                {garment.brand ? <span className="chip">{garment.brand}</span> : null}
                {Array.isArray(garment.seasons) ? garment.seasons.map((season) => <span className="chip" key={season}>{season}</span>) : null}
              </div>
              <div className="stat-kpis">
                <div className="kpi">
                  <div className="label">Ports</div>
                  <div className="big">{Number(garment.wearCount || 0)}</div>
                </div>
                <div className="kpi">
                  <div className="label">Dernier port</div>
                  <div className="big">{formatDate(garment.lastWornAt)}</div>
                </div>
                <div className="kpi">
                  <div className="label">Prix</div>
                  <div className="big">{formatPrice(garment.price)}</div>
                </div>
                <div className="kpi">
                  <div className="label">Cout / port</div>
                  <div className="big">{getPricePerWear(garment)}</div>
                </div>
              </div>
              <div className="meta-list" style={{ marginTop: '12px' }}>
                <div className="muted">Achete le: {formatDate(garment.purchaseDate)}</div>
                <div className="muted">Lieu: {garment.purchaseLocation || 'Non renseigne'}</div>
                <div className="muted">Origine: {garment.origin || 'Non renseignee'}</div>
                <div className="muted">Taille: {garment.size || 'Non renseignee'}</div>
                <div className="muted">Matiere: {garment.material || 'Non renseignee'}</div>
                {garment.notes ? <div className="muted">Notes: {garment.notes}</div> : null}
              </div>
            </div>
          </div>

          <div className="grid cols-2">
            <div className="panel">
              <div className="section-title">
                <h3>Historique d'usage</h3>
                <span className="chip">{usageHistory.length} port(s) traces</span>
              </div>
              {usageHistory.length ? (
                <div className="list garment-history-list">
                  {usageHistory.map((entry) => (
                    <div className="saved-outfit-card garment-history-card" key={entry.id}>
                      <OutfitCanvasPreview items={entry.outfit?.items} className="saved-outfit-canvas-small" />
                      <div className="saved-outfit-meta">
                        <strong>{entry.outfitName}</strong>
                        <div className="muted">Portee le {formatDate(entry.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">Aucun port date n'a encore ete retrouve dans le calendrier.</div>
              )}
            </div>

            <div className="panel">
              <div className="section-title">
                <h3>Tenues liees</h3>
                <span className="chip">{relatedOutfits.length}</span>
              </div>
              {relatedOutfits.length ? (
                <div className="list garment-related-outfits">
                  {relatedOutfits.slice(0, 6).map((outfit) => (
                    <div className="saved-outfit-card" key={outfit._id}>
                      <OutfitCanvasPreview items={outfit.items} className="saved-outfit-canvas-small" />
                      <div className="saved-outfit-meta">
                        <strong>{outfit.name}</strong>
                        <div className="muted">{Number(outfit.wearCount || 0)} port(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">Ce vetement n'est encore utilise dans aucune tenue enregistree.</div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </Layout>
  )
}

export default VetementDetail
