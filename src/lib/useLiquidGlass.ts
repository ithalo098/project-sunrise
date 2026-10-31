import { useEffect, useRef } from 'react';

export function useLiquidGlass() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const elements = containerRef.current?.querySelectorAll('[data-liquid]');
    if (!elements || elements.length === 0) return;

    // Check for SVG filter support
    const supportsSvgFilter = typeof SVGFEColorMatrixElement !== 'undefined' && typeof SVGFEDisplacementMapElement !== 'undefined';
    if (!supportsSvgFilter) return;

    const svgId = 'liquid-glass-filters';
    let svg = document.getElementById(svgId) as unknown as SVGSVGElement | null;
    
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      if (svg) {
        svg.id = svgId;
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.pointerEvents = 'none';
        document.body.appendChild(svg);
      }
    }

    if (!svg) return;

    let defs = svg.querySelector('defs') as SVGDefsElement | null;
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);
    }

    elements.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      const id = `liquid-filter-${index}`;
      
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.id = id;
      filter.setAttribute('x', '-20%');
      filter.setAttribute('y', '-20%');
      filter.setAttribute('width', '140%');
      filter.setAttribute('height', '140%');

      const feTurbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
      feTurbulence.setAttribute('type', 'fractalNoise');
      feTurbulence.setAttribute('baseFrequency', '0.01 0.01');
      feTurbulence.setAttribute('numOctaves', '2');
      feTurbulence.setAttribute('result', 'noise');

      const feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
      feDisplacementMap.setAttribute('in', 'SourceGraphic');
      feDisplacementMap.setAttribute('in2', 'noise');
      feDisplacementMap.setAttribute('scale', '4');
      feDisplacementMap.setAttribute('xChannelSelector', 'R');
      feDisplacementMap.setAttribute('yChannelSelector', 'G');

      filter.appendChild(feTurbulence);
      filter.appendChild(feDisplacementMap);
      if (defs) defs.appendChild(filter);

      htmlEl.style.backdropFilter = `url(#${id}) blur(0.3px) saturate(1.3)`;
    });
  }, []);

  return containerRef;
}
