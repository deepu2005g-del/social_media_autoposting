import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import AuthLayout from "../components/AuthLayout";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      return setError("Please enter your full name.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return setError("Please enter a valid email address.");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      localStorage.removeItem("token");
      const res = await axios.post(`${API}/auth/signup`, {
        full_name: trimmedName,
        email: trimmedEmail,
        password,
      });
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 500) {
        setError("Server error during registration. Please try again.");
      } else if (!err.response) {
        setError("Unable to connect to the server. Please ensure the backend is running.");
      } else {
        setError(err.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="auth-card-title">Create Account</h2>
      <p className="auth-card-subtitle">Start your AI-powered social growth journey</p>

      <form onSubmit={handleSignup} className="auth-form" noValidate>
        <div className="auth-field">
          <label htmlFor="signup-name" className="auth-label">Full Name</label>
          <div className="auth-input-wrap">
            <User size={17} className="auth-input-icon" />
            <input
              id="signup-name"
              type="text"
              placeholder="Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="auth-input"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="signup-email" className="auth-label">Email Address</label>
          <div className="auth-input-wrap">
            <Mail size={17} className="auth-input-icon" />
            <input
              id="signup-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="signup-password" className="auth-label">Password</label>
          <div className="auth-input-wrap">
            <Lock size={17} className="auth-input-icon" />
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input has-toggle"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="auth-eye-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="signup-confirm-password" className="auth-label">Confirm Password</label>
          <div className="auth-input-wrap">
            <Lock size={17} className="auth-input-icon" />
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="auth-input has-toggle"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="auth-eye-btn"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?{" "}
        <Link to="/login" className="auth-link-btn">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;
