import PPTX2Json from "pptx2json"
import { documentSchema } from "../schema.js"

const textFromXml = (value) => {
  if (!value) return []
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(textFromXml)
  if (typeof value === "object") return Object.entries(value).flatMap(([key, child]) => key === "a:t" ? textFromXml(child) : textFromXml(child))
  return []
}

export const parsePptx = async ({ filePath, sourceFile, metadata = {} }) => {
  const parser = new PPTX2Json()
  const json = await parser.toJson(filePath)
  const slideFiles = Object.keys(json).filter((key) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
  const notesFiles = Object.keys(json).filter((key) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(key))
  return slideFiles.map((slideFile) => {
    const slideNumber = Number(slideFile.match(/slide(\d+)/)[1])
    const notesFile = notesFiles.find((key) => key.endsWith(`notesSlide${slideNumber}.xml`))
    const slideText = [...new Set(textFromXml(json[slideFile]).map((item) => item.trim()).filter(Boolean))].join(" ")
    const notesText = notesFile
      ? [...new Set(textFromXml(json[notesFile]).map((item) => item.trim()).filter(Boolean))].join(" ")
      : ""
    const text = [slideText, notesText && `Notes: ${notesText}`].filter(Boolean).join("\n")
    return documentSchema({
      text: text || `Slide ${slideNumber} contains no extractable text.`,
      sourceFile,
      location: { slide: slideNumber },
      metadata: { ...metadata, artifact_type: "pptx" }
    })
  }).filter((document) => document.text.trim())
}
