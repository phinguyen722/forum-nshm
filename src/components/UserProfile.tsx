import { useState, useEffect } from 'react';
import { User, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { Loader2, CheckCircle, AlertCircle, User as UserIcon, Lock } from 'lucide-react';

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.displayName || '');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoadingProfile(true);
    setProfileMessage({ type: '', text: '' });
    
    try {
      await updateProfile(user, { displayName });
      setProfileMessage({ type: 'success', text: 'Cập nhật tên hiển thị thành công!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileMessage({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật hồ sơ.' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới không khớp.' });
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }

    setLoadingPassword(true);
    setPasswordMessage({ type: '', text: '' });
    
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPasswordMessage({ type: 'error', text: 'Mật khẩu hiện tại không đúng.' });
      } else {
        setPasswordMessage({ type: 'error', text: 'Có lỗi xảy ra khi đổi mật khẩu.' });
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-[#141414] dark:text-[#E5E5E5] mb-6">Hồ sơ cá nhân</h2>
      
      {/* Profile Section */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] dark:border-[#333333] flex items-center gap-2">
          <UserIcon className="text-[#E08F24]" size={20} />
          <h3 className="font-bold text-[#141414] dark:text-[#E5E5E5]">Thông tin cơ bản</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên đăng nhập (Email)</label>
              <input
                type="text"
                value={user.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Tên đăng nhập không thể thay đổi.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên hiển thị</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị của bạn"
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                required
              />
            </div>

            {profileMessage.text && (
              <div className={`p-3 rounded text-sm flex items-center gap-2 ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {profileMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {profileMessage.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loadingProfile}
                className="px-6 py-2 bg-[#E08F24] hover:bg-[#c77a1e] text-white font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loadingProfile && <Loader2 size={16} className="animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] dark:border-[#333333] flex items-center gap-2">
          <Lock className="text-[#E08F24]" size={20} />
          <h3 className="font-bold text-[#141414] dark:text-[#E5E5E5]">Đổi mật khẩu</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                required
              />
            </div>

            {passwordMessage.text && (
              <div className={`p-3 rounded text-sm flex items-center gap-2 ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {passwordMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {passwordMessage.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loadingPassword}
                className="px-6 py-2 bg-[#E08F24] hover:bg-[#c77a1e] text-white font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loadingPassword && <Loader2 size={16} className="animate-spin" />}
                Đổi mật khẩu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
