import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { Bell, Loader2, Calendar } from 'lucide-react';

export default function PopupHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we would query a collection of popups.
    // Since we only store the current popup in 'system/global_popup', 
    // we need to either change how we store popups or just show the current one.
    // For now, let's just fetch the current one and display it as history.
    // To make it a real history, we should save popups to a 'popups' collection when created.
    
    // Let's assume we have a 'popups' collection for history
    const q = query(collection(db, 'popups'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setHistory(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 text-[#E08F24] rounded-full flex items-center justify-center">
          <Bell size={20} />
        </div>
        <h2 className="text-2xl font-bold text-[#141414] dark:text-[#E5E5E5]">Thông báo chung</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">Chưa có thông báo nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] overflow-hidden transition-shadow hover:shadow-md">
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <Calendar size={14} />
                  <span>{formatDate(item.createdAt || item.updatedAt)}</span>
                </div>
                <h3 className="text-xl font-bold text-[#141414] dark:text-[#E5E5E5] mb-3">
                  {item.title}
                </h3>
                <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-4">
                  {item.content}
                </div>
                {item.link && (
                  <a 
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    {item.linkText || 'Xem chi tiết'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
