import { useContext, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { AuthContext } from '../context/AuthContext'
import { buildApiUrl } from '../config/api'
import OutfitCanvasPreview from '../components/OutfitCanvasPreview'
import { useToast } from '../context/ToastContext'

function LookbookPublic() {
  const toast = useToast()
  const { token } = useContext(AuthContext)
  const [outfits, setOutfits] = useState([])
  const [posts, setPosts] = useState([])
  const [ownedOutfits, setOwnedOutfits] = useState([])
  const [ownedGarments, setOwnedGarments] = useState([])
  const [selectedGarmentId, setSelectedGarmentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [posting, setPosting] = useState(false)
  const [postDescription, setPostDescription] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')

      try {
        const [outfitRes, postRes, userGarmentsRes] = await Promise.all([
          fetch(buildApiUrl('/api/outfits/public')),
          fetch(buildApiUrl('/api/public-posts')),
          token
            ? fetch(buildApiUrl('/api/garments'), {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve({ ok: false, json: async () => [] }),
        ])

        if (!outfitRes.ok) {
          throw new Error('Erreur lors du chargement des tenues publiques')
        }

        if (!postRes.ok) {
          throw new Error('Erreur lors du chargement des posts publics')
        }

        if (token && !userGarmentsRes.ok) {
          throw new Error('Erreur lors du chargement de vos vêtements')
        }

        const [outfitData, postData, userGarmentsData] = await Promise.all([
          outfitRes.json(),
          postRes.json(),
          token ? userGarmentsRes.json() : [],
        ])

        setOutfits(outfitData)
        setPosts(postData)
        setOwnedGarments(Array.isArray(userGarmentsData) ? userGarmentsData : [])
      } catch (err) {
        setError(err.message)
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast, token])

  const submitPost = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error('Connectez-vous pour poster.');
      return;
    }

    if (!selectedGarmentId) {
      toast.error("Veuillez sélectionner un vêtement à publier.");
      return;
    }

    setPosting(true);

    try {
      const res = await fetch(buildApiUrl('/api/public-posts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          garmentId: selectedGarmentId,
          description: postDescription.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || data.error || data.message || 'Erreur création post');
      }

      const newPost = await res.json();
      setPosts((prev) => [newPost, ...prev]);
      setPostDescription('');
      setSelectedGarmentId('');
      toast.success('Post créé !');
    } catch (err) {
      toast.error(err.message || 'Erreur création post');
    } finally {
      setPosting(false);
    }
  }

  return (
    <Layout title="Lookbook Public">
      <div className="page-content">
        <h1>Lookbook Public</h1>
        <p>Découvrez les vêtements partagées par la communauté</p>

        {token ? (
          <form className="public-post-form" onSubmit={submitPost}>
            <h2>Publier un vêtement</h2>
            <div className="field">
              <label>Sélectionnez un vêtement de votre dressing</label>
              <select
                value={selectedGarmentId}
                onChange={(event) => setSelectedGarmentId(event.target.value)}
              >
                <option value="">--- Choisir un vêtement ---</option>
                {ownedGarments.map((garment) => (
                  <option key={garment._id} value={garment._id}>
                    {garment.title} ({garment.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                placeholder="Ajoute une description pour ton vêtement"
                value={postDescription}
                onChange={(event) => setPostDescription(event.target.value)}
                maxLength={500}
              />
            </div>
            <button className="btn primary" type="submit" disabled={posting}>
              {posting ? 'Publication...' : 'Publier'}
            </button>
          </form>
        ) : (
          <p>Connectez-vous pour publier un vêtement.</p>
        )}

        {loading && <p>Chargement des vêtements...</p>}

        {error && <p className="error">{error}</p>}


        <h2>Posts communauté</h2>
        {posts.length === 0 ? (
          <p>Aucun post pour l'instant.</p>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <article key={post._id} className="post-card">
                <div className="post-preview">
                  {post.garment ? (
                    <img 
                      src={post.garment.imageUrl} 
                      alt={post.garment.title || 'Vêtement'} 
                    />
                  ) : (
                    <p className="muted">Image indisponible</p>
                  )}
                </div>
                <div className="post-content">
                  <h3>{post.garment?.title}</h3>
                  <p className="post-author">Par : {post.user?.email || 'Utilisateur invité'}</p>
                  {post.garment && (
                    <p className="garment-info">{post.garment.category} • {post.garment.color}</p>
                  )}
                  {post.description ? <p>{post.description}</p> : <p className="muted">Pas de description</p>}
                  <p className="muted small">Publié le {new Date(post.createdAt).toLocaleDateString()}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="outfits-grid">
          {outfits.map((outfit) => (
            <div key={outfit._id} className="outfit-card">
              <div className="outfit-preview">
                <OutfitCanvasPreview
                  items={outfit.items}
                  width={200}
                  height={300}
                />
              </div>
              <div className="outfit-info">
                <h3>{outfit.name}</h3>
                <p className="outfit-author">
                  Par: {outfit.user?.email || 'Utilisateur anonyme'}
                </p>
                {outfit.personalNote && (
                  <p className="outfit-note">{outfit.personalNote}</p>
                )}
                {outfit.personalRating && (
                  <div className="outfit-rating">
                    {'★'.repeat(outfit.personalRating)}
                    {'☆'.repeat(5 - outfit.personalRating)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .page-content {
          padding: 2rem;
        }

        .outfits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .outfit-card {
          border: 1px solid;
          border-radius: 8px;
          overflow: hidden;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .outfit-preview {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .outfit-info {
          padding: 1rem;
        }

        .outfit-author {
          color: #666;
          font-size: 0.9rem;
          margin: 0.5rem 0;
        }

        .outfit-note {
          font-style: italic;
          color: #555;
          margin: 0.5rem 0;
        }

        .outfit-rating {
          color: #ffd700;
          font-size: 1.2rem;
        }

        .public-post-form {
          border: 1px solid var(--stroke);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          margin-bottom: var(--space-5);
          background: var(--panel);
          box-shadow: var(--shadow-1);
          color: var(--text);
        }

        .public-post-form .field {
          margin-bottom: var(--space-3);
          text-align: left;
        }

        .public-post-form label {
          display: block;
          margin-bottom: 0.35rem;
          font-weight: 600;
        }

        .public-post-form input,
        .public-post-form select,
        .public-post-form textarea {
          width: 100%;
          background: var(--panel-strong);
          border: 1px solid var(--stroke);
          color: var(--text);
          border-radius: var(--radius-sm);
          padding: 0.65rem;
        }

        .public-post-form textarea {
          min-height: 80px;
          resize: vertical;
        }

        .public-post-form .btn {
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
          color: #210b3b;
          border: none;
        }

        .post-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .post-card {
          border: 1px solid;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .post-card img {
          width: 100%;
          max-height: 300px;
          object-fit: contain;
          display: block;
          background: var(--panel);
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        }

        .post-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 250px;
          background: var(--panel);
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          overflow: hidden;
        }

        .post-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 1rem;
        }

        .post-preview .muted {
          color: var(--text-muted);
        }

        .post-content {
          padding: 0.75rem;
        }

        .post-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
        }

        .post-author {
          font-size: 0.85rem;
          margin: 0.25rem 0;
          color: var(--accent);
          font-weight: 600;
        }

        .garment-info {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0.25rem 0;
        }

        .post-content p {
          margin: 0.25rem 0;
          font-size: 0.95rem;
        }

        .post-content .small {
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .public-post-form {
          border: 1px solid;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .public-post-form .field {
          margin-bottom: 0.75rem;
        }

        .public-post-form input,
        .public-post-form textarea {
          width: 100%;
          border: 1px solid;
          border-radius: 4px;
          padding: 0.5rem;
          font: inherit;
        }

        .error {
          color: red;
          margin: 1rem 0;
        }
      `}</style>
    </Layout>
  )
}

export default LookbookPublic