import { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Bell, MessageSquare, Loader2, AlertCircle, ShieldAlert, Calendar, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { Post } from '../types';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'approval' | 'popup' | 'filter' | 'calendar' | 'about'>('approval');
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Popup state
  const [popupTitle, setPopupTitle] = useState('');
  const [popupContent, setPopupContent] = useState('');
  const [popupLink, setPopupLink] = useState('');
  const [popupLinkText, setPopupLinkText] = useState('');
  const [isPopupActive, setIsPopupActive] = useState(false);
  const [savingPopup, setSavingPopup] = useState(false);

  // Filter state
  const [bannedWords, setBannedWords] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);

  // Calendar state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  // About Us state
  const [aboutContent, setAboutContent] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);

  useEffect(() => {
    // Fetch pending posts
    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPendingPosts(postsData);
      setLoading(false);
    });

    // Fetch current popup settings
    const fetchPopup = async () => {
      const docRef = doc(db, 'system', 'global_popup');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPopupTitle(data.title || '');
        setPopupContent(data.content || '');
        setPopupLink(data.link || '');
        setPopupLinkText(data.linkText || '');
        setIsPopupActive(data.active || false);
      }
    };
    fetchPopup();

    // Fetch banned words
    const fetchBannedWords = async () => {
      const docRef = doc(db, 'system', 'banned_words');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.words && Array.isArray(data.words)) {
          setBannedWords(data.words.join(', '));
        }
      }
    };
    fetchBannedWords();

    // Fetch events
    const qEvents = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const eventsData: any[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() });
      });
      setEvents(eventsData);
    });

    // Fetch about content
    const fetchAboutContent = async () => {
      const docRef = doc(db, 'system', 'about_us');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAboutContent(docSnap.data().content || '');
      }
    };
    fetchAboutContent();

    return () => {
      unsubscribePosts();
      unsubscribeEvents();
    };
  }, []);

  const handleApprove = async (post: Post) => {
    if (!post.id) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), { status: 'approved' });
      
      // Create notification for the author
      await addDoc(collection(db, 'notifications'), {
        userId: post.authorId,
        type: 'post_approved',
        postId: post.id,
        postTitle: post.title,
        actorName: 'Admin',
        createdAt: Date.now(),
        read: false
      });
      
      // Broadcast to everyone
      await addDoc(collection(db, 'notifications'), {
        userId: 'all',
        type: 'new_post',
        postId: post.id,
        postTitle: post.title,
        actorName: post.authorName,
        createdAt: Date.now(),
        read: false
      });
      
      alert('Đã duyệt bài viết thành công!');
    } catch (error) {
      console.error('Error approving post:', error);
      alert('Có lỗi xảy ra khi duyệt bài.');
    }
  };

  const handleReject = async (postId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa/từ chối bài viết này?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      alert('Đã xóa bài viết.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Có lỗi xảy ra khi xóa bài.');
    }
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPopup(true);
    try {
      const popupData = {
        title: popupTitle,
        content: popupContent,
        link: popupLink,
        linkText: popupLinkText,
        active: isPopupActive,
        updatedAt: Date.now()
      };
      
      await setDoc(doc(db, 'system', 'global_popup'), popupData);
      
      // Also save to history collection
      await addDoc(collection(db, 'popups'), {
        ...popupData,
        createdAt: Date.now()
      });
      
      alert('Đã lưu cấu hình thông báo popup và thêm vào lịch sử thành công!');
    } catch (error) {
      console.error('Error saving popup:', error);
      alert('Có lỗi xảy ra khi lưu.');
    } finally {
      setSavingPopup(false);
    }
  };

  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFilter(true);
    try {
      const wordsArray = bannedWords
        .split(',')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0);
        
      await setDoc(doc(db, 'system', 'banned_words'), {
        words: wordsArray,
        updatedAt: Date.now()
      });
      alert('Đã lưu danh sách từ khóa bị chặn thành công!');
    } catch (error) {
      console.error('Error saving banned words:', error);
      alert('Có lỗi xảy ra khi lưu.');
    } finally {
      setSavingFilter(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate) return;
    
    setSavingEvent(true);
    try {
      await addDoc(collection(db, 'events'), {
        title: eventTitle,
        date: eventDate,
        createdAt: Date.now()
      });
      setEventTitle('');
      setEventDate('');
      alert('Đã thêm sự kiện thành công!');
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Có lỗi xảy ra khi thêm sự kiện.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Có lỗi xảy ra khi xóa sự kiện.');
    }
  };

  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAbout(true);
    try {
      await setDoc(doc(db, 'system', 'about_us'), {
        content: aboutContent,
        updatedAt: Date.now()
      });
      alert('Đã lưu thông tin giới thiệu thành công!');
    } catch (error) {
      console.error('Error saving about content:', error);
      alert('Có lỗi xảy ra khi lưu thông tin giới thiệu.');
    } finally {
      setSavingAbout(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden">
      <div className="flex border-b border-[#E5E5E5] dark:border-[#333333]">
        <button
          onClick={() => setActiveTab('approval')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'approval' 
              ? 'text-[#E08F24] border-b-2 border-[#E08F24] bg-orange-50/50 dark:bg-orange-900/10' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <MessageSquare size={18} />
          Duyệt bài viết
          {pendingPosts.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingPosts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('popup')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'popup' 
              ? 'text-[#E08F24] border-b-2 border-[#E08F24] bg-orange-50/50 dark:bg-orange-900/10' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Bell size={18} />
          Thông báo Popup
        </button>
        <button
          onClick={() => setActiveTab('filter')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'filter' 
              ? 'text-[#E08F24] border-b-2 border-[#E08F24] bg-orange-50/50 dark:bg-orange-900/10' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <ShieldAlert size={18} />
          Chặn từ ngữ xấu
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'calendar' 
              ? 'text-[#E08F24] border-b-2 border-[#E08F24] bg-orange-50/50 dark:bg-orange-900/10' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Calendar size={18} />
          Lịch sự kiện
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'about' 
              ? 'text-[#E08F24] border-b-2 border-[#E08F24] bg-orange-50/50 dark:bg-orange-900/10' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Info size={18} />
          Về chúng tôi
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'approval' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-[#141414] dark:text-[#E5E5E5]">Danh sách bài viết chờ duyệt</h2>
            {loading ? (
              <div className="flex justify-center py-8 text-gray-500">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : pendingPosts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-[#252525] rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <CheckCircle size={48} className="mx-auto text-green-500 mb-3 opacity-50" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Không có bài viết nào đang chờ duyệt.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPosts.map(post => (
                  <div key={post.id} className="border border-[#E5E5E5] dark:border-[#333333] rounded-lg p-4 bg-gray-50 dark:bg-[#252525]">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-[#0077CC] dark:text-[#4da3ff]">{post.title}</h3>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-3">
                          <span>Bởi: <span className="font-medium text-gray-700 dark:text-gray-300">{post.authorName}</span></span>
                          <span>Chuyên mục: <span className="font-medium text-gray-700 dark:text-gray-300">{post.subjectName || 'Khác'}</span></span>
                          <span>Thời gian: {formatTime(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                        <button 
                          onClick={() => handleApprove(post)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          <CheckCircle size={16} /> Duyệt
                        </button>
                        <button 
                          onClick={() => handleReject(post.id!)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          <Trash2 size={16} /> Xóa
                        </button>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#1E1E1E] p-3 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {post.content}
                    </div>
                    {post.mediaUrl && (
                      <div className="mt-3 text-sm">
                        <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                          <MessageSquare size={14} /> Xem tệp đính kèm
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'popup' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/30">
              <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm">
                Tính năng này cho phép hiển thị một hộp thoại thông báo (popup) nổi lên giữa màn hình cho <strong>tất cả người dùng</strong> khi họ truy cập vào trang web. Rất hữu ích để thông báo khảo sát, lịch thi, hoặc sự kiện quan trọng.
              </p>
            </div>

            <form onSubmit={handleSavePopup} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  value={popupTitle}
                  onChange={(e) => setPopupTitle(e.target.value)}
                  placeholder="VD: Khảo sát chất lượng học tập học kỳ 1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nội dung chi tiết</label>
                <textarea
                  value={popupContent}
                  onChange={(e) => setPopupContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24] resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Đường dẫn (Link) - Tùy chọn</label>
                  <input
                    type="url"
                    value={popupLink}
                    onChange={(e) => setPopupLink(e.target.value)}
                    placeholder="https://forms.gle/..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chữ hiển thị trên nút Link</label>
                  <input
                    type="text"
                    value={popupLinkText}
                    onChange={(e) => setPopupLinkText(e.target.value)}
                    placeholder="VD: Làm khảo sát ngay"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="popup-active"
                  checked={isPopupActive}
                  onChange={(e) => setIsPopupActive(e.target.checked)}
                  className="w-5 h-5 text-[#E08F24] rounded border-gray-300 focus:ring-[#E08F24]"
                />
                <label htmlFor="popup-active" className="font-medium text-[#141414] dark:text-[#E5E5E5] cursor-pointer">
                  Kích hoạt hiển thị thông báo này
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPopup}
                  className="px-6 py-2.5 bg-[#E08F24] hover:bg-[#c77a1e] text-white font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {savingPopup ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'filter' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800/30">
              <ShieldAlert className="flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm">
                <p className="font-bold mb-1">Bộ lọc từ ngữ xấu (Chặn bình luận/bài viết)</p>
                <p>Hệ thống sẽ tự động chặn người dùng đăng bài hoặc bình luận nếu nội dung chứa các từ khóa được liệt kê dưới đây.</p>
              </div>
            </div>

            <form onSubmit={handleSaveFilter} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Danh sách từ khóa bị chặn (ngăn cách bằng dấu phẩy)
                </label>
                <textarea
                  value={bannedWords}
                  onChange={(e) => setBannedWords(e.target.value)}
                  placeholder="VD: ngu ngốc, dốt, chửi thề, ..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Các từ khóa không phân biệt chữ hoa chữ thường. Nếu người dùng nhập từ khóa này, hệ thống sẽ báo lỗi và không cho phép đăng.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  type="submit"
                  disabled={savingFilter}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {savingFilter ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Lưu danh sách chặn
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/30">
              <Calendar className="flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm">
                <p className="font-bold mb-1">Quản lý Lịch sự kiện</p>
                <p>Thêm các sự kiện sắp tới để hiển thị trên thanh thông báo chung của diễn đàn.</p>
              </div>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-5 mb-8 bg-gray-50 dark:bg-[#252525] p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-lg text-[#141414] dark:text-[#E5E5E5] mb-4">Thêm sự kiện mới</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên sự kiện</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="VD: Thi học kỳ 1"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#1E1E1E] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày diễn ra</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#1E1E1E] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-6 py-2.5 bg-[#E08F24] hover:bg-[#c77a1e] text-white font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {savingEvent ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Thêm sự kiện
                </button>
              </div>
            </form>

            <div>
              <h3 className="font-bold text-lg text-[#141414] dark:text-[#E5E5E5] mb-4">Danh sách sự kiện</h3>
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                  Chưa có sự kiện nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-[#E08F24] rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xs font-bold leading-none">{new Date(event.date).getDate()}</span>
                          <span className="text-[10px] uppercase leading-none mt-0.5">Th {new Date(event.date).getMonth() + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-[#141414] dark:text-[#E5E5E5]">{event.title}</h4>
                          <p className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        title="Xóa sự kiện"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/30">
              <Info className="flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm">
                <p className="font-bold mb-1">Cập nhật thông tin Về chúng tôi</p>
                <p>Nội dung này sẽ được hiển thị trên trang "Về chúng tôi" của diễn đàn. Bạn có thể chèn hình ảnh, video, và định dạng văn bản.</p>
              </div>
            </div>

            <form onSubmit={handleSaveAbout} className="space-y-6">
              <div className="bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-300 dark:border-[#333333] overflow-hidden">
                <ReactQuill 
                  theme="snow" 
                  value={aboutContent} 
                  onChange={setAboutContent}
                  className="h-96 mb-12"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      ['link', 'image', 'video'],
                      ['clean']
                    ]
                  }}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={savingAbout}
                  className="px-6 py-2.5 bg-[#E08F24] hover:bg-[#c77a1e] text-white font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {savingAbout ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Lưu thông tin giới thiệu
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
