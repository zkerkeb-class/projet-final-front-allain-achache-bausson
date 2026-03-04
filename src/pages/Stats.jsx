import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { buildApiUrl, buildAssetUrl } from '../config/api'

const piePalette = ['#f0c4ff', '#b18cff', '#ffcf70', '#6edbc8', '#ff9fb6', '#9fd0ff']
const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const toTitleCase = (value) => normalizeWhitespace(value).toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
const normalizeOccasion = (value) => normalizeWhitespace(value).toLowerCase()
const normalizeBrand = (value) => toTitleCase(value)
const normalizeOrigin = (value) => normalizeOccasion(value)

const formatPrice = (value) => {
  if (value == null || value === '') return 'Non renseigne'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 'Non renseigne'
  return `${amount.toFixed(2)} EUR`
}

const formatDate = (value) => {
  if (!value) return 'Non renseignee'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non renseignee'
  return date.toLocaleDateString()
}

const getAgeDays = (item) => {
  const sourceDate = item?.purchaseDate || item?.createdAt
  if (!sourceDate) return null
  const date = new Date(sourceDate)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

const formatPricePerWear = (item) => {
  const price = Number(item?.price)
  const wears = Number(item?.wearCount)

  if (!Number.isFinite(price)) return 'Prix non renseigne'
  if (!Number.isFinite(wears) || wears <= 0) return `${price.toFixed(2)} EUR / port`

  return `${(price / wears).toFixed(2)} EUR / port`
}

const getWearCount = (item) => {
  const wears = Number(item?.wearCount)
  return Number.isFinite(wears) ? Math.max(0, wears) : 0
}

const getPricePerWearValue = (item) => {
  const price = Number(item?.price)
  if (!Number.isFinite(price)) return null

  const wears = getWearCount(item)
  if (wears <= 0) return price

  return price / wears
}

const countBy = (values, normalize = (value) => normalizeWhitespace(value)) => {
  const map = new Map()

  values.filter(Boolean).forEach((value) => {
    const key = normalize(value)
    if (!key) return
    map.set(key, (map.get(key) || 0) + 1)
  })

  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function StatPie({ items, emptyLabel }) {
  if (!items.length) {
    return <div className="muted">{emptyLabel}</div>
  }

  const total = items.reduce((sum, item) => sum + item.count, 0)
  let current = 0

  const slices = items.map((item, index) => {
    const start = (current / total) * 360
    current += item.count
    const end = (current / total) * 360
    const color = piePalette[index % piePalette.length]
    return { ...item, color, start, end, percent: Math.round((item.count / total) * 100) }
  })

  const gradient = `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.start}deg ${slice.end}deg`).join(', ')})`

  return (
    <div className="pie-card">
      <div className="pie-chart" style={{ backgroundImage: gradient }}>
        <div className="pie-center">
          <strong>{total}</strong>
          <span>total</span>
        </div>
      </div>
      <div className="pie-legend">
        {slices.map((slice) => (
          <div className="pie-legend-item" key={slice.label}>
            <span className="pie-swatch" style={{ backgroundColor: slice.color }} />
            <span>{slice.label}</span>
            <strong>{slice.percent}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsCard({ item, subtitle, detail }) {
  const src = buildAssetUrl(item.imageUrl || item.cutoutUrl || item.originalUrl)

  return (
      <div className="stat-card" key={item._id}>
      {src ? <img className="stat-img" src={src} alt={item.title || item.category} loading="lazy" decoding="async" /> : <div className="stat-img" />}
      <div className="stat-meta">
        <div className="name">{item.title || 'Sans nom'}</div>
        <div className="muted">{subtitle}</div>
        <div className="muted">{detail}</div>
        <div className="muted">{formatPricePerWear(item)}</div>
      </div>
    </div>
  )
}

function Stats() {
  const [items, setItems] = useState([])
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    categories: [],
    colors: [],
    occasions: [],
  })

  useEffect(() => {
    const fetchItems = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      setLoading(true)
      setError('')

      try {
        const [garmentsRes, outfitsRes] = await Promise.all([
          fetch(buildApiUrl('/api/garments'), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(buildApiUrl('/api/outfits'), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!garmentsRes.ok) {
          const data = await garmentsRes.json().catch(() => ({}))
          throw new Error(data.message || data.error || 'Erreur chargement statistiques')
        }

        if (!outfitsRes.ok) {
          const data = await outfitsRes.json().catch(() => ({}))
          throw new Error(data.details || data.error || data.message || 'Erreur chargement statistiques')
        }

        const garmentsData = await garmentsRes.json()
        const outfitsData = await outfitsRes.json()
        setItems(Array.isArray(garmentsData) ? garmentsData : [])
        setOutfits(Array.isArray(outfitsData) ? outfitsData : [])
      } catch (err) {
        setError(err.message || 'Erreur chargement statistiques')
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  const availableCategories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
    [items]
  )

  const availableColors = useMemo(
    () => [...new Set(items.flatMap((item) => [item.color, item.secondaryColor]).filter(Boolean))].sort(),
    [items]
  )

  const availableOccasions = useMemo(
    () => [...new Set(items.flatMap((item) => (Array.isArray(item.occasions) ? item.occasions.map(normalizeOccasion) : [])).filter(Boolean))].sort(),
    [items]
  )

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const categoryOk = !filters.categories.length || filters.categories.includes(item.category)
      const colorOk = !filters.colors.length || [item.color, item.secondaryColor].some((value) => filters.colors.includes(value))
      const occasions = Array.isArray(item.occasions) ? item.occasions.map(normalizeOccasion) : []
      const occasionOk = !filters.occasions.length || occasions.some((value) => filters.occasions.includes(value))
      return categoryOk && colorOk && occasionOk
    })
  }, [filters, items])

  const pricedItems = useMemo(() => {
    return filteredItems
      .filter((item) => Number.isFinite(Number(item.price)))
      .sort((a, b) => Number(b.price) - Number(a.price))
  }, [filteredItems])

  const recentPurchases = useMemo(() => {
    return filteredItems
      .filter((item) => item.purchaseDate)
      .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))
  }, [filteredItems])

  const totalCost = useMemo(
    () => pricedItems.reduce((sum, item) => sum + Number(item.price), 0),
    [pricedItems]
  )

  const averagePrice = pricedItems.length ? totalCost / pricedItems.length : 0
  const averageAgeDays = useMemo(() => {
    const ages = filteredItems.map(getAgeDays).filter((value) => value != null)
    if (!ages.length) return null
    return Math.round(ages.reduce((sum, value) => sum + value, 0) / ages.length)
  }, [filteredItems])

  const totalWearCount = useMemo(
    () => filteredItems.reduce((sum, item) => sum + getWearCount(item), 0),
    [filteredItems]
  )

  const globalPricePerWear = totalWearCount > 0 ? totalCost / totalWearCount : null

  const neverWornItems = useMemo(
    () => filteredItems.filter((item) => getWearCount(item) === 0),
    [filteredItems]
  )

  const costlyPerWearItems = useMemo(() => {
    return filteredItems
      .filter((item) => getPricePerWearValue(item) != null)
      .sort((a, b) => {
        const valueGap = Number(getPricePerWearValue(b) || 0) - Number(getPricePerWearValue(a) || 0)
        if (valueGap !== 0) return valueGap
        return Number(b.price || 0) - Number(a.price || 0)
      })
  }, [filteredItems])

  const mostWornItems = useMemo(() => {
    return filteredItems
      .filter((item) => getWearCount(item) > 0)
      .sort((a, b) => {
        const wearGap = getWearCount(b) - getWearCount(a)
        if (wearGap !== 0) return wearGap

        const aDate = a.lastWornAt ? new Date(a.lastWornAt).getTime() : 0
        const bDate = b.lastWornAt ? new Date(b.lastWornAt).getTime() : 0
        return bDate - aDate
      })
  }, [filteredItems])

  const colorStats = useMemo(
    () => countBy(filteredItems.flatMap((item) => [item.color, item.secondaryColor])).slice(0, 6),
    [filteredItems]
  )

  const occasionStats = useMemo(
    () => countBy(filteredItems.flatMap((item) => (Array.isArray(item.occasions) ? item.occasions : [])), normalizeOccasion).slice(0, 6),
    [filteredItems]
  )

  const brandStats = useMemo(
    () => countBy(filteredItems.map((item) => item.brand), normalizeBrand).slice(0, 5),
    [filteredItems]
  )

  const originStats = useMemo(
    () => countBy(filteredItems.map((item) => item.origin), normalizeOrigin).slice(0, 5),
    [filteredItems]
  )

  const thisMonthBudget = useMemo(() => {
    const now = new Date()
    return filteredItems.reduce((sum, item) => {
      if (!item.purchaseDate) return sum
      const purchaseDate = new Date(item.purchaseDate)
      if (Number.isNaN(purchaseDate.getTime())) return sum
      if (purchaseDate.getFullYear() !== now.getFullYear() || purchaseDate.getMonth() !== now.getMonth()) return sum
      return sum + Number(item.price || 0)
    }, 0)
  }, [filteredItems])

  const spendByCategory = useMemo(() => {
    const totals = new Map()

    filteredItems.forEach((item) => {
      const key = item.category || 'autre'
      totals.set(key, Number(totals.get(key) || 0) + Number(item.price || 0))
    })

    return [...totals.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total)
  }, [filteredItems])

  const activeOutfits = useMemo(
    () => outfits.filter((outfit) => (outfit.status || 'active') === 'active'),
    [outfits]
  )

  const favoriteOutfits = useMemo(
    () => outfits.filter((outfit) => outfit.isFavorite),
    [outfits]
  )

  const wornItemsCount = useMemo(
    () => filteredItems.filter((item) => getWearCount(item) > 0).length,
    [filteredItems]
  )

  const goalCards = useMemo(() => {
    const goals = [
      {
        label: 'Pieces deja portees',
        current: wornItemsCount,
        target: Math.max(10, Math.min(filteredItems.length || 10, 20)),
      },
      {
        label: 'Tenues actives',
        current: activeOutfits.length,
        target: 8,
      },
      {
        label: 'Tenues favorites',
        current: favoriteOutfits.length,
        target: 3,
      },
    ]

    return goals.map((goal) => {
      const safeTarget = Math.max(1, goal.target)
      const progress = Math.min(100, Math.round((goal.current / safeTarget) * 100))
      return { ...goal, progress }
    })
  }, [activeOutfits.length, favoriteOutfits.length, filteredItems.length, wornItemsCount])

  const toggleFilter = (group, value) => {
    setFilters((prev) => {
      const current = prev[group]
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]

      return { ...prev, [group]: next }
    })
  }

  const resetFilters = () => {
    setFilters({
      categories: [],
      colors: [],
      occasions: [],
    })
  }

  return (
    <Layout title="Statistiques">
      <div className="panel" style={{ marginBottom: '12px' }}>
        <div className="stat-kpis">
          <div className="kpi">
            <div className="label">Vetements filtres</div>
            <div className="big">{filteredItems.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Cout garde-robe</div>
            <div className="big">{formatPrice(totalCost)}</div>
          </div>
          <div className="kpi">
            <div className="label">Prix moyen</div>
            <div className="big">{formatPrice(averagePrice)}</div>
          </div>
          <div className="kpi">
            <div className="label">Prix par port global</div>
            <div className="big">{globalPricePerWear == null ? 'Aucun port' : formatPrice(globalPricePerWear)}</div>
          </div>
          <div className="kpi">
            <div className="label">Jamais portes</div>
            <div className="big">{neverWornItems.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Age moyen</div>
            <div className="big">{averageAgeDays == null ? 'N/A' : `${averageAgeDays} j`}</div>
          </div>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="panel" id="stats-filters">
          <h3>Filtres</h3>

          <div className="grid cols-3">
            <div className="field">
              <label>Categories</label>
              <div className="chips">
                {availableCategories.map((value) => (
                  <label className="chip" key={value}>
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(value)}
                      onChange={() => toggleFilter('categories', value)}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Occasions</label>
              <div className="chips">
                {availableOccasions.map((value) => (
                  <label className="chip" key={value}>
                    <input
                      type="checkbox"
                      checked={filters.occasions.includes(value)}
                      onChange={() => toggleFilter('occasions', value)}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Couleurs</label>
              <div className="chips">
                {availableColors.map((value) => (
                  <label className="chip" key={value}>
                    <input
                      type="checkbox"
                      checked={filters.colors.includes(value)}
                      onChange={() => toggleFilter('colors', value)}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: '6px' }}>
            <button className="btn small" type="button" onClick={resetFilters}>Reinitialiser</button>
            <span className="muted">{loading ? 'Chargement...' : `${items.length} vetement(s) au total`}</span>
          </div>

          {error ? <div className="muted" style={{ color: '#b00020', marginTop: '8px' }}>{error}</div> : null}
        </div>

        <div className="panel" id="stats-actions">
          <h3>A surveiller</h3>
          <div className="stat-grid">
            {neverWornItems.length ? neverWornItems.slice(0, 4).map((item) => (
              <StatsCard
                key={item._id}
                item={item}
                subtitle="Jamais porte"
                detail={`Prix: ${formatPrice(item.price)}`}
              />
            )) : (
              <div className="muted">Aucune piece jamais portee avec les filtres actuels.</div>
            )}
          </div>
        </div>

        <div className="panel" id="stats-goals">
          <h3>Objectifs dressing</h3>
          <div className="goal-card-list">
            {goalCards.map((goal) => (
              <div className="goal-card" key={goal.label}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{goal.label}</strong>
                  <span className="chip">{goal.current}/{goal.target}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="muted">{goal.progress}% atteint</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" id="stats-budget">
          <h3>Budget</h3>
          <div className="stat-kpis">
            <div className="kpi">
              <div className="label">Depense ce mois</div>
              <div className="big">{formatPrice(thisMonthBudget)}</div>
            </div>
            <div className="kpi">
              <div className="label">Top categorie budget</div>
              <div className="big">{spendByCategory[0]?.label || 'N/A'}</div>
            </div>
            <div className="kpi">
              <div className="label">Montant top categorie</div>
              <div className="big">{formatPrice(spendByCategory[0]?.total || 0)}</div>
            </div>
          </div>
          {spendByCategory.length ? (
            <div className="list budget-breakdown">
              {spendByCategory.slice(0, 5).map((entry) => (
                <div className="row" key={entry.label} style={{ justifyContent: 'space-between' }}>
                  <span>{entry.label}</span>
                  <strong>{formatPrice(entry.total)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">Ajoute des prix pour suivre ton budget.</div>
          )}
        </div>

        <div className="panel" id="stats-most">
          <h3>Pieces les plus portees</h3>
          {mostWornItems.length ? (
            <div className="stat-grid">
              {mostWornItems.slice(0, 4).map((item) => (
                <StatsCard
                  key={item._id}
                  item={item}
                  subtitle={`Ports: ${getWearCount(item)}`}
                  detail={`Dernier port: ${formatDate(item.lastWornAt)}`}
                />
              ))}
            </div>
          ) : (
            <div className="muted">Aucune piece portee avec les filtres actuels.</div>
          )}
        </div>

        <div className="panel" id="stats-least">
          <h3>Achats recents</h3>
          {recentPurchases.length ? (
            <div className="stat-grid">
              {recentPurchases.slice(0, 4).map((item) => (
                <StatsCard
                  key={item._id}
                  item={item}
                  subtitle={`Achete le ${formatDate(item.purchaseDate)}`}
                  detail={`Lieu: ${toTitleCase(item.purchaseLocation) || 'Non renseigne'}`}
                />
              ))}
            </div>
          ) : (
            <div className="muted">Ajoute des dates d'achat dans Dressing pour voir les achats recents.</div>
          )}
        </div>

        <div className="panel">
          <h3>Pieces les moins rentables</h3>
          {costlyPerWearItems.length ? (
            <div className="stat-grid">
              {costlyPerWearItems.slice(0, 4).map((item) => (
                <StatsCard
                  key={item._id}
                  item={item}
                  subtitle={formatPricePerWear(item)}
                  detail={`Ports: ${getWearCount(item)} | Prix: ${formatPrice(item.price)}`}
                />
              ))}
            </div>
          ) : (
            <div className="muted">Porte d'abord quelques pieces pour calculer les couts par port.</div>
          )}
        </div>

        <div className="panel">
          <h3>Pieces les plus cheres</h3>
          {pricedItems.length ? (
            <div className="stat-grid">
              {pricedItems.slice(0, 4).map((item) => (
                <StatsCard
                  key={item._id}
                  item={item}
                  subtitle={`Prix: ${formatPrice(item.price)}`}
                  detail={`Marque: ${normalizeBrand(item.brand) || 'Non renseignee'}`}
                />
              ))}
            </div>
          ) : (
            <div className="muted">Ajoute des prix dans Dressing pour voir ce classement.</div>
          )}
        </div>

        <div className="panel" id="stats-occs">
          <h3>Repartition par occasion</h3>
          <StatPie items={occasionStats} emptyLabel="Aucune occasion renseignee pour le moment." />
        </div>

        <div className="panel" id="stats-cols">
          <h3>Couleurs dominantes</h3>
          <StatPie items={colorStats} emptyLabel="Aucune couleur exploitable avec les filtres actuels." />
        </div>

        <div className="panel" id="stats-ideal">
          <h3>Marques et origines</h3>
          <div className="stat-split">
            <div>
              <h4>Marques</h4>
              <StatPie items={brandStats} emptyLabel="Aucune marque renseignee." />
            </div>
            <div>
              <h4>Origines</h4>
              <StatPie items={originStats} emptyLabel="Aucune origine renseignee." />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Stats
