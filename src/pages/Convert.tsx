import { useState } from 'react';
import DropZone from './../components/DropZone';
import ImageWrapper from './../components/ImageWrapper';

const Convert = () => {
  const [videos, setVideos] = useState([]);

  const onDropFile = (file: File) => {
    console.log('file', file);
    setVideos([...videos, file]);
  };

  return (
    <DropZone onDropFile={onDropFile}>
      {videos.map((v, i) => (
        <div key={i} className='card flex justify-between'>
          <ImageWrapper isVideo={true} src={v.uri}></ImageWrapper>
          <div className='flex flex-col'>
            <p>{v.uri}</p>
          </div>
        </div>
      ))}
    </DropZone>
  );
};

export default Convert;
