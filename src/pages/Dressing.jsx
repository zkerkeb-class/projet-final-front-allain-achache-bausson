import Layout from '../components/Layout'

const categories = ['top', 'bottom', 'dress', 'shoes', 'bag', 'hat', 'necklace', 'earrings', 'outerwear']
const occasions = ['casual', 'soirée', 'travail', 'sport']
const colors = ['blanc', 'noir', 'beige', 'bleu', 'rouge', 'vert', 'rose', 'jaune', 'marron', 'gris', 'violet', 'orange', 'doré', 'argenté', 'multi']

const sampleItems = [
  {
    id: 'top-1',
    name: 'Pull doux',
    category: 'top',
    brand: 'Atelier',
    color: 'beige',
    price: '39,90€',
    image: '/images/tops/top1.png',
  },
  {
    id: 'bottom-1',
    name: 'Jean bleu',
    category: 'bottom',
    brand: 'Denim',
    color: 'bleu',
    price: '45,00€',
    image: '/images/bottoms/bottom1.png',
  },
  {
    id: 'earrings-1',
    name: 'Boucles lumière',
    category: 'earrings',
    brand: 'Studio',
    color: 'doré',
    price: '19,00€',
    image: '/images/earrings/earrings1.png',
  },
]

function Dressing() {
  return (
    <Layout title="Dressing">
      <div className="row" style={{ marginBottom: '10px' }}>
        <a className="chip" href="#add-item">Ajouter</a>
        <a className="chip" href="#filter-items">Filtres</a>
        <a className="chip" href="#my-items">Mes vêtements</a>
      </div>
      <div className="grid cols-2">
        <div className="panel" id="add-item">
          <h2>Ajouter un vêtement</h2>
          <div className="grid cols-2">
            <div className="field">
              <label>Nom</label>
              <input type="text" placeholder="ex: Jean bleu" />
            </div>
            <div className="field">
              <label>Catégorie</label>
              <select>
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Marque</label>
              <input type="text" placeholder="ex: Zara" />
            </div>
            <div className="field">
              <label>Prix (€)</label>
              <input type="number" min="0" step="0.01" placeholder="ex: 39.90" />
            </div>
            <div className="field">
              <label>Origine</label>
              <select>
                <option value="neuf">Neuf</option>
                <option value="seconde_main">Seconde main</option>
                <option value="don">Donné</option>
                <option value="cadeau">Cadeau</option>
                <option value="location">Location</option>
                <option value="autre">Autre</option>
              </select>
            </div>
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
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Notes</label>
              <textarea placeholder="ex: trop chaud, parfait pour soirée"></textarea>
            </div>
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Image du vêtement</label>
              <div className="grid cols-2">
                <div className="field">
                  <small className="muted">Depuis un fichier</small>
                  <input type="file" accept="image/*" />
                </div>
                <div className="field">
                  <small className="muted">Ou via une URL</small>
                  <input type="url" placeholder="https://…/mon-vetement.png" />
                </div>
              </div>
              <div className="thumb" style={{ marginTop: '8px' }}>
                <img src="/images/tops/top2.png" alt="Prévisualisation" />
              </div>
            </div>
          </div>
          <div className="row">
            <button className="btn" type="button">Ajouter</button>
            <button className="btn" type="button">Annuler</button>
          </div>
        </div>

        <div className="panel" id="filter-items">
          <h2>Filtres</h2>
          <div className="grid cols-3">
            <div className="field">
              <label>Recherche</label>
              <input type="text" placeholder="Nom…" />
            </div>
            <div className="field">
              <label>Occasion</label>
              <select>
                <option value="">(toutes)</option>
                {occasions.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Catégorie</label>
              <select>
                <option value="">(toutes)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="row" style={{ marginTop: '8px' }}>
            <button className="btn" type="button">Tout marquer propre</button>
            <span className="muted">{sampleItems.length} vêtement(s)</span>
          </div>
        </div>
      </div>

      <div className="panel" id="my-items" style={{ marginTop: '12px' }}>
        <h2>Mes vêtements</h2>
        <div className="list">
          {sampleItems.map((item) => (
            <div className="kard" key={item.id}>
              <div className={`thumb ${item.category}`}>
                <img src={item.image} alt={item.name} loading="lazy" />
              </div>
              <div className="row">
                <strong>{item.name}</strong>
                <div className="chips">
                  <span className="chip">{item.color}</span>
                  <span className="chip">Marque: {item.brand}</span>
                  <span className="chip">Prix: {item.price}</span>
                </div>
              </div>
              <div className="row">
                <div className="muted">Porté <strong>0</strong>× · <span className="chip">propre</span></div>
                <div className="row" style={{ gap: '6px' }}>
                  <button className="btn small" type="button">+1 porté</button>
                  <button className="btn small" type="button">Laver</button>
                  <button className="btn small" type="button">Éditer</button>
                  <button className="btn small danger" type="button">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default Dressing
