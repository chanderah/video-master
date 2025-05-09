import { useEffect, useState } from 'react';

const ImageWrapper = ({ isVideo = false, src, width, height, className }: any) => {
  const imgFallback = '/assets/images/image_placeholder.png';
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateImageSource = async () => {
      setLoading(true);
      if (isVideo) {
        const thumbnail = await window.api.getThumbnail(src);
        setSource(thumbnail);
      } else {
        setSource(src ?? imgFallback);
      }
      setLoading(false);
    };

    generateImageSource();
  }, [src, isVideo]);

  return (
    <div
      className={`relative flex items-center justify-center ${className || ''}`}
      style={{
        ...(width && { width }),
        ...(height && { height }),
      }}>
      {loading ? (
        <p className='text-2xl'>⏳</p>
      ) : (
        <img alt={'image'} className='h-full w-full object-cover' src={source} onError={() => setSource(imgFallback)} />
      )}
    </div>
  );
};

export default ImageWrapper;
