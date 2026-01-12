'use client';

import { DragEvent, ClipboardEvent, RefObject } from 'react';

interface ImageDropzoneProps {
  image: string | null;
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPaste: (e: ClipboardEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClick: () => void;
  placeholder?: string;
  className?: string;
  height?: string;
}

export function ImageDropzone({
  image,
  isDragging,
  fileInputRef,
  onPaste,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onClick,
  placeholder = 'Drop, paste or click to upload',
  className = '',
  height = 'h-32',
}: ImageDropzoneProps) {
  return (
    <>
      <div
        className={`border flex items-center justify-center cursor-pointer transition-colors rounded-lg overflow-hidden ${height} ${
          isDragging ? 'border-white bg-white/10' : 'border-white/20 hover:border-white/40'
        } ${className}`}
        onClick={onClick}
        onPaste={onPaste}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        tabIndex={0}
      >
        {image ? (
          <img
            src={image}
            alt="Reference"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs text-white/40">
            {isDragging ? 'Drop here' : placeholder}
          </span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
    </>
  );
}
