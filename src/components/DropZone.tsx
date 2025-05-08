import { DragEvent, FC, ReactNode, useCallback, useState } from 'react';

type DropZoneProps = {
  onDropFile: (file: any[]) => void;
  children?: ReactNode;
};

const DropZone: FC<DropZoneProps> = ({ onDropFile, children }) => {
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
    </div>
  );
};

export default DropZone;
