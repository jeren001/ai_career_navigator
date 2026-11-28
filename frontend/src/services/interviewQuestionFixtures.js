// Included only when the Vite development server explicitly enables test fixtures.
export async function requestFixtureQuestion({ configuration, index, signal }) {
  signal?.throwIfAborted()
  const categories = configuration.types ?? [configuration.interviewType]
  const category = categories[index % categories.length]
  return {
    status: 'available',
    question: {
      id: `fixture-${index + 1}`,
      category: `Development fixture · ${category}`,
      content: `Development test prompt ${index + 1}. Enter sample text to verify the interview session controls.`,
      source: 'fixture'
    }
  }
}
