'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent, ClipboardEvent } from 'react';

export interface UseImageUploadReturn {
  image: string | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setImage: (image: string | null) => void;
  handlers: {
    handlePaste: (e: ClipboardEvent) => void;
    handleDragOver: (e: DragEvent) => void;
    handleDragLeave: (e: DragEvent) => void;
    handleDrop: (e: DragEvent) => void;
    handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  };
  openFilePicker: () => void;
  clear: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clear = useCallback(() => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return {
    image,
    isDragging,
    fileInputRef,
    setImage,
    handlers: {
      handlePaste,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileChange,
    },
    openFilePicker,
    clear,
  };
}
