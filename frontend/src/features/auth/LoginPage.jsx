import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, verify2FA, forgotPassword, resetPassword } from '../../services/auth';
import { Mail, Lock, Key, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/MAROC-YNOV-CAMPUS-768x362-min-600x600.png';
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
      // } catch (err) {
      //   toast.error(err.message || 'An error occurred.');
      // }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred.';
      toast.error(errorMessage);
    }
    finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {isLoading && <GlobalLoader />}
      <div className="w-full max-w-4xl bg-surface rounded-3xl shadow-2xl overflow-hidden flex min-h-125">
        <div className="hidden lg:flex w-1/2 bg-secondary p-12 flex-col justify-between text-white">
          <div>
            <h2 className="text-3xl font-bold mb-4">Welcome Back</h2>
            <p className="text-gray-400">Access your EduTrack Analytics dashboard.</p>
          </div>
          <img src={logo} alt="Logo" className="w-48 brightness-0 invert" />
        </div>

        <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-secondary capitalize mb-8">{step.replace('-', ' ')}</h2>
          <AnimatePresence mode="wait">
            <form key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleAction} className="space-y-4">
              {(step === 'login' || step === 'forgot') && (
                <div>
                  <label className="block text-xs font-bold uppercase text-text-muted mb-1">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none cursor-text" />
                </div>
              )}
              {(step === 'login' || step === 'reset') && (
                <div>
                  <label className="block text-xs font-bold uppercase text-text-muted mb-1">{step === 'reset' ? 'New Password' : 'Password'}</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none" />
                </div>
              )}
              {step === 'reset' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-text-muted mb-1">Confirm Password</label>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none" />
                </div>
              )}
              {(step === '2fa' || step === 'verify-reset') && (
                <div>
                  <label className="block text-xs font-bold uppercase text-text-muted mb-1">Verification Code</label>
                  <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none tracking-widest font-mono text-center" />
                </div>
              )}
              <button type="submit" disabled={isLoading} className="w-full bg-primary text-white p-3 rounded-lg font-bold hover:opacity-90 transition shadow-lg shadow-primary/20 cursor-pointer">
                {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Continue'}
              </button>
            </form>
          </AnimatePresence>

          {step === 'login' && <button onClick={() => setStep('forgot')} className="mt-4 text-sm text-primary hover:underline cursor-pointer">Forgot password?</button>}
          {step !== 'login' && <button onClick={() => setStep('login')} className="mt-4 text-sm text-text-muted flex items-center cursor-pointer"><ArrowLeft className="w-4 h-4 mr-1" /> Back to login</button>}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;