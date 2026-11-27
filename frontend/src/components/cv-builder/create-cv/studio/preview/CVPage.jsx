import { fontFamilies, pageDimensions } from '../design/designDefaults'

function luminance(color) {
  const [red, green, blue] = color.slice(1).match(/../g).map(part => {
    const channel = parseInt(part, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

// This unscaled surface supplies the document styles used for measurement and page rendering.
export default function CVPage({ design, layout, locale, direction, children }) {
  const [width, height] = pageDimensions[design.pageSize] ?? pageDimensions.A4
  const lightAccent = luminance(design.accent) > 1.05 / 4.5 - 0.05

  return (
    <div className="cv-document-frame" style={{ maxInlineSize: `${width}mm` }}>
      <article
        className="cv-document"
        lang={locale}
        dir={direction}
        data-header={layout.header}
        data-entry-style={layout.entryStyle}
        data-section-style={layout.sectionStyle}
        style={{
          '--cv-document-accent': design.accent,
          '--cv-document-heading': lightAccent ? '#071b60' : design.accent,
          '--cv-document-banner-text': lightAccent ? '#000' : '#fff',
          '--cv-document-page-ratio': height / width,
          '--cv-document-margin': `${design.margins / width * 100}cqi`,
          fontFamily: fontFamilies[design.fontFamily] ?? fontFamilies['sans-serif'],
          fontSize: `${design.fontSize}pt`,
          lineHeight: design.lineSpacing
        }}
        aria-label="CV document"
      >
        {children}
      </article>
    </div>
  )
}
