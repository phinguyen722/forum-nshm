import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin_forum' && password === 'NsHM@2026') {
      setLoading(true);
      setError('');
      const adminEmail = 'admin_forum@system.local';
      try {
        // Try to sign in
        await signInWithEmailAndPassword(auth, adminEmail, password);
        onClose();
      } catch (err: any) {
        console.log('Admin login error:', err.code, err.message);
        // If user not found, create it
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          try {
            const userCred = await createUserWithEmailAndPassword(auth, adminEmail, password);
            await updateProfile(userCred.user, { displayName: 'Admin' });
            onClose();
          } catch (createErr: any) {
            console.error('Admin create error:', createErr.code, createErr.message);
            if (createErr.code === 'auth/operation-not-allowed') {
              setError('Tính năng đăng nhập bằng Email/Mật khẩu chưa được bật trên Firebase. Vui lòng bật trong Firebase Console > Authentication > Sign-in method.');
            } else {
              setError(`Không thể tạo tài khoản admin: ${createErr.message}`);
            }
          }
        } else if (err.code === 'auth/operation-not-allowed') {
          setError('Tính năng đăng nhập bằng Email/Mật khẩu chưa được bật trên Firebase. Vui lòng bật trong Firebase Console > Authentication > Sign-in method.');
        } else {
          setError(`Đăng nhập admin thất bại: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setError('Tài khoản hoặc mật khẩu không chính xác.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-center mb-2 text-[#141414] dark:text-[#E5E5E5]">
          Đăng nhập
        </h2>
        
        <p className="text-center text-[#8C8C8C] dark:text-[#A3A3A3] mb-8 text-sm">
          Đăng nhập để tham gia thảo luận, tải tài liệu và kết nối với các bạn học sinh khác.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded border border-red-200 dark:border-red-800/30">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="mb-6 space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="Tài khoản" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#333333] rounded bg-gray-50 dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-1 focus:ring-[#E08F24]"
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Mật khẩu" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#333333] rounded bg-gray-50 dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-1 focus:ring-[#E08F24]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E08F24] text-white py-2 rounded hover:bg-[#c77a1e] transition-colors font-medium"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Đăng nhập'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-[#333333]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-[#1E1E1E] text-gray-500">Hoặc</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#252525] border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-200 px-4 py-3 rounded hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors font-medium shadow-sm"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>Đăng nhập bằng Google</span>
        </button>
      </div>
    </div>
  );
}
