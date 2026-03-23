import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiFetch, buildAssetUrl, readApiError } from '../config/api'
import OutfitCanvasPreview from '../components/OutfitCanvasPreview'
import { useToast } from '../context/ToastContext'

const categories = ['hat', 'outer', 'top', 'dress', 'bottom', 'bag', 'shoes', 'accessory']
const defaultCanvasCategories = ['top', 'bottom', 'shoes']
const selectorCategories = [
  ...defaultCanvasCategories,
  ...categories.filter((category) => !defaultCanvasCategories.includes(category)),
]
const copySuffix = '__copy'

const canvasSlots = {
  hat: { top: '6%', left: '50%', width: '32%', zIndex: 7 },
  outer: { top: '42%', left: '50%', width: '56%', zIndex: 5 },
  top: { top: '33%', left: '50%', width: '36%', zIndex: 4 },
  dress: { top: '50%', left: '50%', width: '52%', zIndex: 4 },
  bottom: { top: '67%', left: '50%', width: '42%', zIndex: 3 },
  bag: { top: '56%', left: '74%', width: '24%', zIndex: 6 },
  shoes: { top: '89%', left: '50%', width: '36%', zIndex: 2 },
  accessory: { top: '33%', left: '68%', width: '18%', zIndex: 6 },
}

const labels = {
  hat: 'Chapeau',
  outer: 'Veste',
  top: 'Haut',
  dress: 'Robe',
  bottom: 'Bas',
  bag: 'Sac',
  shoes: 'Chaussures',
  accessory: 'Accessoire',
}

const outfitStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'retest', label: 'A retester' },
  { value: 'archived', label: 'Archivee' },
]

const seasonOptions = ['printemps', 'ete', 'automne', 'hiver']
const weatherOptions = ['froid', 'doux', 'chaud', 'pluie', 'beau temps']
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const makePieceId = (category, variant = 'base') => (variant === 'copy' ? `${category}${copySuffix}` : category)
const getPieceCategory = (pieceId = '') => pieceId.endsWith(copySuffix) ? pieceId.slice(0, -copySuffix.length) : pieceId
const getPieceVariant = (pieceId = '') => pieceId.endsWith(copySuffix) ? 'copy' : 'base'
const isDefaultCanvasCategory = (category) => defaultCanvasCategories.includes(category)

const getDefaultAdjustment = (category) => {
  const slot = canvasSlots[category]
  return {
    x: Number.parseFloat(slot?.left || '50'),
    y: Number.parseFloat(slot?.top || '50'),
    size: Number.parseFloat(slot?.width || '30'),
    zIndex: Number(slot?.zIndex || 1),
    rotation: 0,
  }
}

const createDefaultAdjustments = () => {
  return categories.reduce((acc, category) => {
    acc[makePieceId(category)] = getDefaultAdjustment(category)
    return acc
  }, {})
}

const createDuplicateAdjustment = (category, adjustment) => {
  const source = adjustment || getDefaultAdjustment(category)
  return {
    x: clamp((source.x ?? 50) + 6, 4, 96),
    y: clamp((source.y ?? 50) + 4, 4, 96),
    size: source.size ?? getDefaultAdjustment(category).size,
    zIndex: clamp((source.zIndex ?? getDefaultAdjustment(category).zIndex) + 1, 1, 20),
    rotation: source.rotation ?? 0,
  }
}

