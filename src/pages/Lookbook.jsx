import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

function Lookbook() {
  return (
    <Layout title="Maylis' Lookbook">
      <div className="panel">
        <h2>Ma tenue</h2>
        <div className="lookbook">
          <img src="/images/base.png" className="base" alt="Mannequin" />

          <div className="arrows-group">
            <button className="arrow top left" type="button">← Haut</button>
            <button className="arrow top right" type="button">→ Haut</button>

            <button className="arrow bottom left" type="button">← Bas</button>
            <button className="arrow bottom right" type="button">→ Bas</button>

            <button className="btn" type="button">Enregistrer la tenue</button>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <Link className="btn" to="/mes-tenues">Voir mes tenues enregistrées</Link>
            </div>
          </div>
        </div>
        <p className="muted">Aucun vêtement n'est chargé par défaut.</p>
      </div>

      <div className="panel" style={{ marginTop: '12px' }}>
        <h2>Projets</h2>
        <div className="gallery">
          <a href="#" className="card" data-card="portfolio">
            <div className="card-image"></div>
            <div className="card-title">Portfolio</div>
          </a>
          <a href="#" className="card" data-card="ece">
            <div className="card-image"></div>
            <div className="card-title">ECE-CUP</div>
          </a>
          <a href="#" className="card" data-card="synth">
            <div className="card-image"></div>
            <div className="card-title">Synthétiseur Arduino</div>
          </a>
          <a href="#" className="card" data-card="ecg">
            <div className="card-image"></div>
            <div className="card-title">Électro-cardiogramme</div>
          </a>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '12px' }}>
        <h2>Contact</h2>
        <div className="fiche">
          <p>Maylis ALLAIN</p>
          <p>Numéro : 07 83 75 55 65</p>
          <p>E-mail : maylis.allain@gmail.com</p>
        </div>
      </div>
    </Layout>
  )
}

export default Lookbook
