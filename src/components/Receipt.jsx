import { useEffect, useRef } from 'react';
import { PAPER, PHOTO_SIZE } from '../utils/imageProcessing.js';

export default function Receipt({ photo, interactive = false, handlers = {}, busy = false }) {
  const ref = useRef(null);
  const height = PAPER.top + PHOTO_SIZE + PAPER.bottom;
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
    if (photo) context.drawImage(photo, 0, 0);
  }, [photo]);
  return (
    <div className="receipt" style={{ aspectRatio: `${PAPER.width} / ${height}` }}>
      <canvas
        ref={ref} width={PHOTO_SIZE} height={PHOTO_SIZE}
        className={interactive ? 'receipt-photo draggable' : 'receipt-photo'}
        style={{ left: `${PAPER.side / PAPER.width * 100}%`, top: `${PAPER.top / height * 100}%`, width: `${PHOTO_SIZE / PAPER.width * 100}%` }}
        aria-label={interactive ? 'Thermal receipt preview. Drag to reposition; arrow buttons are also available below.' : 'Black-and-white photo on a Polaroid-style receipt'}
        aria-busy={busy}
        {...handlers}
      />
    </div>
  );
}
