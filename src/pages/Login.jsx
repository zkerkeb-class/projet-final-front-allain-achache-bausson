import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildApiUrl, readApiError } from "../config/api";
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

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        login(data);
        localStorage.setItem("userId", data.userId);
        toast.success("Connexion réussie.");
        navigate("/accueil");
        return;
      }

      const message = await readApiError(res, "Erreur de connexion.");
      setError(message);
      toast.error(message);
    } catch (err) {
      const isNetworkError =
        err?.name === "TypeError" &&
        String(err?.message || "").toLowerCase().includes("fetch");
      const message = isNetworkError
        ? "Serveur injoignable. Vérifie que le back tourne sur http://localhost:5000."
        : err.message || "Impossible de contacter le serveur.";
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
        Pas encore enregistrée ? <Link to="/register">Crée un compte</Link>
      </p>
    </div>
  );
}

export default Login;
