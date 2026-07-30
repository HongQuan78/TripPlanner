import { useEffect, useRef, useState } from 'react';

export function useImageLoaded(imageUrl: string | null) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [imageUrl]);

  return { imgRef, loaded, markLoaded: () => setLoaded(true) };
}
