import { DragEvent, FC, ReactNode, useCallback, useState } from 'react';

type DropZoneProps = {
  onDropFile: (file: any) => void;
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

      const file = e.dataTransfer.files[0];
      if (!file) return;

      console.log('file', file);
      const fileStat = await window.api.getFileStat(file.path);
      onDropFile(fileStat);
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
