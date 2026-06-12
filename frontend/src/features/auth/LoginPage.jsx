import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, verify2FA, forgotPassword, resetPassword } from '../../services/auth';
import { Mail, Lock, Key, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ynovLogo from '../../assets/MAROC-YNOV-CAMPUS-768x362-min-600x600.png';
import GlobalLoader from '../../components/GlobalLoader';

const LoginPage = () => {
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAction = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (step === 'login') {
        const data = await login(email, password);
        data.requires_2fa ? setStep('2fa') : navigate('/');
      } else if (step === '2fa') {
        await verify2FA(email, code);
        toast.success('Login successful');
        navigate('/');
      } else if (step === 'forgot') {
        await forgotPassword(email);
        toast.success('Reset code sent to your email');
        setStep('verify-reset');
      } else if (step === 'verify-reset') {
        if (!code) throw new Error("Please enter the code");
        setStep('reset');
      } else if (step === 'reset') {
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        await resetPassword(email, password, code);
        toast.success('Password reset successfully');
        setStep('login');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {isLoading && <GlobalLoader />}

      <div className="w-full max-w-4xl bg-surface border border-border/40 rounded-3xl shadow-2xl overflow-hidden flex min-h-137.5">

        {/* Left Branding Panel - Solid Dark Slate / Black Theme */}
        <div className="hidden lg:flex w-1/2 bg-secondary p-12 flex-col justify-between relative border-r border-border/20">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img src="/EduTrack-Logo.jpeg" alt="EduTrack Logo" className="h-10 w-10 rounded-xl object-cover shadow-md" />
              <span className="text-xl font-bold tracking-tight text-white">EduTrack<span className="text-primary">.</span></span>
            </div>
            <div className="pt-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">
                Predictive Student Analytics
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Turn institutional metrics into real-time preventative academic operations.
              </p>
            </div>
          </div>

          {/* Institutional Partner Footer */}
          <div className="flex items-center space-x-4 border-t border-border/20 pt-6">
            <img src={ynovLogo} alt="Ynov Campus Logo" className="h-18 w-auto brightness-0 invert opacity-60" />
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center bg-surface">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text-main capitalize tracking-tight">{step.replace('-', ' ')}</h2>
            <p className="text-sm text-text-muted mt-1">Please enter your credentials to access the system.</p>
          </div>

          <AnimatePresence mode="wait">
            <form key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} onSubmit={handleAction} className="space-y-4">
              {(step === 'login' || step === 'forgot') && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-text-muted tracking-wider">Email</label>
                  <div className="relative flex items-center">
                    <Mail className="w-5 h-5 absolute left-3 text-text-muted" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-border/60 rounded-xl bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm" placeholder="username@ynov.com" />
                  </div>
                </div>
              )}
              {(step === 'login' || step === 'reset') && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-text-muted tracking-wider">{step === 'reset' ? 'New Password' : 'Password'}</label>
                  <div className="relative flex items-center">
                    <Lock className="w-5 h-5 absolute left-3 text-text-muted" />
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-border/60 rounded-xl bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm" placeholder="••••••••" />
                  </div>
                </div>
              )}
              {step === 'reset' && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-text-muted tracking-wider">Confirm Password</label>
                  <div className="relative flex items-center">
                    <Lock className="w-5 h-5 absolute left-3 text-text-muted" />
                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-border/60 rounded-xl bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm" placeholder="••••••••" />
                  </div>
                </div>
              )}
              {(step === '2fa' || step === 'verify-reset') && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-text-muted tracking-wider">Verification Code</label>
                  <div className="relative flex items-center">
                    <Key className="w-5 h-5 absolute left-3 text-text-muted" />
                    <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-border/60 rounded-xl bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono tracking-widest text-center text-sm" placeholder="000000" />
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center cursor-pointer mt-2 text-sm">
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Continue to Dashboard'}
              </button>
            </form>
          </AnimatePresence>

          <div className="mt-6 text-center">
            {step === 'login' && (
              <button onClick={() => setStep('forgot')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                Forgot your password?
              </button>
            )}
            {step !== 'login' && (
              <button onClick={() => setStep('login')} className="text-xs font-semibold text-text-muted hover:text-text-main inline-flex items-center cursor-pointer transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;