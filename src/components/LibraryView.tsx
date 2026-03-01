import { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Download, ExternalLink, File, FileImage, FileVideo, FileAudio, FileArchive } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  webViewLink: string;
  webContentLink?: string;
  iconLink?: string;
}

export default function LibraryView() {
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = user?.email === 'admin_forum@system.local';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState('');

  const fetchFiles = async () => {
    setLoadingFiles(true);
    setFilesError('');
    try {
      const res = await fetch('/api/library/files');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setFiles(data.files);
    } catch (err: any) {
      console.error("Fetch files error:", err);
      setFilesError(err.message || 'Lỗi khi tải danh sách tài liệu');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setUploadResult(null);

    try {
      // 1. Start upload session with specific folderId for Library
      const mimeType = file.type || 'application/octet-stream';
      const startRes = await fetch('/api/start-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: file.name, 
          mimeType,
          folderId: '1RxAUIiU-wZ14cPfKgtQ5kce-WAuJl9QY' // Library folder ID
        })
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
      
      setUploadResult(publicData.file);
      setFile(null);
      
      // Refresh the file list
      fetchFiles();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || 'Lỗi khi tải lên tài liệu');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="text-blue-500" size={24} />;
    if (mimeType.startsWith('video/')) return <FileVideo className="text-purple-500" size={24} />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="text-yellow-500" size={24} />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive className="text-red-500" size={24} />;
    if (mimeType.includes('pdf')) return <FileText className="text-red-600" size={24} />;
    if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="text-blue-600" size={24} />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="text-green-600" size={24} />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText className="text-orange-600" size={24} />;
    return <File className="text-gray-500" size={24} />;
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return '';
    const size = parseInt(bytes, 10);
    if (isNaN(size)) return '';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
    return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] p-6">
          <h2 className="text-2xl font-bold mb-4 text-[#141414] dark:text-[#E5E5E5]">Quản lý Thư viện</h2>
          <p className="text-[#8C8C8C] dark:text-[#A3A3A3] mb-6">
            Tài liệu tải lên tại đây sẽ được lưu trữ an toàn trực tiếp trên Google Drive của nhà trường và hiển thị cho tất cả học sinh.
          </p>

          <div className="border-2 border-dashed border-[#E5E5E5] dark:border-[#333333] rounded-lg p-8 text-center bg-gray-50/50 dark:bg-[#252525]/50">
            <Upload className="mx-auto h-12 w-12 text-[#8C8C8C] mb-4" />
            <h3 className="text-lg font-medium text-[#141414] dark:text-[#E5E5E5] mb-2">Tải lên tài liệu mới</h3>
            <p className="text-sm text-[#8C8C8C] dark:text-[#A3A3A3] mb-4">Hỗ trợ PDF, Word, Excel, PowerPoint, Hình ảnh</p>
            
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError('');
                setUploadResult(null);
              }}
            />
            <label 
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center justify-center px-6 py-2.5 bg-[#E08F24] text-white rounded font-medium hover:bg-[#c77a1e] transition-colors shadow-sm"
            >
              Chọn tệp từ máy tính
            </label>

            {file && (
              <div className="mt-6 p-3 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#333333] rounded flex items-center justify-between max-w-md mx-auto shadow-sm">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <FileText className="text-[#0077CC] flex-shrink-0" size={20} />
                  <span className="text-sm truncate dark:text-[#E5E5E5] font-medium">{file.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button 
                  onClick={handleUpload}
                  disabled={uploading}
                  className="ml-4 px-4 py-1.5 bg-[#0077CC] text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center font-medium transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Đang tải...
                    </>
                  ) : 'Tải lên Drive'}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded flex items-start space-x-3 max-w-md mx-auto text-left border border-red-200 dark:border-red-800/30">
                <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm">
                  <p className="font-medium mb-1">Lỗi tải lên</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {uploadResult && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded flex items-start space-x-3 max-w-md mx-auto text-left border border-green-200 dark:border-green-800/30">
                <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-medium text-sm">Tải lên Google Drive thành công!</p>
                  <a 
                    href={uploadResult.webViewLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm underline mt-1 block hover:text-green-800 dark:hover:text-green-300"
                  >
                    Xem tệp trên Google Drive
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File List Section */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#141414] dark:text-[#E5E5E5]">Tài liệu đã chia sẻ</h3>
          <button 
            onClick={fetchFiles}
            disabled={loadingFiles}
            className="text-sm text-[#0077CC] hover:underline disabled:opacity-50"
          >
            {loadingFiles ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {loadingFiles ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filesError ? (
          <div className="p-6 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800/30 text-center max-w-2xl mx-auto">
            <AlertCircle className="mx-auto h-10 w-10 mb-3 opacity-80" />
            <h4 className="text-lg font-bold mb-2">Chưa cấu hình Google Drive API</h4>
            <p className="mb-4">Để sử dụng tính năng Thư viện, bạn cần cấu hình các biến môi trường sau trong hệ thống:</p>
            <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded text-left font-mono text-sm border border-amber-200 dark:border-amber-800/30 inline-block">
              <div className="mb-2"><span className="font-bold text-gray-700 dark:text-gray-300">GOOGLE_CLIENT_EMAIL</span> = email_service_account_cua_ban</div>
              <div><span className="font-bold text-gray-700 dark:text-gray-300">GOOGLE_PRIVATE_KEY</span> = khóa_bí_mật_cua_ban</div>
            </div>
            <p className="mt-4 text-sm opacity-80">Lỗi chi tiết: {filesError}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p>Chưa có tài liệu nào trong thư viện.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f) => (
              <div key={f.id} className="border border-[#E5E5E5] dark:border-[#333333] rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50/30 dark:bg-[#252525]/30 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="mt-1">
                    {f.iconLink ? (
                      <img src={f.iconLink} alt="" className="w-6 h-6" />
                    ) : (
                      getFileIcon(f.mimeType)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[#141414] dark:text-[#E5E5E5] truncate" title={f.name}>
                      {f.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-[#8C8C8C] dark:text-[#A3A3A3] mt-1">
                      <span>{formatDate(f.createdTime)}</span>
                      {f.size && (
                        <>
                          <span>•</span>
                          <span>{formatSize(f.size)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-3 border-t border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between">
                  <a 
                    href={f.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-[#0077CC] hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={14} />
                    Xem trước
                  </a>
                  {f.webContentLink && (
                    <a 
                      href={f.webContentLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#141414] dark:hover:text-white flex items-center gap-1"
                    >
                      <Download size={14} />
                      Tải xuống
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
