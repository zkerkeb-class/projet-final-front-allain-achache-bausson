import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { apiFetch, readApiError } from '../config/api'
import OutfitCanvasPreview from '../components/OutfitCanvasPreview'
import { useToast } from '../context/ToastContext'

const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const getWeatherEmoji = (weatherCode, temperature) => {
  const code = Number(weatherCode ?? -1)
  const temp = Number(temperature ?? 0)

  if (code === 95) return '⛈️'
  if ([71, 73, 75].includes(code)) return '❄️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'
  if (code === 0 && temp >= 24) return '☀️'
  if ([0, 1].includes(code)) return '🌤️'
  if ([2, 3].includes(code)) return '☁️'

  return temp <= 8 ? '🧥' : '🌡️'
}

const getLocalIsoDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getMonthGridStart = (year, month) => {
  const first = new Date(year, month, 1)
  const dow = (first.getDay() + 6) % 7
  return new Date(year, month, 1 - dow)
}

const buildMonthCells = (year, month) => {
  const start = getMonthGridStart(year, month)
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10)
    return {
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      key: iso,
      iso,
    }
  })
}

const inferSeasonFromIsoDate = (isoDate) => {
  const month = new Date(`${isoDate}T12:00:00`).getMonth()
  if (month >= 2 && month <= 4) return 'printemps'
  if (month >= 5 && month <= 7) return 'ete'
  if (month >= 8 && month <= 10) return 'automne'
  return 'hiver'
}

const getWeatherTagsForDay = (dailyWeather) => {
  if (!dailyWeather) return []

  const tags = []
  const temp = Number(dailyWeather.temperature ?? 0)
  const code = Number(dailyWeather.weatherCode ?? -1)

  if (temp <= 10) tags.push('froid')
  else if (temp >= 24) tags.push('chaud')
  else tags.push('doux')

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    tags.push('pluie')
  } else {
    tags.push('beau temps')
  }

  return tags
}

const scoreOutfitForDay = (outfit, season, weatherTags) => {
  const status = outfit?.status || 'active'
  if (status === 'archived') return -999

  let score = status === 'active' ? 4 : 1

  ;(Array.isArray(outfit?.items) ? outfit.items : []).forEach((entry) => {
    const garment = entry?.garment
    const seasons = Array.isArray(garment?.seasons) ? garment.seasons : []
    const itemWeatherTags = Array.isArray(garment?.weatherTags) ? garment.weatherTags : []

    if (seasons.length) {
      score += seasons.includes(season) ? 2 : -2
    }

    if (itemWeatherTags.length) {
      score += itemWeatherTags.some((value) => weatherTags.includes(value)) ? 2 : -1
    }
  })

  const wearCount = Number(outfit?.wearCount || 0)
  score -= wearCount * 0.15

  if (outfit?.lastWornAt) {
    const daysSinceWear = Math.floor((Date.now() - new Date(outfit.lastWornAt).getTime()) / (1000 * 60 * 60 * 24))
    if (Number.isFinite(daysSinceWear) && daysSinceWear <= 7) score -= 3
  }

  return score
}

