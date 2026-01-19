/**
 * Email parser utilities for stripping signatures and quoted content from replies.
 */

/**
 * Common signature delimiters and patterns
 */
const SIGNATURE_PATTERNS = [
  /^--\s*$/m, // Standard signature delimiter
  /^---+\s*$/m, // Dashes
  /^___+\s*$/m, // Underscores
  /^\*\*\*+\s*$/m, // Asterisks
  /^Sent from my iPhone/im,
  /^Sent from my iPad/im,
  /^Sent from my Android/im,
  /^Sent from my mobile/im,
  /^Sent from Mail for Windows/im,
  /^Get Outlook for /im,
  /^Sent from Yahoo Mail/im,
  /^Sent from Outlook/im,
]

/**
 * Patterns that indicate the start of quoted reply content
 */
const QUOTE_HEADER_PATTERNS = [
  /^On .+ wrote:$/m, // "On Mon, Jan 1, 2024, John wrote:"
  /^On .+,.*wrote:$/m, // Variations
  /^\d{1,2}\/\d{1,2}\/\d{2,4}.*wrote:$/m, // Date formats
  /^From:.*$/m, // Forwarded email headers
  /^-+\s*Original Message\s*-+/im,
  /^-+\s*Forwarded message\s*-+/im,
  /^>{2,}/, // Multiple quote levels
]

/**
 * Strip email signature from text content.
 * Returns the text before the first signature delimiter found.
 */
export function stripSignature(text: string): string {
  let result = text

  for (const pattern of SIGNATURE_PATTERNS) {
    const match = result.match(pattern)
    if (match && match.index !== undefined) {
      result = result.slice(0, match.index).trim()
    }
  }

  return result
}

/**
 * Strip quoted reply content (lines starting with >) from text.
 * Also removes the "On ... wrote:" header lines.
 */
export function stripQuotedContent(text: string): string {
  const lines = text.split('\n')
  const resultLines: string[] = []
  let inQuotedBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for quote header patterns
    const isQuoteHeader = QUOTE_HEADER_PATTERNS.some((p) => p.test(line))
    if (isQuoteHeader) {
      inQuotedBlock = true
      continue
    }

    // Check for quoted lines (starting with >)
    if (/^>/.test(line.trim())) {
      inQuotedBlock = true
      continue
    }

    // If we were in a quoted block and hit a non-quoted line,
    // check if it's just whitespace between quote blocks
    if (inQuotedBlock && line.trim() === '') {
      // Look ahead to see if the next non-empty line is also quoted
      let nextNonEmptyIdx = i + 1
      while (nextNonEmptyIdx < lines.length && lines[nextNonEmptyIdx].trim() === '') {
        nextNonEmptyIdx++
      }
      if (nextNonEmptyIdx < lines.length && /^>/.test(lines[nextNonEmptyIdx].trim())) {
        continue
      }
      inQuotedBlock = false
    }

    if (!inQuotedBlock) {
      resultLines.push(line)
    }
  }

  return resultLines.join('\n').trim()
}

/**
 * Extract plain text from HTML email content.
 * Handles common HTML email structures from Gmail, Outlook, etc.
 */
export function extractPlainTextFromHtml(html: string): string {
  // Remove Gmail quote containers
  let text = html.replace(/<div class="gmail_quote"[\s\S]*$/i, '')

  // Remove Outlook quote containers
  text = text.replace(/<div id="divRplyFwdMsg"[\s\S]*$/i, '')
  text = text.replace(/<div id="appendonsend"[\s\S]*$/i, '')

  // Remove style and script tags entirely
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '')

  // Replace common block elements with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = decodeHtmlEntities(text)

  // Normalize whitespace
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char)
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  )

  return result
}

/**
 * Process an email body to extract just the reply content.
 * Strips signatures, quoted content, and extracts plain text from HTML.
 */
export function parseEmailReply(body: string, isHtml: boolean = false): string {
  let text = body

  // Convert HTML to plain text if needed
  if (isHtml) {
    text = extractPlainTextFromHtml(text)
  }

  // Strip quoted content first (includes "On ... wrote:" headers)
  text = stripQuotedContent(text)

  // Then strip signature
  text = stripSignature(text)

  // Final cleanup
  text = text.trim()

  return text
}

/**
 * Extract sender information from email headers.
 */
export interface EmailSender {
  email: string
  name?: string
}

export function parseEmailAddress(addressString: string): EmailSender {
  // Handle format: "Name <email@example.com>" or just "email@example.com"
  const match = addressString.match(/^(?:"?([^"<]+)"?\s*)?<?([^>]+@[^>]+)>?$/)

  if (match) {
    return {
      name: match[1]?.trim(),
      email: match[2].trim().toLowerCase(),
    }
  }

  // Fallback: treat the whole string as an email
  return {
    email: addressString.trim().toLowerCase(),
  }
}
