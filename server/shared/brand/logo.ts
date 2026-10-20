/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Shared / UI / Brand Components
 * File           : logo.ts
 * Version        : 2.0.0
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

import { __t } from '../i18n';

export interface UgonduLogoProps {
  variant?: 'full' | 'symbol';
  size?: 'compact' | 'normal' | 'large';
  decorative?: boolean;
  altText?: string;
  altToken?: string;
  locale?: string;
  basePath?: string;
  className?: string;
  responsiveClass?: string;
  customStyle?: string;
  loading?: 'lazy' | 'eager';
}

export const BRAND_RELATIVE_PATHS = {
  full: {
    svg: 'web/ugondu-logo.svg',
    png: 'web/ugondu-logo.png',
  },
  symbol: {
    svg: 'web/ugondu-symbol.svg',
    png: 'web/ugondu-symbol.png',
  },
  favicon: 'web/favicon.ico',
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
 * Resolves a normalized absolute or CDN URL for a brand asset given a base path.
 */
export function resolveBrandAssetUrl(relPath: string, basePath?: string): string {
  const defaultBase = typeof process !== 'undefined' && process.env && process.env['UGONDU_ASSET_BASE_URL']
    ? process.env['UGONDU_ASSET_BASE_URL']
    : '/assets/brand';
  const base = (basePath !== undefined ? basePath : defaultBase).replace(/\/+$/, '');
  const cleanRel = relPath.replace(/^\/+/, '');
  return `${base}/${cleanRel}`;
}

export const BRAND_ASSET_PATHS = {
  full: {
    svg: resolveBrandAssetUrl(BRAND_RELATIVE_PATHS.full.svg),
    png: resolveBrandAssetUrl(BRAND_RELATIVE_PATHS.full.png),
  },
  symbol: {
    svg: resolveBrandAssetUrl(BRAND_RELATIVE_PATHS.symbol.svg),
    png: resolveBrandAssetUrl(BRAND_RELATIVE_PATHS.symbol.png),
  },
  favicon: resolveBrandAssetUrl(BRAND_RELATIVE_PATHS.favicon),
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
  const src = resolveBrandAssetUrl(BRAND_RELATIVE_PATHS[variant].svg, props.basePath);
  const fallbackSrc = resolveBrandAssetUrl(BRAND_RELATIVE_PATHS[variant].png, props.basePath);

  let alt = '';
  if (!decorative) {
    if (props.altText !== undefined) {
      alt = props.altText;
    } else {
      const token = props.altToken ?? 'brand.logo_alt';
      try {
        const translated = __t(token, {}, props.locale);
        alt = translated && translated !== token ? translated : 'Ugondu — Universal Delivery Operating System';
      } catch {
        alt = 'Ugondu — Universal Delivery Operating System';
      }
    }
  }

  const ariaHidden = decorative ? ' aria-hidden="true"' : '';
  const loadingAttr = props.loading ? ` loading="${props.loading}"` : '';
  const classes = [props.className, props.responsiveClass].filter(Boolean).join(' ');
  const classAttr = classes ? ` class="${escapeHtml(classes)}"` : '';
  const styleAttr = props.customStyle
    ? ` style="${escapeHtml(props.customStyle)}"`
    : ' style="display:block;max-width:100%;height:auto;object-fit:contain;"';

  return (
    `<picture${classAttr}>` +
    `<source srcset="${escapeHtml(src)}" type="image/svg+xml">` +
    `<img src="${escapeHtml(fallbackSrc)}" width="${dims.width}" height="${dims.height}" ` +
    `alt="${escapeHtml(alt)}"${ariaHidden}${loadingAttr}${styleAttr} />` +
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
