import Layout from '../components/Layout'

const galleries = {
  soiree: {
    title: 'Soirée',
    items: ['/tenues/soirée/tenue1.png'],
  },
  casual: {
    title: 'Casual',
    items: [],
  },
  travail: {
    title: 'Travail',
    items: [],
  },
}

function Gallery({ items }) {
  if (!items.length) {
    return (
      <div className="gallery">
        <div className="gallery-placeholder">Bientôt</div>
        <div className="gallery-placeholder">Bientôt</div>
        <div className="gallery-placeholder">Bientôt</div>
      </div>
    )
  }

  return (
    <div className="gallery">
      {items.map((src, index) => (
        <img key={src + index} src={src} alt="tenue" loading="lazy" />
      ))}
    </div>
  )
}

function MesTenues() {
  return (
    <Layout title="Mes tenues enregistrées">
      {Object.values(galleries).map((section) => (
        <div className="panel" key={section.title} style={{ marginBottom: '12px' }}>
          <h2>{section.title}</h2>
          <Gallery items={section.items} />
        </div>
      ))}
    </Layout>
  )
}

export default MesTenues
