# Equipment Compatibility Checker - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Schemas](#data-schemas)
3. [Calculation / Logic Algorithms](#calculation--logic-algorithms)
4. [API Reference](#api-reference)
5. [Integration Guide](#integration-guide)
6. [Customization](#customization)
7. [Performance Considerations](#performance-considerations)
8. [Browser Compatibility](#browser-compatibility)
9. [Security](#security)
10. [Version History](#version-history)
11. [Support and Contact](#support-and-contact)

## Architecture Overview

### Technology Stack

The Equipment Compatibility Checker is a **static, dependency-free** web application built with:

- **HTML5** - Semantic markup with ARIA attributes for accessibility
- **CSS3** - Custom stylesheets with CSS custom properties for theming
- **Vanilla JavaScript (ES6+)** - No frameworks, no build tools, no external runtime dependencies
- **Fuse.js** - Client-side fuzzy search library (loaded via CDN or bundled)
- **localStorage** - Client-side persistence for user preferences and favorites

### File Structure

```
equipment-compatibility-checker/
├── index.html                  # Main application entry point
├── documentation.html          # Standalone documentation page
├── embed.html                  # Embed instructions page
├── css/
│   └── style.css               # All application styles
├── js/
│   ├── common.js               # Shared utilities (theme toggle, modals, toasts)
│   ├── checker.js              # Core compatibility logic and UI controllers
│   ├── machine-database.js     # Machine equipment data
│   ├── cartridge-database.js   # Cartridge/needle data
│   ├── power-database.js       # Power supply data
│   └── grip-database.js        # Grip/tube data
```

### Component Breakdown

The application is organized into six functional tabs:

1. **Check Compatibility** - Select two components and verify pairwise compatibility
2. **Reverse Lookup** - Select one component to see all compatible items (list or matrix view)
3. **Build Your Setup** - Select one item from each of four categories to validate a full rig
4. **Compare Equipment** - Side-by-side comparison of 2-4 items
5. **Suggest Gear** - Form to submit missing equipment for database expansion
6. **FAQ & Troubleshooting** - Interactive troubleshooting wizard and static FAQ

### State Management

Global state is maintained in a single `state` object within `checker.js`:

```javascript
const state = {
    selected: {
        comp1: { type: null, id: null },
        comp2: { type: null, id: null },
        reverse: { type: null, id: null },
        build: {
            machine: null,
            power: null,
            cartridge: null,
            grip: null,
        }
    }
};
```

## Data Schemas

### Machine Database (`machine-database.js`)

```javascript
{
    "id": "fk-irons-spektra-flux",    // Unique identifier
    "brand": "FK Irons",               // Manufacturer name
    "model": "Spektra Flux",           // Product model name
    "type": "pen",                     // Machine type: "pen", "rotary", "coil"
    "connection": "rca",               // Connection type: "rca", "clip", "wireless", "both"
    "cartridge_compatible": true,      // Boolean: accepts universal cartridges
    "price_range": "$$$$",             // Price tier: "$" to "$$$$$"
    "status": ["new", "popular"]       // Optional status badges
}
```

### Cartridge Database (`cartridge-database.js`)

```javascript
{
    "id": "cheyenne-craft",            // Unique identifier
    "brand": "Cheyenne",               // Manufacturer name
    "model": "Craft Cartridges",       // Product model name
    "universal_fit": true,             // Boolean: fits universal machines
    "compatible_machines": ["universal", "cheyenne"],  // Array of compatible machine IDs or types
    "membrane_type": "full",           // Safety membrane: "full", "partial_or_none", "n/a"
    "price_range": "$$"                // Price tier
}
```

### Power Supply Database (`power-database.js`)

```javascript
{
    "id": "critical-atom-xr",          // Unique identifier
    "brand": "Critical Tattoo",        // Manufacturer name
    "model": "Atom X-R",               // Product model name
    "connection": "rca",               // Connection type: "rca", "clip", "wireless", "both"
    "output_amperage": "3A",           // Output amperage rating
    "price_range": "$$$",              // Price tier
    "status": ["popular"]              // Optional status badges
}
```

### Grip Database (`grip-database.js`)

```javascript
{
    "id": "fk-irons-ergo-click",       // Unique identifier
    "brand": "FK Irons",               // Manufacturer name
    "model": "Ergo Click Grip",        // Product model name
    "type": "cartridge",               // Grip type: "cartridge", "standard_needle"
    "price_range": "$$$",              // Price tier
    "status": ["popular"]              // Optional status badges
}
```

### Combined All Items Array

All four databases are merged into a single `allItems` array with a `type` discriminator:

```javascript
const allItems = [
    ...machineDB.map(i => ({...i, type: 'machine'})),
    ...cartridgeDB.map(i => ({...i, type: 'cartridge'})),
    ...powerDB.map(i => ({...i, type: 'power'})),
    ...gripDB.map(i => ({...i, type: 'grip'}))
];
```

## Calculation / Logic Algorithms

### `checkCompatibility(item1, item2, type1, type2)`

This is the core compatibility engine. It evaluates pairwise compatibility between any two equipment items.

**Algorithm Steps:**

1. **Category Validation**: If both items are from the same category (e.g., two machines), return incompatible with note "Cannot compare two items of the same type."

2. **Connection Type Matching**: For machine-to-power-supply pairs, compare connection types:
   - Direct match (e.g., RCA to RCA) = compatible
   - Wireless machine with any power supply = conditional (machine has built-in battery)
   - Mismatch requiring adapter (e.g., RCA to clip cord) = conditional
   - Complete mismatch = incompatible

3. **Cartridge Compatibility**: For machine-to-cartridge pairs:
   - If machine has `cartridge_compatible: true` and cartridge has `universal_fit: true` = compatible
   - If cartridge has `membrane_type: "partial_or_none"` = conditional (safety concern)
   - If machine is not cartridge-compatible and cartridge is universal = incompatible

4. **Grip Compatibility**: For machine-to-grip pairs:
   - Cartridge grip requires cartridge-compatible machine
   - Standard needle grip requires non-cartridge machine

5. **Power Supply Output**: For power-to-machine pairs, checks if output amperage is sufficient for the machine type

**Return Value:**
```javascript
{
    status: "compatible" | "conditional" | "incompatible",
    notes: ["Note 1", "Note 2", ...]  // Array of human-readable explanations
}
```

### `getItem(type, id)`

Simple lookup function that retrieves an item from the appropriate database:

```javascript
function getItem(type, id) {
    if (!type || !id || !databases[type]) return null;
    return databases[type].find(item => item.id === id);
}
```

### `getAlternativeRecommendations(item1, item2, type1, type2)`

Generates alternative equipment suggestions when compatibility fails:

1. Identifies the more expensive item of the pair
2. Searches all items of the same type
3. Tests each candidate against the other item using `checkCompatibility`
4. Returns up to 4 compatible or conditionally compatible alternatives

### Fuzzy Search (Fuse.js)

All searchable comboboxes use Fuse.js with these options:

```javascript
const fuseOptions = {
    keys: [
        { name: 'brand', weight: 0.7 },
        { name: 'model', weight: 0.3 }
    ],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    ignoreLocation: true,
    includeScore: true
};
```

### Result Caching

Compatibility results are cached in a `Map` to avoid redundant calculations:

```javascript
const compatibilityCache = new Map();

function getCachedCompatibility(item1Id, item2Id, type1, type2) {
    const cacheKey = `${type1}-${item1Id}-${type2}-${item2Id}`;
    return compatibilityCache.get(cacheKey);
}

function setCachedCompatibility(item1Id, item2Id, type1, type2, result) {
    const cacheKey = `${type1}-${item1Id}-${type2}-${item2Id}`;
    compatibilityCache.set(cacheKey, result);
    // Limit cache to 1000 entries
    if (compatibilityCache.size > 1000) {
        const firstKey = compatibilityCache.keys().next().value;
        compatibilityCache.delete(firstKey);
    }
}
```

## API Reference

### Public Functions

#### `window.PoliTools.EquipmentCompatibility`

The main namespace object containing all public APIs.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `checkCompatibility(item1, item2, type1, type2)` | `item1`: Object, `item2`: Object, `type1`: String, `type2`: String | `{status, notes}` | Core compatibility check between two items |
| `getItem(type, id)` | `type`: String ("machine"/"cartridge"/"power"/"grip"), `id`: String | Object or null | Lookup single item by type and ID |
| `formatPrice(priceRange)` | `priceRange`: String ("$" to "$$$$$") | HTML string | Returns formatted price badge HTML |
| `renderStatusBadges(item)` | `item`: Object with `status` array | HTML string | Returns status badge HTML (New, Popular, Recommended) |
| `toggleFavorite(type, id, buttonElement)` | `type`: String, `id`: String, `buttonElement`: DOM Element | void | Toggles favorite status and updates button UI |
| `createFavoriteButton(type, id, className)` | `type`: String, `id`: String, `className`: String (optional) | HTML string | Returns favorite button HTML |

#### `window.PoliTools.EquipmentCompatibility.databases`

```javascript
{
    machine: [...],    // Array of machine objects
    cartridge: [...],  // Array of cartridge objects
    power: [...],      // Array of power supply objects
    grip: [...]        // Array of grip objects
}
```

#### `window.showToast(title, message, type)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | String | Toast notification title |
| `message` | String | Optional detailed message |
| `type` | String | One of: "success", "error", "info" |

#### `window.EquipStorage` (if available)

| Namespace | Methods | Description |
|-----------|---------|-------------|
| `Favorites` | `toggle(type, id)`, `isFavorite(type, id)` | Manages user favorites in localStorage |
| `SearchHistory` | `add(term)`, `getRecent(count)` | Manages recent search terms |
| `RecentChecks` | `add(check)` | Records recent compatibility checks |

### Event Handlers

| Handler | Trigger | Behavior |
|---------|---------|----------|
| `check-compatibility-btn` click | Button click | Validates two selected components, shows loading spinner, displays result |
| `reverse-lookup-search` input | Text input | Fuzzy searches equipment, shows matching items |
| `list-view-btn` click | Button click | Switches reverse lookup to list view |
| `matrix-view-btn` click | Button click | Switches reverse lookup to matrix grid view |
| `check-full-setup-btn` click | Button click | Validates all four build components simultaneously |
| `compare-items-btn` click | Button click | Generates side-by-side comparison table |
| `suggest-gear-form` submit | Form submission | Submits new equipment suggestion |
| `dark-mode-toggle` click | Button click | Toggles light/dark theme |

## Integration Guide

### Standalone Embedding

The tool can be embedded in any website using an iframe. No API keys, dependencies, or configuration required.

**Standard Embed (Recommended):**

```html
<iframe
  src="https://poliinternational.com/tools/equipment-compatibility-checker/index.html"
  width="100%"
  height="800"
  frameborder="0"
  style="border: 1px solid #ddd; border-radius: 8px;"
  title="Equipment Compatibility Checker by Poli International">
</iframe>
```

**Available Size Variants:**

| Variant | Height | Use Case |
|---------|--------|----------|
| Standard | 800px | General purpose, recommended |
| Large | 1000px | Dedicated tool pages |
| Compact | 600px | Space-constrained layouts |

### Customization Options

The iframe `style` attribute can be customized:

```html
<iframe
  src="https://poliinternational.com/tools/equipment-compatibility-checker/index.html"
  width="100%"
  height="800"
  frameborder="0"
  style="border: 2px solid #B76E79; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
  title="Equipment Compatibility Checker by Poli International">
</iframe>
```

### Requirements

- JavaScript enabled (required for all functionality)
- HTML5 compatible browser
- No server-side dependencies
- No API keys or registration required
- Works on HTTP and HTTPS

## Customization

### Theme Customization

Users can toggle between light and dark mode using the theme toggle button. The preference is persisted in `localStorage` under the key `compatCheckerTheme`.

### CSS Custom Properties

The stylesheet uses CSS custom properties for theming. Key variables include:

```css
:root {
    --color-primary: #3B82F6;
    --color-secondary: #8B5CF6;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-error: #EF4444;
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #1a1a1a;
    --text-secondary: #666666;
}
```

### Embed Attribution

The embed includes a subtle "Powered by Poli International" footer. This attribution must remain intact per the license terms.

## Performance Considerations

### Caching Strategy

- **Compatibility results** are cached in memory (Map) with a 1000-entry limit
- **Search results** are debounced at 200ms to reduce computation
- **User preferences** (theme, favorites) are stored in localStorage

### Lazy Loading

Images use Intersection Observer for lazy loading when available:

```javascript
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, { rootMargin: '50px' });
}
```

### Search Optimization

- Fuse.js threshold set to 0.4 for balanced precision/recall
- Results limited to 20 items per search
- Empty search shows first 20 items or recent searches
- Debounced input handler prevents excessive computation

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |
| iOS Safari | 14+ | Touch-optimized |
| Android Chrome | 90+ | Touch-optimized |

### Requirements

- **JavaScript**: Required (ES6+ features used)
- **localStorage**: Required for persistence features
- **Intersection Observer**: Used for lazy loading (polyfill not included)
- **CSS Grid/Flexbox**: Used for layout

## Security

### Input Handling

- All user input is handled client-side only
- No data is transmitted to any server
- Form submissions (Suggest Gear) are client-side only with no backend endpoint
- Search inputs use `textContent` assignment to prevent XSS

### XSS Prevention

- Dynamic HTML is constructed using `textContent` where possible
- When innerHTML is used, content comes from controlled database objects
- User input is never directly injected into the DOM without sanitization
- No `eval()` or dynamic script execution

### Data Privacy

- No personally identifiable information (PII) is collected
- No cookies are set
- Camera access is not required (despite embed.html mentioning virtual try-on, this feature does not exist in the actual tool)
- All data persists only in the user's browser localStorage
- No analytics or tracking scripts are included

### Content Security

The application includes `meta` tags with `noindex, nofollow` directives to prevent search engine indexing of the tool page.

## Version History

### Version 1.0.0 (February 7, 2026)

- Initial release of Equipment Compatibility Checker
- Four equipment databases: machines, cartridges, power supplies, grips
- Six functional tabs: Check Compatibility, Reverse Lookup, Build Your Setup, Compare Equipment, Suggest Gear, FAQ & Troubleshooting
- Fuzzy search with Fuse.js integration
- Light/dark theme toggle with localStorage persistence
- Favorites system with localStorage persistence
- Result caching for performance
- Accessibility features with ARIA attributes
- Responsive design for mobile and desktop
- Embeddable via iframe with no dependencies

## Support and Contact

For technical support, questions, or custom integration assistance:

- **Website**: [https://poliinternational.com](https://poliinternational.com)
- **Documentation**: [https://poliinternational.com/equipment-compatibility-checker-documentation/](https://poliinternational.com/equipment-compatibility-checker-documentation/)
- **Contact Form**: [https://poliinternational.com/contact-us/](https://poliinternational.com/contact-us/)
- **Support Development**: [Buy Me a Coffee](https://ko-fi.com/C0C81NEXBV)

### License

This tool is provided as a free web application. The embed attribution must remain intact. For licensing inquiries, contact Poli International through the official website.
