import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #004d20 0%, #009639 50%, #00b347 100%)',
        padding: '20px',
        fontFamily: "'Segoe UI', Arial, sans-serif",
    },
    card: {
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        width: '100%',
        maxWidth: '460px',
        overflow: 'hidden',
    },
    header: {
        background: 'linear-gradient(135deg, #009639, #00b347)',
        padding: '28px 32px 24px',
        textAlign: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: '1.5rem',
        fontWeight: 700,
        margin: 0,
        letterSpacing: '-0.3px',
    },
    headerSub: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: '0.85rem',
        margin: '4px 0 0',
    },
    body: {
        padding: '32px',
    },
    stepIndicator: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '28px',
        gap: 0,
    },
    stepDot: (active, done) => ({
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.85rem',
        background: done ? '#009639' : active ? '#009639' : '#e8e8e8',
        color: done || active ? '#fff' : '#999',
        transition: 'all 0.3s ease',
        flexShrink: 0,
        border: active && !done ? '3px solid #00b347' : '3px solid transparent',
    }),
    stepLine: (done) => ({
        flex: 1,
        height: 3,
        background: done ? '#009639' : '#e8e8e8',
        transition: 'background 0.3s ease',
        margin: '0 4px',
    }),
    stepLabel: {
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '24px',
    },
    stepLabelItem: (active) => ({
        fontSize: '0.7rem',
        color: active ? '#009639' : '#aaa',
        fontWeight: active ? 700 : 400,
        width: '33%',
        textAlign: 'center',
    }),
    stepTitle: {
        fontSize: '1.15rem',
        fontWeight: 700,
        color: '#1a1a2e',
        margin: '0 0 6px',
    },
    stepDesc: {
        fontSize: '0.875rem',
        color: '#666',
        margin: '0 0 24px',
        lineHeight: 1.5,
    },
    label: {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#444',
        marginBottom: '6px',
    },
    input: {
        width: '100%',
        padding: '11px 14px',
        border: '1.5px solid #ddd',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
        marginBottom: '18px',
    },
    btn: {
        width: '100%',
        padding: '13px',
        background: 'linear-gradient(135deg, #009639, #00b347)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'opacity 0.2s, transform 0.1s',
        marginTop: '4px',
    },
    btnDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    alert: (type) => ({
        padding: '12px 14px',
        borderRadius: '8px',
        fontSize: '0.875rem',
        marginBottom: '16px',
        background: type === 'error' ? '#fdecea' : '#e8f5e9',
        color: type === 'error' ? '#c62828' : '#2e7d32',
        border: `1px solid ${type === 'error' ? '#ef9a9a' : '#a5d6a7'}`,
        lineHeight: 1.5,
    }),
    otpRow: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    otpBox: (filled) => ({
        width: 48,
        height: 56,
        border: `2px solid ${filled ? '#009639' : '#ddd'}`,
        borderRadius: '10px',
        fontSize: '1.6rem',
        fontWeight: 700,
        textAlign: 'center',
        outline: 'none',
        transition: 'border-color 0.2s',
        color: '#1a1a2e',
        background: filled ? '#f0faf4' : '#fff',
        caretColor: 'transparent',
    }),
    timerRow: {
        textAlign: 'center',
        fontSize: '0.82rem',
        color: '#888',
        marginBottom: '16px',
    },
    timerExpired: {
        color: '#c62828',
        fontWeight: 600,
    },
    resendLink: {
        color: '#009639',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '0.85rem',
        textDecoration: 'underline',
        padding: 0,
    },
    backLink: {
        display: 'block',
        textAlign: 'center',
        marginTop: '18px',
        color: '#009639',
        fontSize: '0.85rem',
        textDecoration: 'none',
        fontWeight: 600,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        width: '100%',
    },
    strengthBar: {
        height: 5,
        borderRadius: 4,
        marginTop: 6,
        marginBottom: 14,
        transition: 'width 0.3s, background 0.3s',
    },
    strengthLabel: {
        fontSize: '0.75rem',
        marginTop: -10,
        marginBottom: 14,
    },
    successIcon: {
        textAlign: 'center',
        fontSize: '4rem',
        marginBottom: '16px',
    },
};

