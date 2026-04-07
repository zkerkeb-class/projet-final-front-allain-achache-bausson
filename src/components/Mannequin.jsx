function Mannequin({ baseSrc, outfit }) {
  const slots = {
    top: { top: '20%', width: '46%', z: 3 },
    bottom: { top: '50%', width: '40%', z: 2 },
    dress: { top: '35%', width: '52%', z: 3 },
    outer: { top: '24%', width: '52%', z: 4 },
    shoes: { top: '82%', width: '30%', z: 2 },
    accessory: { top: '30%', width: '20%', z: 5 },
  }

  const layers = ['dress', 'top', 'bottom', 'outer', 'shoes', 'accessory']

  return (
    <div style={{ maxWidth: '360px', margin: '0 auto' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <img src={baseSrc} alt="Mannequin" style={{ width: '100%', display: 'block' }} />
        {layers.map((key) => {
          const item = outfit?.[key]
          if (!item) return null
          const slot = slots[key]
          if (!slot) return null
          const src = item.cutoutUrl || item.imageUrl

          return (
            <img
              key={`${key}-${item._id}`}
              src={src}
              alt={item.title || key}
              style={{
                position: 'absolute',
                left: '50%',
                top: slot.top,
                width: slot.width,
                transform: 'translate(-50%, -50%)',
                zIndex: slot.z,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default Mannequin
