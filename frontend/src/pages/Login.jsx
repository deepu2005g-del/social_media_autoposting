import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
        setLoading(true);
        setError("");
        try {
            localStorage.removeItem("token");
            const res = await axios.post(`${API}/auth/login`, { email, password });
            localStorage.setItem("token", res.data.access_token);
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
                email: forgotEmail,
                new_password: forgotPassword,
            });
            setForgotSuccess(res.data.message || "Password updated successfully!");
            setTimeout(() => {
                setEmail(forgotEmail);
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
        <div style={styles.container}>
            {/* Decorative background blobs for color */}
            <div style={styles.blob1}></div>
            <div style={styles.blob2}></div>

            <div style={styles.glassCard}>
                <div style={styles.logoContainer}>
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
                        alt="LinkedIn Logo"
                        style={styles.logo}
                    />
                </div>

                {!isForgot ? (
                    <>
                        <h1 style={styles.title}>Welcome Back</h1>
                        <p style={styles.subtitle}>Supercharge your LinkedIn with AI</p>

                        <form onSubmit={handleLogin} style={styles.form} autoComplete="off">
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={styles.input}
                                    autoComplete="off"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <div style={styles.labelRow}>
                                    <label style={styles.label}>Password</label>
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
                                        style={styles.forgotBtn}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div style={styles.passwordWrapper}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        id="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{ ...styles.input, paddingRight: "48px" }}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                        className="eye-toggle-btn"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {error && <p style={styles.error}>{error}</p>}

                            <button type="submit" disabled={loading} style={styles.button}>
                                {loading ? "Logging in..." : "Login to Dashboard"}
                            </button>
                        </form>

                        <p style={styles.footer}>
                            New here? <Link to="/signup" style={styles.link}>Create a professional account</Link>
                        </p>
                    </>
                ) : (
                    <>
                        <h1 style={styles.title}>Reset Password</h1>
                        <p style={styles.subtitle}>Enter your account email and choose a new password</p>

                        <form onSubmit={handleResetPassword} style={styles.form} autoComplete="off">
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Account Email</label>
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                    style={styles.input}
                                    autoComplete="off"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>New Password</label>
                                <div style={styles.passwordWrapper}>
                                    <input
                                        type={showForgotPw ? "text" : "password"}
                                        placeholder="At least 6 characters"
                                        value={forgotPassword}
                                        onChange={(e) => setForgotPassword(e.target.value)}
                                        required
                                        style={{ ...styles.input, paddingRight: "48px" }}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPw(!showForgotPw)}
                                        style={styles.eyeButton}
                                        className="eye-toggle-btn"
                                        aria-label={showForgotPw ? "Hide password" : "Show password"}
                                        title={showForgotPw ? "Hide password" : "Show password"}
                                    >
                                        {showForgotPw ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Confirm New Password</label>
                                <div style={styles.passwordWrapper}>
                                    <input
                                        type={showForgotPw ? "text" : "password"}
                                        placeholder="Re-enter new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        style={{ ...styles.input, paddingRight: "48px" }}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPw(!showForgotPw)}
                                        style={styles.eyeButton}
                                        className="eye-toggle-btn"
                                        aria-label={showForgotPw ? "Hide password" : "Show password"}
                                        title={showForgotPw ? "Hide password" : "Show password"}
                                    >
                                        {showForgotPw ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {forgotError && <p style={styles.error}>{forgotError}</p>}
                            {forgotSuccess && <p style={styles.success}>{forgotSuccess}</p>}

                            <button type="submit" disabled={forgotLoading} style={styles.button}>
                                {forgotLoading ? "Resetting Password..." : "Update Password"}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgot(false);
                                    setForgotError("");
                                    setForgotSuccess("");
                                }}
                                style={styles.backBtn}
                            >
                                <ArrowLeft size={16} /> Back to Login
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a1628 0%, #1e293b 100%)",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
    },
    blob1: {
        position: "absolute",
        top: "-10%",
        right: "-10%",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(0, 119, 181, 0.4) 0%, transparent 70%)",
        filter: "blur(60px)",
        zIndex: 0,
    },
    blob2: {
        position: "absolute",
        bottom: "-10%",
        left: "-10%",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
        filter: "blur(60px)",
        zIndex: 0,
    },
    glassCard: {
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "32px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "48px",
        width: "100%",
        maxWidth: "460px",
        boxShadow: "0 40px 100px -20px rgba(0, 0, 0, 0.5)",
        zIndex: 10,
        animation: "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
    },
    logoContainer: {
        display: "flex",
        justifyContent: "center",
        marginBottom: "24px",
    },
    logo: {
        width: "48px",
        height: "48px",
        filter: "drop-shadow(0 0 10px rgba(0, 119, 181, 0.5))",
    },
    title: {
        color: "#fff",
        fontSize: "36px",
        fontWeight: "800",
        marginBottom: "12px",
        textAlign: "center",
        letterSpacing: "-1px",
        background: "linear-gradient(to right, #fff, #94a3b8)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },
    subtitle: {
        color: "#94a3b8",
        fontSize: "17px",
        marginBottom: "40px",
        textAlign: "center",
        fontWeight: "400",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    labelRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    label: {
        color: "#cbd5e1",
        fontSize: "14px",
        fontWeight: "600",
        marginLeft: "4px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    forgotBtn: {
        background: "none",
        border: "none",
        color: "#00a0dc",
        fontSize: "13px",
        cursor: "pointer",
        padding: "0",
        fontWeight: "600",
        transition: "color 0.2s ease",
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "16px 20px",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#fff",
        fontSize: "16px",
        outline: "none",
        transition: "all 0.3s ease",
        "&:focus": {
            border: "1px solid #0077b5",
            background: "rgba(255, 255, 255, 0.05)",
        }
    },
    button: {
        padding: "16px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)",
        color: "#fff",
        border: "none",
        fontSize: "17px",
        fontWeight: "700",
        cursor: "pointer",
        marginTop: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 119, 181, 0.4)",
        transition: "all 0.3s ease",
    },
    backBtn: {
        background: "transparent",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        color: "#94a3b8",
        padding: "14px",
        borderRadius: "16px",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: "all 0.2s ease",
        marginTop: "4px",
    },
    error: {
        color: "#f87171",
        fontSize: "14px",
        textAlign: "center",
        background: "rgba(248, 113, 113, 0.1)",
        padding: "12px",
        borderRadius: "12px",
        border: "1px solid rgba(248, 113, 113, 0.2)",
    },
    success: {
        color: "#4ade80",
        fontSize: "14px",
        textAlign: "center",
        background: "rgba(74, 222, 128, 0.1)",
        padding: "12px",
        borderRadius: "12px",
        border: "1px solid rgba(74, 222, 128, 0.2)",
    },
    footer: {
        color: "#64748b",
        fontSize: "15px",
        marginTop: "32px",
        textAlign: "center",
    },
    link: {
        color: "#00a0dc",
        textDecoration: "none",
        fontWeight: "700",
        transition: "color 0.2s ease",
    },
    passwordWrapper: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
    },
    eyeButton: {
        position: "absolute",
        right: "14px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#94a3b8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px",
        borderRadius: "8px",
        zIndex: 10,
        userSelect: "none",
    },
};

export default Login;
