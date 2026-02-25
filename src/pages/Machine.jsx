import Layout from '../components/Layout'

const recentItems = [
  { id: 'r1', name: 'Pull doux', category: 'top', image: '/images/tops/top1.png', lastWorn: '2026-02-10' },
  { id: 'r2', name: 'Jean bleu', category: 'bottom', image: '/images/bottoms/bottom1.png', lastWorn: '2026-02-09' },
]

const dirtyItems = [
  { id: 'd1', name: 'Boucles lumière', category: 'earrings', image: '/images/earrings/earrings1.png' },
]

const cleanItems = [
  { id: 'c1', name: 'Top pastel', category: 'top', image: '/images/tops/top2.png' },
  { id: 'c2', name: 'Top noir', category: 'top', image: '/images/tops/top3.png' },
]

function ItemCard({ item, extra }) {
  return (
    <div className="kard">
      <div className={`thumb ${item.category}`}>
        <img src={item.image} alt={item.name} loading="lazy" />
      </div>
      <div className="row" style={{ marginTop: '8px' }}>
        <strong>{item.name}</strong>
        {extra}
      </div>
      <div className="row">
        <span className="chip">{item.category}</span>
        <span className="chip">{item.status || 'propre'}</span>
      </div>
    </div>
  )
}

function Machine() {
  return (
    <Layout title="Machine à laver">
      <div className="panel">
        <div className="section-title">
          <h2>Dernières affaires portées</h2>
          <div className="row" style={{ gap: '6px' }}>
            <label className="chip">
              Depuis
              <select defaultValue="3">
                <option value="1">hier</option>
                <option value="3">3 jours</option>
                <option value="7">7 jours</option>
                <option value="14">14 jours</option>
                <option value="30">30 jours</option>
              </select>
            </label>
            <button className="btn" type="button">Tout cocher</button>
            <button className="btn" type="button">Tout décocher</button>
            <button className="btn" type="button">Mettre au sale</button>
          </div>
        </div>
        <div className="laundry-grid">
          {recentItems.map((item) => (
            <ItemCard
              key={item.id}
              item={{ ...item, status: 'propre' }}
              extra={<span className="muted"><small>dernier porté : {item.lastWorn}</small></span>}
            />
          ))}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="panel">
          <div className="section-title">
            <h2>Sale</h2>
            <div className="row" style={{ gap: '6px' }}>
              <button className="btn" type="button">Tout laver</button>
            </div>
          </div>
          <div className="laundry-grid">
            {dirtyItems.map((item) => (
              <ItemCard
                key={item.id}
                item={{ ...item, status: 'sale' }}
                extra={<button className="btn small" type="button">Laver</button>}
              />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">
            <h2>Propre</h2>
            <div className="row" style={{ gap: '6px' }}>
              <button className="btn" type="button">Tout mettre au sale</button>
            </div>
          </div>
          <div className="laundry-grid">
            {cleanItems.map((item) => (
              <ItemCard
                key={item.id}
                item={{ ...item, status: 'propre' }}
                extra={<button className="btn small" type="button">Mettre au sale</button>}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Machine
