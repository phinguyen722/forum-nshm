import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Info, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AboutUs() {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        const docRef = doc(db, 'system', 'about_us');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const rawContent = docSnap.data().content || '';
          
          // Parse HTML to extract images
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawContent, 'text/html');
          
          // Extract all image sources
          const imgElements = Array.from(doc.querySelectorAll('img'));
          const extractedImages = imgElements.map(img => img.src);
          
          // Remove images from the document
          imgElements.forEach(img => img.remove());
          
          setImages(extractedImages);
          setContent(doc.body.innerHTML);
        }
      } catch (error) {
        console.error('Error fetching about content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAboutContent();
  }, []);

  // Auto-flip images
  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Change image every 3 seconds
    
    return () => clearInterval(interval);
  }, [images.length]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
          <Info size={20} />
        </div>
        <h2 className="text-2xl font-bold text-[#141414] dark:text-[#E5E5E5]">Về chúng tôi</h2>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] rounded shadow-sm border border-[#E5E5E5] dark:border-[#333333] p-6 md:p-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#E08F24]" size={32} />
          </div>
        ) : content || images.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Text Content (Left Side) */}
            <div className={`flex-1 ${images.length > 0 ? 'lg:w-1/2' : 'w-full'}`}>
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>

            {/* Image Carousel (Right Side) */}
            {images.length > 0 && (
              <div className="w-full lg:w-1/2 relative rounded-lg overflow-hidden shadow-md bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                <div className="aspect-video relative">
                  <img 
                    src={images[currentImageIndex]} 
                    alt="About Us" 
                    className="w-full h-full object-cover transition-opacity duration-500"
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                      >
                        <ChevronRight size={20} />
                      </button>
                      
                      {/* Indicators */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Chưa có thông tin giới thiệu.
          </div>
        )}
      </div>

      <div className="w-full mt-8 flex justify-center">
        <img 
          src="https://hoangmaistarschool.edu.vn/assets/images/background-7.svg" 
          alt="Background decoration" 
          className="w-full max-w-2xl opacity-80"
        />
      </div>
    </div>
  );
}
