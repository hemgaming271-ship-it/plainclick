"use client";

import { useRef, useState } from "react";

/** The launch film in a large rounded card. Nothing downloads until the visitor presses play. */
export function FilmCard({ src, poster, duration }: { src: string; poster: string; duration: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="shadow-float relative overflow-hidden rounded-[28px] bg-black">
      <video
        ref={ref}
        className="block aspect-video w-full"
        poster={poster}
        preload="none"
        playsInline
        controls={playing}
        onEnded={() => setPlaying(false)}
        aria-label="PlainClick launch film"
      >
        <source src={src} type="video/mp4" />
      </video>
      {!playing && (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            ref.current?.play().catch(() => setPlaying(false));
          }}
          className="absolute bottom-6 left-1/2 inline-flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/95 py-2 pl-2 pr-5 text-[15px] font-semibold text-[#1d1d1f] shadow-lg backdrop-blur transition hover:bg-white"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 1.5v11l9-5.5z" fill="currentColor" />
            </svg>
          </span>
          Play the film <span className="font-normal text-muted">{duration}</span>
        </button>
      )}
    </div>
  );
}
