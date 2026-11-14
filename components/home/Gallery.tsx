"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { GALLERY_PHOTOS } from "./gallery-photos";

/** Galeria em grade com ampliação em tela cheia (anterior/próximo, setas, Esc e gesto de deslizar). */
export function Gallery({ photos = GALLERY_PHOTOS }: { photos?: typeof GALLERY_PHOTOS }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const swipeStart = useRef<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const total = photos.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  const show = (i: number) => setIndex(((i % total) + total) % total);

  function open(i: number, button: HTMLButtonElement) {
    opener.current = button;
    show(i);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (index === null) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      show(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      show(index - 1);
    }
  }

  function onPointerDown(e: PointerEvent) {
    swipeStart.current = e.clientX;
  }
  function onPointerUp(e: PointerEvent) {
    if (swipeStart.current === null || index === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  }

  const current = index === null ? null : photos[index];

  return (
    <section id="galeria" aria-labelledby="galeria-titulo" className="container-page section-y scroll-mt-24">
      <div className="mb-8 flex flex-col gap-2">
        <p className="eyebrow">Galeria</p>
        <h2 id="galeria-titulo" className="title-section">
          Nosso trabalho
        </h2>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" data-testid="gallery">
        {photos.map((p, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={(e) => open(i, e.currentTarget)}
              className="group relative block aspect-square w-full overflow-hidden rounded-md border border-border bg-card"
              aria-label={`Ampliar foto ${i + 1} de ${total}: ${p.alt}`}
            >
              <Image
                src={p.src}
                alt=""
                fill
                loading="lazy"
                placeholder="blur"
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label="Foto ampliada"
        onKeyDown={onKeyDown}
        onClose={() => {
          setIndex(null);
          opener.current?.focus();
        }}
        onClick={(e) => {
          // Clique no fundo (fora da foto e dos botões) fecha.
          if (e.target === e.currentTarget) setIndex(null);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg/95 p-0 text-text backdrop:bg-bg/80"
      >
        {current ? (
          <div className="relative flex h-full w-full touch-pan-y flex-col select-none" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
            <div className="flex items-center justify-between p-3">
              <p className="pl-2 text-sm text-muted" aria-live="polite">
                {index! + 1} / {total}
              </p>
              <button type="button" onClick={() => setIndex(null)} className="flex size-11 items-center justify-center rounded-sm hover:bg-card" aria-label="Fechar">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <figure className="relative mx-3 mb-3 flex-1 md:mx-20">
              <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" placeholder="blur" draggable={false} />
              <figcaption className="sr-only">{current.alt}</figcaption>
            </figure>
            <button
              type="button"
              onClick={() => show(index! - 1)}
              className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg/70 hover:border-gold md:left-6"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => show(index! + 1)}
              className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg/70 hover:border-gold md:right-6"
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
