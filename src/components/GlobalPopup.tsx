import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function GlobalPopup() {
  const [popupData, setPopupData] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'system', 'global_popup'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPopupData(data);
        
        // Check if user already dismissed this specific popup update
        const dismissedAt = localStorage.getItem(`dismissed_popup_${data.updatedAt}`);
        if (data.active && !dismissedAt) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } else {
        setIsVisible(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (popupData?.updatedAt) {
      localStorage.setItem(`dismissed_popup_${popupData.updatedAt}`, 'true');
    }
  };

  if (!isVisible || !popupData) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-[#E08F24] h-2 w-full"></div>
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-[#252525] rounded-full p-1"
        >
          <X size={20} />
        </button>
        
        <div className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-[#E08F24] rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#141414] dark:text-[#E5E5E5] mb-3">
            {popupData.title}
          </h2>
          <div className="text-[#666666] dark:text-[#A3A3A3] mb-8 whitespace-pre-wrap leading-relaxed">
            {popupData.content}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {popupData.link && (
              <a 
                href={popupData.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDismiss}
                className="px-6 py-2.5 bg-[#E08F24] hover:bg-[#c77a1e] text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                {popupData.linkText || 'Xem chi tiết'}
              </a>
            )}
            <button 
              onClick={handleDismiss}
              className="px-6 py-2.5 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#333333] text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
