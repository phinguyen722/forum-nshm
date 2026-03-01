import { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Clock, Plus, Loader2, CheckCircle } from 'lucide-react';
import CreatePostModal from './CreatePostModal';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Post } from '../types';

interface SubjectForumProps {
  subjectId: string;
  subjectName: string;
  onBack: () => void;
  onPostClick: (postId: string) => void;
}

export default function SubjectForum({ subjectId, subjectName, onBack, onPostClick }: SubjectForumProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = user?.email === 'admin_forum@system.local';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let q;
    if (subjectId === 'all') {
      q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'posts'),
        where('subjectId', '==', subjectId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach((doc) => {
        const post = { id: doc.id, ...doc.data() } as Post;
        // Filter logic:
        // Admin sees everything.
        // Normal user sees approved posts OR their own pending posts.
        if (isAdmin || post.status === 'approved' || post.authorId === user?.uid) {
          postsData.push(post);
        }
      });
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [subjectId]);

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

  const handleApprove = async (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    if (!isAdmin || !post.id) return;
    
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        status: 'approved'
      });
      
      // Create notification for the author
      await addDoc(collection(db, 'notifications'), {
        userId: post.authorId,
        type: 'new_post', // Using new_post type for simplicity
        postId: post.id,
        postTitle: post.title,
        actorName: 'Admin',
        createdAt: Date.now(),
        read: false
      });
      
      // Also broadcast to everyone that a new post is available
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

  return (
    <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden">
      <div className="bg-gray-100 dark:bg-[#252525] px-4 py-3 border-b border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-lg font-bold text-[#141414] dark:text-[#E5E5E5]">
            {subjectId === 'all' ? 'Tất cả bài thảo luận' : `Diễn đàn: ${subjectName}`}
          </h2>
        </div>
        {subjectId !== 'all' && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-[#E08F24] hover:bg-[#c77a1e] text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Tạo thảo luận</span>
          </button>
        )}
      </div>
      
      <div className="p-0 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Đang tải dữ liệu...
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p>Chưa có thảo luận nào. Hãy là người đầu tiên tạo thảo luận!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5] dark:divide-[#333333]">
            {posts.map(post => (
              <div 
                key={post.id} 
                onClick={() => onPostClick(post.id!)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors flex items-start gap-4 cursor-pointer"
              >
                <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-full flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-base font-medium text-[#0077CC] dark:text-[#4da3ff] hover:underline truncate flex items-center gap-2">
                    {post.title}
                    {post.status === 'pending' && (
                      <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-medium border border-yellow-200">
                        Chờ duyệt
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] mt-1.5 flex items-center gap-4">
                    {subjectId === 'all' && post.subjectName && (
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                        {post.subjectName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      {post.authorPhoto ? (
                        <img src={post.authorPhoto} alt={post.authorName} className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[8px] text-white">
                          {post.authorName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-600 dark:text-gray-400">{post.authorName}</span>
                    </span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(post.createdAt)}</span>
                  </div>
                </div>
                <div className="hidden sm:flex flex-shrink-0 items-center gap-4 text-xs text-[#8C8C8C] dark:text-[#A3A3A3]">
                  {isAdmin && post.status === 'pending' && (
                    <button 
                      onClick={(e) => handleApprove(e, post)}
                      className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-md font-medium transition-colors"
                    >
                      <CheckCircle size={14} />
                      Duyệt bài
                    </button>
                  )}
                  <div className="text-center">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{post.repliesCount || 0}</div>
                    <div>Trả lời</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{post.views || 0}</div>
                    <div>Lượt xem</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        subjectId={subjectId}
        subjectName={subjectName}
      />
    </div>
  );
}
