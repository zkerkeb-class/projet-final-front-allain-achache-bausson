import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

function Accueil() {
  return (
    <Layout title="Maylis Dressing">
      <div className="panel">
        <h2>Bienvenue</h2>
        <p className="muted">
          Gère ta garde-robe, compose des tenues avec des vignettes d’images, suis tes statistiques et planifie tes looks.
        </p>
        <div className="grid cols-4" style={{ marginTop: '12px' }}>
          <Link className="card-link" to="/dressing">
            <strong>Ajouter & gérer les vêtements</strong>
            <span className="muted">Images, couleurs, occasions…</span>
          </Link>
          <Link className="card-link" to="/tenues">
            <strong>Créer des tenues</strong>
            <span className="muted">Pickers + aléatoire + favoris</span>
          </Link>
          <Link className="card-link" to="/stats">
            <strong>Statistiques</strong>
            <span className="muted">Pièces les plus portées, couleurs…</span>
          </Link>
          <Link className="card-link" to="/calendrier">
            <strong>Calendrier</strong>
            <span className="muted">Planifie tes tenues par date</span>
          </Link>
        </div>
      </div>
    </Layout>
  )
}

export default Accueil
