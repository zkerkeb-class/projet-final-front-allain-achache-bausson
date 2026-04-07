import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../config/api";
import { useToast } from "../context/ToastContext";

function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const res = await fetch(buildApiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success("Compte cr??. Tu peux maintenant te connecter.");
      navigate("/login");
    } else {
      toast.error(data.message || "Erreur lors de l'inscription.");
    }
  };

  return (
    <div className="panel" style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Créer un compte</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <button className="btn primary" type="submit">S'enregistrer</button>
      </form>
    </div>
  );
}

export default Register;
