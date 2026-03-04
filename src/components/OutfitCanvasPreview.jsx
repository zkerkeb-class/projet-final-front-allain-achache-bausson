import { memo, useMemo } from 'react'
import { buildAssetUrl } from '../config/api'

function OutfitCanvasPreview({ items, className = '' }) {
  const safeItems = useMemo(() => (
    Array.isArray(items)
      ? [...items].sort((a, b) => (a?.zIndex ?? 1) - (b?.zIndex ?? 1))
      : []
  ), [items])

  return (
    <div className={`saved-outfit-canvas ${className}`.trim()}>
      <div className="saved-outfit-paper" />
      <div className="saved-outfit-canvas-grid" />
      {safeItems.map((entry, index) => {
        const garment = entry?.garment
        const src = garment ? buildAssetUrl(garment.imageUrl || garment.cutoutUrl || garment.originalUrl) : ''

        if (!src) return null

        return (
          <img
            key={`${garment?._id || 'piece'}-${index}`}
            className="saved-outfit-piece"
            src={src}
            alt={garment?.title || entry?.category || 'piece'}
            loading="lazy"
            decoding="async"
            style={{
              top: `${entry?.y ?? 50}%`,
              left: `${entry?.x ?? 50}%`,
              width: `${entry?.size ?? 30}%`,
              zIndex: entry?.zIndex ?? 1,
              transform: `translate(-50%, -50%) rotate(${entry?.rotation ?? 0}deg)`,
            }}
          />
        )
      })}
    </div>
  )
}

export default memo(OutfitCanvasPreview)