// ─── Password Strength ────────────────────────────────────────────────────────
function getPasswordStrength(password) {
    if (!password) return { score: 0, label: '', color: '#eee', width: '0%' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const map = [
        { label: 'Very Weak', color: '#ef5350', width: '20%' },
        { label: 'Weak', color: '#ff7043', width: '40%' },
        { label: 'Fair', color: '#ffa726', width: '60%' },
        { label: 'Good', color: '#66bb6a', width: '80%' },
        { label: 'Strong', color: '#2e7d32', width: '100%' },
    ];
    return { score, ...map[Math.max(0, score - 1)] };
}

// ─── OTP Input Component ──────────────────────────────────────────────────────
const OtpInput = ({ value, onChange }) => {
    const inputRefs = useRef([]);
    const digits = value.split('');

    const focusAt = (i) => {
        if (inputRefs.current[i]) inputRefs.current[i].focus();
    };

    const handleKey = (e, i) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            const next = digits.slice();
            if (next[i]) {
                next[i] = '';
                onChange(next.join(''));
            } else if (i > 0) {
                next[i - 1] = '';
                onChange(next.join(''));
                focusAt(i - 1);
            }
        } else if (e.key === 'ArrowLeft' && i > 0) {
            focusAt(i - 1);
        } else if (e.key === 'ArrowRight' && i < 5) {
            focusAt(i + 1);
        }
    };

    const handleChange = (e, i) => {
        const val = e.target.value.replace(/\D/g, '').slice(-1);
        if (!val) return;
        const next = digits.slice();
        next[i] = val;
        onChange(next.join(''));
        if (i < 5) focusAt(i + 1);
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        onChange(pasted.padEnd(6, '').slice(0, 6));
        focusAt(Math.min(pasted.length, 5));
    };

    return (
        <div style={styles.otpRow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                    key={i}
                    id={`otp-digit-${i}`}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i] || ''}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKey(e, i)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    style={styles.otpBox(!!digits[i])}
                    autoComplete="one-time-code"
                />
            ))}
        </div>
    );
};

