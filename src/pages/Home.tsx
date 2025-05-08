import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const listAction = [
    { label: 'Convert', action: 'convert' },
    { label: 'Join', action: 'join' },
  ];

  const [files, setFiles] = useState([]);

  useEffect(() => {
    const run = async () => {
      const home = await window.api.invoke('env').then((res) => res.HOME);
      const dir = `${home}/Movies`;

      const files: any[] = await window.api.scanDirectory(dir, ['.mp4']);
      setFiles(files);
    };

    run();
  }, []);

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid w-full md:grid-cols-2 md:space-x-4'>
        {listAction.map((v, i) => (
          <Link key={i} to={v.action} className='card cursor-pointer'>
            <p className='font-semibold'>{v.label}</p>
          </Link>
        ))}
      </div>

      <div className='grid w-full md:grid-cols-2 md:space-x-4'>
        {files.map((v, i) => (
          <div key={i} className='card'>
            {/* <ImageWrapper isVideo={true} src={v.uri}></ImageWrapper>
            <p>{v.name}</p>
            <img src={v.thumbnail}></img>
            <p>{v.thumbnail}</p> */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
