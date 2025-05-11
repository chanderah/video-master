import { DragEvent, FC, ReactNode, useCallback, useState } from 'react';

type DropZoneProps = {
  showPicker: boolean;
  children?: ReactNode;
  onDropFile: (file: any[]) => void;
};

const FileDropZone: FC<DropZoneProps> = ({ showPicker, children, onDropFile }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;

      const stats = await Promise.all(files.map((v) => window.api.getFileStat(v.path)));
      onDropFile(stats);
    },
    [onDropFile]
  );

  const onPickFile = async (e: any) => {
    const files: any[] = Array.from(e.target.files);
    if (!files.length) return;

    const stats = await Promise.all(files.map((v) => window.api.getFileStat(v.path)));
    onDropFile(stats);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className='h-screen'
      style={{
        backgroundColor: isDragging ? '#071426' : '#040d19',
        transition: 'background-color 0.2s',
      }}>
      {children}
      {showPicker && <input multiple type='file' id='file' accept='video/mp4,video/x-m4v,video/*' onChange={onPickFile} />}
    </div>
  );
};

export default FileDropZone;