// ─── Countdown Timer ──────────────────────────────────────────────────────────
const CountdownTimer = ({ expiresAt, onExpired }) => {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        const tick = () => {
            const diff = Math.max(0, expiresAt - Date.now());
            setRemaining(diff);
            if (diff === 0) onExpired();
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, onExpired]);

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);

    if (remaining === 0) {
        return <p style={{ ...styles.timerRow, ...styles.timerExpired }}>⏰ Code expired. Please request a new one.</p>;
    }

    return (
        <p style={styles.timerRow}>
            Code expires in{' '}
            <strong style={{ color: remaining < 60000 ? '#c62828' : '#009639' }}>
                {mins}:{secs.toString().padStart(2, '0')}
            </strong>
        </p>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ForgotPassword = () => {
    const navigate = useNavigate();

    // Step 1
    const [email, setEmail] = useState('');
    // Step 2
    const [otp, setOtp] = useState('');
    const [otpExpiry, setOtpExpiry] = useState(null);
    const [otpExpired, setOtpExpired] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    // Step 3
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Shared state
    const [step, setStep] = useState(1); // 1 | 2 | 3 | 'success'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const strength = getPasswordStrength(password);

    // Resend cooldown ticker
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleExpired = useCallback(() => setOtpExpired(true), []);

    // ── Step 1: Request OTP ──
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/forgot-password', { email });
            setInfo(res.data.message);
            setOtpExpiry(Date.now() + 10 * 60 * 1000);
            setOtpExpired(false);
            setResendCooldown(60);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ──
    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/forgot-password', { email });
            setOtp('');
            setOtpExpiry(Date.now() + 10 * 60 * 1000);
            setOtpExpired(false);
            setResendCooldown(60);
            setInfo('A new code has been sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify OTP ──
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length < 6) return setError('Please enter all 6 digits.');
        if (otpExpired) return setError('This code has expired. Please request a new one.');
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/verify-otp', { email, otp });
            setResetToken(res.data.resetToken);
            setStep(3);
            setError('');
            setInfo('');
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Reset Password ──
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) return setError('Passwords do not match.');
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/reset-password', { resetToken, password });
            setStep('success');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please start over.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render helpers ──
    const StepIndicator = () => (
        <>
            <div style={styles.stepIndicator}>
                {[1, 2, 3].map((s, idx) => (
                    <React.Fragment key={s}>
                        <div style={styles.stepDot(step === s, step === 'success' || (typeof step === 'number' && step > s))}>
                            {step === 'success' || (typeof step === 'number' && step > s) ? '✓' : s}
                        </div>
                        {idx < 2 && (
                            <div style={styles.stepLine(step === 'success' || (typeof step === 'number' && step > s + 0))} />
                        )}
                    </React.Fragment>
                ))}
            </div>
            <div style={styles.stepLabel}>
                <span style={styles.stepLabelItem(step === 1)}>Email</span>
                <span style={styles.stepLabelItem(step === 2)}>Verify Code</span>
                <span style={styles.stepLabelItem(step === 3)}>New Password</span>
            </div>
        </>
    );

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.headerTitle}>🔐 Reset Password</h1>
                    <p style={styles.headerSub}>Old Mutual Vehicle Requisition System</p>
                </div>

                <div style={styles.body}>
                    {step !== 'success' && <StepIndicator />}

                    {/* Alerts */}
                    {error && <div id="reset-error-alert" style={styles.alert('error')}>⚠ {error}</div>}
                    {info && !error && <div id="reset-info-alert" style={styles.alert('success')}>✓ {info}</div>}

                    {/* ── STEP 1: Email ── */}
                    {step === 1 && (
                        <form id="forgot-password-form" onSubmit={handleRequestOtp}>
                            <p style={styles.stepTitle}>Forgot your password?</p>
                            <p style={styles.stepDesc}>
                                Enter your work email address and we'll send you a 6-digit verification code.
                            </p>
                            <label style={styles.label} htmlFor="reset-email">Work Email Address</label>
                            <input
                                id="reset-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="e.g. yourname@oldmutual.rw"
                                style={styles.input}
                                onFocus={(e) => (e.target.style.borderColor = '#009639')}
                                onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                            />
                            <button
                                id="send-otp-btn"
                                type="submit"
                                style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
                                disabled={loading}
                            >
                                {loading ? 'Sending Code…' : 'Send Verification Code →'}
                            </button>
                            <button style={styles.backLink} onClick={() => navigate('/login')} type="button">
                                ← Back to Login
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2: OTP ── */}
                    {step === 2 && (
                        <form id="verify-otp-form" onSubmit={handleVerifyOtp}>
                            <p style={styles.stepTitle}>Enter verification code</p>
                            <p style={styles.stepDesc}>
                                We sent a 6-digit code to <strong>{email}</strong>. Check your inbox (and spam folder).
                            </p>

                            <OtpInput value={otp} onChange={setOtp} />

                            {otpExpiry && (
                                <CountdownTimer expiresAt={otpExpiry} onExpired={handleExpired} />
                            )}

                            <div style={{ textAlign: 'center', marginBottom: 18 }}>
                                {resendCooldown > 0 ? (
                                    <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                        Resend available in {resendCooldown}s
                                    </span>
                                ) : (
                                    <button
                                        id="resend-otp-btn"
                                        type="button"
                                        style={styles.resendLink}
                                        onClick={handleResend}
                                        disabled={loading}
                                    >
                                        Didn't receive it? Resend code
                                    </button>
                                )}
                            </div>

                            <button
                                id="verify-otp-btn"
                                type="submit"
                                style={{ ...styles.btn, ...(loading || otp.length < 6 || otpExpired ? styles.btnDisabled : {}) }}
                                disabled={loading || otp.length < 6 || otpExpired}
                            >
                                {loading ? 'Verifying…' : 'Verify Code →'}
                            </button>
                            <button style={styles.backLink} onClick={() => { setStep(1); setOtp(''); setError(''); setInfo(''); }} type="button">
                                ← Change email address
                            </button>
                        </form>
                    )}

                    {/* ── STEP 3: New Password ── */}
                    {step === 3 && (
                        <form id="reset-password-form" onSubmit={handleResetPassword}>
                            <p style={styles.stepTitle}>Set new password</p>
                            <p style={styles.stepDesc}>
                                Choose a strong password. You have <strong>5 minutes</strong> to complete this step.
                            </p>

                            <label style={styles.label} htmlFor="new-password">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="At least 8 characters"
                                    style={{ ...styles.input, paddingRight: 48 }}
                                    onFocus={(e) => (e.target.style.borderColor = '#009639')}
                                    onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: 12, top: 11,
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: '1.1rem', color: '#888',
                                    }}
                                    tabIndex={-1}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>

                            {password && (
                                <>
                                    <div style={{ ...styles.strengthBar, width: strength.width, background: strength.color }} />
                                    <p style={{ ...styles.strengthLabel, color: strength.color }}>
                                        Strength: {strength.label}
                                    </p>
                                </>
                            )}

                            <label style={styles.label} htmlFor="confirm-password">Confirm New Password</label>
                            <input
                                id="confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Repeat your new password"
                                style={{
                                    ...styles.input,
                                    borderColor: confirmPassword && confirmPassword !== password ? '#ef5350' : undefined,
                                }}
                                onFocus={(e) => (e.target.style.borderColor = '#009639')}
                                onBlur={(e) => (e.target.style.borderColor = confirmPassword && confirmPassword !== password ? '#ef5350' : '#ddd')}
                            />

                            <button
                                id="set-password-btn"
                                type="submit"
                                style={{ ...styles.btn, ...(loading || !password || !confirmPassword ? styles.btnDisabled : {}) }}
                                disabled={loading || !password || !confirmPassword}
                            >
                                {loading ? 'Resetting Password…' : '✓ Set New Password'}
                            </button>
                        </form>
                    )}

                    {/* ── SUCCESS ── */}
                    {step === 'success' && (
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={styles.successIcon}>🎉</div>
                            <p style={{ ...styles.stepTitle, textAlign: 'center', fontSize: '1.3rem' }}>
                                Password Reset!
                            </p>
                            <p style={{ color: '#555', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
                                Your password has been successfully updated. You can now log in with your new credentials.
                            </p>
                            <div style={{ ...styles.alert('success'), textAlign: 'left' }}>
                                🔒 For your security, all active sessions have been invalidated. Please log in again.
                            </div>
                            <button
                                id="go-to-login-btn"
                                style={styles.btn}
                                onClick={() => navigate('/login')}
                            >
                                Go to Login →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
