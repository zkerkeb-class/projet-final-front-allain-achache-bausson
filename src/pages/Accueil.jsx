import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import OutfitCanvasPreview from '../components/OutfitCanvasPreview'
import { AuthContext } from '../context/AuthContext'
import { apiFetch, buildAssetUrl, readApiError } from '../config/api'

const weatherCodeLabels = {
  0: 'Ciel dégagé',
  1: 'Plutôt ensoleillé',
  2: 'Peu nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard dense',
  51: 'Bruine legère',
  53: 'Bruine',
  55: 'Bruine soutenue',
  61: 'Pluie legère',
  63: 'Pluie',
  65: 'Pluie forte',
  71: 'Neige legère',
  73: 'Neige',
  75: 'Neige forte',
  80: 'Averses legères',
  81: 'Averses',
  82: 'Fortes averses',
  95: 'Orage',
}

const getLocalIsoDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDisplayAccountName = (user) => {
  const rawValue =
    String(user?.name || user?.username || user?.email || '')
      .split('@')[0]
      .trim()

  if (!rawValue) return 'Mon'

  return rawValue.charAt(0).toUpperCase() + rawValue.slice(1)
}

const formatDateLabel = (value) => {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

const randomFromList = (items) => {
  if (!Array.isArray(items) || !items.length) return null
  return items[Math.floor(Math.random() * items.length)] || null
}

const pickRandomDifferent = (items, usedIds) => {
  const pool = Array.isArray(items)
    ? items.filter((item) => item?._id && !usedIds.has(item._id))
    : []

  const selected = randomFromList(pool)
  if (selected?._id) {
    usedIds.add(selected._id)
  }
  return selected
}

const previewLayouts = {
  dress: { x: 50, y: 43, size: 46, zIndex: 2 },
  top: { x: 50, y: 31, size: 34, zIndex: 3 },
  outer: { x: 50, y: 30, size: 40, zIndex: 4 },
  bottom: { x: 50, y: 58, size: 34, zIndex: 2 },
  shoes: { x: 50, y: 82, size: 26, zIndex: 2 },
  bag: { x: 73, y: 48, size: 20, zIndex: 5, rotation: 8 },
  accessory: { x: 28, y: 47, size: 18, zIndex: 5, rotation: -8 },
  hat: { x: 50, y: 12, size: 22, zIndex: 5 },
}

const categoryLabels = {
  top: 'Hauts',
  bottom: 'Bas',
  dress: 'Robes',
  shoes: 'Chaussures',
  outer: 'Vestes',
  accessory: 'Accessoires',
  bag: 'Sacs',
  hat: 'Chapeaux',
}

const seasonReadinessTargets = {
  outfits: 15,
  top: 10,
  bottom: 3,
  shoes: 1,
  outer: 1,
}

const ignoredSeasonCategories = new Set()

const buildPreviewItems = (selection) => {
  return selection.map((garment, index) => {
    const layout = previewLayouts[garment?.category] || {
      x: 50,
      y: 50,
      size: 26,
      zIndex: 3 + index,
    }

    return {
      garment,
      category: garment?.category || 'piece',
      x: layout.x,
      y: layout.y,
      size: layout.size,
      zIndex: layout.zIndex ?? 3 + index,
      rotation: layout.rotation ?? 0,
    }
  })
}

const getWeeklyDates = (startDate = new Date(), count = 7) => {
  return Array.from({ length: count }, (_, index) => {
    const next = new Date(startDate)
    next.setDate(startDate.getDate() + index)

    return {
      iso: getLocalIsoDate(next),
      shortLabel: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(next),
      dayLabel: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(next),
    }
  })
}

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

const inferSeasonFromDate = (date = new Date()) => {
  const month = date.getMonth()
  if (month >= 2 && month <= 4) return 'printemps'
  if (month >= 5 && month <= 7) return 'été'
  if (month >= 8 && month <= 10) return 'automne'
  return 'hiver'
}

const deriveWeatherTags = (weather) => {
  if (!weather) return []

  const tags = []
  const code = Number(weather.weatherCode ?? -1)
  const temperature = Number(weather.apparentTemperature ?? weather.temperature ?? 0)

  if (temperature <= 10) tags.push('froid')
  else if (temperature >= 24) tags.push('chaud')
  else tags.push('doux')

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code)) {
    tags.push('pluie')
  } else if ([0, 1].includes(code)) {
    tags.push('beau temps')
  }

  return tags
}

