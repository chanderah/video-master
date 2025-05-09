import { useEffect, useState } from 'react';
import DropZone from './../components/DropZone';
import ImageWrapper from './../components/ImageWrapper';
import { Autocomplete, Button, Checkbox, IconButton, TextField } from '@mui/material';
import { Clear, PlayArrow, Stop } from '@mui/icons-material';
import { formatNumber } from '../utils/utils';
import Progress from '../components/Progress';

const Convert = () => {
  const audio = new Audio('/assets/sounds/bell.mp3');

  const listQuality = ['auto', '1080p', '720p'];
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState<{ [filePath: string]: number }>({});
  const [form, setForm] = useState({
    format: 'mp4',
    quality: '720p',
    outputPath: 'relative',
    separator: '_',
    suffix: 'converted',
    deleteSource: true,
    merge: false,
  });

  useEffect(() => {
    window.api.receive('convertProgress', (data: any) => {
      setProgress((prev) => {
        if (!prev[data.file]) {
          const element = document.getElementById(data.file);
          element?.scrollIntoView({ behavior: 'smooth' });
        }
        return { ...prev, [data.file]: data.percent };
      });
    });
  }, []);

  const onDropFile = (files: File[]) => {
    if (Object.keys(progress).length) {
      clearList();
    }

    // const data = filterUniqueArr([...videos, ...files], 'uri');
    const data = [...videos, ...files];
    setVideos(data);

    // scrollTo({
    //   top: window.innerHeight,
    //   behavior: 'smooth',
    // });
  };

  const onClickStart = async () => {
    setLoading(true);

    let error = 0;
    if (form.merge) {
      try {
        const files = videos.map((v) => v.uri);
        const res = await window.api.mergeVideo(files, form);
        console.log('Successfully converted:', res);
      } catch (err) {
        console.log('Error converting:', err);
        error++;
      }
    } else {
      const filtered = videos.filter((v) => !progress[v.uri]);
      for (const v of filtered) {
        try {
          const res = await window.api.convertVideo(v.uri, form);
          console.log('Successfully converted:', res);
        } catch (err) {
          console.log('Error converting:', err);
          error++;
        }
      }
    }

    audio.load();
    audio.play();
    setTimeout(() => {
      const message = `${videos.length} Conversion finished with errors: ${error}`;
      console.log(message);
      alert(message);
      setLoading(false);
    });
  };

  const onClickStop = () => {
    window.api.stopFfmpeg().then(() => setLoading(false));
  };

  const clearList = () => {
    setProgress({});
    setVideos([]);
  };

  return (
    <DropZone showPicker={!videos.length} onDropFile={onDropFile}>
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
            disabled={loading}
            renderInput={(params) => <TextField {...params} />}
          />
        </div>
        <div className='flex w-fit flex-col items-center justify-between'>
          <div className='flex flex-col'>
            <label className='inline-flex cursor-pointer items-center'>
              <Checkbox disabled={loading} checked={form.deleteSource} onChange={(e) => setForm({ ...form, deleteSource: e.target.checked })} />
              Delete Source
            </label>
            <label>
              <Checkbox
                disabled={loading}
                checked={form.merge}
                onChange={(e) => {
                  const merge = e.target.checked;
                  setForm({ ...form, merge, suffix: merge ? 'merged' : 'converted' });
                }}
              />
              Merge
            </label>
          </div>

          <div className='flex gap-2'>
            <IconButton disabled={loading || !videos.length} color='primary' onClick={clearList}>
              <Clear />
            </IconButton>
            <Button variant='contained' startIcon={loading ? <Stop /> : <PlayArrow />} disabled={!videos.length} onClick={loading ? onClickStop : onClickStart}>
              {loading ? 'Stop' : 'Start'}
            </Button>
          </div>
        </div>
      </div>

      {videos.map((v, i) => (
        <div key={i} id={v.uri} className='card grid grid-cols-[auto_1fr] justify-between gap-4'>
          <ImageWrapper src={v.uri} isVideo={true} width='120px' height='80px'></ImageWrapper>
          <div className='flex h-full flex-col'>
            <p>{v.uri}</p>
            <p>
              {formatNumber((v.size / 1000000).toFixed(0))} MB
              {v.newSize && <span className='font-semibold'>{` -> ${formatNumber((v.newSize / 1000000).toFixed(0))}`}</span>}
            </p>

            {progress[v.uri] && <Progress className='mt-auto' value={progress[v.uri]} />}
          </div>
        </div>
      ))}
    </DropZone>
  );
};

export default Convert;
