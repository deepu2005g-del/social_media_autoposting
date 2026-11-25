import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Scheduled from "./pages/Scheduled";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RootRedirect = () => {
  const token = localStorage.getItem("token");
  const search = window.location.search || "";
  if (token) return <Navigate to={`/dashboard${search}`} replace />;
  return <Navigate to={`/login${search}`} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/scheduled" element={<ProtectedRoute><Scheduled /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;