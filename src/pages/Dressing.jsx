import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { buildApiUrl, buildAssetUrl } from '../config/api'
import { useToast } from '../context/ToastContext'
import PaginationControls from '../components/PaginationControls'
import { getPhotoWarnings, prepareImageForUpload } from '../utils/imagePreparation'

const categories = ['top', 'bottom', 'dress', 'shoes', 'outer', 'accessory', 'bag', 'hat']
const colors = ['blanc', 'noir', 'beige', 'bleu', 'rouge', 'vert', 'rose', 'jaune', 'marron', 'gris', 'violet', 'orange', 'dore', 'argente', 'multi']
const origins = ['neuf', 'seconde main', 'cadeau', 'location', 'autre']
const occasionsOptions = ['casual', 'travail', 'soiree', 'sport', 'ceremonie', 'vacances']
const seasonOptions = ['printemps', 'ete', 'automne', 'hiver']
const weatherOptions = ['froid', 'doux', 'chaud', 'pluie', 'beau temps']
const conditionOptions = [
  { value: 'perfect', label: 'Parfait etat' },
  { value: 'good', label: 'Bon etat' },
  { value: 'bad', label: 'Mauvais etat' },
]
const defaultBrandSuggestions = ['Zara', 'H&M', 'Mango', 'Uniqlo', 'Nike', 'Adidas', 'Vinted']
const defaultMaterialSuggestions = ['Coton', 'Jean', 'Laine', 'Lin', 'Polyester', 'Cuir']
const defaultSizeSuggestions = ['XS', 'S', 'M', 'L', 'XL', '34', '36', '38', '40', '42', 'Unique']

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const toTitleCase = (value) => normalizeWhitespace(value).toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
const buildSuggestionList = (defaults, values) => [...new Set([...defaults, ...values.filter(Boolean)])].sort((a, b) => a.localeCompare(b))

const createEmptyForm = () => ({
  title: '',
  category: categories[0],
  color: colors[0],
  secondaryColor: '',
  condition: 'good',
  brand: '',
  price: '',
  purchaseDate: '',
  purchaseLocation: '',
  origin: origins[0],
  size: '',
  material: '',
  occasions: [],
  seasons: [],
  weatherTags: [],
  notes: '',
})

const mapGarmentToForm = (garment) => ({
  title: garment?.title || '',
  category: garment?.category || categories[0],
  color: garment?.color || colors[0],
  secondaryColor: garment?.secondaryColor || '',
  condition: garment?.condition || 'good',
  brand: toTitleCase(garment?.brand || ''),
  price: garment?.price == null ? '' : String(garment.price),
  purchaseDate: garment?.purchaseDate ? String(garment.purchaseDate).slice(0, 10) : '',
  purchaseLocation: toTitleCase(garment?.purchaseLocation || ''),
  origin: garment?.origin || origins[0],
  size: normalizeWhitespace(garment?.size || ''),
  material: toTitleCase(garment?.material || ''),
  occasions: Array.isArray(garment?.occasions) ? garment.occasions.filter((value) => occasionsOptions.includes(value)) : [],
  seasons: Array.isArray(garment?.seasons) ? garment.seasons.filter((value) => seasonOptions.includes(value)) : [],
  weatherTags: Array.isArray(garment?.weatherTags) ? garment.weatherTags.filter((value) => weatherOptions.includes(value)) : [],
  notes: garment?.notes || '',
})

const formatPrice = (value) => {
  if (value == null || value === '') return ''
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''
  return `${amount.toFixed(2)} EUR`
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString()
}

const conditionLabels = {
  perfect: 'Parfait etat',
  good: 'Bon etat',
  bad: 'Mauvais etat',
}

