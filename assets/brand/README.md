# Ugondu Brand Assets & Authoritative Logo Specification

> [!IMPORTANT]
> **Product**: Ugondu — Universal Delivery Operating System  
> **Brand Authority**: Air Roofers SASU Brand & Design Governance  
> **Classification**: ENTERPRISE | PUBLIC ASSET  
> **Version**: 1.0.0

---

## 1. Overview & Authorized Asset Hierarchy

The Ugondu brand asset standard establishes a single authoritative repository source for product visual branding across all supported operating systems, interfaces, packaging manifests, and documentation surfaces.

```
assets/brand/
├── manifest.json              # Machine-readable asset inventory and rules
├── checksums.sha256           # SHA-256 cryptographic digests
├── README.md                  # Brand usage & specification guide
├── source/
│   └── ugondu-logo-master.png # High-resolution uncompressed transparent master
├── web/
│   ├── ugondu-logo.svg        # Scalable vector primary logo (emblem + wordmark)
│   ├── ugondu-logo.png        # High-density transparent PNG primary logo
│   ├── ugondu-symbol.svg      # Scalable compact emblem (arrow symbol)
│   ├── ugondu-symbol.png      # Compact emblem raster
│   └── favicon.ico            # Multi-resolution ICO (16, 32, 48, 64, 128, 256)
├── desktop/
│   ├── app-icon.png           # 512x512 launcher icon
│   └── app-icon.ico           # Windows multi-resolution icon
├── mobile/
│   ├── icon.png               # Adaptive icon master (512x512)
│   ├── icon-192.png           # PWA/Android launcher icon (192x192)
│   ├── icon-512.png           # PWA/Android high-density icon (512x512)
│   └── splash-logo.png        # Launch splash screen logo
└── documentation/
    ├── ugondu-logo.svg        # Clean vector logo for docs and reports
    └── ugondu-logo.png        # Markdown/preview fallback
```

---

## 2. Color System & Geometry Rules

| Token | Hex | RGB | CMYK | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `primaryBlue` | `#02438d` | `2, 67, 141` | `99, 52, 0, 45` | Left letterform glyph & wordmark |
| `goldenYellow` | `#f5ae04` | `245, 174, 4` | `0, 29, 98, 4` | Initial growth arrow & curve highlight |

### Design Rules
- Background must be genuinely transparent (alpha = 0); no white mattes, dark halos, or black fill blocks disguised as transparency.
- Proportions and aspect ratios are strictly frozen; never stretch, skew, crop, or recolor elements.
- Decorative CLI banners are prohibited when `--format json`, `--json`, or non-interactive mode is active.
