import React from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';

type DragDropListProps<T> = {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  children: (item: T, index: number) => React.ReactNode;
  getKey: (item: T) => string;
};

export function DragDropList<T = any>({ items, setItems, children, getKey }: DragDropListProps<T>) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = [...items];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId='droppable'>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {items.map((item, i) => (
              <Draggable draggableId={getKey(item)} index={i} key={getKey(item)}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                    {children(item, i)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
