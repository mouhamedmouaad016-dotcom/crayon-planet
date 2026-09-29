import { Suspense } from 'react';
import DoneInner from './DoneInner';

export default function Done() {
  return (
    <Suspense fallback={<div className="py-6 text-gray-400">جارٍ التحميل…</div>}>
      <DoneInner />
    </Suspense>
  );
}
