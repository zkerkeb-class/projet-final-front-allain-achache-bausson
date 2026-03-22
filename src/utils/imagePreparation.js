const MAX_OUTPUT_EDGE = 1600

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image loading failed'))
    image.src = src
  })

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('File reading failed'))
    reader.readAsDataURL(file)
  })

const analyzeCanvasQuality = (canvas) => {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const { width, height } = canvas
  const { data } = context.getImageData(0, 0, width, height)
  let brightnessTotal = 0
  let edgeTotal = 0
  let sampleCount = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const gray = (data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114)
      brightnessTotal += gray
      sampleCount += 1

      if (x < width - 1 && y < height - 1) {
        const rightIndex = index + 4
        const downIndex = index + (width * 4)
        const rightGray = (data[rightIndex] * 0.299) + (data[rightIndex + 1] * 0.587) + (data[rightIndex + 2] * 0.114)
        const downGray = (data[downIndex] * 0.299) + (data[downIndex + 1] * 0.587) + (data[downIndex + 2] * 0.114)
        edgeTotal += Math.abs(gray - rightGray) + Math.abs(gray - downGray)
      }
    }
  }

  const brightness = sampleCount ? brightnessTotal / sampleCount : 0
  const sharpness = sampleCount ? edgeTotal / sampleCount : 0

  return {
    brightness: Math.round(brightness),
    sharpness: Number(sharpness.toFixed(2)),
    isDark: brightness < 75,
    isBlurry: sharpness < 12,
  }
}

export const getPhotoWarnings = (analysis) => {
  const warnings = []
  if (!analysis) return warnings
  if (analysis.isDark) warnings.push('Photo sombre: ajoute plus de lumiere ou augmente l exposition avant import.')
  if (analysis.isBlurry) warnings.push('Photo possiblement floue: le detourage risque d etre moins net.')
  return warnings
}

export const prepareImageForUpload = async (file, adjustments = {}) => {
  const {
    rotation = 0,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
    quality = 0.82,
  } = adjustments

  const src = await readFileAsDataUrl(file)
  const image = await loadImage(src)

  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  const outputScale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(sourceWidth, sourceHeight))
  const outputWidth = Math.max(300, Math.round(sourceWidth * outputScale))
  const outputHeight = Math.max(300, Math.round(sourceHeight * outputScale))

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight

  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, outputWidth, outputHeight)
  context.save()
  context.translate(outputWidth / 2, outputHeight / 2)
  context.rotate((rotation * Math.PI) / 180)

  const scaledWidth = outputWidth * clamp(zoom, 1, 2.5)
  const scaledHeight = outputHeight * clamp(zoom, 1, 2.5)
  const translateX = (clamp(offsetX, -40, 40) / 100) * outputWidth
  const translateY = (clamp(offsetY, -40, 40) / 100) * outputHeight

  context.drawImage(
    image,
    (-scaledWidth / 2) + translateX,
    (-scaledHeight / 2) + translateY,
    scaledWidth,
    scaledHeight
  )
  context.restore()

  const analysisCanvas = document.createElement('canvas')
  analysisCanvas.width = 120
  analysisCanvas.height = Math.max(120, Math.round((outputHeight / outputWidth) * 120))
  const analysisContext = analysisCanvas.getContext('2d')
  analysisContext.drawImage(canvas, 0, 0, analysisCanvas.width, analysisCanvas.height)
  const analysis = analyzeCanvasQuality(analysisCanvas)

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', clamp(quality, 0.55, 0.95))
  })

  if (!blob) {
    throw new Error('Image compression failed')
  }

  const extension = '.jpg'
  const safeName = (file.name || 'photo').replace(/\.[^.]+$/, '')
  const preparedFile = new File([blob], `${safeName}-prepared${extension}`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })

  return {
    file: preparedFile,
    previewUrl: URL.createObjectURL(blob),
    analysis,
    width: outputWidth,
    height: outputHeight,
    originalSize: Number(file.size || 0),
    compressedSize: Number(blob.size || 0),
    adjustments: {
      rotation: clamp(rotation, -180, 180),
      zoom: clamp(zoom, 1, 2.5),
      offsetX: clamp(offsetX, -40, 40),
      offsetY: clamp(offsetY, -40, 40),
      quality: clamp(quality, 0.55, 0.95),
    },
  }
}
