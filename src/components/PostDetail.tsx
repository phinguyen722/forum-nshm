import { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Clock, Loader2, Send, Image as ImageIcon, FileVideo, Upload, X } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { Post, Reply } from '../types';

interface PostDetailProps {
  postId: string;
  onBack: () => void;
}

export default function PostDetail({ postId, onBack }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [replyContent, setReplyContent] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [user, setUser] = useState<any>(null);
  const isAdmin = user?.email === 'admin_forum@system.local';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch post details
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as Post);
          // Increment views
          await updateDoc(docRef, { views: increment(1) });
        }
      } catch (err) {
        console.error("Error fetching post:", err);
      }
    };

    fetchPost();

    // Listen for replies
    const q = query(
      collection(db, 'replies'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const repliesData: Reply[] = [];
      snapshot.forEach((doc) => {
        repliesData.push({ id: doc.id, ...doc.data() } as Reply);
      });
      setReplies(repliesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError('Bạn cần đăng nhập để trả lời.');
      return;
    }
    if (!replyContent.trim() && !replyFile) {
      setError('Vui lòng nhập nội dung hoặc đính kèm tệp.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Check for banned words
      const bannedRef = doc(db, 'system', 'banned_words');
      const bannedSnap = await getDoc(bannedRef);
      if (bannedSnap.exists()) {
        const bannedData = bannedSnap.data();
        if (bannedData.words && Array.isArray(bannedData.words)) {
          const lowerContent = replyContent.toLowerCase();
          const hasBannedWord = bannedData.words.some((word: string) => lowerContent.includes(word));
          if (hasBannedWord) {
            setError('Nội dung bình luận chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa lại.');
            setSubmitting(false);
            return;
          }
        }
      }

      let mediaUrl = '';

      // Upload file if selected
      if (replyFile) {
        // 1. Start upload session
        const mimeType = replyFile.type || 'application/octet-stream';
        const startRes = await fetch('/api/start-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: replyFile.name, mimeType })
        });
        
        let startData;
        const contentType = startRes.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          startData = await startRes.json();
        } else {
          const text = await startRes.text();
          throw new Error(`Server returned ${startRes.status}: ${startRes.statusText}. ${text.substring(0, 100)}`);
        }
        
        if (!startRes.ok) throw new Error(startData.error || 'Failed to start upload');
        const uploadUrl = startData.uploadUrl;
        
        // 2. Upload directly to Google Drive
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
          },
          body: replyFile
        });
        
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Failed to upload file to Google Drive: ${uploadRes.status} ${errText}`);
        }
        
        const uploadedFile = await uploadRes.json();
        
        // 3. Make file public and get links
        const publicRes = await fetch('/api/make-file-public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: uploadedFile.id })
        });
        
        const publicData = await publicRes.json();
        if (!publicRes.ok) throw new Error(publicData.error || 'Failed to make file public');
        
        mediaUrl = publicData.file.webContentLink || publicData.file.webViewLink;
      }

      // Save reply to Firestore
      await addDoc(collection(db, 'replies'), {
        postId,
        content: replyContent.trim(),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Học sinh',
        authorPhoto: auth.currentUser.photoURL || '',
        createdAt: Date.now(),
        ...(mediaUrl && { mediaUrl })
      });

      // Update replies count in post
      await updateDoc(doc(db, 'posts', postId), {
        repliesCount: increment(1)
      });

      // Create notification for post author and all other repliers
      const participants = new Set<string>();
      if (post && post.authorId) participants.add(post.authorId);
      replies.forEach(r => {
        if (r.authorId) participants.add(r.authorId);
      });
      
      // Remove the current user from participants so they don't get notified of their own reply
      participants.delete(auth.currentUser.uid);

      // Send notifications
      for (const userId of participants) {
        await addDoc(collection(db, 'notifications'), {
          userId: userId,
          type: 'reply',
          postId: postId,
          postTitle: post?.title || 'Thảo luận',
          actorName: auth.currentUser.displayName || 'Học sinh',
          createdAt: Date.now(),
          read: false
        });
      }

      setReplyContent('');
      setReplyFile(null);
    } catch (err: any) {
      console.error('Reply error:', err);
      setError(err.message || 'Đã xảy ra lỗi khi gửi trả lời.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
      await deleteDoc(doc(db, 'replies', replyId));
      await updateDoc(doc(db, 'posts', postId), {
        repliesCount: increment(-1)
      });
    } catch (err) {
      console.error('Error deleting reply:', err);
      alert('Có lỗi xảy ra khi xóa bình luận.');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const getPreviewUrl = (url: string) => {
    if (!url) return '';
    const viewMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if (viewMatch && viewMatch[1]) {
      return `https://drive.google.com/file/d/${viewMatch[1]}/preview`;
    }
    const ucMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) {
      return `https://drive.google.com/file/d/${ucMatch[1]}/preview`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] p-8 flex justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] p-8 text-center text-gray-500">
        Không tìm thấy bài thảo luận.
        <button onClick={onBack} className="block mx-auto mt-4 text-blue-500 hover:underline">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-[#252525] px-4 py-3 border-b border-[#E5E5E5] dark:border-[#333333] flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="text-lg font-bold text-[#141414] dark:text-[#E5E5E5] truncate flex items-center gap-2">
          {post.title}
          {post.status === 'pending' && (
            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-medium border border-yellow-200 flex-shrink-0">
              Chờ duyệt
            </span>
          )}
        </h2>
      </div>

      {post.status === 'pending' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 px-6 py-3 border-b border-yellow-200 dark:border-yellow-800/30 text-yellow-800 dark:text-yellow-500 text-sm flex items-center gap-2">
          <Clock size={16} />
          Bài viết này đang chờ quản trị viên duyệt. Chỉ bạn và quản trị viên mới có thể xem bài viết này.
        </div>
      )}

      {/* Main Post */}
      <div className="p-6 border-b border-[#E5E5E5] dark:border-[#333333]">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#E08F24] flex items-center justify-center text-white text-xl font-bold">
                {post.authorName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-[#141414] dark:text-[#E5E5E5]">{post.authorName}</h3>
                <div className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3] flex items-center gap-1">
                  <Clock size={12} /> {formatTime(post.createdAt)}
                </div>
              </div>
            </div>
            <div className="text-[#141414] dark:text-[#E5E5E5] whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>
            
            {/* Media Attachment */}
            {post.mediaUrl && (
              <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-3xl">
                {post.mediaUrl.includes('drive.google.com') ? (
                  <div className="w-full aspect-video relative">
                    <iframe 
                      src={getPreviewUrl(post.mediaUrl)} 
                      className="absolute top-0 left-0 w-full h-full border-0"
                      allow="autoplay"
                    ></iframe>
                  </div>
                ) : post.mediaType === 'image' ? (
                  <img src={post.mediaUrl} alt="Attachment" className="w-full h-auto" />
                ) : post.mediaType === 'video' ? (
                  <video src={post.mediaUrl} controls className="w-full h-auto" />
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-[#252525] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="text-blue-500" />
                      <span className="font-medium text-[#141414] dark:text-[#E5E5E5]">Tệp đính kèm</span>
                    </div>
                    <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium text-sm">
                      Tải xuống
                    </a>
                  </div>
                )}
                <div className="p-3 bg-gray-50 dark:bg-[#252525] border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                    Mở trong thẻ mới / Tải xuống
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="bg-gray-50 dark:bg-[#1a1a1a]">
        <div className="px-6 py-4 border-b border-[#E5E5E5] dark:border-[#333333]">
          <h3 className="font-bold text-[#141414] dark:text-[#E5E5E5]">{replies.length} Trả lời</h3>
        </div>
        
        <div className="divide-y divide-[#E5E5E5] dark:divide-[#333333]">
          {replies.map((reply) => (
            <div key={reply.id} className="p-6 flex items-start gap-4">
              <div className="flex-shrink-0">
                {reply.authorPhoto ? (
                  <img src={reply.authorPhoto} alt={reply.authorName} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                    {reply.authorName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-[#141414] dark:text-[#E5E5E5]">{reply.authorName}</span>
                  <span className="text-xs text-[#8C8C8C] dark:text-[#A3A3A3]">{formatTime(reply.createdAt)}</span>
                </div>
                <div className="text-sm text-[#141414] dark:text-[#E5E5E5] whitespace-pre-wrap">
                  {reply.content}
                </div>
                {reply.mediaUrl && (
                  <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-2xl">
                    {reply.mediaUrl.includes('drive.google.com') ? (
                      <div className="w-full aspect-video relative">
                        <iframe 
                          src={getPreviewUrl(reply.mediaUrl)} 
                          className="absolute top-0 left-0 w-full h-full border-0"
                          allow="autoplay"
                        ></iframe>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 dark:bg-[#252525] flex items-center gap-2">
                        <MessageSquare size={16} className="text-blue-500" />
                        <span className="text-sm font-medium text-[#141414] dark:text-[#E5E5E5]">Tệp đính kèm</span>
                      </div>
                    )}
                    <div className="p-2 bg-gray-50 dark:bg-[#252525] border-t border-gray-200 dark:border-gray-700 flex justify-end">
                      <a href={reply.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                        Mở trong thẻ mới / Tải xuống
                      </a>
                    </div>
                  </div>
                )}
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDeleteReply(reply.id!)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Xóa bình luận"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <div className="p-6 bg-white dark:bg-[#1E1E1E] border-t border-[#E5E5E5] dark:border-[#333333]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded border border-red-200 dark:border-red-800/30">
              {error}
            </div>
          )}
          <form onSubmit={handleReplySubmit}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Viết câu trả lời của bạn..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24] resize-none mb-3"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  id="reply-file"
                  className="hidden"
                  onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="reply-file"
                  className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#E08F24] transition-colors"
                >
                  <Upload size={16} />
                  Đính kèm
                </label>
                {replyFile && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#252525] px-2 py-1 rounded">
                    <span className="truncate max-w-[150px]">{replyFile.name}</span>
                    <button type="button" onClick={() => setReplyFile(null)} className="text-red-500 hover:text-red-700">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#0077CC] text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Gửi trả lời
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