function Tenues() {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const interactionRef = useRef(null)
  const [items, setItems] = useState([])
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [selectedColors, setSelectedColors] = useState([])
  const [selectedOccasions, setSelectedOccasions] = useState([])
  const [selectedSeasons, setSelectedSeasons] = useState([])
  const [selectedWeatherTags, setSelectedWeatherTags] = useState([])
  const [selection, setSelection] = useState({})
  const [duplicateSelection, setDuplicateSelection] = useState({})
  const [selectorCategoryIndex, setSelectorCategoryIndex] = useState(0)
  const [activePieceId, setActivePieceId] = useState('')
  const [lockedPieces, setLockedPieces] = useState({})
  const [pieceAdjustments, setPieceAdjustments] = useState(createDefaultAdjustments)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [snapToGuides, setSnapToGuides] = useState(true)
  const [showGuides, setShowGuides] = useState(true)
  const [outfitName, setOutfitName] = useState('')
  const [outfitStatus, setOutfitStatus] = useState('active')
  const [outfitIsFavorite, setOutfitIsFavorite] = useState(false)
  const [editingOutfitId, setEditingOutfitId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      setLoading(true)
      setError('')

      try {
        const [garmentsRes, outfitsRes] = await Promise.all([
          apiFetch('/api/garments'),
          apiFetch('/api/outfits'),
        ])

        if (!garmentsRes.ok) {
          throw new Error(await readApiError(garmentsRes, 'Erreur chargement tenues'))
        }

        if (!outfitsRes.ok) {
          throw new Error(await readApiError(outfitsRes, 'Erreur chargement tenues'))
        }

        const garments = await garmentsRes.json()
        const savedOutfits = await outfitsRes.json()
        setItems(Array.isArray(garments) ? garments : [])
        setOutfits(Array.isArray(savedOutfits) ? savedOutfits : [])
      } catch (err) {
        setError(err.message || 'Erreur chargement tenues')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const availableColors = useMemo(
    () => [...new Set(items.flatMap((item) => [item.color, item.secondaryColor]).filter(Boolean))].sort(),
    [items]
  )

  const availableOccasions = useMemo(
    () => [...new Set(items.flatMap((item) => Array.isArray(item.occasions) ? item.occasions : []).filter(Boolean))].sort(),
    [items]
  )

  const availableSeasons = useMemo(
    () => seasonOptions.filter((value) => items.some((item) => Array.isArray(item.seasons) && item.seasons.includes(value))),
    [items]
  )

  const availableWeatherTags = useMemo(
    () => weatherOptions.filter((value) => items.some((item) => Array.isArray(item.weatherTags) && item.weatherTags.includes(value))),
    [items]
  )

  const resetCanvasEditor = () => {
    setDuplicateSelection({})
    setLockedPieces({})
    setPieceAdjustments(createDefaultAdjustments())
    setCanvasZoom(1)
    setActivePieceId('')
    setSaveError('')
  }

  const resetComposer = () => {
    setSelection({})
    resetCanvasEditor()
    setOutfitName('')
    setOutfitStatus('active')
    setOutfitIsFavorite(false)
    setEditingOutfitId('')
  }

  const loadOutfitIntoEditor = (outfit) => {
    if (!outfit) return

    const nextSelection = {}
    const nextDuplicateSelection = {}
    const nextAdjustments = createDefaultAdjustments()

    categories.forEach((category) => {
      const outfitItems = (Array.isArray(outfit.items) ? outfit.items : []).filter((entry) => entry.category === category)
      const list = items.filter((item) => item.category === category)

      outfitItems.slice(0, 2).forEach((outfitItem, index) => {
        const garmentId = outfitItem?.garment?._id || outfitItem?.garment
        const listIndex = list.findIndex((item) => item._id === garmentId)
        if (listIndex < 0) return

        const pieceId = makePieceId(category, index === 0 ? 'base' : 'copy')

        if (index === 0) {
          nextSelection[category] = listIndex
        } else {
          nextDuplicateSelection[category] = listIndex
        }

        nextAdjustments[pieceId] = {
          x: Number(outfitItem.x ?? getDefaultAdjustment(category).x),
          y: Number(outfitItem.y ?? getDefaultAdjustment(category).y),
          size: Number(outfitItem.size ?? getDefaultAdjustment(category).size),
          zIndex: Number(outfitItem.zIndex ?? getDefaultAdjustment(category).zIndex),
          rotation: Number(outfitItem.rotation ?? getDefaultAdjustment(category).rotation),
        }
      })
    })

    setSelectedColors([])
    setSelectedOccasions([])
    setSelectedSeasons([])
    setSelectedWeatherTags([])
    setSelection(nextSelection)
    setDuplicateSelection(nextDuplicateSelection)
    setLockedPieces({})
    setPieceAdjustments(nextAdjustments)
    setCanvasZoom(1)
    setOutfitName(outfit.name || '')
    setOutfitStatus(outfit.status || 'active')
    setOutfitIsFavorite(Boolean(outfit.isFavorite))
    setEditingOutfitId(outfit._id || '')
    setSaveError('')
    setActivePieceId(makePieceId(categories.find((category) => nextSelection[category] != null) || ''))
    window.location.hash = '#/tenues'
  }

  const loadGarmentSelectionIntoEditor = (garmentIds = [], options = {}) => {
    const nextSelection = {}
    const nextDuplicateSelection = {}
    const nextAdjustments = createDefaultAdjustments()

    categories.forEach((category) => {
      const list = items.filter((item) => item.category === category)
      const matchingGarments = garmentIds
        .map((garmentId) => list.find((item) => item._id === garmentId))
        .filter(Boolean)

      matchingGarments.slice(0, 2).forEach((garment, index) => {
        const listIndex = list.findIndex((item) => item._id === garment._id)
        if (listIndex < 0) return

        const pieceId = makePieceId(category, index === 0 ? 'base' : 'copy')

        if (index === 0) {
          nextSelection[category] = listIndex
        } else {
          nextDuplicateSelection[category] = listIndex
          nextAdjustments[pieceId] = createDuplicateAdjustment(category, nextAdjustments[makePieceId(category)])
        }
      })
    })

    setSelectedColors([])
    setSelectedOccasions([])
    setSelectedSeasons([])
    setSelectedWeatherTags([])
    setSelection(nextSelection)
    setDuplicateSelection(nextDuplicateSelection)
    setLockedPieces({})
    setPieceAdjustments(nextAdjustments)
    setCanvasZoom(1)
    setOutfitName(String(options.name || 'Selection surprise'))
    setOutfitStatus('active')
    setOutfitIsFavorite(false)
    setEditingOutfitId('')
    setSaveError('')
    setActivePieceId(makePieceId(categories.find((category) => nextSelection[category] != null) || ''))
    window.location.hash = '#/tenues'
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const colorOk = !selectedColors.length || [item.color, item.secondaryColor].some((value) => selectedColors.includes(value))
      const occasions = Array.isArray(item.occasions) ? item.occasions : []
      const occasionOk = !selectedOccasions.length || occasions.some((value) => selectedOccasions.includes(value))
      const seasons = Array.isArray(item.seasons) ? item.seasons : []
      const seasonOk = !selectedSeasons.length || seasons.some((value) => selectedSeasons.includes(value))
      const weatherTags = Array.isArray(item.weatherTags) ? item.weatherTags : []
      const weatherOk = !selectedWeatherTags.length || weatherTags.some((value) => selectedWeatherTags.includes(value))
      return colorOk && occasionOk && seasonOk && weatherOk
    })
  }, [items, selectedColors, selectedOccasions, selectedSeasons, selectedWeatherTags])

  const groupedItems = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category] = filteredItems.filter((item) => item.category === category)
      return acc
    }, {})
  }, [filteredItems])

  const selectedEntries = useMemo(() => {
    return categories.flatMap((category) => {
      const list = groupedItems[category] || []
      const baseIndex = selection[category]
      const duplicateIndex = duplicateSelection[category]
      const entries = []

      if (list.length && baseIndex !== -1) {
        const resolvedBaseIndex = baseIndex != null ? baseIndex : (isDefaultCanvasCategory(category) ? 0 : null)
        const item = resolvedBaseIndex == null ? null : (list[resolvedBaseIndex] || null)
        if (item) entries.push({ pieceId: makePieceId(category), category, item, variant: 'base' })
      }

      if (list.length && duplicateIndex !== -1 && duplicateIndex != null) {
        const item = list[duplicateIndex] || null
        if (item) entries.push({ pieceId: makePieceId(category, 'copy'), category, item, variant: 'copy' })
      }

      return entries
    })
  }, [duplicateSelection, groupedItems, selection])

  const selectorCategory = selectorCategories[selectorCategoryIndex] || selectorCategories[0]
  const selectorItems = groupedItems[selectorCategory] || []
  const selectorCurrentIndex = selection[selectorCategory]
  const selectorResolvedIndex = selectorCurrentIndex === -1 ? -1 : (selectorCurrentIndex ?? 0)
  const selectorCurrentItem = selectorResolvedIndex >= 0 ? (selectorItems[selectorResolvedIndex] || null) : null
  const selectorCurrentSrc = selectorCurrentItem
    ? buildAssetUrl(selectorCurrentItem.imageUrl || selectorCurrentItem.cutoutUrl || selectorCurrentItem.originalUrl)
    : ''
  const selectorHasDuplicate = duplicateSelection[selectorCategory] != null && duplicateSelection[selectorCategory] !== -1
  const selectorIsOnCanvas = Boolean(
    selectorItems.length && (
      selection[selectorCategory] != null
        ? selection[selectorCategory] !== -1
        : isDefaultCanvasCategory(selectorCategory)
    )
  )

  const moveSelectorCategory = (direction) => {
    setSelectorCategoryIndex((current) => (current + direction + selectorCategories.length) % selectorCategories.length)
  }

  const selectedItems = useMemo(() => {
    const uniqueIds = new Set()
    return selectedEntries
      .map((entry) => entry.item)
      .filter((item) => {
        if (!item?._id || uniqueIds.has(item._id)) return false
        uniqueIds.add(item._id)
        return true
      })
  }, [selectedEntries])

  const totalLookPrice = selectedItems.reduce((sum, item) => {
    const price = Number(item.price)
    return Number.isFinite(price) ? sum + price : sum
  }, 0)

  const activeEntry = selectedEntries.find((entry) => entry.pieceId === activePieceId) || selectedEntries[0] || null
  const mobileComposerFilterCount = [
    selectedColors.length,
    selectedOccasions.length,
    selectedSeasons.length,
    selectedWeatherTags.length,
  ].reduce((sum, value) => sum + value, 0)

  const activeGuides = useMemo(() => {
    if (!showGuides || !activeEntry) return { vertical: false, horizontal: false }
    const adjustment = pieceAdjustments[activeEntry.pieceId] || getDefaultAdjustment(activeEntry.category)
    return {
      vertical: Math.abs((adjustment.x ?? 50) - 50) <= 1.5,
      horizontal: Math.abs((adjustment.y ?? 50) - 50) <= 1.5,
    }
  }, [activeEntry, pieceAdjustments, showGuides])

  useEffect(() => {
    if (!selectedEntries.length) {
      setActivePieceId('')
      return
    }

    if (!selectedEntries.some((entry) => entry.pieceId === activePieceId)) {
      setActivePieceId(selectedEntries[0].pieceId)
    }
  }, [activePieceId, selectedEntries])

  useEffect(() => {
    const editOutfitId = location.state?.editOutfitId
    if (!editOutfitId || !items.length || !outfits.length) return

    const outfit = outfits.find((entry) => entry._id === editOutfitId)
    if (!outfit) return

    loadOutfitIntoEditor(outfit)
    navigate(location.pathname, { replace: true, state: {} })
  }, [items, outfits, location.pathname, location.state, navigate])

  useEffect(() => {
    const surpriseGarmentIds = Array.isArray(location.state?.surpriseGarmentIds)
      ? location.state.surpriseGarmentIds.filter(Boolean)
      : []

    if (!surpriseGarmentIds.length || !items.length) return

    loadGarmentSelectionIntoEditor(surpriseGarmentIds, {
      name: location.state?.surpriseName || 'Selection surprise',
    })
    navigate(location.pathname, { replace: true, state: {} })
  }, [items, location.pathname, location.state, navigate])

  useEffect(() => {
    const duplicateOutfitId = location.state?.duplicateOutfitId
    if (!duplicateOutfitId || !items.length || !outfits.length) return

    const outfit = outfits.find((entry) => entry._id === duplicateOutfitId)
    if (!outfit) return

    loadOutfitIntoEditor(outfit)
    setEditingOutfitId('')
    setOutfitName(`${outfit.name || 'Tenue'} copie`)
    navigate(location.pathname, { replace: true, state: {} })
  }, [items, outfits, location.pathname, location.state, navigate])

  const toggleInList = (value, current, setter) => {
    setter(current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value])
  }

  const cycleItem = (category, direction) => {
    const list = groupedItems[category] || []
    if (!list.length) return

    setSelection((prev) => {
      const currentIndex = prev[category] === -1 ? 0 : (prev[category] ?? 0)
      const nextIndex = (currentIndex + direction + list.length) % list.length
      return { ...prev, [category]: nextIndex }
    })
    setActivePieceId(makePieceId(category))
  }

  const clearPiece = (pieceId) => {
    const category = getPieceCategory(pieceId)
    const isCopy = getPieceVariant(pieceId) === 'copy'
    const baseId = makePieceId(category)
    const copyId = makePieceId(category, 'copy')

    if (isCopy) {
      setDuplicateSelection((prev) => ({ ...prev, [category]: -1 }))
      setPieceAdjustments((prev) => {
        const next = { ...prev }
        delete next[copyId]
        return next
      })
      setLockedPieces((prev) => {
        const next = { ...prev }
        delete next[copyId]
        return next
      })
      setActivePieceId(baseId)
      return
    }

    const duplicateIndex = duplicateSelection[category]
    if (duplicateIndex != null && duplicateIndex !== -1) {
      setSelection((prev) => ({ ...prev, [category]: duplicateIndex }))
      setDuplicateSelection((prev) => ({ ...prev, [category]: -1 }))
      setPieceAdjustments((prev) => {
        const next = { ...prev }
        next[baseId] = next[copyId] || getDefaultAdjustment(category)
        delete next[copyId]
        return next
      })
      setLockedPieces((prev) => {
        const next = { ...prev }
        next[baseId] = Boolean(next[copyId])
        delete next[copyId]
        return next
      })
      setActivePieceId(baseId)
      return
    }

    setSelection((prev) => ({ ...prev, [category]: -1 }))
    setActivePieceId('')
  }

  const duplicatePiece = (pieceId) => {
    const category = getPieceCategory(pieceId)
    const currentIndex = selection[category] === -1
      ? -1
      : (selection[category] ?? (isDefaultCanvasCategory(category) ? 0 : null))
    const copyId = makePieceId(category, 'copy')

    if (getPieceVariant(pieceId) === 'copy') {
      toast.info('Une copie supplementaire n est pas disponible pour cette piece.')
      return
    }

    if (currentIndex == null || currentIndex === -1) {
      toast.error("Ajoute d'abord une pièce sur le canvas.")
      return
    }

    if (duplicateSelection[category] != null && duplicateSelection[category] !== -1) {
      toast.info('Cette catégorie a déjà une copie sur le canvas.')
      return
    }

    setDuplicateSelection((prev) => ({ ...prev, [category]: currentIndex }))
    setPieceAdjustments((prev) => ({
      ...prev,
      [copyId]: createDuplicateAdjustment(category, prev[pieceId] || prev[makePieceId(category)]),
    }))
    setActivePieceId(copyId)
  }

  const randomizeLook = () => {
    const next = {}

    defaultCanvasCategories.forEach((category) => {
      const list = groupedItems[category] || []
      if (list.length) next[category] = Math.floor(Math.random() * list.length)
    })

    setSelection(next)
    resetCanvasEditor()
    setActivePieceId(makePieceId(categories.find((category) => next[category] != null) || ''))
  }

  const resetFilters = () => {
    setSelectedColors([])
    setSelectedOccasions([])
    setSelectedSeasons([])
    setSelectedWeatherTags([])
  }

  const resetAdjustment = (pieceId) => {
    const category = getPieceCategory(pieceId)
    const isCopy = getPieceVariant(pieceId) === 'copy'
    setPieceAdjustments((prev) => ({
      ...prev,
      [pieceId]: isCopy ? createDuplicateAdjustment(category, prev[makePieceId(category)]) : getDefaultAdjustment(category),
    }))
  }

  const updatePieceAdjustment = (pieceId, updater) => {
    const category = getPieceCategory(pieceId)
    setPieceAdjustments((prev) => {
      const current = prev[pieceId] || getDefaultAdjustment(category)
      return {
        ...prev,
        [pieceId]: updater(current),
      }
    })
  }

  const nudgePiece = (pieceId, deltaX, deltaY) => {
    if (!pieceId || lockedPieces[pieceId]) return

    updatePieceAdjustment(pieceId, (current) => {
      let nextX = clamp((current.x ?? 50) + deltaX, 4, 96)
      let nextY = clamp((current.y ?? 50) + deltaY, 4, 96)

      if (snapToGuides) {
        if (Math.abs(nextX - 50) <= 1.5) nextX = 50
        if (Math.abs(nextY - 50) <= 1.5) nextY = 50
      }

      return {
        ...current,
        x: nextX,
        y: nextY,
      }
    })
  }

  const resizePieceBy = (pieceId, delta) => {
    if (!pieceId || lockedPieces[pieceId]) return

    updatePieceAdjustment(pieceId, (current) => ({
      ...current,
      size: clamp((current.size ?? 30) + delta, 8, 90),
    }))
  }

  const rotatePieceBy = (pieceId, delta) => {
    if (!pieceId || lockedPieces[pieceId]) return

    updatePieceAdjustment(pieceId, (current) => ({
      ...current,
      rotation: (current.rotation ?? 0) + delta,
    }))
  }

  const shiftPieceLayer = (pieceId, delta) => {
    updatePieceAdjustment(pieceId, (current) => ({
      ...current,
      zIndex: clamp((current.zIndex || 1) + delta, 1, 20),
    }))
    setActivePieceId(pieceId)
  }

  const togglePieceLock = (pieceId) => {
    setLockedPieces((prev) => ({
      ...prev,
      [pieceId]: !prev[pieceId],
    }))
  }

  const selectedPayload = selectedEntries.map(({ pieceId, category, item }) => ({
    category,
    garment: item._id,
    x: pieceAdjustments[pieceId]?.x ?? 50,
    y: pieceAdjustments[pieceId]?.y ?? 50,
    size: pieceAdjustments[pieceId]?.size ?? 30,
    zIndex: pieceAdjustments[pieceId]?.zIndex ?? canvasSlots[category]?.zIndex ?? 1,
    rotation: pieceAdjustments[pieceId]?.rotation ?? 0,
  }))

  const startInteraction = (event, pieceId, mode) => {
    const canvas = canvasRef.current
    if (!canvas || lockedPieces[pieceId]) return

    event.preventDefault()
    event.stopPropagation()

    const category = getPieceCategory(pieceId)
    const canvasRect = canvas.getBoundingClientRect()
    const current = pieceAdjustments[pieceId] || getDefaultAdjustment(category)
    const centerX = canvasRect.left + (canvasRect.width * (current.x ?? 50)) / 100
    const centerY = canvasRect.top + (canvasRect.height * (current.y ?? 50)) / 100
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI)

    interactionRef.current = {
      pieceId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startAdjustment: current,
      canvasRect,
      centerX,
      centerY,
      startAngle,
    }

    setActivePieceId(pieceId)
  }

  useEffect(() => {
    const handlePointerMove = (event) => {
      const interaction = interactionRef.current
      if (!interaction) return

      const { pieceId, mode, startX, startY, startAdjustment, canvasRect, centerX, centerY, startAngle } = interaction
      const dx = ((event.clientX - startX) / canvasRect.width) * 100
      const dy = ((event.clientY - startY) / canvasRect.height) * 100

      setPieceAdjustments((prev) => {
        const current = prev[pieceId] || startAdjustment

        if (mode === 'move') {
          let nextX = clamp((startAdjustment.x ?? 50) + dx, 4, 96)
          let nextY = clamp((startAdjustment.y ?? 50) + dy, 4, 96)

          if (snapToGuides) {
            if (Math.abs(nextX - 50) <= 1.5) nextX = 50
            if (Math.abs(nextY - 50) <= 1.5) nextY = 50
          }

          return {
            ...prev,
            [pieceId]: {
              ...current,
              x: nextX,
              y: nextY,
            },
          }
        }

        if (mode === 'rotate') {
          const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI)
          return {
            ...prev,
            [pieceId]: {
              ...current,
              rotation: (startAdjustment.rotation ?? 0) + (angle - startAngle),
            },
          }
        }

        return {
          ...prev,
          [pieceId]: {
            ...current,
            size: clamp((startAdjustment.size ?? 30) + dx, 8, 90),
          },
        }
      })
    }

    const stopInteraction = () => {
      interactionRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopInteraction)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopInteraction)
    }
  }, [snapToGuides])

  const handleSaveOutfit = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    if (!outfitName.trim()) {
      setSaveError('Donne un nom a la tenue.')
      return
    }

    if (!selectedPayload.length) {
      setSaveError('Ajoute au moins une piece sur le canvas.')
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const isEditing = Boolean(editingOutfitId)
      const res = await apiFetch(isEditing ? `/api/outfits/${editingOutfitId}` : '/api/outfits', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: outfitName.trim(),
          status: outfitStatus,
          isFavorite: outfitIsFavorite,
          items: selectedPayload,
        }),
      })

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Erreur enregistrement tenue'))
      }

      const saved = await res.json()
      setOutfits((prev) => {
        if (editingOutfitId) return prev.map((entry) => (entry._id === saved._id ? saved : entry))
        return [saved, ...prev]
      })
      setOutfitName(saved.name || '')
      setOutfitStatus(saved.status || 'active')
      setOutfitIsFavorite(Boolean(saved.isFavorite))
      setEditingOutfitId(saved._id || '')
      toast.success(editingOutfitId ? 'Tenue mise à jour.' : 'Tenue enregistrée.')
    } catch (err) {
      setSaveError(err.message || 'Erreur enregistrement tenue')
      toast.error(err.message || 'Erreur enregistrement tenue')
    } finally {
      setSaving(false)
    }
  }

  const renderFilterDropdown = (label, options, selectedValues, setter) => (
    <details className="tenues-filter-dropdown" open={selectedValues.length > 0}>
      <summary>
        <span>{label}</span>
        <span className="chip">{selectedValues.length || '0'}</span>
      </summary>
      <div className="chips">
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const text = typeof option === 'string' ? option : option.label

          return (
            <label className="chip" key={`${label}-${value}`}>
              <input type="checkbox" checked={selectedValues.includes(value)} onChange={() => toggleInList(value, selectedValues, setter)} />
              {text}
            </label>
          )
        })}
      </div>
    </details>
  )

  const filtersPanel = (
    <div className="panel tenues-subpanel tenues-filters-panel">
      <div className="section-title">
        <h3>Filtres</h3>
        <div className="muted">{loading ? 'Chargement...' : `${filteredItems.length} vêtement(s) disponibles pour composer`}</div>
      </div>

      <div className="tenues-filters-grid">
        {renderFilterDropdown('Occasions', availableOccasions, selectedOccasions, setSelectedOccasions)}
        {renderFilterDropdown('Couleurs', availableColors, selectedColors, setSelectedColors)}
        {renderFilterDropdown('Saisons', availableSeasons, selectedSeasons, setSelectedSeasons)}
        {renderFilterDropdown('Météo', availableWeatherTags, selectedWeatherTags, setSelectedWeatherTags)}
      </div>

      <div className="row">
        <button className="btn" type="button" onClick={resetFilters}>Reset filtres</button>
      </div>

      {error ? <div className="muted" style={{ color: '#b00020' }}>{error}</div> : null}
    </div>
  )

  const selectorsPanel = (
    <div className="panel" id="selectors">
      <div className="section-title">
        <h3>Sélections par catégorie</h3>
        <div className="muted">Chaque catégorie peut alimenter la pièce principale et une copie sur le canvas.</div>
      </div>

      <div className="selector-carousel-head">
        <button className="btn small ghost selector-nav-btn" type="button" onClick={() => moveSelectorCategory(-1)} aria-label="Catégorie précédente">
          &lt;
        </button>
        <div className="selector-carousel-meta">
          <strong>{labels[selectorCategory] || selectorCategory}</strong>
          <span className="muted">{selectorCategoryIndex + 1}/{selectorCategories.length} · {selectorItems.length} option(s)</span>
        </div>
        <button className="btn small ghost selector-nav-btn" type="button" onClick={() => moveSelectorCategory(1)} aria-label="Catégorie suivante">
          &gt;
        </button>
      </div>

      <div className="selector-grid selector-grid-single">
        <div className="selector-card" key={selectorCategory}>
          <div className="selector-preview">
            {selectorCurrentItem && selectorCurrentSrc ? (
              <img src={selectorCurrentSrc} alt={selectorCurrentItem.title || selectorCategory} />
            ) : (
              <div className="selector-empty">Aucune pièce</div>
            )}
          </div>

          <div className="muted selector-title">{selectorCurrentItem ? selectorCurrentItem.title || 'Sans nom' : 'Aucune sélection'}</div>

          <div className="chips">
            {selectorIsOnCanvas ? <span className="chip">Piece active</span> : null}
            {selectorHasDuplicate ? <span className="chip">Copie sur canvas</span> : null}
            {!selectorIsOnCanvas && !isDefaultCanvasCategory(selectorCategory) ? <span className="chip">Ajout manuel</span> : null}
          </div>

          <div className="row">
            <button
              className="btn small"
              type="button"
              onClick={() => cycleItem(selectorCategory, 0)}
              disabled={!selectorCurrentItem || selectorIsOnCanvas}
            >
              Ajouter
            </button>
            <button className="btn small" type="button" onClick={() => setActivePieceId(makePieceId(selectorCategory))} disabled={!selectorIsOnCanvas}>Ajuster</button>
            <button className="btn small" type="button" onClick={() => cycleItem(selectorCategory, -1)} disabled={selectorItems.length < 2}>Prec.</button>
            <button className="btn small" type="button" onClick={() => cycleItem(selectorCategory, 1)} disabled={selectorItems.length < 2}>Suiv.</button>
            <button className="btn small" type="button" onClick={() => duplicatePiece(makePieceId(selectorCategory))} disabled={!selectorIsOnCanvas || selectorHasDuplicate}>Dupliquer</button>
            <button className="btn small" type="button" onClick={() => clearPiece(makePieceId(selectorCategory))} disabled={!selectorIsOnCanvas}>Vider</button>
          </div>
        </div>
      </div>
    </div>
  )

  const sidebarContent = (
    <>
      {filtersPanel}

      <div className="panel tenues-subpanel">
        <h3>Resume</h3>
        <div className="stat-bars">
          <div className="stat-bar-row">
            <div className="stat-bar-head">
              <span>Calques sur le canvas</span>
              <strong>{selectedEntries.length}</strong>
            </div>
          </div>
          <div className="stat-bar-row">
            <div className="stat-bar-head">
              <span>Budget tenue</span>
              <strong>{totalLookPrice ? `${totalLookPrice.toFixed(2)} EUR` : '0.00 EUR'}</strong>
            </div>
          </div>
        </div>

        <div className="look-summary">
          {selectedEntries.length ? selectedEntries.map((entry) => (
            <div className="look-summary-item" key={entry.pieceId}>
              <strong>{entry.item.title || labels[entry.category] || entry.category}</strong>
              <span className="muted">{labels[entry.category] || entry.category}{entry.variant === 'copy' ? ' Â· Copie' : ''}</span>
            </div>
          )) : <div className="muted">Choisis des pieces pour remplir le canvas.</div>}
        </div>
      </div>

      <div className="panel tenues-subpanel">
        <h3>Outils canvas</h3>
        <div className="adjust-panel">
          <label className="chip chip-toggle">
            <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} />
            Guides centraux
          </label>
          <label className="chip chip-toggle">
            <input type="checkbox" checked={snapToGuides} onChange={(event) => setSnapToGuides(event.target.checked)} />
            Alignement magnetique
          </label>
          <div className="row">
            <button className="btn small" type="button" onClick={() => setCanvasZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.7, 1.6))}>Zoom -</button>
            <button className="btn small" type="button" onClick={() => setCanvasZoom(1)}>Reset zoom</button>
            <button className="btn small" type="button" onClick={() => setCanvasZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.7, 1.6))}>Zoom +</button>
          </div>
          <div className="muted">Zoom: {Math.round(canvasZoom * 100)}%</div>
          <button className="btn" type="button" onClick={resetCanvasEditor}>Reset global du canvas</button>
        </div>
      </div>

      <div className="panel tenues-subpanel">
        <h3>Ajuster la piece active</h3>
        {activeEntry ? (
          <div className="adjust-panel">
            <div className="look-summary-item">
              <strong>{activeEntry.item.title || labels[activeEntry.category] || activeEntry.category}</strong>
              <span className="muted">{labels[activeEntry.category] || activeEntry.category}{activeEntry.variant === 'copy' ? ' Â· Copie' : ''}</span>
            </div>
            <div className="chips">
              <span className="chip">{lockedPieces[activeEntry.pieceId] ? 'Verrouillee' : 'Modifiable'}</span>
              <span className="chip">Calque {pieceAdjustments[activeEntry.pieceId]?.zIndex || 1}</span>
              <span className="chip">Rotation {Math.round(pieceAdjustments[activeEntry.pieceId]?.rotation || 0)}Â°</span>
            </div>
            <div className="muted">Glisse la piece sur le canvas pour la deplacer, la tourner ou la redimensionner.</div>
            <div className="row">
              <button className="btn small" type="button" onClick={() => shiftPieceLayer(activeEntry.pieceId, -1)}>Arriere</button>
              <button className="btn small" type="button" onClick={() => shiftPieceLayer(activeEntry.pieceId, 1)}>Avant</button>
              <button className={`btn small ${lockedPieces[activeEntry.pieceId] ? 'primary' : 'ghost'}`} type="button" onClick={() => togglePieceLock(activeEntry.pieceId)}>
                {lockedPieces[activeEntry.pieceId] ? 'Deverrouiller' : 'Verrouiller'}
              </button>
              <button
                className="btn small"
                type="button"
                onClick={() => duplicatePiece(activeEntry.pieceId)}
                disabled={activeEntry.variant === 'copy' || (duplicateSelection[activeEntry.category] != null && duplicateSelection[activeEntry.category] !== -1)}
              >
                Dupliquer
              </button>
            </div>
            <button className="btn" type="button" onClick={() => resetAdjustment(activeEntry.pieceId)}>Reinitialiser cette piece</button>
            <button className="btn small danger" type="button" onClick={() => clearPiece(activeEntry.pieceId)}>Retirer du canvas</button>
          </div>
        ) : (
          <div className="muted">Clique une piece du canvas ou une carte de selection pour activer les outils avances.</div>
        )}
      </div>
    </>
  )

  return (
    <Layout title="Tenues">
      <div className="panel">
        <h2 id="creator">Composer une tenue</h2>
        <div className="desktop-only" style={{ marginBottom: '12px' }}>
          {filtersPanel}
        </div>

        <div className="mobile-toolbar-summary mobile-only" style={{ marginBottom: '10px' }}>
          <button className="btn" type="button" onClick={() => setShowMobileSidebar(true)}>
            {mobileComposerFilterCount ? `Filtres (${mobileComposerFilterCount})` : 'Filtres'}
          </button>
          <span className="chip">{selectedEntries.length} piece(s)</span>
          {activeEntry ? <span className="chip">{labels[activeEntry.category] || activeEntry.category}</span> : null}
        </div>

        {showMobileSidebar ? (
          <div className="mobile-drawer-backdrop mobile-only" onClick={() => setShowMobileSidebar(false)}>
            <div className="mobile-drawer mobile-drawer-wide" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-drawer-header">
                <div>
                  <strong>Filtres</strong>
                  <div className="muted">{filteredItems.length} piece(s) filtrable(s)</div>
                </div>
                <button className="btn small ghost" type="button" onClick={() => setShowMobileSidebar(false)}>
                  Fermer
                </button>
              </div>
              <div className="mobile-drawer-body tenues-sidebar">
                {sidebarContent}
              </div>
              <div className="mobile-drawer-actions">
                <button className="btn small ghost" type="button" onClick={resetFilters}>
                  Reset filtres
                </button>
                <button className="btn" type="button" onClick={() => setShowMobileSidebar(false)}>
                  Retour au canvas
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="tenues-shell">
          <aside className="tenues-sidebar desktop-only">
            <div className="panel tenues-subpanel">
              <h3>Filtres</h3>

              <div className="field">
                <label>Occasions</label>
                <div className="chips">
                  {availableOccasions.map((occasion) => (
                    <label className="chip" key={occasion}>
                      <input type="checkbox" checked={selectedOccasions.includes(occasion)} onChange={() => toggleInList(occasion, selectedOccasions, setSelectedOccasions)} />
                      {occasion}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Couleurs</label>
                <div className="chips">
                  {availableColors.map((color) => (
                    <label className="chip" key={color}>
                      <input type="checkbox" checked={selectedColors.includes(color)} onChange={() => toggleInList(color, selectedColors, setSelectedColors)} />
                      {color}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Saisons</label>
                <div className="chips">
                  {availableSeasons.map((season) => (
                    <label className="chip" key={season}>
                      <input type="checkbox" checked={selectedSeasons.includes(season)} onChange={() => toggleInList(season, selectedSeasons, setSelectedSeasons)} />
                      {season}
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Météo</label>
                <div className="chips">
                  {availableWeatherTags.map((value) => (
                    <label className="chip" key={value}>
                      <input type="checkbox" checked={selectedWeatherTags.includes(value)} onChange={() => toggleInList(value, selectedWeatherTags, setSelectedWeatherTags)} />
                      {value}
                    </label>
                  ))}
                </div>
              </div>

              <div className="row">
                <button className="btn" type="button" onClick={resetFilters}>Reset filtres</button>
              </div>

              <div className="muted">{loading ? 'Chargement...' : `${filteredItems.length} vêtement(s) disponibles pour composer`}</div>
              {error ? <div className="muted" style={{ color: '#b00020' }}>{error}</div> : null}
            </div>

            <div className="panel tenues-subpanel">
              <h3>Resume</h3>
              <div className="stat-bars">
                <div className="stat-bar-row">
                  <div className="stat-bar-head">
                    <span>Calques sur le canvas</span>
                    <strong>{selectedEntries.length}</strong>
                  </div>
                </div>
                <div className="stat-bar-row">
                  <div className="stat-bar-head">
                    <span>Budget tenue</span>
                    <strong>{totalLookPrice ? `${totalLookPrice.toFixed(2)} EUR` : '0.00 EUR'}</strong>
                  </div>
                </div>
              </div>

              <div className="look-summary">
                {selectedEntries.length ? selectedEntries.map((entry) => (
                  <div className="look-summary-item" key={entry.pieceId}>
                    <strong>{entry.item.title || labels[entry.category] || entry.category}</strong>
                    <span className="muted">{labels[entry.category] || entry.category}{entry.variant === 'copy' ? ' · Copie' : ''}</span>
                  </div>
                )) : <div className="muted">Choisis des pieces pour remplir le canvas.</div>}
              </div>
            </div>

            <div className="panel tenues-subpanel">
              <h3>Outils canvas</h3>
              <div className="adjust-panel">
                <label className="chip chip-toggle">
                  <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} />
                  Guides centraux
                </label>
                <label className="chip chip-toggle">
                  <input type="checkbox" checked={snapToGuides} onChange={(event) => setSnapToGuides(event.target.checked)} />
                  Alignement magnetique
                </label>
                <div className="row">
                  <button className="btn small" type="button" onClick={() => setCanvasZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.7, 1.6))}>Zoom -</button>
                  <button className="btn small" type="button" onClick={() => setCanvasZoom(1)}>Reset zoom</button>
                  <button className="btn small" type="button" onClick={() => setCanvasZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.7, 1.6))}>Zoom +</button>
                </div>
                <div className="muted">Zoom: {Math.round(canvasZoom * 100)}%</div>
                <button className="btn" type="button" onClick={resetCanvasEditor}>Reset global du canvas</button>
              </div>
            </div>

            <div className="panel tenues-subpanel">
              <h3>Ajuster la piece active</h3>
              {activeEntry ? (
                <div className="adjust-panel">
                  <div className="look-summary-item">
                    <strong>{activeEntry.item.title || labels[activeEntry.category] || activeEntry.category}</strong>
                    <span className="muted">{labels[activeEntry.category] || activeEntry.category}{activeEntry.variant === 'copy' ? ' · Copie' : ''}</span>
                  </div>
                  <div className="chips">
                    <span className="chip">{lockedPieces[activeEntry.pieceId] ? 'Verrouillee' : 'Modifiable'}</span>
                    <span className="chip">Calque {pieceAdjustments[activeEntry.pieceId]?.zIndex || 1}</span>
                    <span className="chip">Rotation {Math.round(pieceAdjustments[activeEntry.pieceId]?.rotation || 0)}°</span>
                  </div>
                  <div className="muted">Glisse la piece sur le canvas pour la deplacer, la tourner ou la redimensionner.</div>
                  <div className="row">
                    <button className="btn small" type="button" onClick={() => shiftPieceLayer(activeEntry.pieceId, -1)}>Arriere</button>
                    <button className="btn small" type="button" onClick={() => shiftPieceLayer(activeEntry.pieceId, 1)}>Avant</button>
                    <button className={`btn small ${lockedPieces[activeEntry.pieceId] ? 'primary' : 'ghost'}`} type="button" onClick={() => togglePieceLock(activeEntry.pieceId)}>
                      {lockedPieces[activeEntry.pieceId] ? 'Deverrouiller' : 'Verrouiller'}
                    </button>
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => duplicatePiece(activeEntry.pieceId)}
                      disabled={activeEntry.variant === 'copy' || (duplicateSelection[activeEntry.category] != null && duplicateSelection[activeEntry.category] !== -1)}
                    >
                      Dupliquer
                    </button>
                  </div>
                  <button className="btn" type="button" onClick={() => resetAdjustment(activeEntry.pieceId)}>Reinitialiser cette piece</button>
                  <button className="btn small danger" type="button" onClick={() => clearPiece(activeEntry.pieceId)}>Retirer du canvas</button>
                </div>
              ) : (
                <div className="muted">Clique une piece du canvas ou une carte de selection pour activer les outils avances.</div>
              )}
            </div>
          </aside>

          <section className="tenues-main">
            <div className="canvas-panel">
              <div className="canvas-toolbar">
                <div className="canvas-toolbar-group">
                  <button className="btn primary" type="button" onClick={randomizeLook} disabled={!filteredItems.length}>
                    Generer
                  </button>
                </div>
              </div>

              <div className="outfit-canvas-viewport">
                <div className={`outfit-canvas ${showGuides ? 'show-guides' : ''}`} ref={canvasRef} style={{ '--canvas-zoom': canvasZoom }}>
                  <div className="canvas-paper" />
                  <div className="canvas-grid" />
                  {showGuides ? (
                    <div className="canvas-guides" aria-hidden="true">
                      <span className={`canvas-guide vertical ${activeGuides.vertical ? 'is-active' : ''}`} />
                      <span className={`canvas-guide horizontal ${activeGuides.horizontal ? 'is-active' : ''}`} />
                    </div>
                  ) : null}
                  {selectedEntries.length ? selectedEntries.map(({ pieceId, category, item, variant }) => {
                    const slot = pieceAdjustments[pieceId] || getDefaultAdjustment(category)
                    const src = buildAssetUrl(item.imageUrl || item.cutoutUrl || item.originalUrl)
                    if (!src) return null

                    return (
                      <button
                        key={pieceId}
                        className={`canvas-piece-button ${activePieceId === pieceId ? 'is-active' : ''} ${lockedPieces[pieceId] ? 'is-locked' : ''}`}
                        type="button"
                        onClick={() => setActivePieceId(pieceId)}
                        onDoubleClick={() => clearPiece(pieceId)}
                        onPointerDown={(event) => startInteraction(event, pieceId, 'move')}
                        style={{ top: `${slot.y}%`, left: `${slot.x}%`, width: `${slot.size}%`, zIndex: slot.zIndex ?? 1 }}
                      >
                        <img className={`canvas-piece piece-${category}`} src={src} alt={item.title || item.category} style={{ '--piece-rotation': `${slot.rotation ?? 0}deg` }} />
                        <span className="canvas-piece-tag">{variant === 'copy' ? 'Copie' : labels[category] || category}</span>
                        <span className="canvas-rotate-handle" onPointerDown={(event) => startInteraction(event, pieceId, 'rotate')} />
                        <span className="canvas-resize-handle" onPointerDown={(event) => startInteraction(event, pieceId, 'resize')} />
                      </button>
                    )
                  }) : (
                    <div className="canvas-empty">
                      <strong>Le canvas est vide</strong>
                      <span>Sélectionne des vêtements dans les cartes ci-dessous.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {selectorsPanel}
          </section>
        </div>
      </div>

      <div className="panel" id="outfits" style={{ marginTop: '12px' }}>
        <div className="row">
          <h2>Mes tenues</h2>
          <div className="muted">{outfits.length} tenue(s) sauvegardée(s)</div>
        </div>
        {editingOutfitId ? (
          <div className="row" style={{ marginBottom: '10px' }}>
            <span className="chip">Mode modification</span>
            <span className="muted">Tu modifies la tenue enregistrée "{outfitName || 'Sans nom'}".</span>
            <button className="btn small" type="button" onClick={resetComposer}>Quitter la modification</button>
          </div>
        ) : null}
        <div className="row" style={{ marginBottom: '10px' }}>
          <input type="text" placeholder="Nom de la tenue" value={outfitName} onChange={(event) => setOutfitName(event.target.value)} style={{ maxWidth: '280px' }} />
          <select value={outfitStatus} onChange={(event) => setOutfitStatus(event.target.value)} style={{ maxWidth: '180px' }}>
            {outfitStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="chip chip-toggle">
            <input type="checkbox" checked={outfitIsFavorite} onChange={(event) => setOutfitIsFavorite(event.target.checked)} />
            Favori
          </label>
          <button className="btn primary" type="button" onClick={handleSaveOutfit} disabled={saving}>
            {saving ? 'Enregistrement...' : editingOutfitId ? 'Mettre ? jour la tenue' : 'Enregistrer la tenue'}
          </button>
        </div>
        {saveError ? <div className="muted" style={{ color: '#b00020' }}>{saveError}</div> : null}
        <div className="saved-outfit-grid" id="outfits-list">
          {outfits.length ? outfits.slice(0, 3).map((outfit) => (
            <div className="saved-outfit-card" key={outfit._id}>
              <OutfitCanvasPreview items={outfit.items} className="saved-outfit-canvas-small" />
              <div className="saved-outfit-meta">
                <strong>{outfit.name}</strong>
                <div className="chips">
                  <span className={`chip outfit-status-chip ${outfit.status || 'active'}`}>
                    {outfitStatusOptions.find((option) => option.value === (outfit.status || 'active'))?.label || 'Active'}
                  </span>
                  {outfit.isFavorite ? <span className="chip">Favori</span> : null}
                  <span className="chip">{Number(outfit.wearCount || 0)} port(s)</span>
                </div>
                <div className="muted">{Array.isArray(outfit.items) ? outfit.items.length : 0} piece(s)</div>
              </div>
              <div className="row">
                <button className="btn small" type="button" onClick={() => loadOutfitIntoEditor(outfit)}>Modifier</button>
              </div>
            </div>
          )) : (
            <div className="muted">Aucune tenue enregistrée pour le moment.</div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default Tenues
