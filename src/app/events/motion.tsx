'use client';

import { useEffect } from 'react';

/**
 * Animations du back-office : apparition au défilement, compteurs, halo suivant le curseur.
 * Tout reste lisible sans JavaScript et respecte « réduire les animations ».
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

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target as HTMLElement;
        node.classList.add('is-in');
        node.querySelectorAll<HTMLElement>('[data-count]').forEach(count);
        if (node.dataset.count) count(node);
        observer.unobserve(node);
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(node => observer.observe(node));

    let frame = 0;
    const move = (event: PointerEvent) => {
      if (reduced || frame) return;
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--mx', event.clientX + 'px');
        root.style.setProperty('--my', event.clientY + 'px');
        frame = 0;
      });
    };
    window.addEventListener('pointermove', move, { passive: true });

    // Effet magnétique léger sur les éléments marqués.
    const magnets = [...document.querySelectorAll<HTMLElement>('[data-magnet]')];
    const handlers = magnets.map(node => {
      const enter = (event: PointerEvent) => {
        if (reduced) return;
        const box = node.getBoundingClientRect();
        node.style.transform = `translate(${(event.clientX - box.left - box.width / 2) * 0.18}px, ${(event.clientY - box.top - box.height / 2) * 0.25}px)`;
      };
      const leave = () => { node.style.transform = ''; };
      node.addEventListener('pointermove', enter);
      node.addEventListener('pointerleave', leave);
      return () => { node.removeEventListener('pointermove', enter); node.removeEventListener('pointerleave', leave); };
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('pointermove', move);
      handlers.forEach(off => off());
    };
  }, []);
  return null;
}
