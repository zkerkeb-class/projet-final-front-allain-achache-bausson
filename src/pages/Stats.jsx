import Layout from '../components/Layout'

const kpis = [
  { label: 'Jours planifiés (30 j)', value: '12' },
  { label: '% garde-robe utilisée', value: '38%' },
  { label: 'Coût garde-robe', value: '420,00€' },
  { label: 'Coût par port (moy.)', value: '3,20€' },
]

const statItems = [
  { id: 's1', name: 'Pull doux', count: '6×', image: '/images/tops/top1.png' },
  { id: 's2', name: 'Jean bleu', count: '5×', image: '/images/bottoms/bottom1.png' },
  { id: 's3', name: 'Boucles lumière', count: '4×', image: '/images/earrings/earrings1.png' },
]

function Stats() {
  return (
    <Layout title="Statistiques">
      <div className="row" style={{ marginBottom: '10px' }}>
        <a className="chip" href="#stats-filters">Filtres</a>
        <a className="chip" href="#stats-most">Plus portés</a>
        <a className="chip" href="#stats-least">Moins portés</a>
        <a className="chip" href="#stats-occs">Occasions</a>
        <a className="chip" href="#stats-cols">Couleurs</a>
        <a className="chip" href="#stats-ideal">Tenue idéale</a>
      </div>

      <div className="panel" style={{ marginBottom: '12px' }}>
        <div className="stat-kpis">
          {kpis.map((kpi) => (
            <div className="kpi" key={kpi.label}>
              <div className="label">{kpi.label}</div>
              <div className="big">{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-3">
        <div className="panel" id="stats-filters">
          <h3>Filtres (listes “plus/moins portés”)</h3>
          <div className="grid cols-3">
            <div className="field">
              <label>Catégories</label>
              <div className="chips">
                <label className="chip"><input type="checkbox" /> top</label>
                <label className="chip"><input type="checkbox" /> bottom</label>
                <label className="chip"><input type="checkbox" /> dress</label>
              </div>
            </div>
            <div className="field">
              <label>Occasions</label>
              <div className="chips">
                <label className="chip"><input type="checkbox" /> casual</label>
                <label className="chip"><input type="checkbox" /> soirée</label>
                <label className="chip"><input type="checkbox" /> travail</label>
              </div>
            </div>
            <div className="field">
              <label>Couleurs</label>
              <div className="chips">
                <label className="chip"><input type="checkbox" /> noir</label>
                <label className="chip"><input type="checkbox" /> beige</label>
                <label className="chip"><input type="checkbox" /> bleu</label>
              </div>
            </div>
          </div>
          <div className="row" style={{ marginTop: '6px' }}>
            <button className="btn small" type="button">Réinitialiser</button>
          </div>
        </div>

        <div className="panel" id="stats-most">
          <h3>Vêtements les plus portés</h3>
          <div className="stat-grid">
            {statItems.map((item) => (
              <div className="stat-card" key={item.id}>
                <img className="stat-img" src={item.image} alt={item.name} />
                <div className="stat-meta">
                  <div className="name">{item.name}</div>
                  <div className="muted">Fenêtre : <strong>{item.count}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" id="stats-least">
          <h3>Vêtements les moins portés</h3>
          <div className="stat-grid">
            {statItems.slice().reverse().map((item) => (
              <div className="stat-card" key={item.id + '-least'}>
                <img className="stat-img" src={item.image} alt={item.name} />
                <div className="stat-meta">
                  <div className="name">{item.name}</div>
                  <div className="muted">Fenêtre : <strong>1×</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" id="stats-occs">
          <h3>Répartition par occasion</h3>
          <div className="muted">Graphique à connecter aux données.</div>
        </div>

        <div className="panel" id="stats-cols">
          <h3>Couleurs dominantes portées</h3>
          <div className="muted">Graphique à connecter aux données.</div>
        </div>

        <div className="panel" id="stats-ideal">
          <h3>Tenue idéale (combos les plus portés)</h3>
          <div className="stat-card" style={{ alignItems: 'flex-start' }}>
            <div className="mini-stage">
              <img className="layer" src="/images/base.png" alt="Mannequin" />
              <img className="layer" src="/images/tops/top1.png" alt="Haut" />
              <img className="layer" src="/images/bottoms/bottom1.png" alt="Bas" />
            </div>
            <div className="stat-meta">
              <div className="name">Portée 3 fois</div>
              <div className="chips">
                <span className="chip">Pull doux</span>
                <span className="chip">Jean bleu</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Stats
