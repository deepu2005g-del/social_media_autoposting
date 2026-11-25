import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Mail, Lock } from "lucide-react";
import AuthLayout from "../components/AuthLayout";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const REMEMBER_EMAIL_KEY = "ai_social_hub_remembered_email";

function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY)));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      localStorage.removeItem("token");
      const res = await axios.post(`${API}/auth/login`, { email: trimmedEmail, password });
      localStorage.setItem("token", res.data.access_token);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (forgotPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (forgotPassword.length < 6) {
      setForgotError("Password must be at least 6 characters long.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await axios.post(`${API}/auth/reset-password`, {
        email: forgotEmail.trim(),
        new_password: forgotPassword,
      });
      setForgotSuccess(res.data.message || "Password updated successfully!");
      setTimeout(() => {
        setEmail(forgotEmail.trim());
        setPassword("");
        setIsForgot(false);
        setForgotSuccess("");
      }, 1800);
    } catch (err) {
      setForgotError(err.response?.data?.detail || "Failed to reset password. Please check the email.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <AuthLayout>
      {!isForgot ? (
        <>
          <h2 className="auth-card-title">Welcome Back</h2>
          <p className="auth-card-subtitle">Sign in to your AI Social Hub workspace</p>

          <form onSubmit={handleLogin} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={17} className="auth-input-icon" />
                <input
                  id="login-email"
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
              <label htmlFor="login-password" className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input has-toggle"
                  autoComplete="current-password"
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

            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="auth-checkbox"
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsForgot(true);
                  setForgotEmail(email);
                  setForgotError("");
                  setForgotSuccess("");
                  setForgotPassword("");
                  setConfirmPassword("");
                }}
                className="auth-link-btn"
              >
                Forgot Password?
              </button>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="auth-footer">
            New to AI Social Hub?{" "}
            <Link to="/signup" className="auth-link-btn">
              Create Account
            </Link>
          </p>
        </>
      ) : (
        <>
          <h2 className="auth-card-title">Reset Password</h2>
          <p className="auth-card-subtitle">Enter your account email and choose a new password</p>

          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="auth-field">
              <label htmlFor="forgot-email" className="auth-label">Account Email</label>
              <div className="auth-input-wrap">
                <Mail size={17} className="auth-input-icon" />
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="auth-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="forgot-password" className="auth-label">New Password</label>
              <div className="auth-input-wrap">
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="forgot-password"
                  type={showForgotPw ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={forgotPassword}
                  onChange={(e) => setForgotPassword(e.target.value)}
                  required
                  className="auth-input has-toggle"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotPw((prev) => !prev)}
                  className="auth-eye-btn"
                  aria-label={showForgotPw ? "Hide password" : "Show password"}
                >
                  {showForgotPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="forgot-confirm" className="auth-label">Confirm New Password</label>
              <div className="auth-input-wrap">
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="forgot-confirm"
                  type={showForgotPw ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-input has-toggle"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotPw((prev) => !prev)}
                  className="auth-eye-btn"
                  aria-label={showForgotPw ? "Hide password" : "Show password"}
                >
                  {showForgotPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {forgotError && <p className="auth-error">{forgotError}</p>}
            {forgotSuccess && <p className="auth-success">{forgotSuccess}</p>}

            <button type="submit" disabled={forgotLoading} className="auth-submit-btn">
              {forgotLoading ? "Updating Password..." : "Update Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgot(false);
                setForgotError("");
                setForgotSuccess("");
              }}
              className="auth-secondary-btn"
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

export default Login;
