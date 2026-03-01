import { useState, useEffect, useRef } from 'react';
import { Bell, Check, MessageSquare, Loader2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { Notification } from '../types';

interface NotificationsProps {
  onPostClick: (postId: string) => void;
}

export default function Notifications({ onPostClick }: NotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Listen for notifications directed to the user OR global 'all' notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [auth.currentUser.uid, 'all']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      let unread = 0;
      const lastReadGlobal = Number(localStorage.getItem('lastReadGlobal') || 0);
      
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Notification;
        
        // Don't show 'all' notifications to the person who created the post
        if (data.userId === 'all' && data.actorName === auth.currentUser?.displayName) {
          return;
        }

        notifs.push(data);
        // If it's a global notification, we might need a separate collection to track read status per user.
        // For simplicity, we just treat 'read' as a global flag or ignore it for 'all'.
        // Let's just count unread if it's specifically for the user and not read.
        if (data.userId === auth.currentUser?.uid && !data.read) {
          unread++;
        }
        // For 'all' notifications, we can just show them as unread if they are newer than lastReadGlobal
        if (data.userId === 'all' && data.createdAt > lastReadGlobal) {
          unread++; 
        }
      });
      setNotifications(notifs);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    setIsOpen(false);
    onPostClick(notif.postId);

    if (notif.userId === 'all') {
      localStorage.setItem('lastReadGlobal', Date.now().toString());
    } else if (!notif.read && notif.id) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }
  };

  const markAllAsRead = async () => {
    if (!auth.currentUser) return;
    localStorage.setItem('lastReadGlobal', Date.now().toString());
    const unreadNotifs = notifications.filter(n => n.userId === auth.currentUser?.uid && !n.read);
    for (const notif of unreadNotifs) {
      if (notif.id) {
        updateDoc(doc(db, 'notifications', notif.id), { read: true }).catch(console.error);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  if (!auth.currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 text-gray-300 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#141414]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1E1E1E] rounded-lg shadow-xl border border-[#E5E5E5] dark:border-[#333333] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] dark:border-[#333333] bg-gray-50 dark:bg-[#252525]">
            <h3 className="font-bold text-[#141414] dark:text-[#E5E5E5]">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                <Check size={12} /> Đánh dấu đã đọc
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                Không có thông báo nào.
              </div>
            ) : (
              <div className="divide-y divide-[#E5E5E5] dark:divide-[#333333]">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-[#252525] cursor-pointer transition-colors flex gap-3 ${!notif.read && notif.userId !== 'all' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notif.type === 'new_post' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : notif.type === 'post_approved' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        <MessageSquare size={14} />
                      </div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm text-[#141414] dark:text-[#E5E5E5] line-clamp-2">
                        <span className="font-bold">{notif.actorName}</span>{' '}
                        {notif.type === 'new_post' ? 'vừa tạo một thảo luận mới:' : notif.type === 'post_approved' ? 'đã duyệt bài viết của bạn:' : 'đã trả lời thảo luận của bạn:'}{' '}
                        <span className="font-medium">"{notif.postTitle}"</span>
                      </p>
                      <p className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] mt-1">
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && notif.userId !== 'all' && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
