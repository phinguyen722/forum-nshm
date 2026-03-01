import { useState } from 'react';
import { X, Loader2, Upload, Image as ImageIcon, FileVideo } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectName: string;
}

export default function CreatePostModal({ isOpen, onClose, subjectId, subjectName }: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError('Bạn cần đăng nhập để đăng bài.');
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError('Vui lòng nhập tiêu đề và nội dung.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check for banned words
      const bannedRef = doc(db, 'system', 'banned_words');
      const bannedSnap = await getDoc(bannedRef);
      if (bannedSnap.exists()) {
        const bannedData = bannedSnap.data();
        if (bannedData.words && Array.isArray(bannedData.words)) {
          const lowerTitle = title.toLowerCase();
          const lowerContent = content.toLowerCase();
          const hasBannedWord = bannedData.words.some((word: string) => 
            lowerTitle.includes(word) || lowerContent.includes(word)
          );
          if (hasBannedWord) {
            setError('Tiêu đề hoặc nội dung chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa lại.');
            setLoading(false);
            return;
          }
        }
      }

      let mediaUrl = '';
      let mediaType = '';

      // Upload file if selected
      if (file) {
        // 1. Start upload session
        const mimeType = file.type || 'application/octet-stream';
        const startRes = await fetch('/api/start-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, mimeType })
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
          body: file
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
        mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
      }

      // Save to Firestore
      const isAdmin = auth.currentUser.email === 'admin_forum@system.local';
      const postData = {
        subjectId,
        subjectName,
        title: title.trim(),
        content: content.trim(),
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Học sinh',
        authorPhoto: auth.currentUser.photoURL || '',
        createdAt: Date.now(),
        repliesCount: 0,
        views: 0,
        status: isAdmin ? 'approved' : 'pending',
        ...(mediaUrl && { mediaUrl, mediaType })
      };

      const docRef = await addDoc(collection(db, 'posts'), postData);

      // Create a global notification for new post if approved immediately
      if (isAdmin) {
        await addDoc(collection(db, 'notifications'), {
          userId: 'all', // Special ID for global notifications
          type: 'new_post',
          postId: docRef.id,
          postTitle: title.trim(),
          actorName: auth.currentUser.displayName || 'Học sinh',
          createdAt: Date.now(),
          read: false
        });
      } else {
        alert('Bài viết của bạn đã được gửi và đang chờ Admin duyệt.');
      }

      setTitle('');
      setContent('');
      setFile(null);
      onClose();
    } catch (err: any) {
      console.error('Create post error:', err);
      setError(err.message || 'Đã xảy ra lỗi khi đăng bài.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-[#E5E5E5] dark:border-[#333333]">
          <h2 className="text-xl font-bold text-[#141414] dark:text-[#E5E5E5]">
            Tạo thảo luận mới - {subjectName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-grow">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded border border-red-200 dark:border-red-800/30">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề thảo luận..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#333333] rounded-md bg-white dark:bg-[#252525] text-[#141414] dark:text-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#E08F24]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nội dung</label>
              <div className="bg-white dark:bg-[#1E1E1E] rounded-md border border-gray-300 dark:border-[#333333] overflow-hidden">
                <ReactQuill 
                  theme="snow" 
                  value={content} 
                  onChange={setContent}
                  className="h-48 mb-10"
                  placeholder="Nhập nội dung chi tiết (câu hỏi, bài tập, chia sẻ)..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Đính kèm (Hình ảnh/Video/Tài liệu)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  id="post-file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="post-file"
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#333333] rounded-md hover:bg-gray-50 dark:hover:bg-[#333333] text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Upload size={16} />
                  Chọn tệp
                </label>
                {file && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {file.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileVideo size={16} />}
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-red-500 hover:text-red-700 ml-2">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-[#E5E5E5] dark:border-[#333333] flex justify-end gap-3 bg-gray-50 dark:bg-[#1E1E1E] rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333] rounded-md transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0077CC] hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Đăng bài
          </button>
        </div>
      </div>
    </div>
  );
}