const getWeatherEmoji = (weather) => {
  if (!weather) return '🌤️'

  const code = Number(weather.weatherCode ?? -1)
  const felt = Number(weather.apparentTemperature ?? weather.temperature ?? 0)

  if ([95].includes(code)) return '⛈️'
  if ([71, 73, 75].includes(code)) return '❄️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'
  if ([0].includes(code) && felt >= 24) return '☀️'
  if ([0, 1].includes(code)) return '🌤️'
  if ([2, 3].includes(code)) return '☁️'

  return felt <= 8 ? '🧥' : '🌡️'
}

const getWeatherAdvice = (weather) => {
  if (!weather) {
    return {
      title: 'Tenue à ajuster selon ta journée',
      detail: 'Sans météo locale, garde une base polyvalente et adaptée avec une couche en plus si besoin.',
    }
  }

  const code = Number(weather.weatherCode ?? -1)
  const felt = Number(weather.apparentTemperature ?? weather.temperature ?? 0)

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code)) {
    return {
      title: 'Pense aux couches de pluie',
      detail: 'Mise sur une tenue pratique avec veste ou pièce extérieure adaptée et chaussures moins sensibles.',
    }
  }

  if (felt <= 8) {
    return {
      title: 'Journée froide',
      detail: 'Privilégie une tenue chaude, des superpositions et des matières plus couvrantes.',
    }
  }

  if (felt >= 24) {
    return {
      title: 'Journée chaude',
      detail: "Favorise des pieces légères et respirantes pour rester à l'aise toute la journée.",
    }
  }

  if ([0, 1].includes(code)) {
    return {
      title: 'Temps clair et stable',
      detail: "C'est un bon jour pour sortir une tenue favorite ou plus visible sans surcouche lourde.",
    }
  }

  return {
    title: 'Météo plutot douce',
    detail: 'Une tenue équilibrée devrait suffire, avec une couche facile a retirer si la température monte.',
  }
}

const scoreOutfitForWeather = (outfit, season, weatherTags) => {
  if (!outfit || outfit.status === 'archived') {
    return { score: -999, reasons: [] }
  }

  const garments = Array.isArray(outfit.items)
    ? outfit.items.map((item) => item?.garment).filter(Boolean)
    : []

  if (!garments.length) {
    return { score: -999, reasons: [] }
  }

  let score = 0
  let weatherMatchCount = 0
  const reasons = []
  const weatherTagSet = new Set(Array.isArray(weatherTags) ? weatherTags : [])

  garments.forEach((garment) => {
    const seasons = Array.isArray(garment?.seasons) ? garment.seasons : []
    const garmentWeatherTags = Array.isArray(garment?.weatherTags) ? garment.weatherTags : []
    const category = String(garment?.category || '').toLowerCase()

    if (seasons.includes(season)) score += 3
    garmentWeatherTags.forEach((tag) => {
      if (weatherTagSet.has(tag)) {
        score += 3
        weatherMatchCount += 1
      }
    })

    if (weatherTagSet.has('pluie') && category === 'shoes') score += 2
    if (weatherTagSet.has('froid') && ['outer', 'top'].includes(category)) score += 1
    if (weatherTagSet.has('chaud') && ['dress', 'top', 'bottom'].includes(category)) score += 1
  })

  if (outfit.status === 'active') {
    score += 4
    reasons.push('Statut actif')
  }

  if (outfit.status === 'retest') {
    score += 1
  }

  if (outfit.isFavorite) {
    score += 2
    reasons.push('Favori')
  }

  if (garments.some((garment) => Array.isArray(garment?.seasons) && garment.seasons.includes(season))) {
    reasons.push(`Saison ${season}`)
  }

  if (weatherTagSet.size) {
    const hasRainSupport = garments.some((garment) => {
      const garmentWeatherTags = Array.isArray(garment?.weatherTags) ? garment.weatherTags : []
      const category = String(garment?.category || '').toLowerCase()
      return garmentWeatherTags.includes('pluie') || ['outer', 'shoes'].includes(category)
    })
    const hasColdSupport = garments.some((garment) => {
      const garmentWeatherTags = Array.isArray(garment?.weatherTags) ? garment.weatherTags : []
      const category = String(garment?.category || '').toLowerCase()
      return garmentWeatherTags.includes('froid') || ['outer', 'top'].includes(category)
    })
    const hasHotSupport = garments.some((garment) => {
      const garmentWeatherTags = Array.isArray(garment?.weatherTags) ? garment.weatherTags : []
      const category = String(garment?.category || '').toLowerCase()
      return garmentWeatherTags.includes('chaud') || ['dress', 'top', 'bottom'].includes(category)
    })

    if (weatherMatchCount === 0) {
      score -= 10
      reasons.push('Météo peu adaptée')
    } else if (weatherMatchCount >= Math.max(1, Math.ceil(garments.length / 2))) {
      score += 6
      reasons.push('Météo bien adaptée')
    } else {
      score += 2
      reasons.push('Météo partiellement adaptée')
    }

    if (weatherTagSet.has('pluie')) {
      if (hasRainSupport) {
        score += 4
        reasons.push('Prête pour la pluie')
      } else {
        score -= 7
      }
    }

    if (weatherTagSet.has('froid')) {
      if (hasColdSupport) {
        score += 4
        reasons.push('Adaptée au froid')
      } else {
        score -= 7
      }
    }

    if (weatherTagSet.has('chaud')) {
      if (hasHotSupport) {
        score += 4
        reasons.push('Adaptée à la chaleur')
      } else {
        score -= 5
      }
    }
  }

  return { score, reasons }
}

