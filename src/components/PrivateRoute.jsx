import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;