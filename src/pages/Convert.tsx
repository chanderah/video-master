import { useEffect, useState } from 'react';
import { Autocomplete, Button, Checkbox, CircularProgress, IconButton, TextField } from '@mui/material';
import { Clear, PlayArrow, Stop } from '@mui/icons-material';
import { TaskQueueService } from '../services/TaskQueueService';
import { VideoProgress } from '../interfaces/video';
import FileDropZone from '../components/FileDropZone';
import { DragDropList } from '../components/DragDropList';
import ImageWrapper from '../components/ImageWrapper';
import { formatNumber } from '../utils/utils';
import Progress from '../components/Progress';

type Props = {
  queue: TaskQueueService;
};

const Convert = ({ queue }: Props) => {
  const audio = new Audio('/assets/sounds/bell.mp3');
  const listQuality = ['auto', '1080p', '720p'];
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [tasks, setTasks] = useState<{ [id: string]: VideoProgress }>({});
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
    window.api.receive('convertProgress', (data: VideoProgress) => {
      setTasks((prev) => {
        // if (!form.merge && !prev[data.file]) {
        //   const element = document.getElementById(data.file);
        //   element?.scrollIntoView({ behavior: 'smooth' });
        // }

        return { ...prev, [data.taskId]: { ...data, file: prev[data.taskId].file, running: data.percent < 100 } };
      });
    });
  }, []);

  useEffect(() => {
    console.log(videos);
  }, [videos]);

  const onDropFile = (files: File[]) => {
    if (Object.keys(tasks).length) {
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
      const filesUri = videos.map((v) => v.uri);
      const taskId = queue.generateTaskId();
      const task = queue.add(() => window.api.mergeVideo(taskId, filesUri, form));
      tasks[taskId] = { file: filesUri.join('|'), percent: 0 } as VideoProgress; // this

      console.log('tasks[taskId]', tasks[taskId]);
      await task.promise
        .then((res) => {
          console.log('Successfully converted:', res);
        })
        .catch((err) => {
          console.log('Error converting:', err);
        });
    } else {
      const pendingTasks = videos.filter((v) => !tasks[v.uri]);
      const tasksToRun = pendingTasks.map((v) => {
        const taskId = queue.generateTaskId();
        const task = queue.add(() => window.api.convertVideo(taskId, v.uri, form));
        tasks[taskId] = { file: v.uri, percent: 0 } as VideoProgress;
        return task;
      });

      const taskPromises = tasksToRun.map((v) => v.promise);
      taskPromises.forEach((promise) =>
        promise
          .then((res) => console.log('Successfully converted:', res))
          .catch((err) => {
            error++;
            console.log('Error during conversion:', err);
          })
      );
      await Promise.all(taskPromises);
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
    // window.api.stopFfmpeg().then(() => setLoading(false));

    Object.keys(tasks).forEach(async (id) => {
      const isRemoved = queue.remove(id);
      if (!isRemoved) await window.api.stopFfmpeg(id);
    });
    setLoading(false);
  };

  const clearList = () => {
    setTasks({});
    setVideos([]);
  };

  return (
    <FileDropZone showPicker={!videos.length} onDropFile={onDropFile}>
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

      <DragDropList items={videos} setItems={setVideos} getKey={(v) => v.uri}>
        {(v, i) => {
          const task = Object.values(tasks).find((task) => task.file.includes(v.uri));
          return (
            <div key={i} id={v.uri} className='card grid grid-cols-[auto_1fr] justify-between gap-4' onClick={() => window.api.openFile(v.uri)}>
              <ImageWrapper isVideo={true} src={v.uri} width='120px' height='80px' className='!cursor-pointer'></ImageWrapper>
              <div className='flex h-full flex-col'>
                <div className='grid w-full grid-cols-[1fr_auto] items-center justify-between gap-2'>
                  <p>{v.uri}</p>
                  <CircularProgress size='16px' className='ml-auto' style={{ visibility: task?.running ? 'visible' : 'hidden' }} />

                  <p>{formatNumber((v.size / 1000000).toFixed(0))} MB</p>
                  {task?.size && <p>{formatNumber(task.size / 1000000)} MB</p>}
                </div>
                {(task?.running || task?.done) && <Progress className='mt-auto' value={task.percent} />}
              </div>
            </div>
            // <div key={v.uri} className='video-item'>
            //   <p>{v.uri}</p>
            //   <p>{v.size} MB</p>
            // </div>
          );
        }}
      </DragDropList>
    </FileDropZone>
  );
};

export default Convert;
