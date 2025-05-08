import { useEffect, useState } from 'react';

const ImageWrapper = ({ isVideo = false, src, width, height, className }: any) => {
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateImageSource = async () => {
      console.log('Called');
      setLoading(true);
      if (isVideo) {
        const thumbnail = await window.api.getThumbnail(src);
        setSource(thumbnail);
      } else {
        setSource(src);
      }
      setLoading(false);
    };

    generateImageSource();
  }, [src, isVideo]);

  return (
    <div
      className={`image-wrapper ${className || ''}`}
      style={{
        position: 'relative',
        width: width || 160,
        height: height || 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {loading ? (
        <div className='spinner' style={{ fontSize: '1.5rem' }}>
          ⏳
        </div>
      ) : (
        <img src={source || '/assets/images/image_placeholder.png'} alt={'image'} className='h-full w-full object-cover' />
      )}
    </div>
  );
};

export default ImageWrapper;
