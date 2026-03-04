import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl } from "../config/api";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(email || "").trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        login(data);
        localStorage.setItem("userId", data.userId);
        toast.success("Connexion reussie.");
        navigate("/accueil");
        return;
      }

      const message = data.error || data.details || data.message || "Erreur de connexion.";
      setError(message);
      toast.error(message);
    } catch (err) {
      const message = err.message || "Impossible de contacter le serveur.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        {error ? <div className="muted" style={{ color: "#b00020", marginBottom: "12px" }}>{error}</div> : null}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p style={{ marginTop: "12px" }}>
        Pas encore enregistree ? <Link to="/register">Cree un compte</Link>
      </p>
    </div>
  );
}

export default Login;
