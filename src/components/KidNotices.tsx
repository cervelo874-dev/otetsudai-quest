import type { Notice } from '../types';
import { dismissNotice } from '../actions';
import { sound } from '../sound';
import { X } from 'lucide-react';

export function KidNotices({
  notices,
  childId,
}: {
  notices: Notice[];
  childId: string;
}) {
  const myNotices = notices.filter((n) => n.childId === childId);
  if (myNotices.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {myNotices.map((n) => (
        <div
          key={n.id}
          className="animate-popin relative flex items-center justify-between rounded-2xl bg-amber-100 p-3.5 border-2 border-amber-300 text-amber-900 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{n.icon}</span>
            <span className="text-sm font-black">{n.text}</span>
          </div>

          <button
            onClick={() => {
              sound.tap();
              dismissNotice(n.id);
            }}
            className="btn-pop ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-amber-800 hover:bg-white"
            aria-label="とじる"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
