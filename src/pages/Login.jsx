import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    // appel API pour login
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId); // pour filtrer les vêtements par user
      navigate("/accueil");
    } else {
      alert(data.message || "Erreur login");
    }
  };

  return (
    <div className="panel" style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="btn primary" type="submit">Se connecter</button>
      </form>
      <p style={{ marginTop: "12px" }}>
        Pas encore enregistré ? <Link to="/register">Cliquez ici</Link>
      </p>
    </div>
  );
}

export default Login;