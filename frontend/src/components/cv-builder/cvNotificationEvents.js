const messages = {
  'cv.created': ['CV created successfully', 'Your new CV is ready to view, edit and download.'],
  'cv.updated': ['Changes saved successfully', 'Your CV is up to date.'],
  'cv.draftSaved': ['Draft saved', "Continue editing your CV whenever you're ready."],
  'cv.duplicated': ['CV duplicated', 'A copy of your CV has been created.'],
  'cv.renamed': ['CV renamed', 'Your CV name has been updated.'],
  'cv.deleted': ['CV deleted', 'Your CV has been removed successfully.']
}

export function createCVNotification(type, cvId) {
  const [title, description] = messages[type]
  return { type, title, description, target: cvId ? { kind: 'cv', id: cvId } : null }
}
