import { useEffect, useState } from 'react';
import DropZone from './../components/DropZone';
import ImageWrapper from './../components/ImageWrapper';
import { Autocomplete, Button, Checkbox, IconButton, TextField } from '@mui/material';
import { Clear, PlayArrow } from '@mui/icons-material';
import { formatNumber } from '../utils/utils';
import Progress from '../components/Progress';

const Convert = () => {
  const listQuality = ['auto', '1080p', '720p'];
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState<{ [filePath: string]: number }>({});
  const [form, setForm] = useState({
    format: 'mp4',
    quality: '720p',
    outputPath: 'relative',
    separator: '_',
    suffix: 'converted',
    merge: false,
  });

  useEffect(() => {
    window.api.receive('convertProgress', (data: any) => {
      const obj = { ...progress, [data.file]: data.percent };
      setProgress(obj);
    });

    // return () => {
    //   window.api.removeListener('convertProgress', handleProgress);
    // };
  }, []);

  const onDropFile = (files: File[]) => {
    const data = [...videos, ...files].filter((v, i, self) => self.indexOf(v) === i);
    console.log('data', data);
    setVideos(data);
  };

  const onClickStart = () => {
    console.log('videos', videos);
    console.log('form', form);

    for (const v of videos) {
      window.api
        .convertVideo(v.uri, form)
        .then((res) => {
          console.log('Successfully converted:', res);
        })
        .catch((err) => console.log('Error converting:', err));
    }
  };

  return (
    <DropZone onDropFile={onDropFile}>
      <div id='options' className='card flex justify-between gap-2'>
        <div className='grid w-full grid-cols-[auto_1fr] items-center gap-4'>
          <p className='font-semibold'>Output Path:</p>
          <p>Relative</p>
          <p className='font-semibold'>Format:</p>
          <p>{form.format.toUpperCase()}</p>
          <p className='font-semibold'>Quality:</p>
          <Autocomplete
            disablePortal
            options={listQuality}
            value={form.quality}
            onChange={(_, quality) => setForm({ ...form, quality })}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} />}
          />
        </div>
        <div className='flex w-fit flex-col items-center justify-between'>
          <label className='inline-flex cursor-pointer items-center'>
            <Checkbox checked={form.merge} onChange={(e) => setForm({ ...form, merge: e.target.checked })} />
            Merge
          </label>

          <div className='flex gap-2'>
            <IconButton color='primary' onClick={() => setVideos([])} disabled={!videos.length}>
              <Clear />
            </IconButton>
            <Button variant='contained' startIcon={<PlayArrow />} disabled={!videos.length} onClick={onClickStart}>
              Start
            </Button>
          </div>
        </div>
      </div>

      {videos.map((v, i) => (
        <div key={i} className='card flex justify-between gap-2'>
          <ImageWrapper isVideo={true} src={v.uri}></ImageWrapper>
          <div className='flex h-full flex-col'>
            <p>{v.uri}</p>
            <p>{formatNumber((v.size / 1000000).toFixed(0))} MB</p>

            {progress[v.uri] && <Progress className='mt-auto' value={progress[v.uri]} />}
          </div>
        </div>
      ))}
    </DropZone>
  );
};

export default Convert;
