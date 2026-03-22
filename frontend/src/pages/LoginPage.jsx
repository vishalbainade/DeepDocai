import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FileText, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { login, isAuthenticated } from '../services/api';
import DeepDocAILogo from '../components/DeepDocAILogo';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const LoginPage = () => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // If user is already authenticated, redirect to chat
  if (isAuthenticated()) {
    return <Navigate to="/chat" replace />;
  }

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        // Redirect to OTP verification page
        navigate('/verify-otp', {
          state: {
            email: formData.email,
            type: 'login'
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 transition-colors duration-300" style={{ backgroundColor: dc.bgSecondary }}>
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center gap-2 mb-6 transition-colors duration-300" style={{ color: dc.textSecondary }}>
          <ArrowLeft size={20} />
          Back to Home
        </Link>

        <div className="rounded-2xl shadow-xl p-8 transition-colors duration-300" style={{ backgroundColor: dc.bgPrimary, border: `1px solid ${dc.borderPrimary}` }}>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <DeepDocAILogo size="large" useOriginalLogo={true} />
            </div>
            <h1 className="text-3xl font-bold mb-2 transition-colors duration-300" style={{ color: dc.textPrimary }}>Welcome Back</h1>
            <p className="transition-colors duration-300" style={{ color: dc.textSecondary }}>Sign in to your DeepDoc AI account</p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 transition-colors duration-300" style={{ color: dc.textPrimary }}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#8E84B8] transition-all duration-300"
                style={{ backgroundColor: dc.bgSecondary, color: dc.textPrimary, border: `1px solid ${dc.borderPrimary}` }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 transition-colors duration-300" style={{ color: dc.textPrimary }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 pr-10 rounded-lg focus:ring-2 focus:ring-[#8E84B8] transition-all duration-300"
                  style={{ backgroundColor: dc.bgSecondary, color: dc.textPrimary, border: `1px solid ${dc.borderPrimary}` }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-[#8E84B8] hover:text-[#7A70A8] font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#8E84B8] text-white rounded-lg hover:bg-[#7A70A8] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#8E84B8] hover:text-[#7A70A8] font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

