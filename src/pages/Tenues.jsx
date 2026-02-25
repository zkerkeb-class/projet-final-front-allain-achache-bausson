import Layout from '../components/Layout'

const occasions = ['casual', 'soirée', 'travail', 'sport']
const colors = ['blanc', 'noir', 'beige', 'bleu', 'rouge', 'vert', 'rose', 'jaune']

const pickerLeft = ['hat', 'earrings', 'necklace', 'top', 'bottom']
const pickerRight = ['outerwear', 'dress', 'bag', 'shoes']

function PickerField({ label, disabled }) {
  return (
    <div className="field" data-picker={label}>
      <label className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        <span className="row" style={{ gap: '6px' }}>
          <label className="chip" style={{ userSelect: 'none' }}>
            <input type="checkbox" defaultChecked={!disabled} /> inclure
          </label>
          <button className="btn small" type="button">🔒</button>
        </span>
      </label>
      <div className="picker">
        <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
          <button className="btn small" type="button">◀</button>
          <button className="btn small" type="button">▶</button>
        </div>
        <div className="muted" style={{ marginTop: '6px' }}>(aperçu)</div>
      </div>
    </div>
  )
}

function Tenues() {
  return (
    <Layout title="Tenues">
      <div className="panel">
        <h2 id="creator">Créer une tenue</h2>
        <div className="row" style={{ marginBottom: '10px' }}>
          <a className="chip" href="#creator">Créateur</a>
          <a className="chip" href="#outfits">Mes tenues</a>
        </div>

        <div className="grid cols-3" id="filters" style={{ marginBottom: '8px' }}>
          <div className="field">
            <label>Occasions</label>
            <div className="chips">
              {occasions.map((occ) => (
                <label className="chip" key={occ}>
                  <input type="checkbox" /> {occ}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Couleurs</label>
            <div className="chips">
              {colors.map((color) => (
                <label className="chip" key={color}>
                  <input type="checkbox" /> {color}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>État</label>
            <div className="chips">
              <label className="chip"><input type="checkbox" defaultChecked /> Propre</label>
              <label className="chip"><input type="checkbox" /> Sale</label>
            </div>
          </div>
        </div>

        <div className="row" style={{ margin: '6px 0 10px', justifyContent: 'space-between' }}>
          <button className="btn" type="button">Générer aléatoire</button>
          <p className="muted" style={{ margin: 0 }}>Astuce : exporte les images au même cadrage que images/base.png.</p>
        </div>

        <div className="composer">
          <div className="picker-column left" id="pickers-left">
            {pickerLeft.map((cat) => (
              <PickerField key={cat} label={cat} />
            ))}
          </div>

          <div className="stage-wrap">
            <span className="stage-hint hint-head">Tête</span>
            <span className="stage-hint hint-torso">Torse</span>
            <span className="stage-hint hint-legs">Jambes</span>
            <span className="stage-hint hint-feet">Pieds</span>
            <div id="preview" className="stage">
              <img id="layer-base" className="layer" src="/images/base.png" alt="Mannequin de base" />
              <img id="layer-bottom" className="layer" src="/images/bottoms/bottom1.png" alt="Bas" />
              <img id="layer-shoes" className="layer" src="" alt="Chaussures" />
              <img id="layer-top" className="layer" src="/images/tops/top1.png" alt="Haut" />
              <img id="layer-dress" className="layer" src="" alt="Robe" />
              <img id="layer-outerwear" className="layer" src="" alt="Veste/Manteau" />
              <img id="layer-bag" className="layer" src="" alt="Sac" />
              <img id="layer-hat" className="layer" src="" alt="Chapeau" />
              <img id="layer-necklace" className="layer" src="" alt="Collier" />
              <img id="layer-earrings" className="layer" src="/images/earrings/earrings1.png" alt="Boucles d’oreilles" />
            </div>
          </div>

          <div className="picker-column right" id="pickers-right">
            {pickerRight.map((cat) => (
              <PickerField key={cat} label={cat} />
            ))}
          </div>
        </div>

        <div className="row" style={{ marginTop: '12px' }}>
          <input type="text" placeholder="Nom de la tenue" style={{ maxWidth: '280px' }} />
          <button className="btn primary" type="button">Enregistrer la tenue</button>
        </div>
      </div>

      <div className="panel" id="outfits" style={{ marginTop: '12px' }}>
        <div className="row">
          <h2>Mes tenues</h2>
          <button className="btn" type="button">Afficher seulement les favoris</button>
        </div>
        <div className="list" id="outfits-list">
          <div className="kard">
            <div className="mini-stage">
              <img className="layer" src="/images/base.png" alt="Mannequin" />
              <img className="layer" src="/images/tops/top2.png" alt="Haut" />
              <img className="layer" src="/images/bottoms/bottom1.png" alt="Bas" />
            </div>
            <div className="row">
              <strong>Look casual</strong>
              <div className="chips">
                <span className="chip">top</span>
                <span className="chip">bottom</span>
              </div>
            </div>
            <div className="row" style={{ gap: '6px' }}>
              <button className="btn small" type="button">Éditer</button>
              <button className="btn small" type="button">Favori ★</button>
              <button className="btn small" type="button">Suppr.</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Tenues