function Accueil() {
  const { user } = useContext(AuthContext)
  const [randomPickToken, setRandomPickToken] = useState(0)
  const [garments, setGarments] = useState([])
  const [outfits, setOutfits] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [weather, setWeather] = useState(null)
  const [weatherError, setWeatherError] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const currentYear = new Date().getFullYear()
    let cancelled = false

    const fetchDashboard = async () => {
      setLoading(true)
      setError('')

      try {
        const [garmentsRes, outfitsRes, calendarRes] = await Promise.all([
          apiFetch('/api/garments'),
          apiFetch('/api/outfits'),
          apiFetch(`/api/calendar?year=${currentYear}`),
        ])

        if (!garmentsRes.ok || !outfitsRes.ok || !calendarRes.ok) {
          const firstError = await Promise.all([
            garmentsRes.ok ? null : readApiError(garmentsRes, 'Erreur chargement accueil'),
            outfitsRes.ok ? null : readApiError(outfitsRes, 'Erreur chargement accueil'),
            calendarRes.ok ? null : readApiError(calendarRes, 'Erreur chargement accueil'),
          ])
          throw new Error(firstError.find(Boolean) || 'Erreur chargement accueil')
        }

        const [garmentsData, outfitsData, calendarData] = await Promise.all([
          garmentsRes.json(),
          outfitsRes.json(),
          calendarRes.json(),
        ])

        if (cancelled) return

        setGarments(Array.isArray(garmentsData) ? garmentsData : [])
        setOutfits(Array.isArray(outfitsData) ? outfitsData : [])
        setPlans(Array.isArray(calendarData) ? calendarData : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erreur chargement accueil')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadWeather = async () => {
      if (!navigator.geolocation) {
        setWeatherError('La géolocalisation n est pas disponible sur cet appareil.')
        setWeatherLoading(false)
        return
      }

      setWeatherLoading(true)
      setWeatherError('')

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const url = new URL('https://api.open-meteo.com/v1/forecast')
            url.searchParams.set('latitude', String(coords.latitude))
            url.searchParams.set('longitude', String(coords.longitude))
            url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day')
            url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
            url.searchParams.set('forecast_days', '1')
            url.searchParams.set('timezone', 'auto')

            const res = await fetch(url.toString())
            if (!res.ok) {
              throw new Error('Impossible de récupérer la météo du jour.')
            }

            const data = await res.json()
            if (cancelled) return

            setWeather({
              temperature: Math.round(Number(data?.current?.temperature_2m ?? 0)),
              apparentTemperature: Math.round(Number(data?.current?.apparent_temperature ?? 0)),
              windSpeed: Math.round(Number(data?.current?.wind_speed_10m ?? 0)),
              weatherCode: Number(data?.current?.weather_code ?? -1),
              tempMin: Math.round(Number(data?.daily?.temperature_2m_min?.[0] ?? 0)),
              tempMax: Math.round(Number(data?.daily?.temperature_2m_max?.[0] ?? 0)),
            })
          } catch (err) {
            if (!cancelled) {
              setWeatherError(err.message || 'Impossible de récupérer la météo du jour.')
            }
          } finally {
            if (!cancelled) {
              setWeatherLoading(false)
            }
          }
        },
        () => {
          if (!cancelled) {
            setWeatherError('Autorise la localisation pour afficher la météo du jour.')
            setWeatherLoading(false)
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 }
      )
    }

    loadWeather()

    return () => {
      cancelled = true
    }
  }, [])

  const todayIso = getLocalIsoDate()
  const displayName = toDisplayAccountName(user)
  const currentSeason = useMemo(() => inferSeasonFromDate(new Date()), [])
  const weatherLabel = weather ? (weatherCodeLabels[weather.weatherCode] || 'Conditions variables') : ''
  const activeWeatherTags = useMemo(() => deriveWeatherTags(weather), [weather])
  const weatherEmoji = useMemo(() => getWeatherEmoji(weather), [weather])
  const weatherAdvice = useMemo(() => getWeatherAdvice(weather), [weather])
  const weeklyDates = useMemo(() => getWeeklyDates(new Date(), 7), [todayIso])
  const plannedDates = useMemo(
    () => new Map(plans.filter((entry) => entry?.date).map((entry) => [entry.date, entry])),
    [plans]
  )

  const todayPlan = useMemo(
    () => plans.find((entry) => entry?.date === todayIso) || null,
    [plans, todayIso]
  )

  const favoriteCount = useMemo(
    () => outfits.filter((item) => item?.isFavorite).length,
    [outfits]
  )

  const retestCount = useMemo(
    () => outfits.filter((item) => item?.status === 'retest').length,
    [outfits]
  )

  const cutoutIssueCount = useMemo(
    () => garments.filter((item) => item?.uploadMeta?.cutoutStatus === 'failed').length,
    [garments]
  )

  const weekPlannedCount = useMemo(
    () => weeklyDates.filter((day) => plannedDates.has(day.iso)).length,
    [plannedDates, weeklyDates]
  )

  const weekUnplannedCount = Math.max(0, weeklyDates.length - weekPlannedCount)

  const heroStats = [
    { label: 'Vêtements', value: loading ? '...' : garments.length },
    { label: 'Tenues', value: loading ? '...' : outfits.length },
    { label: 'Favoris', value: loading ? '...' : favoriteCount },
    { label: 'A retester', value: loading ? '...' : retestCount },
    { label: 'Jours planifies', value: loading ? '...' : plans.length },
  ]

  const suggestedOutfit = useMemo(() => {
    if (!outfits.length) return null

    const ranked = outfits
      .map((outfit) => {
        const result = scoreOutfitForWeather(outfit, currentSeason, activeWeatherTags)
        return {
          outfit,
          score: result.score,
          reasons: result.reasons,
        }
      })
      .filter((entry) => entry.score > -900)
      .sort((a, b) => b.score - a.score)

    return ranked[0] || null
  }, [activeWeatherTags, currentSeason, outfits])

  const randomOutfitRecommendation = useMemo(() => {
    const pool = garments

    if (!pool.length) return null

    const byCategory = pool.reduce((acc, garment) => {
      const category = String(garment?.category || '').trim().toLowerCase()
      if (!category) return acc
      if (!acc[category]) acc[category] = []
      acc[category].push(garment)
      return acc
    }, {})

    const usedIds = new Set()
    const selection = []
    const useDress =
      Array.isArray(byCategory.dress) &&
      byCategory.dress.length > 0 &&
      (
        !Array.isArray(byCategory.top) ||
        !byCategory.top.length ||
        !Array.isArray(byCategory.bottom) ||
        !byCategory.bottom.length ||
        Math.random() < 0.4
      )

    if (useDress) {
      const dress = pickRandomDifferent(byCategory.dress, usedIds)
      if (dress) selection.push(dress)
    } else {
      const top = pickRandomDifferent(byCategory.top, usedIds)
      const bottom = pickRandomDifferent(byCategory.bottom, usedIds)
      if (top) selection.push(top)
      if (bottom) selection.push(bottom)
    }

    const shoes = pickRandomDifferent(byCategory.shoes, usedIds)
    if (shoes) selection.push(shoes)

    const extraCategories = ['bag', 'hat']
      .filter((category) => Array.isArray(byCategory[category]) && byCategory[category].length > 0)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.random() < 0.5 ? 1 : 2)

    extraCategories.forEach((category) => {
      const extra = pickRandomDifferent(byCategory[category], usedIds)
      if (extra) selection.push(extra)
    })

    const fallbackSelection = selection.length
      ? selection
      : pool
          .slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(3, pool.length))

    return {
      garments: fallbackSelection,
      previewItems: buildPreviewItems(fallbackSelection),
    }
  }, [activeWeatherTags, garments, randomPickToken])

  const attentionCards = [
    {
      label: 'Semaine',
      value: weekUnplannedCount,
      tone: weekUnplannedCount ? 'accent' : 'success',
      description: weekUnplannedCount ? 'jour(s) restent sans tenue planifiée sur les 7 prochains jours.' : 'Les 7 prochains jours sont déjà couverts.',
      to: '/calendrier',
      cta: weekUnplannedCount ? 'Compléter la semaine' : 'Vérifier le planning',
    },
    {
      label: 'Tenues a revoir',
      value: retestCount,
      tone: retestCount ? 'accent' : 'success',
      description: retestCount ? 'tenue(s) sont marquees a retester avant de redevenir des valeurs sures.' : 'Aucune tenue en attente de retest.',
      to: '/mes-tenues',
      cta: retestCount ? 'Revoir mes tenues' : 'Parcourir mes tenues',
    },
    {
      label: 'Photos',
      value: cutoutIssueCount,
      tone: cutoutIssueCount ? 'warning' : 'success',
      description: cutoutIssueCount ? 'image(s) ont eu un échec de détourage et méritent une relance.' : 'Les imports photo récents sont valides.',
      to: '/dressing',
      cta: cutoutIssueCount ? 'Corriger les images' : 'Voir le dressing',
    },
  ]

  const seasonSnapshot = useMemo(() => {
    const seasonalGarments = garments.filter((item) => Array.isArray(item?.seasons) && item.seasons.includes(currentSeason))
    const readyGarments = seasonalGarments
    const seasonalOutfits = outfits.filter((outfit) => {
      if (!outfit || outfit.status === 'archived') return false
      const outfitGarments = Array.isArray(outfit.items)
        ? outfit.items.map((item) => item?.garment).filter(Boolean)
        : []

      if (!outfitGarments.length) return false

      const allSeasonMatch = outfitGarments.every(
        (garment) => Array.isArray(garment?.seasons) && garment.seasons.includes(currentSeason)
      )
      return allSeasonMatch
    })

    const categoryCoverage = [
      ...new Set(
        readyGarments
          .map((item) => item.category)
          .filter((category) => category && !ignoredSeasonCategories.has(category))
      ),
    ].slice(0, 4)
    const seasonalCounts = seasonalGarments.reduce((acc, item) => {
      const category = item?.category
      if (!category || ignoredSeasonCategories.has(category)) return acc
      acc[category] = Number(acc[category] || 0) + 1
      return acc
    }, {})
    const readinessChecks = [
      {
        key: 'outfits',
        label: 'Tenues',
        current: seasonalOutfits.length,
        target: seasonReadinessTargets.outfits,
      },
      {
        key: 'top',
        label: categoryLabels.top,
        current: Number(seasonalCounts.top || 0),
        target: seasonReadinessTargets.top,
      },
      {
        key: 'bottom',
        label: categoryLabels.bottom,
        current: Number(seasonalCounts.bottom || 0),
        target: seasonReadinessTargets.bottom,
      },
      {
        key: 'shoes',
        label: categoryLabels.shoes,
        current: Number(seasonalCounts.shoes || 0),
        target: seasonReadinessTargets.shoes,
      },
      {
        key: 'outer',
        label: categoryLabels.outer,
        current: Number(seasonalCounts.outer || 0),
        target: seasonReadinessTargets.outer,
      },
    ]
    const missingTargets = readinessChecks
      .map((item) => ({
        ...item,
        missing: Math.max(0, item.target - item.current),
      }))
      .filter((item) => item.missing > 0)

    return {
      seasonalGarments,
      readyGarments,
      seasonalOutfits,
      categoryCoverage,
      readinessChecks,
      missingTargets,
    }
  }, [currentSeason, garments, outfits])

  const seasonReadyRate = useMemo(() => {
    const checks = Array.isArray(seasonSnapshot.readinessChecks) ? seasonSnapshot.readinessChecks : []
    const totalTarget = checks.reduce((sum, item) => sum + Number(item.target || 0), 0)
    if (!totalTarget) return 0
    const covered = checks.reduce((sum, item) => sum + Math.min(Number(item.current || 0), Number(item.target || 0)), 0)
    return Math.round((covered / totalTarget) * 100)
  }, [seasonSnapshot])

  const seasonGalleryGarments = useMemo(
    () => seasonSnapshot.seasonalGarments.slice(0, 6),
    [seasonSnapshot]
  )

  const seasonGalleryOutfits = useMemo(
    () => seasonSnapshot.seasonalOutfits.slice(0, 4),
    [seasonSnapshot]
  )

  return (
    <Layout title={`${displayName} Dressing`}>
      <section className="panel home-hero">
        <div className="home-hero-glow home-hero-glow-left" />
        <div className="home-hero-glow home-hero-glow-right" />

        <div className="home-hero-copy">
          <div className="site-eyebrow">Tableau de bord dressing</div>
          <h2>{getGreeting()}, {displayName}</h2>
          <p className="muted">
            Retrouve en un coup d'œil l'état de ton dressing, ta tenue du jour, la météo locale et tes prochains looks planifiés.
          </p>
          <div className="chips">
            <span className="chip">Saison: {currentSeason}</span>
            {activeWeatherTags.map((tag) => (
              <span className="chip" key={tag}>{tag}</span>
            ))}
          </div>
          <div className="row">
            <Link className="btn primary" to="/dressing">Ajouter un vêtement</Link>
            <Link className="btn" to="/tenues">Composer une tenue</Link>
            <Link className="btn ghost" to="/calendrier">Ouvrir le calendrier</Link>
          </div>
        </div>

        <div className="home-hero-side">
          <div className="home-weather-card">
            <div className="section-title">
              <h3>Météo du jour</h3>
              <span className="chip">Autour de vous</span>
            </div>
            {weatherLoading ? (
              <div className="muted">Recherche de la localisation et de la météo...</div>
            ) : weather ? (
              <div className="home-weather-grid">
                <div className="home-weather-main">
                  <strong>{weatherEmoji} {weather.temperature} C</strong>
                  <span>{weatherLabel}</span>
                </div>
                <div className="home-weather-meta">
                  <div className="muted">Ressenti: {weather.apparentTemperature} C</div>
                  <div className="muted">Mini / maxi: {weather.tempMin} C / {weather.tempMax} C</div>
                  <div className="muted">Vent: {weather.windSpeed} km/h</div>
                </div>
              </div>
            ) : (
              <div className="muted">{weatherError || 'Météo indisponible pour le moment.'}</div>
            )}
            <div className="home-weather-advice">
              <strong>{weatherAdvice.title}</strong>
              <span className="muted">{weatherAdvice.detail}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stat-kpis home-kpis">
        {heroStats.map((item) => (
          <div className="kpi" key={item.label}>
            <div className="label">{item.label}</div>
            <div className="big">{item.value}</div>
          </div>
        ))}
      </section>

      {error ? <div className="panel"><div className="muted" style={{ color: '#b00020' }}>{error}</div></div> : null}

      <section className="home-primary-stack">
        <div className="grid cols-2 home-feature-duo">
          <div className="panel home-suggestion-panel">
            <div className="section-title">
              <h3>Suggestion du jour</h3>
              <span className="chip">{currentSeason}</span>
            </div>
            {suggestedOutfit?.outfit ? (
              <div className="home-today-card">
                <OutfitCanvasPreview items={suggestedOutfit.outfit.items} className="saved-outfit-canvas-small" />
                <div className="home-today-meta">
                  <strong>{suggestedOutfit.outfit.name}</strong>
                  <div className="chips">
                    {suggestedOutfit.reasons.slice(0, 3).map((reason) => (
                      <span className="chip" key={reason}>{reason}</span>
                    ))}
                  </div>
                  <div className="muted">
                    {weather
                      ? `Suggestion basee sur ${weatherLabel.toLowerCase()}, la saison ${currentSeason} et l'état de tes pieces.`
                      : `Suggestion basee sur la saison ${currentSeason} et l'état de tes pieces.`}
                  </div>
                  <div className="row">
                    <Link className="btn small" to="/mes-tenues">Voir mes tenues</Link>
                    <Link className="btn small ghost" to="/tenues">Composer une variante</Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="home-empty-state">
                <strong>Aucune suggestion fiable pour le moment</strong>
                <span className="muted">Ajoute des saisons, des conditions météo et plus de tenues pour obtenir une recommandation vraiment pertinente.</span>
              </div>
            )}
          </div>

          <div className="panel home-random-panel">
            <div className="section-title">
              <h3>Reco surprise</h3>
              <span className="chip">100% hasard</span>
            </div>
            {randomOutfitRecommendation ? (
              <div className="home-random-card">
                <div className="home-today-meta">
                  <strong>Selection surprise</strong>
                  <div className="chips">
                    <span className="chip">{randomOutfitRecommendation.garments.length} piece(s)</span>
                    {randomOutfitRecommendation.garments.slice(0, 3).map((item) => (
                      <span className="chip" key={item._id || item.title || item.category}>
                        {item.category || 'piece'}
                      </span>
                    ))}
                  </div>
                  <div className="muted">
                    Une composition aleatoire pour casser les habitudes.
                  </div>
                  <div className="row">
                    <button className="btn small" type="button" onClick={() => setRandomPickToken((value) => value + 1)}>
                      Nouvelle selection
                    </button>
                    <Link
                      className="btn small ghost"
                      to="/tenues"
                      state={{
                        surpriseGarmentIds: randomOutfitRecommendation.garments.map((item) => item._id).filter(Boolean),
                        surpriseName: 'Selection surprise',
                      }}
                    >
                      Creer cette tenue
                    </Link>
                  </div>
                </div>
                <OutfitCanvasPreview
                  items={randomOutfitRecommendation.previewItems}
                  className="saved-outfit-canvas-random"
                />
              </div>
            ) : (
              <div className="home-empty-state">
                <strong>Pas assez de vêtements pour une surprise</strong>
                <span className="muted">Ajoute quelques pieces dans ton dressing pour generer une composition aleatoire differente a chaque relance.</span>
              </div>
	            )}
	          </div>
	        </div>
	      </section>

      <section className="grid cols-3 home-planning-grid">
        <div className="panel home-week-panel home-feature-panel">
          <div className="section-title">
            <h3>Semaine a venir</h3>
            <span className="chip">{weekPlannedCount}/7 planifie(s)</span>
          </div>
          <div className="home-week-strip">
            {weeklyDates.map((day) => {
              const entry = plannedDates.get(day.iso)

              return (
                <div
                  className={`home-week-day${day.iso === todayIso ? ' is-today' : ''}${entry?.outfit ? ' is-planned' : ''}`}
                  key={day.iso}
                >
                  <div className="home-week-date">
                    <strong>{day.shortLabel}</strong>
                    <span className="muted">{day.dayLabel}</span>
                  </div>
                  <div className="home-week-outfit">
                    {entry?.outfit ? (
                      <>
                        <OutfitCanvasPreview
                          items={entry.outfit.items}
                          className="saved-outfit-canvas-week"
                        />
                        <span className="muted">
                          {Array.isArray(entry.outfit.items) ? entry.outfit.items.length : 0} piece(s)
                        </span>
                      </>
                    ) : (
                      <div className="home-week-empty">
                        <strong>Aucune tenue</strong>
                        <span className="muted">Journee a preparer</span>
                      </div>
                    )}
                  </div>
                  <span className={`home-week-status${entry?.outfit ? ' is-planned' : ''}`}>
                    {day.iso === todayIso ? 'Aujourd hui' : entry?.outfit ? 'Planifie' : 'Libre'}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="row">
            <Link className="btn small" to="/calendrier">Organiser la semaine</Link>
            <Link className="btn small ghost" to="/mes-tenues">Choisir une tenue</Link>
          </div>
        </div>

        <div className="home-side-stack">
          <div className="panel home-side-panel">
            <div className="section-title">
              <h3>Aujourd hui</h3>
              <span className="chip">{formatDateLabel(todayIso)}</span>
            </div>
            {todayPlan?.outfit ? (
              <div className="home-today-card home-today-card-compact">
                <OutfitCanvasPreview items={todayPlan.outfit.items} className="saved-outfit-canvas-small" />
                <div className="home-today-meta">
                  <strong>{todayPlan.outfit.name}</strong>
                  <div className="chips">
                    <span className="chip">{Array.isArray(todayPlan.outfit.items) ? todayPlan.outfit.items.length : 0} piece(s)</span>
                    {todayPlan.outfit.isFavorite ? <span className="chip">Favori</span> : null}
                  </div>
                  <div className="muted">
                    {weather ? `Météo conseillée: ${weatherLabel.toLowerCase()}.` : 'Ajuste ta tenue selon la météo du jour.'}
                  </div>
                  <div className="row">
                    <Link className="btn small" to="/calendrier">Modifier le planning</Link>
                    <Link className="btn small ghost" to="/mes-tenues">Voir mes tenues</Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="home-empty-state">
                <strong>Aucune tenue planifiée aujourd'hui</strong>
                <span className="muted">Passe par le calendrier pour preparer ton look du jour ou compose une nouvelle tenue.</span>
                <div className="row">
                  <Link className="btn small" to="/calendrier">Planifier</Link>
                  <Link className="btn small ghost" to="/tenues">Composer</Link>
                </div>
              </div>
	            )}
		          </div>
	        </div>
	      </section>

      <section className="panel home-attention-panel">
        <div className="section-title">
          <h3>A faire maintenant</h3>
          <span className="chip">{attentionCards.filter((item) => item.value > 0).length} priorite(s)</span>
        </div>
        <div className="home-attention-grid">
          {attentionCards.map((item) => (
            <Link className={`home-attention-card is-${item.tone}`} key={item.label} to={item.to}>
              <div className="home-attention-head">
                <span className="site-eyebrow">{item.label}</span>
                <span className="chip">{item.cta}</span>
              </div>
              <strong className="home-attention-value">{item.value}</strong>
              <span className="muted">{item.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section
        className={`panel home-season-panel is-${currentSeason}`}
        style={{ '--season-ready-rate': seasonReadyRate }}
      >
          <div className="home-season-hero">
            <div className="home-season-copy">
              <span className="site-eyebrow">Capsule saison</span>
              <div className="section-title">
                <h3>Bloc saison</h3>
                <span className="chip">{currentSeason}</span>
              </div>
              <strong className="home-season-highlight">{seasonReadyRate}% du vestiaire de saison est pret</strong>
              <span className="muted">Objectif: 15 tenues, 10 hauts, 3 bas, 1 paire de chaussures et 1 veste.</span>
            </div>
            <div className="home-season-meter" aria-hidden="true">
              <div className="home-season-meter-ring">
                <strong>{seasonReadyRate}%</strong>
                <span>pret</span>
              </div>
            </div>
          </div>
          <div className="home-season-kpis">
            <div className="kpi home-season-kpi-card">
              <div className="label">Pieces de saison</div>
              <div className="big">{seasonSnapshot.seasonalGarments.length}</div>
              <span className="muted">base actuelle</span>
            </div>
            <div className="kpi home-season-kpi-card">
              <div className="label">Objectif restant</div>
              <div className="big">{seasonSnapshot.missingTargets.reduce((sum, item) => sum + item.missing, 0)}</div>
              <span className="muted">
                {seasonSnapshot.missingTargets.length
                  ? seasonSnapshot.missingTargets
                      .slice(0, 2)
                      .map((item) => `${item.missing} ${item.label.toLowerCase()}`)
                      .join(', ')
                  : 'Vestiaire de saison pret'}
              </span>
            </div>
            <div className="kpi home-season-kpi-card">
              <div className="label">Tenues pretes</div>
              <div className="big">{seasonSnapshot.seasonalOutfits.length}</div>
              <span className="muted">déjà exploitables</span>
            </div>
          </div>
          <div className="home-season-progress">
            <div className="home-season-progress-bar">
              <span style={{ width: `${seasonReadyRate}%` }} />
            </div>
            <div className="home-season-progress-meta">
              <span className="muted">{seasonSnapshot.readyGarments.length}/{seasonSnapshot.seasonalGarments.length || 0} pieces disponibles</span>
              <span className="muted">{Math.max(0, seasonSnapshot.seasonalGarments.length - seasonSnapshot.readyGarments.length)} a remettre en etat</span>
            </div>
          </div>
          <div className="home-season-summary">
            <strong>Couverture saisonniere</strong>
            <span className="muted">
              {seasonSnapshot.missingTargets.length
                ? `${seasonSnapshot.readyGarments.length} piece(s) disponibles et ${seasonSnapshot.seasonalOutfits.length} tenue(s) prêtes actuellement.`
                : 'Les grands types utiles a cette saison sont couverts dans ton dressing.'}
            </span>
            <div className="home-season-missing-copy">
              {seasonSnapshot.missingTargets.length
                ? `Il manque encore ${seasonSnapshot.missingTargets.map((item) => `${item.missing} ${item.label.toLowerCase()}`).join(', ')} pour atteindre l objectif.`
                : 'Le vestiaire de saison remplit l objectif defini.'}
            </div>
          </div>
          <div className="chips">
            {seasonSnapshot.categoryCoverage.length ? (
              seasonSnapshot.categoryCoverage.map((category) => (
                <span className="chip" key={category}>{categoryLabels[category] || category}</span>
              ))
            ) : (
              <span className="chip">Aucune couverture saisonniere</span>
            )}
          </div>
          <div className="home-season-gallery-grid">
            <div className="home-season-gallery-panel">
              <div className="section-title">
                <h4>Pieces de saison</h4>
                <span className="chip">{seasonGalleryGarments.length}</span>
              </div>
              {seasonGalleryGarments.length ? (
                <div className="home-season-garments-gallery">
                  {seasonGalleryGarments.map((garment) => {
                    const src = buildAssetUrl(garment.imageUrl || garment.cutoutUrl || garment.originalUrl)
                    if (!src) return null

                    return (
                      <div className="home-season-garment-card" key={garment._id || garment.title}>
                        <img
                          src={src}
                          alt={garment.title || garment.category || 'piece'}
                          loading="lazy"
                          decoding="async"
                        />
                        <span>{garment.title || categoryLabels[garment.category] || garment.category || 'Piece'}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="home-empty-state">
                  <strong>Aucune pièce de saison</strong>
                  <span className="muted">Ajoute ou renseigne des saisons sur tes vêtements.</span>
                </div>
              )}
            </div>
            <div className="home-season-gallery-panel">
              <div className="section-title">
                <h4>Tenues de saison</h4>
                <span className="chip">{seasonGalleryOutfits.length}</span>
              </div>
              {seasonGalleryOutfits.length ? (
                <div className="home-season-outfits-gallery">
                  {seasonGalleryOutfits.map((outfit) => (
                    <div className="home-season-outfit-card" key={outfit._id || outfit.name}>
                      <OutfitCanvasPreview items={outfit.items} className="saved-outfit-canvas-small home-season-outfit-preview" />
                      <span>{outfit.name || 'Tenue de saison'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="home-empty-state">
                  <strong>Aucune tenue de saison</strong>
                  <span className="muted">Compose quelques tenues adaptees a la saison en cours.</span>
                </div>
              )}
            </div>
          </div>
	      </section>
    </Layout>
  )
}

export default Accueil