function Dressing() {
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [reprocessingId, setReprocessingId] = useState('')
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [editError, setEditError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [preparingImage, setPreparingImage] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('')
  const [laundryFilter, setLaundryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [form, setForm] = useState(createEmptyForm)
  const [sourceFile, setSourceFile] = useState(null)
  const [preparedUpload, setPreparedUpload] = useState(null)
  const [photoAdjustments, setPhotoAdjustments] = useState({
    rotation: 0,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    quality: 0.82,
  })
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState(createEmptyForm)
  const [editSourceFile, setEditSourceFile] = useState(null)
  const [editPreparedUpload, setEditPreparedUpload] = useState(null)
  const [editPreparingImage, setEditPreparingImage] = useState(false)
  const [replacingImage, setReplacingImage] = useState(false)
  const [editPhotoAdjustments, setEditPhotoAdjustments] = useState({
    rotation: 0,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    quality: 0.82,
  })
  const sourcePreviewUrl = useMemo(() => (sourceFile ? URL.createObjectURL(sourceFile) : ''), [sourceFile])
  const editSourcePreviewUrl = useMemo(() => (editSourceFile ? URL.createObjectURL(editSourceFile) : ''), [editSourceFile])

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl)
    }
  }, [sourcePreviewUrl])

  useEffect(() => {
    return () => {
      if (editSourcePreviewUrl) URL.revokeObjectURL(editSourcePreviewUrl)
    }
  }, [editSourcePreviewUrl])

  useEffect(() => {
    return () => {
      if (preparedUpload?.previewUrl) {
        URL.revokeObjectURL(preparedUpload.previewUrl)
      }
    }
  }, [preparedUpload])

  useEffect(() => {
    return () => {
      if (editPreparedUpload?.previewUrl) {
        URL.revokeObjectURL(editPreparedUpload.previewUrl)
      }
    }
  }, [editPreparedUpload])

  useEffect(() => {
    if (!editingItem) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setEditingItem(null)
        setEditError('')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingItem])

  const fetchItems = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setPageError('')

    try {
      const res = await fetch(buildApiUrl('/api/garments'), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || 'Erreur chargement dressing')
      }

      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setPageError(err.message || 'Erreur chargement dressing')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const brandSuggestions = useMemo(
    () => buildSuggestionList(defaultBrandSuggestions, items.map((item) => toTitleCase(item.brand || ''))),
    [items]
  )

  const materialSuggestions = useMemo(
    () => buildSuggestionList(defaultMaterialSuggestions, items.map((item) => toTitleCase(item.material || ''))),
    [items]
  )

  const sizeSuggestions = useMemo(
    () => buildSuggestionList(defaultSizeSuggestions, items.map((item) => normalizeWhitespace(item.size || ''))),
    [items]
  )

  const purchaseLocationSuggestions = useMemo(
    () => buildSuggestionList([], items.map((item) => toTitleCase(item.purchaseLocation || ''))),
    [items]
  )
  const availableBrandFilters = useMemo(
    () => [...new Set(items.map((item) => toTitleCase(item.brand || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [items]
  )
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let cancelled = false

    const buildPreparedUpload = async () => {
      if (!sourceFile) {
        setPreparedUpload((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
          return null
        })
        return
      }

      setPreparingImage(true)

      try {
        const nextPreparedUpload = await prepareImageForUpload(sourceFile, photoAdjustments)

        if (cancelled) {
          if (nextPreparedUpload.previewUrl) URL.revokeObjectURL(nextPreparedUpload.previewUrl)
          return
        }

        setPreparedUpload((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
          return nextPreparedUpload
        })
      } catch (err) {
        if (!cancelled) {
          setFormError(err.message || 'Erreur preparation image')
        }
      } finally {
        if (!cancelled) {
          setPreparingImage(false)
        }
      }
    }

    buildPreparedUpload()

    return () => {
      cancelled = true
    }
  }, [photoAdjustments, sourceFile])

  useEffect(() => {
    let cancelled = false

    const buildPreparedEditUpload = async () => {
      if (!editSourceFile) {
        setEditPreparedUpload((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
          return null
        })
        return
      }

      setEditPreparingImage(true)

      try {
        const nextPreparedUpload = await prepareImageForUpload(editSourceFile, editPhotoAdjustments)

        if (cancelled) {
          if (nextPreparedUpload.previewUrl) URL.revokeObjectURL(nextPreparedUpload.previewUrl)
          return
        }

        setEditPreparedUpload((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
          return nextPreparedUpload
        })
      } catch (err) {
        if (!cancelled) {
          setEditError(err.message || 'Erreur preparation image')
        }
      } finally {
        if (!cancelled) {
          setEditPreparingImage(false)
        }
      }
    }

    buildPreparedEditUpload()

    return () => {
      cancelled = true
    }
  }, [editPhotoAdjustments, editSourceFile])

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    const filtered = items.filter((item) => {
      const matchesQuery = !query || [
        item.title,
        item.brand,
        item.category,
        item.color,
        item.secondaryColor,
        item.purchaseLocation,
        item.material,
        ...(Array.isArray(item.seasons) ? item.seasons : []),
        ...(Array.isArray(item.weatherTags) ? item.weatherTags : []),
      ].some((value) => String(value || '').toLowerCase().includes(query))
      const matchesCategory = !categoryFilter || item.category === categoryFilter
      const matchesColor = !colorFilter || item.color === colorFilter || item.secondaryColor === colorFilter
      const matchesBrand = !brandFilter || toTitleCase(item.brand || '') === brandFilter
      const itemSeasons = Array.isArray(item.seasons) ? item.seasons : []
      const matchesSeason = !seasonFilter || itemSeasons.includes(seasonFilter)
      const matchesLaundry = !laundryFilter || (item.laundryStatus || 'clean') === laundryFilter
      return matchesQuery && matchesCategory && matchesColor && matchesBrand && matchesSeason && matchesLaundry
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.title || '').localeCompare(String(b.title || ''), 'fr')
      }

      if (sortBy === 'price') {
        return Number(b.price || 0) - Number(a.price || 0)
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
  }, [items, deferredSearch, categoryFilter, colorFilter, brandFilter, seasonFilter, laundryFilter, sortBy])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, categoryFilter, colorFilter, brandFilter, seasonFilter, laundryFilter, sortBy])

  const resetWardrobeFilters = () => {
    setSearch('')
    setCategoryFilter('')
    setColorFilter('')
    setBrandFilter('')
    setSeasonFilter('')
    setLaundryFilter('')
    setSortBy('recent')
    setPage(1)
  }

  const mobileWardrobeFilterCount = [
    search.trim(),
    categoryFilter,
    colorFilter,
    brandFilter,
    seasonFilter,
    laundryFilter,
    sortBy !== 'recent' ? sortBy : '',
  ].filter(Boolean).length

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const visibleItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredItems.slice(startIndex, startIndex + pageSize)
  }, [currentPage, filteredItems, pageSize])

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const updatePhotoAdjustment = (field, value) => {
    setPhotoAdjustments((prev) => ({ ...prev, [field]: value }))
  }

  const updateEditPhotoAdjustment = (field, value) => {
    setEditPhotoAdjustments((prev) => ({ ...prev, [field]: value }))
  }

  const toggleOccasion = (value, currentValue, setter) => {
    const next = currentValue.includes(value)
      ? currentValue.filter((item) => item !== value)
      : [...currentValue, value]

    setter(next)
  }

  const resetCreateForm = () => {
    setForm(createEmptyForm())
    setSourceFile(null)
    setPreparedUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
    setPhotoAdjustments({
      rotation: 0,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      quality: 0.82,
    })
    setFormError('')
  }

  const resetEditPhotoState = () => {
    setEditSourceFile(null)
    setEditPreparedUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
    setEditPhotoAdjustments({
      rotation: 0,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      quality: 0.82,
    })
    setEditPreparingImage(false)
    setReplacingImage(false)
  }

  const openEditor = (item) => {
    setEditingItem(item)
    setEditForm(mapGarmentToForm(item))
    resetEditPhotoState()
    setEditError('')
  }

  const closeEditor = () => {
    setEditingItem(null)
    setEditError('')
    setReprocessingId('')
    resetEditPhotoState()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('token')

    if (!token) {
      setFormError('Connecte-toi pour ajouter un vetement.')
      return
    }

    if (!sourceFile) {
      setFormError('Choisis une image.')
      return
    }

    setUploading(true)
    setFormError('')

    try {
      const payload = new FormData()
      payload.append('image', preparedUpload?.file || sourceFile)
      payload.append('title', form.title.trim())
      payload.append('category', form.category)
      payload.append('color', form.color)
      payload.append('secondaryColor', form.secondaryColor)
      payload.append('condition', form.condition)
      payload.append('brand', form.brand.trim())
      payload.append('price', form.price)
      payload.append('purchaseDate', form.purchaseDate)
      payload.append('purchaseLocation', form.purchaseLocation.trim())
      payload.append('origin', form.origin)
      payload.append('size', form.size.trim())
      payload.append('material', form.material.trim())
      payload.append('notes', form.notes.trim())
      payload.append('occasions', JSON.stringify(form.occasions))
      payload.append('seasons', JSON.stringify(form.seasons))
      payload.append('weatherTags', JSON.stringify(form.weatherTags))
      payload.append('uploadMeta', JSON.stringify({
        analysis: preparedUpload?.analysis || null,
        adjustments: preparedUpload?.adjustments || photoAdjustments,
        originalSize: preparedUpload?.originalSize || Number(sourceFile.size || 0),
        compressedSize: preparedUpload?.compressedSize || Number(sourceFile.size || 0),
        width: preparedUpload?.width || null,
        height: preparedUpload?.height || null,
        warnings: getPhotoWarnings(preparedUpload?.analysis),
      }))

      const res = await fetch(buildApiUrl('/api/garments/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur upload')
      }

      const garment = await res.json()
      setItems((prev) => [garment, ...prev])
      resetCreateForm()
      if (garment.cutoutUrl) {
        toast.success('Vetement ajoute.')
      } else {
        toast.success('Vetement ajoute sans detourage.')
      }
    } catch (err) {
      setFormError(err.message || 'Erreur upload')
      toast.error(err.message || 'Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    const token = localStorage.getItem('token')

    if (!token || !editingItem) {
      setEditError('Session invalide.')
      return
    }

    setSavingEdit(true)
    setEditError('')

    try {
      const res = await fetch(buildApiUrl(`/api/garments/${editingItem._id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur modification')
      }

      const updated = await res.json()
      setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
      setEditingItem(updated)
      setEditForm(mapGarmentToForm(updated))
      toast.success('Vetement mis a jour.')
    } catch (err) {
      setEditError(err.message || 'Erreur modification')
      toast.error(err.message || 'Erreur modification')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    const token = localStorage.getItem('token')

    if (!token || !editingItem) {
      setEditError('Session invalide.')
      return
    }

    if (!window.confirm(`Supprimer "${editingItem.title || 'ce vetement'}" ?`)) {
      return
    }

    setDeletingId(editingItem._id)
    setEditError('')

    try {
      const res = await fetch(buildApiUrl(`/api/garments/${editingItem._id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur suppression')
      }

      setItems((prev) => prev.filter((item) => item._id !== editingItem._id))
      closeEditor()
      toast.success('Vetement supprime.')
    } catch (err) {
      setEditError(err.message || 'Erreur suppression')
      toast.error(err.message || 'Erreur suppression')
    } finally {
      setDeletingId('')
    }
  }

  const applyUpdatedGarment = (updated) => {
    setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
    setEditingItem(updated)
    setEditForm(mapGarmentToForm(updated))
  }

  const handleReplaceImage = async () => {
    const token = localStorage.getItem('token')

    if (!token || !editingItem) {
      setEditError('Session invalide.')
      return
    }

    if (!editSourceFile) {
      setEditError('Choisis une nouvelle image.')
      return
    }

    setReplacingImage(true)
    setEditError('')

    try {
      const payload = new FormData()
      payload.append('image', editPreparedUpload?.file || editSourceFile)
      payload.append(
        'uploadMeta',
        JSON.stringify({
          analysis: editPreparedUpload?.analysis || null,
          adjustments: editPreparedUpload?.adjustments || editPhotoAdjustments,
          originalSize: editPreparedUpload?.originalSize || Number(editSourceFile.size || 0),
          compressedSize: editPreparedUpload?.compressedSize || Number(editSourceFile.size || 0),
          width: editPreparedUpload?.width || null,
          height: editPreparedUpload?.height || null,
          warnings: getPhotoWarnings(editPreparedUpload?.analysis),
        })
      )

      const res = await fetch(buildApiUrl(`/api/garments/${editingItem._id}/replace-image`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur remplacement photo')
      }

      const updated = await res.json()
      applyUpdatedGarment(updated)
      resetEditPhotoState()
      toast.success(updated.cutoutUrl ? 'Photo remplacee et detouree.' : 'Photo remplacee sans detourage.')
    } catch (err) {
      setEditError(err.message || 'Erreur remplacement photo')
      toast.error(err.message || 'Erreur remplacement photo')
    } finally {
      setReplacingImage(false)
    }
  }

  const handleReprocessCutout = async () => {
    const token = localStorage.getItem('token')

    if (!token || !editingItem) {
      setEditError('Session invalide.')
      return
    }

    setReprocessingId(editingItem._id)
    setEditError('')

    try {
      const res = await fetch(buildApiUrl(`/api/garments/${editingItem._id}/reprocess-cutout`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || data.message || 'Erreur detourage')
      }

      const updated = await res.json()
      applyUpdatedGarment(updated)
      toast.success('Detourage relance.')
    } catch (err) {
      setEditError(err.message || 'Erreur detourage')
      toast.error(err.message || 'Erreur detourage')
    } finally {
      setReprocessingId('')
    }
  }

  const renderOccasionChecks = (selected, onToggle) => (
    <div className="chips">
      {occasionsOptions.map((occasion) => (
        <label className="chip" key={occasion}>
          <input
            type="checkbox"
            checked={selected.includes(occasion)}
            onChange={() => onToggle(occasion)}
          />
          {occasion}
        </label>
      ))}
    </div>
  )

  const renderMultiChecks = (options, selected, onToggle) => (
    <div className="chips">
      {options.map((value) => (
        <label className="chip" key={value}>
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={() => onToggle(value)}
          />
          {value}
        </label>
      ))}
    </div>
  )

  const editingSrc = editingItem ? buildAssetUrl(editingItem.imageUrl || editingItem.cutoutUrl || editingItem.originalUrl) : ''
  const isUsingCutout = Boolean(editingItem?.cutoutUrl) && editingItem?.imageUrl === editingItem?.cutoutUrl
  const uploadWarnings = getPhotoWarnings(preparedUpload?.analysis)
  const savedUploadWarnings = getPhotoWarnings(editingItem?.uploadMeta?.analysis)
  const editUploadWarnings = getPhotoWarnings(editPreparedUpload?.analysis)
  const wardrobeFilters = (
    <>
      <input
        type="text"
        placeholder="Rechercher un vetement"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
        <option value="">Toutes les categories</option>
        {categories.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
      <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)}>
        <option value="">Toutes les couleurs</option>
        {colors.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
      <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
        <option value="">Toutes les marques</option>
        {availableBrandFilters.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
      <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
        <option value="">Toutes les saisons</option>
        {seasonOptions.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
      <select value={laundryFilter} onChange={(event) => setLaundryFilter(event.target.value)}>
        <option value="">Tous les etats</option>
        <option value="clean">Propres</option>
        <option value="dirty">A laver</option>
      </select>
      <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
        <option value="recent">Plus recents</option>
        <option value="name">Nom A-Z</option>
        <option value="price">Prix decroissant</option>
      </select>
      <button className="btn small ghost mobile-filter-reset" type="button" onClick={resetWardrobeFilters}>
        Reset filtres
      </button>
    </>
  )

  return (
    <Layout title="Dressing">
      <div className="row" style={{ marginBottom: '10px' }}>
        <a className="chip" href="#add-item">Ajouter</a>
        <a className="chip" href="#my-items">Mes vetements</a>
      </div>

      <div className="panel" id="add-item">
        <h2>Ajouter un vetement</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid cols-2">
              <div className="field">
                <label>Nom</label>
                <input type="text" placeholder="ex: Jean bleu" value={form.title} onChange={(event) => updateFormField('title', event.target.value)} />
              </div>

                <div className="field">
                  <label>Marque</label>
                  <input
                    type="text"
                    list="brand-suggestions"
                    placeholder="ex: Zara"
                    value={form.brand}
                    onChange={(event) => updateFormField('brand', event.target.value)}
                    onBlur={(event) => updateFormField('brand', toTitleCase(event.target.value))}
                  />
                </div>

              <div className="field">
                <label>Categorie</label>
                <select value={form.category} onChange={(event) => updateFormField('category', event.target.value)}>
                  {categories.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Couleur</label>
                <select value={form.color} onChange={(event) => updateFormField('color', event.target.value)}>
                  {colors.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Couleur 2</label>
                <select value={form.secondaryColor} onChange={(event) => updateFormField('secondaryColor', event.target.value)}>
                  <option value="">Aucune</option>
                  {colors.filter((value) => value !== form.color).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Prix</label>
                <input type="number" min="0" step="0.01" placeholder="ex: 49.90" value={form.price} onChange={(event) => updateFormField('price', event.target.value)} />
              </div>

              <div className="field">
                <label>Etat du vetement</label>
                <select value={form.condition} onChange={(event) => updateFormField('condition', event.target.value)}>
                  {conditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Date d'achat</label>
                <input type="date" value={form.purchaseDate} onChange={(event) => updateFormField('purchaseDate', event.target.value)} />
              </div>

                <div className="field">
                  <label>Lieu d'achat</label>
                  <input
                    type="text"
                    list="purchase-location-suggestions"
                    placeholder="ex: Paris / Vinted"
                    value={form.purchaseLocation}
                    onChange={(event) => updateFormField('purchaseLocation', event.target.value)}
                    onBlur={(event) => updateFormField('purchaseLocation', toTitleCase(event.target.value))}
                  />
                </div>

              <div className="field">
                <label>Origine</label>
                <select value={form.origin} onChange={(event) => updateFormField('origin', event.target.value)}>
                  {origins.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

                <div className="field">
                  <label>Taille</label>
                  <input
                    type="text"
                    list="size-suggestions"
                    placeholder="ex: S / 38 / unique"
                    value={form.size}
                    onChange={(event) => updateFormField('size', event.target.value)}
                    onBlur={(event) => updateFormField('size', normalizeWhitespace(event.target.value))}
                  />
                </div>

                <div className="field">
                  <label>Matiere</label>
                  <input
                    type="text"
                    list="material-suggestions"
                    placeholder="ex: coton"
                    value={form.material}
                    onChange={(event) => updateFormField('material', event.target.value)}
                    onBlur={(event) => updateFormField('material', toTitleCase(event.target.value))}
                  />
                </div>

              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Occasions</label>
                {renderOccasionChecks(form.occasions, (occasion) => {
                  toggleOccasion(occasion, form.occasions, (next) => updateFormField('occasions', next))
                })}
              </div>

              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Saisons</label>
                {renderMultiChecks(seasonOptions, form.seasons, (value) => {
                  toggleOccasion(value, form.seasons, (next) => updateFormField('seasons', next))
                })}
              </div>

              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Meteo</label>
                {renderMultiChecks(weatherOptions, form.weatherTags, (value) => {
                  toggleOccasion(value, form.weatherTags, (next) => updateFormField('weatherTags', next))
                })}
              </div>

              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Notes</label>
                <textarea placeholder="Infos utiles pour les stats ou le dressing" value={form.notes} onChange={(event) => updateFormField('notes', event.target.value)} />
              </div>

              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Image du vetement</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setSourceFile(event.target.files?.[0] || null)
                    setFormError('')
                  }}
                />
                {sourcePreviewUrl ? (
                  <div className="upload-prep-card">
                    <div className="upload-prep-preview-grid">
                      <div>
                        <div className="muted upload-prep-label">Originale</div>
                        <div className="thumb upload-prep-thumb">
                          <img src={sourcePreviewUrl} alt="Photo originale" />
                        </div>
                      </div>
                      <div>
                        <div className="muted upload-prep-label">Version preparee</div>
                        <div className="thumb upload-prep-thumb">
                          {preparedUpload?.previewUrl ? <img src={preparedUpload.previewUrl} alt="Photo preparee" /> : null}
                        </div>
                      </div>
                    </div>

                    <div className="upload-prep-controls">
                      <div className="field">
                        <label>Rotation</label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="5"
                          value={photoAdjustments.rotation}
                          onChange={(event) => updatePhotoAdjustment('rotation', Number(event.target.value))}
                        />
                        <div className="muted">{photoAdjustments.rotation} deg</div>
                      </div>
                      <div className="field">
                        <label>Zoom / recadrage</label>
                        <input
                          type="range"
                          min="1"
                          max="2.5"
                          step="0.05"
                          value={photoAdjustments.zoom}
                          onChange={(event) => updatePhotoAdjustment('zoom', Number(event.target.value))}
                        />
                        <div className="muted">{photoAdjustments.zoom.toFixed(2)}x</div>
                      </div>
                      <div className="field">
                        <label>Decalage horizontal</label>
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          value={photoAdjustments.offsetX}
                          onChange={(event) => updatePhotoAdjustment('offsetX', Number(event.target.value))}
                        />
                      </div>
                      <div className="field">
                        <label>Decalage vertical</label>
                        <input
                          type="range"
                          min="-40"
                          max="40"
                          step="1"
                          value={photoAdjustments.offsetY}
                          onChange={(event) => updatePhotoAdjustment('offsetY', Number(event.target.value))}
                        />
                      </div>
                      <div className="field">
                        <label>Compression</label>
                        <input
                          type="range"
                          min="0.55"
                          max="0.95"
                          step="0.01"
                          value={photoAdjustments.quality}
                          onChange={(event) => updatePhotoAdjustment('quality', Number(event.target.value))}
                        />
                        <div className="muted">Qualite {Math.round(photoAdjustments.quality * 100)}%</div>
                      </div>
                    </div>

                    <div className="chips">
                      {preparingImage ? <span className="chip">Preparation...</span> : null}
                      {preparedUpload?.compressedSize ? <span className="chip">Compressee: {Math.round(preparedUpload.compressedSize / 1024)} Ko</span> : null}
                      {preparedUpload?.originalSize ? <span className="chip">Originale: {Math.round(preparedUpload.originalSize / 1024)} Ko</span> : null}
                      {preparedUpload?.analysis ? <span className="chip">Luminosite {preparedUpload.analysis.brightness}</span> : null}
                      {preparedUpload?.analysis ? <span className="chip">Nettete {preparedUpload.analysis.sharpness}</span> : null}
                    </div>

                    {uploadWarnings.length ? (
                      <div className="upload-warning-list">
                        {uploadWarnings.map((warning) => (
                          <div className="muted upload-warning" key={warning}>{warning}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted" style={{ marginTop: '6px' }}>
                        Photo correcte pour l upload. L image sera compressee puis detouree automatiquement.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="muted" style={{ marginTop: '6px' }}>
                    Tu pourras recadrer, tourner, compresser et verifier la photo avant l upload.
                  </div>
                )}
              </div>
          </div>

          {formError ? <div className="muted" style={{ color: '#b00020' }}>{formError}</div> : null}

          <div className="row">
            <button className="btn" type="submit" disabled={uploading || preparingImage}>
              {uploading ? 'Upload...' : preparingImage ? 'Preparation...' : 'Ajouter'}
            </button>
            <button className="btn" type="button" onClick={resetCreateForm}>
              Annuler
            </button>
          </div>
        </form>
      </div>

      <div className="row" style={{ marginTop: '12px' }}>
        <button className="btn" type="button" onClick={fetchItems} disabled={loading}>
          {loading ? 'Chargement...' : 'Rafraichir'}
        </button>
        <span className="muted">{items.length} vetement(s)</span>
        {pageError ? <span className="muted" style={{ color: '#b00020' }}>{pageError}</span> : null}
      </div>

      <div className="panel" id="my-items" style={{ marginTop: '12px' }}>
        <div className="section-title">
          <h2>Mes vetements</h2>
          <div className="muted">{filteredItems.length} visible(s)</div>
        </div>

        <div className="stat-kpis" style={{ marginBottom: '10px' }}>
          <div className="kpi">
            <div className="label">Total vetements</div>
            <div className="big">{items.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Categories</div>
            <div className="big">{new Set(items.map((item) => item.category).filter(Boolean)).size}</div>
          </div>
          <div className="kpi">
            <div className="label">Couleurs</div>
            <div className="big">{new Set(items.flatMap((item) => [item.color, item.secondaryColor]).filter(Boolean)).size}</div>
          </div>
        </div>

        <div className="mobile-toolbar-summary mobile-only">
          <button className="btn" type="button" onClick={() => setShowMobileFilters(true)}>
            {mobileWardrobeFilterCount ? `Filtres (${mobileWardrobeFilterCount})` : 'Filtres'}
          </button>
          <span className="chip">{sortBy === 'recent' ? 'Tri recent' : sortBy === 'name' ? 'Tri nom' : 'Tri prix'}</span>
          {categoryFilter ? <span className="chip">{categoryFilter}</span> : null}
          {colorFilter ? <span className="chip">{colorFilter}</span> : null}
          {seasonFilter ? <span className="chip">{seasonFilter}</span> : null}
          {laundryFilter ? <span className="chip">{laundryFilter === 'dirty' ? 'A laver' : 'Propres'}</span> : null}
        </div>

        <div className="wardrobe-toolbar desktop-only">
          {wardrobeFilters}
        </div>

        <div className="wardrobe-quick-filters">
          <div className="chips">
            {colors.slice(0, 8).map((value) => (
              <button
                className={`chip${colorFilter === value ? ' active' : ''}`}
                type="button"
                key={value}
                onClick={() => setColorFilter((prev) => (prev === value ? '' : value))}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="chips">
            {seasonOptions.map((value) => (
              <button
                className={`chip${seasonFilter === value ? ' active' : ''}`}
                type="button"
                key={value}
                onClick={() => setSeasonFilter((prev) => (prev === value ? '' : value))}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {showMobileFilters ? (
          <div className="mobile-drawer-backdrop mobile-only" onClick={() => setShowMobileFilters(false)}>
            <div className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="mobile-drawer-header">
                <div>
                  <strong>Filtres dressing</strong>
                  <div className="muted">{filteredItems.length} resultat(s)</div>
                </div>
                <button className="btn small ghost" type="button" onClick={() => setShowMobileFilters(false)}>
                  Fermer
                </button>
              </div>
              <div className="mobile-drawer-body wardrobe-toolbar mobile-drawer-toolbar">
                {wardrobeFilters}
              </div>
              <div className="mobile-drawer-actions">
                <button className="btn small ghost" type="button" onClick={resetWardrobeFilters}>
                  Tout reinitialiser
                </button>
                <button className="btn" type="button" onClick={() => setShowMobileFilters(false)}>
                  Voir les vetements
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <PaginationControls
          page={currentPage}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          label="vetements"
          showPageSize={false}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setPage(1)
          }}
        />

        {items.length === 0 ? (
          <div className="muted">Aucun vetement enregistre pour le moment.</div>
        ) : filteredItems.length === 0 ? (
          <div className="muted">Aucun vetement ne correspond aux filtres actuels.</div>
        ) : (
          <div className="wardrobe-grid">
            {visibleItems.map((item) => {
              const src = buildAssetUrl(item.imageUrl || item.cutoutUrl || item.originalUrl)

              return (
                <div className="kard" key={item._id}>
                  <div className={`thumb ${item.category || ''}`}>
                    {src ? <img src={src} alt={item.title || item.category} loading="lazy" /> : null}
                  </div>

                  <div className="kard-head">
                    <strong>{item.title || 'Sans nom'}</strong>
                    <div className="chips">
                      {item.color ? <span className="chip">{item.color}</span> : null}
                      {item.secondaryColor ? <span className="chip">{item.secondaryColor}</span> : null}
                      {item.category ? <span className="chip">{item.category}</span> : null}
                      {item.brand ? <span className="chip">{item.brand}</span> : null}
                    </div>
                  </div>

                <div className="meta-list">
                    {Array.isArray(item.occasions) && item.occasions.length > 0 ? (
                      <div className="chips">
                        {item.occasions.map((occasion) => (
                          <span className="chip" key={`${item._id}-${occasion}`}>{occasion}</span>
                        ))}
                      </div>
                    ) : null}
                    {Array.isArray(item.seasons) && item.seasons.length > 0 ? (
                      <div className="chips">
                        {item.seasons.map((season) => (
                          <span className="chip" key={`${item._id}-${season}`}>{season}</span>
                        ))}
                      </div>
                    ) : null}
                    {Array.isArray(item.weatherTags) && item.weatherTags.length > 0 ? (
                      <div className="chips">
                        {item.weatherTags.map((value) => (
                          <span className="chip" key={`${item._id}-${value}`}>{value}</span>
                        ))}
                      </div>
                    ) : null}
                    {item.notes ? <div className="muted">Notes: {item.notes}</div> : null}
                    <div className="muted">Enregistre le {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</div>
                  </div>

                  <div className="row kard-actions">
                    <button className="btn small ghost" type="button" onClick={() => navigate(`/dressing/${item._id}`)}>
                      Voir fiche
                    </button>
                    <button className="btn small" type="button" onClick={() => openEditor(item)}>
                      Modifier
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <PaginationControls
          page={currentPage}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          label="vetements"
          showPageSize={false}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setPage(1)
          }}
        />
      </div>

      <datalist id="brand-suggestions">
        {brandSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="purchase-location-suggestions">
        {purchaseLocationSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="size-suggestions">
        {sizeSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="material-suggestions">
        {materialSuggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>

      {editingItem ? (
        <div className="modal-backdrop" onClick={closeEditor}>
          <div className="panel modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-title">
              <h2>Modifier le vetement</h2>
              <button className="btn small" type="button" onClick={closeEditor}>Fermer</button>
            </div>

            <div className="grid cols-2" style={{ marginBottom: '12px' }}>
              <div className={`thumb ${editingItem.category || ''}`}>
                {editingSrc ? <img src={editingSrc} alt={editingItem.title || editingItem.category} /> : null}
              </div>
              <div className="adjust-panel">
                <div className="chips">
                  <span className="chip">{isUsingCutout ? 'Image detouree' : 'Image originale'}</span>
                  {editingItem.cutoutUrl ? <span className="chip">Detourage disponible</span> : <span className="chip">Pas de detourage</span>}
                  {editingItem.uploadMeta?.compressedSize ? <span className="chip">Import {Math.round(editingItem.uploadMeta.compressedSize / 1024)} Ko</span> : null}
                </div>
                {savedUploadWarnings.length ? (
                  <div className="upload-warning-list">
                    {savedUploadWarnings.map((warning) => (
                      <div className="muted upload-warning" key={warning}>{warning}</div>
                    ))}
                  </div>
                ) : null}
                {editingItem.uploadMeta?.cutoutError ? (
                  <div className="muted" style={{ color: '#b00020' }}>
                    Dernier echec detourage: {editingItem.uploadMeta.cutoutError}
                  </div>
                ) : null}
                <div className="muted">Si le rendu n'est pas bon, tu peux relancer le detourage depuis l'image originale.</div>
                <div className="row">
                  <button className="btn small" type="button" onClick={handleReprocessCutout} disabled={reprocessingId === editingItem._id}>
                    {reprocessingId === editingItem._id ? 'Detourage...' : 'Retenter le detourage'}
                  </button>
                </div>
              </div>
            </div>

            <div className="field" style={{ marginBottom: '12px' }}>
              <label>Remplacer la photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setEditSourceFile(event.target.files?.[0] || null)
                  setEditError('')
                }}
              />
              {editSourcePreviewUrl ? (
                <div className="upload-prep-card">
                  <div className="upload-prep-preview-grid">
                    <div>
                      <div className="muted upload-prep-label">Nouvelle originale</div>
                      <div className="thumb upload-prep-thumb">
                        <img src={editSourcePreviewUrl} alt="Nouvelle photo originale" />
                      </div>
                    </div>
                    <div>
                      <div className="muted upload-prep-label">Nouvelle version preparee</div>
                      <div className="thumb upload-prep-thumb">
                        {editPreparedUpload?.previewUrl ? <img src={editPreparedUpload.previewUrl} alt="Nouvelle photo preparee" /> : null}
                      </div>
                    </div>
                  </div>

                  <div className="upload-prep-controls">
                    <div className="field">
                      <label>Rotation</label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={editPhotoAdjustments.rotation}
                        onChange={(event) => updateEditPhotoAdjustment('rotation', Number(event.target.value))}
                      />
                      <div className="muted">{editPhotoAdjustments.rotation} deg</div>
                    </div>
                    <div className="field">
                      <label>Zoom / recadrage</label>
                      <input
                        type="range"
                        min="1"
                        max="2.5"
                        step="0.05"
                        value={editPhotoAdjustments.zoom}
                        onChange={(event) => updateEditPhotoAdjustment('zoom', Number(event.target.value))}
                      />
                      <div className="muted">{editPhotoAdjustments.zoom.toFixed(2)}x</div>
                    </div>
                    <div className="field">
                      <label>Decalage horizontal</label>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        step="1"
                        value={editPhotoAdjustments.offsetX}
                        onChange={(event) => updateEditPhotoAdjustment('offsetX', Number(event.target.value))}
                      />
                    </div>
                    <div className="field">
                      <label>Decalage vertical</label>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        step="1"
                        value={editPhotoAdjustments.offsetY}
                        onChange={(event) => updateEditPhotoAdjustment('offsetY', Number(event.target.value))}
                      />
                    </div>
                    <div className="field">
                      <label>Compression</label>
                      <input
                        type="range"
                        min="0.55"
                        max="0.95"
                        step="0.01"
                        value={editPhotoAdjustments.quality}
                        onChange={(event) => updateEditPhotoAdjustment('quality', Number(event.target.value))}
                      />
                      <div className="muted">Qualite {Math.round(editPhotoAdjustments.quality * 100)}%</div>
                    </div>
                  </div>

                  <div className="chips">
                    {editPreparingImage ? <span className="chip">Preparation...</span> : null}
                    {editPreparedUpload?.compressedSize ? <span className="chip">Compressee: {Math.round(editPreparedUpload.compressedSize / 1024)} Ko</span> : null}
                    {editPreparedUpload?.originalSize ? <span className="chip">Originale: {Math.round(editPreparedUpload.originalSize / 1024)} Ko</span> : null}
                    {editPreparedUpload?.analysis ? <span className="chip">Luminosite {editPreparedUpload.analysis.brightness}</span> : null}
                    {editPreparedUpload?.analysis ? <span className="chip">Nettete {editPreparedUpload.analysis.sharpness}</span> : null}
                  </div>

                  {editUploadWarnings.length ? (
                    <div className="upload-warning-list">
                      {editUploadWarnings.map((warning) => (
                        <div className="muted upload-warning" key={warning}>{warning}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted" style={{ marginTop: '6px' }}>
                      La nouvelle photo sera compressee puis detouree automatiquement.
                    </div>
                  )}

                  <div className="row" style={{ marginTop: '10px' }}>
                    <button className="btn small" type="button" onClick={handleReplaceImage} disabled={replacingImage || editPreparingImage}>
                      {replacingImage ? 'Remplacement...' : editPreparingImage ? 'Preparation...' : 'Remplacer la photo'}
                    </button>
                    <button className="btn small ghost" type="button" onClick={resetEditPhotoState} disabled={replacingImage}>
                      Annuler la nouvelle photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="muted" style={{ marginTop: '6px' }}>
                  Tu peux choisir une nouvelle photo, la recadrer puis remplacer l'image actuelle du vetement.
                </div>
              )}
            </div>

            <form onSubmit={handleUpdate}>
              <div className="grid cols-2">
                <div className="field">
                  <label>Nom</label>
                  <input type="text" value={editForm.title} onChange={(event) => updateEditField('title', event.target.value)} />
                </div>

                  <div className="field">
                    <label>Marque</label>
                    <input
                      type="text"
                      list="brand-suggestions"
                      value={editForm.brand}
                      onChange={(event) => updateEditField('brand', event.target.value)}
                      onBlur={(event) => updateEditField('brand', toTitleCase(event.target.value))}
                    />
                  </div>

                <div className="field">
                  <label>Categorie</label>
                  <select value={editForm.category} onChange={(event) => updateEditField('category', event.target.value)}>
                    {categories.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Couleur</label>
                  <select value={editForm.color} onChange={(event) => updateEditField('color', event.target.value)}>
                    {colors.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Couleur 2</label>
                  <select value={editForm.secondaryColor} onChange={(event) => updateEditField('secondaryColor', event.target.value)}>
                    <option value="">Aucune</option>
                    {colors.filter((value) => value !== editForm.color).map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Prix</label>
                  <input type="number" min="0" step="0.01" value={editForm.price} onChange={(event) => updateEditField('price', event.target.value)} />
                </div>

                <div className="field">
                  <label>Etat du vetement</label>
                  <select value={editForm.condition} onChange={(event) => updateEditField('condition', event.target.value)}>
                    {conditionOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Date d'achat</label>
                  <input type="date" value={editForm.purchaseDate} onChange={(event) => updateEditField('purchaseDate', event.target.value)} />
                </div>

                  <div className="field">
                    <label>Lieu d'achat</label>
                    <input
                      type="text"
                      list="purchase-location-suggestions"
                      value={editForm.purchaseLocation}
                      onChange={(event) => updateEditField('purchaseLocation', event.target.value)}
                      onBlur={(event) => updateEditField('purchaseLocation', toTitleCase(event.target.value))}
                    />
                  </div>

                <div className="field">
                  <label>Origine</label>
                  <select value={editForm.origin} onChange={(event) => updateEditField('origin', event.target.value)}>
                    {origins.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>

                  <div className="field">
                    <label>Taille</label>
                    <input
                      type="text"
                      list="size-suggestions"
                      value={editForm.size}
                      onChange={(event) => updateEditField('size', event.target.value)}
                      onBlur={(event) => updateEditField('size', normalizeWhitespace(event.target.value))}
                    />
                  </div>

                  <div className="field">
                    <label>Matiere</label>
                    <input
                      type="text"
                      list="material-suggestions"
                      value={editForm.material}
                      onChange={(event) => updateEditField('material', event.target.value)}
                      onBlur={(event) => updateEditField('material', toTitleCase(event.target.value))}
                    />
                  </div>

                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Occasions</label>
                  {renderOccasionChecks(editForm.occasions, (occasion) => {
                    toggleOccasion(occasion, editForm.occasions, (next) => updateEditField('occasions', next))
                  })}
                </div>

                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Saisons</label>
                  {renderMultiChecks(seasonOptions, editForm.seasons, (value) => {
                    toggleOccasion(value, editForm.seasons, (next) => updateEditField('seasons', next))
                  })}
                </div>

                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Meteo</label>
                  {renderMultiChecks(weatherOptions, editForm.weatherTags, (value) => {
                    toggleOccasion(value, editForm.weatherTags, (next) => updateEditField('weatherTags', next))
                  })}
                </div>

                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Notes</label>
                  <textarea value={editForm.notes} onChange={(event) => updateEditField('notes', event.target.value)} />
                </div>
              </div>

              {editError ? <div className="muted" style={{ color: '#b00020' }}>{editError}</div> : null}

              <div className="modal-actions">
                <button className="btn primary" type="submit" disabled={savingEdit}>
                  {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button className="btn small danger" type="button" onClick={handleDelete} disabled={deletingId === editingItem._id}>
                  {deletingId === editingItem._id ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}

export default Dressing
