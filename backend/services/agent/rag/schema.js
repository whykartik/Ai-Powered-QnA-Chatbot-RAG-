export const documentSchema = ({ text, sourceFile, location, metadata = {} }) => ({
  text: text.trim(),
  source_file: sourceFile,
  page: location?.page,
  slide: location?.slide,
  sheet: location?.sheet,
  row: location?.row,
  metadata: {
    ...metadata,
    source_file: sourceFile,
    page: location?.page,
    slide: location?.slide,
    sheet: location?.sheet,
    row: location?.row,
    artifact_type: metadata.artifact_type,
    uploaded_at: metadata.uploaded_at || new Date().toISOString()
  }
})
