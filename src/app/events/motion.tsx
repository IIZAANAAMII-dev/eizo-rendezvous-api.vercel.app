'use client';

import { useEffect, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Animations du back-office : apparition au défilement, compteurs, halo suivant le curseur.
 * Tout reste lisible sans JavaScript et respecte « réduire les animations ».
 *
 * Next.js change de page sans recharger le navigateur (connexion, filtres, onglets) : ce
 * composant reste monté. Il surveille donc les blocs ajoutés après coup (MutationObserver),
 * sinon ils resteraient invisibles jusqu'à un rechargement.
 */
export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.dataset.motion = reduced ? 'off' : 'on';

    const count = (node: HTMLElement) => {
      const target = Number(node.dataset.count);
      if (!Number.isFinite(target) || reduced) { node.textContent = String(target); return; }
      const start = performance.now();
      const duration = 1400 + Math.min(target, 400);
      const step = (time: number) => {
        const progress = Math.min(1, (time - start) / duration);
        const eased = 1 - Math.pow(2, -10 * progress);
        node.textContent = String(Math.round(target * (progress === 1 ? 1 : eased)));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const reveal = (node: HTMLElement) => {
      if (node.classList.contains('is-in')) return;
      node.classList.add('is-in');
      node.querySelectorAll<HTMLElement>('[data-count]').forEach(count);
      if (node.dataset.count) count(node);
    };

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach(node => {
        if (seen.has(node)) return;
        seen.add(node);
        observer.observe(node);
      });
    };
    scan();
    let pending = 0;
    const mutations = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; scan(); });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    // Filet de sécurité : tout ce qui est à l'écran depuis plus d'une seconde est affiché.
    const safety = window.setInterval(() => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach(node => {
        const box = node.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) reveal(node);
      });
    }, 1000);

    let frame = 0;
    const move = (event: PointerEvent) => {
      if (reduced) return;
      if (!frame) frame = requestAnimationFrame(() => {
        root.style.setProperty('--mx', event.clientX + 'px');
        root.style.setProperty('--my', event.clientY + 'px');
        frame = 0;
      });
      // Effet magnétique léger (délégation : fonctionne aussi sur les éléments ajoutés).
      const magnet = (event.target as Element | null)?.closest?.('[data-magnet]') as HTMLElement | null;
      if (magnet) {
        const box = magnet.getBoundingClientRect();
        magnet.style.transform = `translate(${(event.clientX - box.left - box.width / 2) * 0.18}px, ${(event.clientY - box.top - box.height / 2) * 0.25}px)`;
      }
    };
    const out = (event: PointerEvent) => {
      const magnet = (event.target as Element | null)?.closest?.('[data-magnet]') as HTMLElement | null;
      if (magnet && !magnet.contains(event.relatedTarget as Node | null)) magnet.style.transform = '';
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', out, { passive: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.clearInterval(safety);
      if (pending) cancelAnimationFrame(pending);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', out);
    };
  }, []);
  return null;
}

/** Bouton d'envoi qui affiche un indicateur pendant le traitement du formulaire. */
export function Submit({ children, pending: pendingLabel = 'Chargement…', className, magnet }: {
  children: ReactNode; pending?: string; className?: string; magnet?: boolean;
}) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} aria-busy={pending} data-magnet={magnet ? '' : undefined} data-pending={pending ? '' : undefined}>
    {pending ? <><i data-spinner aria-hidden="true" />{pendingLabel}</> : children}
  </button>;
}
