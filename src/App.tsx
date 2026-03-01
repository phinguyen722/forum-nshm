import { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, Moon, Sun, 
  Star, Calendar, Trophy, HelpCircle,
  Home, ChevronRight, ChevronDown,
  Sigma, BookOpen, Languages, FlaskConical, Landmark, Activity,
  UserPlus, LogOut
} from 'lucide-react';
import LibraryView from './components/LibraryView';
import LoginModal from './components/LoginModal';
import SubjectForum from './components/SubjectForum';
import PostDetail from './components/PostDetail';
import Notifications from './components/Notifications';
import AdminDashboard from './components/AdminDashboard';
import GlobalPopup from './components/GlobalPopup';
import PopupHistory from './components/PopupHistory';
import UserProfile from './components/UserProfile';
import GamesView from './components/GamesView';
import AboutUs from './components/AboutUs';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot, getCountFromServer, doc, setDoc } from 'firebase/firestore';
import { Post } from './types';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<'forum' | 'library' | 'activities' | 'admin' | 'popup-history' | 'profile' | 'games' | 'about'>('forum');
  const [selectedSubject, setSelectedSubject] = useState<{id: string, name: string} | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [latestEvent, setLatestEvent] = useState<any>(null);
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [latestSubjectPosts, setLatestSubjectPosts] = useState<Record<string, Post>>({});
  const [subjectStats, setSubjectStats] = useState<Record<string, { posts: number, replies: number }>>({});
  const [stats, setStats] = useState({ members: 0, online: 0, newPostsToday: 0 });

  const isAdmin = user?.email === 'admin_forum@system.local';

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Update user presence
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            lastSeen: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error('Error updating user presence:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Update presence periodically
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, { lastSeen: Date.now() }, { merge: true });
      } catch (error) {
        // Ignore errors for periodic updates
      }
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    // Fetch popular posts
    const qPopular = query(
      collection(db, 'posts'),
      where('status', '==', 'approved'),
      orderBy('views', 'desc'),
      limit(4)
    );
    
    const unsubscribePopular = onSnapshot(qPopular, (snapshot) => {
      const posts: Post[] = [];
      snapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPopularPosts(posts);
    });

    // Fetch stats periodically
    const fetchStats = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const fiveMinsAgo = Date.now() - 5 * 60000;

        const [membersSnap, onlineSnap, newPostsSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'users'), where('lastSeen', '>=', fiveMinsAgo))),
          getCountFromServer(query(collection(db, 'posts'), where('createdAt', '>=', startOfDay.getTime())))
        ]);

        setStats({
          members: membersSnap.data().count,
          online: onlineSnap.data().count,
          newPostsToday: newPostsSnap.data().count
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const statsInterval = setInterval(fetchStats, 60000); // Update stats every minute

    // Fetch latest posts for subjects
    const subjects = ['toan', 'tieng-viet', 'tieng-anh', 'hoat-dong'];
    const unsubscribes = subjects.map(subjectId => {
      const q = query(
        collection(db, 'posts'),
        where('subjectId', '==', subjectId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const post = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Post;
          setLatestSubjectPosts(prev => ({ ...prev, [subjectId]: post }));
        }
      });
    });

    // Fetch stats for subjects
    const fetchSubjectStats = async () => {
      try {
        const stats: Record<string, { posts: number, replies: number }> = {};
        for (const subjectId of subjects) {
          const postsQuery = query(collection(db, 'posts'), where('subjectId', '==', subjectId), where('status', '==', 'approved'));
          const postsSnap = await getCountFromServer(postsQuery);
          
          // For replies, we would ideally need a better way to aggregate, but for now we'll just count posts
          // In a real app, you might want to maintain a counter on the subject document itself
          stats[subjectId] = {
            posts: postsSnap.data().count,
            replies: postsSnap.data().count * 3 // Mocking replies based on posts for now, as counting all replies across all posts is expensive
          };
        }
        setSubjectStats(stats);
      } catch (error) {
        console.error("Error fetching subject stats:", error);
      }
    };
    
    fetchSubjectStats();

    return () => {
      unsubscribePopular();
      clearInterval(statsInterval);
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    // Fetch the latest upcoming event
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'events'),
      where('date', '>=', today),
      orderBy('date', 'asc'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestEvent({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setLatestEvent(null);
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-[#F2F2F2] dark:bg-[#121212] text-[#141414] dark:text-[#E5E5E5] font-sans transition-colors duration-200 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-[#1E252F] text-[#141414] dark:text-white shadow-md z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-6">
            <a href="#" className="flex items-center space-x-2 group shrink-0">
              <img 
                src="https://hoangmaistarschool.edu.vn/storage/nshm-c-b-v.png" 
                alt="Hoàng Mai Star School" 
                className="h-8 w-auto object-contain hidden lg:block"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://hoangmaistarschool.edu.vn/storage/general/logo.svg" 
                alt="Hoàng Mai Star School" 
                className="h-8 w-auto object-contain lg:hidden"
                referrerPolicy="no-referrer"
              />
            </a>
            <nav className="hidden md:flex space-x-2 lg:space-x-6 text-sm font-medium whitespace-nowrap">
              <button onClick={() => {setCurrentView('forum'); setSelectedSubject(null); setSelectedPostId(null);}} className={`uppercase transition-colors ${currentView === 'forum' ? 'text-[#E08F24]' : 'hover:text-[#E08F24]'}`}>Diễn đàn</button>
              <button onClick={() => {setCurrentView('library'); setSelectedSubject(null); setSelectedPostId(null);}} className={`uppercase transition-colors ${currentView === 'library' ? 'text-[#E08F24]' : 'hover:text-[#E08F24]'}`}>Thư viện</button>
              <button onClick={() => {setCurrentView('activities'); setSelectedSubject({id: 'all', name: 'Hoạt động'}); setSelectedPostId(null);}} className={`uppercase transition-colors ${currentView === 'activities' ? 'text-[#E08F24]' : 'hover:text-[#E08F24]'}`}>Hoạt động</button>
              <button onClick={() => {setCurrentView('games'); setSelectedSubject(null); setSelectedPostId(null);}} className={`uppercase transition-colors ${currentView === 'games' ? 'text-[#E08F24]' : 'hover:text-[#E08F24]'}`}>Giải trí</button>
              {isAdmin && (
                <button onClick={() => {setCurrentView('admin'); setSelectedSubject(null); setSelectedPostId(null);}} className={`uppercase transition-colors ${currentView === 'admin' ? 'text-[#E08F24]' : 'hover:text-[#E08F24]'}`}>Quản trị</button>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4 shrink-0">
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="bg-gray-100 dark:bg-[#12161c] text-sm text-gray-900 dark:text-gray-300 border border-transparent dark:border-none rounded-sm py-1.5 pl-3 pr-10 w-32 md:w-40 lg:w-64 focus:ring-1 focus:ring-[#E08F24] focus:bg-white dark:focus:bg-black transition-all outline-none"
              />
              <button className="absolute right-0 top-0 h-full px-2 text-gray-500 dark:text-gray-400 hover:text-[#E08F24] dark:hover:text-white">
                <Search size={16} />
              </button>
            </div>
            <div className="flex items-center space-x-3 text-sm font-medium">
              {user && <Notifications onPostClick={setSelectedPostId} />}
              
              {user ? (
                <div className="flex items-center space-x-3 pl-2 border-l border-gray-300 dark:border-gray-600">
                  <div className="flex items-center space-x-2 cursor-pointer hover:text-[#E08F24] transition-colors" onClick={() => {setCurrentView('profile'); setSelectedSubject(null); setSelectedPostId(null);}}>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#E08F24] flex items-center justify-center text-white text-xs">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="hidden sm:block text-xs font-medium truncate max-w-[100px]">{user.displayName || 'Học sinh'}</span>
                  </div>
                  <button 
                    onClick={() => signOut(auth)}
                    className="hover:text-[#E08F24] transition-colors text-gray-600 dark:text-gray-300"
                    title="Đăng xuất"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  className="hover:text-[#E08F24] transition-colors uppercase whitespace-nowrap font-medium"
                >
                  Đăng nhập
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sub Header */}
      <div className="bg-gray-50 dark:bg-[#171C24] text-gray-600 dark:text-gray-400 text-xs py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex space-x-6 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => {setCurrentView('popup-history'); setSelectedSubject(null); setSelectedPostId(null);}} 
              className="flex items-center space-x-1 hover:text-[#E08F24] dark:hover:text-white transition-colors whitespace-nowrap"
            >
              <Star size={14} />
              <span>Thông báo chung</span>
            </button>
          </div>
          <div className="hidden md:flex items-center space-x-1 text-gray-500 whitespace-nowrap">
            <Calendar size={14} />
            <span>
              {latestEvent 
                ? `Sự kiện sắp tới: ${latestEvent.title} (${new Date(latestEvent.date).toLocaleDateString('vi-VN')})` 
                : 'Không có sự kiện nào sắp diễn ra'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {currentView === 'admin' && isAdmin ? (
          <AdminDashboard />
        ) : currentView === 'library' ? (
          <LibraryView />
        ) : currentView === 'popup-history' ? (
          <PopupHistory />
        ) : currentView === 'profile' && user ? (
          <UserProfile />
        ) : currentView === 'games' ? (
          <GamesView />
        ) : currentView === 'about' ? (
          <AboutUs />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-4">
              {selectedPostId ? (
                <PostDetail 
                  postId={selectedPostId} 
                  onBack={() => setSelectedPostId(null)} 
                />
              ) : selectedSubject ? (
                <SubjectForum 
                  subjectId={selectedSubject.id} 
                  subjectName={selectedSubject.name} 
                  onBack={() => {
                    if (currentView === 'activities') {
                      setCurrentView('forum');
                      setSelectedSubject(null);
                    } else {
                      setSelectedSubject(null);
                    }
                  }} 
                  onPostClick={setSelectedPostId}
                />
              ) : (
                <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden">
                  {/* Breadcrumb */}
                  <div className="bg-gray-100 dark:bg-[#252525] px-4 py-2 border-b border-[#E5E5E5] dark:border-[#333333] flex justify-between items-center text-gray-500 dark:text-gray-400 text-sm">
                    <div className="flex items-center space-x-2">
                      <Home size={16} />
                      <ChevronRight size={16} className="text-gray-400" />
                      <span className="font-medium">Diễn đàn học tập</span>
                    </div>
                    <button className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Forum Category Header */}
                  <div className="p-5">
                    <h1 className="text-2xl font-bold mb-1 text-[#141414] dark:text-[#E5E5E5]">Khu vực Học tập</h1>
                    <p className="text-sm text-[#8C8C8C] dark:text-[#A3A3A3] mb-6">Diễn đàn chính dành cho học sinh tiểu học. Nơi trao đổi kiến thức, bài tập và các hoạt động.</p>
                    
                    {/* Forum List */}
                    <div className="space-y-0 divide-y divide-[#E5E5E5] dark:divide-[#333333]">
                      
                      {/* Item 1 */}
                      <div className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center gap-4 group cursor-pointer" onClick={() => setSelectedSubject({id: 'toan', name: 'Toán'})}>
                        <div className="flex-shrink-0 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200">
                          <Sigma size={36} strokeWidth={1.5} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="text-base font-bold text-[#0077CC] dark:text-[#4da3ff] group-hover:underline truncate">
                            Toán
                          </h3>
                          <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] mt-1 flex space-x-3">
                            <span>Bài viết: <b>{subjectStats['toan']?.posts || 0}</b></span>
                            <span className="border-l border-gray-300 dark:border-gray-600 pl-3">Thảo luận: <b>{subjectStats['toan']?.replies || 0}</b></span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-64 bg-gray-50 dark:bg-[#252525] rounded p-2 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 w-full">
                              {latestSubjectPosts['toan'] ? (
                                <>
                                  <span className="text-xs font-medium text-[#141414] dark:text-[#E5E5E5] group-hover:text-[#0077CC] dark:group-hover:text-[#4da3ff] line-clamp-1 block mb-1">
                                    Mới nhất: {latestSubjectPosts['toan'].title}
                                  </span>
                                  <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] truncate">
                                    <span className="text-[#0077CC] dark:text-[#4da3ff]">{latestSubjectPosts['toan'].authorName}</span>, {formatTimeAgo(latestSubjectPosts['toan'].createdAt)}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] italic">Chưa có bài viết nào</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="py-4 flex flex-col sm:flex-row sm:items-center gap-4 group cursor-pointer" onClick={() => setSelectedSubject({id: 'tieng-viet', name: 'Tiếng Việt'})}>
                        <div className="flex-shrink-0 text-green-600 dark:text-green-500 group-hover:scale-110 transition-transform duration-200">
                          <BookOpen size={36} strokeWidth={1.5} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="text-base font-bold text-[#0077CC] dark:text-[#4da3ff] group-hover:underline truncate">
                            Tiếng Việt
                          </h3>
                          <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] mt-1 flex space-x-3">
                            <span>Bài viết: <b>{subjectStats['tieng-viet']?.posts || 0}</b></span>
                            <span className="border-l border-gray-300 dark:border-gray-600 pl-3">Thảo luận: <b>{subjectStats['tieng-viet']?.replies || 0}</b></span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-64 bg-gray-50 dark:bg-[#252525] rounded p-2 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 w-full">
                              {latestSubjectPosts['tieng-viet'] ? (
                                <>
                                  <span className="text-xs font-medium text-[#141414] dark:text-[#E5E5E5] group-hover:text-[#0077CC] dark:group-hover:text-[#4da3ff] line-clamp-1 block mb-1">
                                    Mới nhất: {latestSubjectPosts['tieng-viet'].title}
                                  </span>
                                  <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] truncate">
                                    <span className="text-[#0077CC] dark:text-[#4da3ff]">{latestSubjectPosts['tieng-viet'].authorName}</span>, {formatTimeAgo(latestSubjectPosts['tieng-viet'].createdAt)}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] italic">Chưa có bài viết nào</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="py-4 flex flex-col sm:flex-row sm:items-center gap-4 group cursor-pointer" onClick={() => setSelectedSubject({id: 'tieng-anh', name: 'Tiếng Anh'})}>
                        <div className="flex-shrink-0 text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform duration-200">
                          <Languages size={36} strokeWidth={1.5} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="text-base font-bold text-[#0077CC] dark:text-[#4da3ff] group-hover:underline truncate">
                            Tiếng Anh
                          </h3>
                          <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] mt-1 flex space-x-3">
                            <span>Bài viết: <b>{subjectStats['tieng-anh']?.posts || 0}</b></span>
                            <span className="border-l border-gray-300 dark:border-gray-600 pl-3">Thảo luận: <b>{subjectStats['tieng-anh']?.replies || 0}</b></span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-64 bg-gray-50 dark:bg-[#252525] rounded p-2 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 w-full">
                              {latestSubjectPosts['tieng-anh'] ? (
                                <>
                                  <span className="text-xs font-medium text-[#141414] dark:text-[#E5E5E5] group-hover:text-[#0077CC] dark:group-hover:text-[#4da3ff] line-clamp-1 block mb-1">
                                    Mới nhất: {latestSubjectPosts['tieng-anh'].title}
                                  </span>
                                  <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] truncate">
                                    <span className="text-[#0077CC] dark:text-[#4da3ff]">{latestSubjectPosts['tieng-anh'].authorName}</span>, {formatTimeAgo(latestSubjectPosts['tieng-anh'].createdAt)}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] italic">Chưa có bài viết nào</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Item 4 */}
                      <div className="py-4 flex flex-col sm:flex-row sm:items-center gap-4 group cursor-pointer" onClick={() => setSelectedSubject({id: 'hoat-dong', name: 'Hoạt động trải nghiệm'})}>
                        <div className="flex-shrink-0 text-pink-500 dark:text-pink-400 group-hover:scale-110 transition-transform duration-200">
                          <Activity size={36} strokeWidth={1.5} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="text-base font-bold text-[#0077CC] dark:text-[#4da3ff] group-hover:underline truncate">
                            Hoạt động trải nghiệm
                          </h3>
                          <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] mt-1 flex space-x-3">
                            <span>Bài viết: <b>{subjectStats['hoat-dong']?.posts || 0}</b></span>
                            <span className="border-l border-gray-300 dark:border-gray-600 pl-3">Thảo luận: <b>{subjectStats['hoat-dong']?.replies || 0}</b></span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-64 bg-gray-50 dark:bg-[#252525] rounded p-2 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 w-full">
                              {latestSubjectPosts['hoat-dong'] ? (
                                <>
                                  <span className="text-xs font-medium text-[#141414] dark:text-[#E5E5E5] group-hover:text-[#0077CC] dark:group-hover:text-[#4da3ff] line-clamp-1 block mb-1">
                                    Mới nhất: {latestSubjectPosts['hoat-dong'].title}
                                  </span>
                                  <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] truncate">
                                    <span className="text-[#0077CC] dark:text-[#4da3ff]">{latestSubjectPosts['hoat-dong'].authorName}</span>, {formatTimeAgo(latestSubjectPosts['hoat-dong'].createdAt)}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] italic">Chưa có bài viết nào</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* Right Column (Sidebar) */}
          <aside className="lg:col-span-4 space-y-6">
            {!user && (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full bg-[#E08F24] hover:bg-opacity-90 text-white font-bold py-3 px-4 rounded shadow-sm text-sm uppercase tracking-wide transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <UserPlus size={20} />
                Đăng ký thành viên
              </button>
            )}

            {/* Popular Articles */}
            <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E5E5] dark:border-[#333333] bg-white dark:bg-[#1E1E1E]">
                <h2 className="text-sm font-bold uppercase text-[#141414] dark:text-[#E5E5E5] border-l-4 border-[#E08F24] pl-3">
                  Bài quan tâm
                </h2>
              </div>
              <div className="divide-y divide-[#E5E5E5] dark:divide-[#333333]">
                
                {popularPosts.length > 0 ? (
                  popularPosts.map((post) => (
                    <div 
                      key={post.id} 
                      className="p-4 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors cursor-pointer group" 
                      onClick={() => setSelectedPostId(post.id)}
                    >
                      <div className="flex gap-3">
                        {post.attachments && post.attachments.length > 0 && post.attachments[0].type.startsWith('image/') ? (
                          <div className="flex-shrink-0 w-20 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                            <img src={post.attachments[0].url} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-20 h-16 bg-gray-100 dark:bg-[#252525] rounded flex items-center justify-center text-gray-400 dark:text-gray-600">
                            <BookOpen size={24} />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-[#141414] dark:text-[#E5E5E5] leading-tight group-hover:text-[#E08F24] transition-colors line-clamp-2">
                            {post.title}
                          </h4>
                          <div className="mt-2 text-xs text-[#8C8C8C] dark:text-[#A3A3A3] flex items-center gap-1">
                            <span>{post.views || 0} Lượt xem</span>
                            <span className="mx-1">•</span>
                            <span className="truncate max-w-[100px]">{post.subjectName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Chưa có bài viết nào.
                  </div>
                )}

              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden p-4">
              <h3 className="text-sm font-bold uppercase text-[#8C8C8C] dark:text-[#A3A3A3] mb-4 border-b border-[#E5E5E5] dark:border-[#333333] pb-2">
                Thống kê diễn đàn
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C] dark:text-[#A3A3A3]">Thành viên:</span>
                  <span className="font-medium">{stats.members}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C] dark:text-[#A3A3A3]">Đang trực tuyến:</span>
                  <span className="font-medium text-green-600">{stats.online}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C] dark:text-[#A3A3A3]">Bài viết mới hôm nay:</span>
                  <span className="font-medium">{stats.newPostsToday}</span>
                </div>
              </div>
            </div>

          </aside>
        </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#1E1E1E] mt-8 pt-10 pb-0 relative overflow-hidden text-sm border-t border-[#E5E5E5] dark:border-[#333333]">
        <div className="container mx-auto px-4 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4 uppercase text-[#141414] dark:text-[#E5E5E5]">Liên hệ</h3>
              <p className="mb-2 font-bold text-[#141414] dark:text-[#E5E5E5]">Trường Tiểu học, THCS và THPT Ngôi Sao Hoàng Mai</p>
              <p className="mb-4 text-[#8C8C8C] dark:text-[#A3A3A3]">Lô TH và PT, Khu đô thị Kim Văn - Kim Lũ, phường Định Công, Hà Nội.</p>
              <p className="mb-4 text-[#141414] dark:text-[#E5E5E5]">Hotline: 1900-888-689</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 uppercase text-[#141414] dark:text-[#E5E5E5]">Truy cập nhanh</h3>
              <ul className="space-y-2 text-[#8C8C8C] dark:text-[#A3A3A3]">
                <li><button onClick={() => setCurrentView('about')} className="hover:text-[#E08F24]">Về chúng tôi</button></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="w-full">
          <img src="https://hoangmaistarschool.edu.vn/assets/images/background-footer-2.svg" alt="Footer Background" className="w-full object-cover" />
        </div>
      </footer>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
      <GlobalPopup />
    </div>
  );
}
