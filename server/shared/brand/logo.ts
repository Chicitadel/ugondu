/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Shared / UI / Brand Components
 * File           : logo.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / WCAG 2.1 AA
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

export interface UgonduLogoProps {
  variant?: 'full' | 'symbol';
  size?: 'compact' | 'normal' | 'large';
  decorative?: boolean;
  altText?: string;
  className?: string;
}

export const BRAND_ASSET_PATHS = {
  full: {
    svg: '/assets/brand/web/ugondu-logo.svg',
    png: '/assets/brand/web/ugondu-logo.png',
  },
  symbol: {
    svg: '/assets/brand/web/ugondu-symbol.svg',
    png: '/assets/brand/web/ugondu-symbol.png',
  },
  favicon: '/assets/brand/web/favicon.ico',
} as const;

export const LOGO_DIMENSIONS = {
  full: {
    compact: { width: 104, height: 48 },
    normal: { width: 160, height: 72 },
    large: { width: 240, height: 108 },
  },
  symbol: {
    compact: { width: 32, height: 32 },
    normal: { width: 48, height: 48 },
    large: { width: 96, height: 96 },
  },
} as const;

/**
 * Generates framework-agnostic accessible HTML markup for rendering
 * the Ugondu brand logo according to WCAG 2.1 AA standards.
 */
export function renderUgonduLogoHtml(props: UgonduLogoProps = {}): string {
  const variant = props.variant ?? 'full';
  const size = props.size ?? 'normal';
  const decorative = props.decorative ?? false;
  const dims = LOGO_DIMENSIONS[variant][size];
  const src = BRAND_ASSET_PATHS[variant].svg;
  const fallbackSrc = BRAND_ASSET_PATHS[variant].png;
  const alt = decorative ? '' : (props.altText ?? 'Ugondu');
  const ariaHidden = decorative ? ' aria-hidden="true"' : '';
  const classAttr = props.className ? ` class="${escapeHtml(props.className)}"` : '';

  return (
    `<picture${classAttr}>` +
    `<source srcset="${src}" type="image/svg+xml">` +
    `<img src="${fallbackSrc}" width="${dims.width}" height="${dims.height}" ` +
    `alt="${escapeHtml(alt)}"${ariaHidden} ` +
    `style="display:block;max-width:100%;height:auto;object-fit:contain;" />` +
    `</picture>`
  );
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
