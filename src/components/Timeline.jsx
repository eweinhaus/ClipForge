import React from 'react';
import { Trash2, Film } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDuration, formatResolution } from '../utils/formatters';
import './Timeline.css';

/**
 * Timeline Component
 * Displays list of imported clips with thumbnails and drag-and-drop reordering
 */
export default function Timeline({ clips, selectedClipId, onSelectClip, onDeleteClip, onReorderClips }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = clips.findIndex(clip => clip.id === active.id);
      const newIndex = clips.findIndex(clip => clip.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderClips(oldIndex, newIndex);
      }
    }
  };

  if (clips.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="empty-icon">
          <Film size={64} strokeWidth={1.5} />
        </div>
        <p>No clips yet</p>
        <p className="empty-hint">Import videos to get started!</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h3>Timeline</h3>
        <span className="clip-count">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={clips.map(clip => clip.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="clip-list">
            {clips.map(clip => (
              <SortableClipItem
                key={clip.id}
                clip={clip}
                isSelected={clip.id === selectedClipId}
                onSelect={() => onSelectClip(clip.id)}
                onDelete={() => onDeleteClip(clip.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/**
 * SortableClipItem Component
 * Individual clip in the timeline with drag-and-drop support
 */
const SortableClipItem = React.memo(({ clip, isSelected, onSelect, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`clip-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <img
        src={clip.thumbnail}
        alt={clip.fileName}
        className="clip-thumbnail"
        loading="lazy"
      />
      <div className="clip-info">
        <div className="clip-name" title={clip.fileName}>
          {clip.fileName}
        </div>
        <div className="clip-meta">
          <span className="clip-duration">{formatDuration(clip.duration)}</span>
          <span className="clip-separator">•</span>
          <span className="clip-resolution">{formatResolution(clip.width, clip.height)}</span>
        </div>
      </div>
      <button
        className="clip-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete clip"
        aria-label={`Delete ${clip.fileName}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});

SortableClipItem.displayName = 'SortableClipItem';