function Calendrier() {
  const toast = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth())
  const [outfits, setOutfits] = useState([])
  const [plans, setPlans] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savingDate, setSavingDate] = useState('')
  const [wearingId, setWearingId] = useState('')
  const [weatherByDate, setWeatherByDate] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      setLoading(true)
      setError('')

      try {
        const [outfitsRes, plansRes] = await Promise.all([
          apiFetch('/api/outfits'),
          apiFetch(`/api/calendar?year=${year}`),
        ])

        if (!outfitsRes.ok) {
          throw new Error(await readApiError(outfitsRes, 'Erreur chargement tenues'))
        }

        if (!plansRes.ok) {
          throw new Error(await readApiError(plansRes, 'Erreur chargement calendrier'))
        }

        const outfitsData = await outfitsRes.json()
        const plansData = await plansRes.json()

        setOutfits(Array.isArray(outfitsData) ? outfitsData : [])
        setPlans(
          (Array.isArray(plansData) ? plansData : []).reduce((acc, entry) => {
            acc[entry.date] = entry
            return acc
          }, {})
        )
      } catch (err) {
        setError(err.message || 'Erreur chargement calendrier')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [year])

  useEffect(() => {
    let cancelled = false

    const loadWeekWeather = async () => {
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const url = new URL('https://api.open-meteo.com/v1/forecast')
            url.searchParams.set('latitude', String(coords.latitude))
            url.searchParams.set('longitude', String(coords.longitude))
            url.searchParams.set('daily', 'weather_code,temperature_2m_max')
            url.searchParams.set('forecast_days', '7')
            url.searchParams.set('timezone', 'auto')

            const res = await fetch(url.toString())
            if (!res.ok) return

            const data = await res.json()
            if (cancelled) return

            const dates = Array.isArray(data?.daily?.time) ? data.daily.time : []
            const codes = Array.isArray(data?.daily?.weather_code) ? data.daily.weather_code : []
            const temps = Array.isArray(data?.daily?.temperature_2m_max) ? data.daily.temperature_2m_max : []

            const nextWeather = dates.reduce((acc, date, index) => {
              acc[date] = {
                weatherCode: Number(codes[index] ?? -1),
                temperature: Math.round(Number(temps[index] ?? 0)),
              }
              return acc
            }, {})

            setWeatherByDate(nextWeather)
          } catch {
            if (!cancelled) {
              setWeatherByDate({})
            }
          }
        },
        () => {
          if (!cancelled) {
            setWeatherByDate({})
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 }
      )
    }

    loadWeekWeather()

    return () => {
      cancelled = true
    }
  }, [])

  const currentDate = new Date()
  const todayIso = getLocalIsoDate(currentDate)
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const plannedDates = Object.keys(plans)
  const pendingWearCount = plannedDates.filter((date) => {
    const plan = plans[date]
    return plan?.outfit?._id && date <= todayIso && !plan?.wearLoggedAt
  }).length

  const monthData = useMemo(() => {
    const cells = buildMonthCells(year, monthIndex)
    const plannedCount = cells.filter((cell) => cell.inMonth && plans[cell.iso]?.outfit?._id).length

    return {
      key: `${year}-${monthIndex}`,
      monthIndex,
      name: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(year, monthIndex, 1)),
      cells,
      plannedCount,
    }
  }, [monthIndex, plans, year])

  const todayPlan = plans[todayIso] || null
  const isCurrentViewedMonth = year === currentYear && monthIndex === currentMonth
  const suggestedOutfitsByDate = useMemo(() => {
    return monthData.cells.reduce((acc, cell) => {
      if (plans[cell.iso]?.outfit?._id) {
        acc[cell.iso] = []
        return acc
      }

      const season = inferSeasonFromIsoDate(cell.iso)
      const weatherTags = getWeatherTagsForDay(weatherByDate[cell.iso])

      acc[cell.iso] = [...outfits]
        .map((outfit) => ({ outfit, score: scoreOutfitForDay(outfit, season, weatherTags) }))
        .filter((entry) => entry.score > -20)
        .sort((a, b) => b.score - a.score || String(a.outfit.name || '').localeCompare(String(b.outfit.name || ''), 'fr'))
        .slice(0, 3)
        .map((entry) => entry.outfit)

      return acc
    }, {})
  }, [monthData.cells, outfits, plans, weatherByDate])

  const goToPreviousMonth = () => {
    setMonthIndex((prev) => {
      if (prev === 0) {
        setYear((current) => current - 1)
        return 11
      }

      return prev - 1
    })
  }

  const goToNextMonth = () => {
    setMonthIndex((prev) => {
      if (prev === 11) {
        setYear((current) => current + 1)
        return 0
      }

      return prev + 1
    })
  }

  const goToCurrentMonth = () => {
    setYear(currentYear)
    setMonthIndex(currentMonth)
  }

  const savePlan = async (date, outfitId, options = {}) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const { silent = false, previousOutfitId = '' } = options

    setSavingDate(date)
    setError('')

    try {
      if (!outfitId) {
        const res = await apiFetch(`/api/calendar/${date}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          throw new Error(await readApiError(res, 'Erreur suppression planning'))
        }

        setPlans((prev) => {
          const next = { ...prev }
          delete next[date]
          return next
        })
        if (!silent) {
          toast.success('Planning retire.', previousOutfitId ? {
            actionLabel: 'Annuler',
            onAction: () => savePlan(date, previousOutfitId, { silent: true }),
          } : {})
        }
        return
      }

      const res = await apiFetch(`/api/calendar/${date}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outfitId }),
      })

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Erreur sauvegarde planning'))
      }

      const plan = await res.json()
      setPlans((prev) => ({ ...prev, [date]: plan }))
      if (!silent) {
        toast.success('Planning enregistre.', {
          actionLabel: 'Annuler',
          onAction: () => (
            previousOutfitId
              ? savePlan(date, previousOutfitId, { silent: true })
              : savePlan(date, '', { silent: true })
          ),
        })
      }
    } catch (err) {
      setError(err.message || 'Erreur sauvegarde planning')
      toast.error(err.message || 'Erreur sauvegarde planning')
    } finally {
      setSavingDate('')
    }
  }

  const markPlannedOutfitAsWorn = async () => {
    const token = localStorage.getItem('token')
    if (!token || !todayPlan?.outfit?._id) return

    setWearingId(todayIso)
    setError('')

    try {
      const res = await apiFetch(`/api/calendar/${todayIso}/mark-worn`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Erreur validation tenue du jour'))
      }

      const data = await res.json()
      setPlans((prev) => ({
        ...prev,
        [todayIso]: {
          ...prev[todayIso],
          wornAt: data.wornAt,
          wearLoggedAt: data.wearLoggedAt,
        },
      }))
      toast.success(
        data.alreadyCounted
          ? 'Cette tenue etait deja comptee.'
          : `${data.updatedGarments || 0} vetement(s) de la tenue du jour comptabilises.`
      )
    } catch (err) {
      setError(err.message || 'Erreur validation tenue du jour')
      toast.error(err.message || 'Erreur validation tenue du jour')
    } finally {
      setWearingId('')
    }
  }

  const markCalendarDateAsWorn = async (date) => {
    const token = localStorage.getItem('token')
    const plan = plans[date]
    if (!token || !plan?.outfit?._id) return

    setWearingId(date)
    setError('')

    try {
      const res = await apiFetch(`/api/calendar/${date}/mark-worn`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Erreur comptage port'))
      }

      const data = await res.json()
      setPlans((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          wornAt: data.wornAt,
          wearLoggedAt: data.wearLoggedAt,
        },
      }))
      toast.success(
        data.alreadyCounted
          ? 'Ce jour etait deja compte.'
          : `Port comptabilise pour le ${date}.`
      )
    } catch (err) {
      setError(err.message || 'Erreur comptage port')
      toast.error(err.message || 'Erreur comptage port')
    } finally {
      setWearingId('')
    }
  }

  return (
    <Layout title="Calendrier">
      <div className="panel">
        <div className="section-title">
          <h2>Planifier tes tenues</h2>
          <div className="row" style={{ gap: '6px' }}>
            <button className="btn" type="button" onClick={goToPreviousMonth}>Prec.</button>
            <div className="chip">{monthData.name} {year}</div>
            <button className="btn" type="button" onClick={goToNextMonth}>Suiv.</button>
            {!isCurrentViewedMonth ? (
              <button className="btn small ghost" type="button" onClick={goToCurrentMonth}>
                Revenir a aujourd'hui
              </button>
            ) : null}
          </div>
        </div>

        <div className="stat-kpis" style={{ marginBottom: '10px' }}>
          <div className="kpi">
            <div className="label">Tenues disponibles</div>
            <div className="big">{loading ? '...' : outfits.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Jours planifies</div>
            <div className="big">{loading ? '...' : plannedDates.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Ce mois</div>
            <div className="big">{loading ? '...' : monthData.plannedCount}</div>
          </div>
          <div className="kpi">
            <div className="label">Ports a compter</div>
            <div className="big">{loading ? '...' : pendingWearCount}</div>
          </div>
        </div>

        {error ? <div className="muted" style={{ color: '#b00020', marginBottom: '10px' }}>{error}</div> : null}
        <div className="panel" style={{ marginBottom: '12px' }}>
          <div className="section-title">
            <h3>Tenue du jour</h3>
            <div className="chip">{todayIso}</div>
          </div>
          {todayPlan?.outfit ? (
            <>
              <div className="calendar-preview calendar-preview-today">
                <OutfitCanvasPreview items={todayPlan.outfit.items} className="calendar-outfit-preview" />
              </div>
              <div className="row">
                <button
                  className="btn small"
                  type="button"
                  onClick={markPlannedOutfitAsWorn}
                  disabled={Boolean(todayPlan?.wearLoggedAt) || wearingId === todayIso}
                >
                  {todayPlan?.wearLoggedAt ? 'Deja comptee' : wearingId === todayIso ? 'Mise a jour...' : "Porter aujourd'hui"}
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="muted" style={{ marginBottom: '8px' }}>Aucune tenue planifiee aujourd'hui.</div>
              {Array.isArray(suggestedOutfitsByDate[todayIso]) && suggestedOutfitsByDate[todayIso].length ? (
                <div className="calendar-suggestions calendar-suggestions-today">
                  {suggestedOutfitsByDate[todayIso].map((suggestion) => (
                    <button
                      className="calendar-suggestion-card calendar-suggestion-card-today"
                      type="button"
                      key={suggestion._id}
                      onClick={() => savePlan(todayIso, suggestion._id)}
                      title={suggestion.name || 'Suggestion'}
                    >
                      <OutfitCanvasPreview items={suggestion.items} className="calendar-outfit-preview" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <section className={`month month-single${isCurrentViewedMonth ? ' is-current-month' : ''}`} key={monthData.key}>
          <div className="section-title">
            <h3>{monthData.name}</h3>
            <span className="chip">{monthData.plannedCount} planifie(s)</span>
          </div>
          <div className="month-weekdays">
            {weekdays.map((day, index) => (
              <div className="weekday" key={`${monthData.key}-${day}-${index}`}>{day}</div>
            ))}
          </div>
          <div className="month-grid">
            {monthData.cells.map((cell) => {
              const planned = plans[cell.iso]
              const outfit = planned?.outfit || null
              const canCountWear = Boolean(outfit?._id) && cell.iso <= todayIso
              const isWearCounted = Boolean(planned?.wearLoggedAt)
              const dailyWeather = weatherByDate[cell.iso]
              const weatherEmoji = dailyWeather ? getWeatherEmoji(dailyWeather.weatherCode, dailyWeather.temperature) : ''
              const suggestions = suggestedOutfitsByDate[cell.iso] || []

              return (
                <div className={`cell${cell.inMonth ? '' : ' dim'}${cell.iso === todayIso ? ' is-today' : ''}${outfit ? ' is-planned' : ''}`} key={cell.key}>
                  <div className="calendar-cell-head">
                    <div className="d">{cell.day}</div>
                    {dailyWeather ? (
                      <div className="calendar-weather-chip" title={`Meteo prevue: ${dailyWeather.temperature} C`}>
                        <span>{weatherEmoji}</span>
                        <span>{dailyWeather.temperature}C</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="calendar-preview">
                    {outfit ? (
                      <OutfitCanvasPreview items={outfit.items} className="calendar-outfit-preview" />
                    ) : (
                      <div className="calendar-empty">Aucune tenue</div>
                    )}
                  </div>
                  {!outfit && suggestions.length ? (
                    <div className="calendar-suggestions calendar-suggestions-grid">
                      {suggestions.slice(0, 2).map((suggestion) => (
                        <button
                          className="calendar-suggestion-card"
                          type="button"
                          key={suggestion._id}
                          onClick={() => savePlan(cell.iso, suggestion._id)}
                          title={suggestion.name || 'Suggestion'}
                        >
                          <OutfitCanvasPreview items={suggestion.items} className="calendar-outfit-preview" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {outfit && canCountWear ? (
                    <div className="row" style={{ gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span className="chip">{isWearCounted ? 'Deja compte' : 'A compter'}</span>
                      <button
                        className="btn small ghost"
                        type="button"
                        onClick={() => markCalendarDateAsWorn(cell.iso)}
                        disabled={isWearCounted || wearingId === cell.iso}
                      >
                        {isWearCounted ? 'Compte' : wearingId === cell.iso ? 'Comptage...' : 'Compter ce port'}
                      </button>
                    </div>
                  ) : null}
                  <select
                    className="mini-select"
                    value={outfit?._id || ''}
                    onChange={(event) => savePlan(cell.iso, event.target.value, { previousOutfitId: outfit?._id || '' })}
                    disabled={savingDate === cell.iso}
                  >
                    <option value="">(aucune)</option>
                    {outfits.map((entry) => (
                      <option key={entry._id} value={entry._id}>{entry.name}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default Calendrier
