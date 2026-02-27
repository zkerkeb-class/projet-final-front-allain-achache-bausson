import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {
  // On suppose que tu stockes le token dans localStorage après login
  const token = localStorage.getItem("token");
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;