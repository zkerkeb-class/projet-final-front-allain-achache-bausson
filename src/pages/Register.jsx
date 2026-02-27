import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      alert("Compte créé, connectez-vous !");
      navigate("/login");
    } else {
      alert(data.message || "Erreur lors de l'inscription");
    }
  };

  return (
    <div className="panel" style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Créer un compte</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="btn primary" type="submit">S'enregistrer</button>
      </form>
    </div>
  );
}

export default Register;