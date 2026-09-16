import { useState } from "react"

const serverUrl = import.meta.env.VITE_SERVER_URL

export default function RagChat() {
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState("")
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!query.trim() || loading) return
    setAnswer("")
    setSources([])
    setLoading(true)
    try {
      const response = await fetch(`${serverUrl}/api/agent/rag/query/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() })
      })
      if (!response.ok || !response.body) throw new Error("RAG query failed")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() || ""
        for (const eventBlock of events) {
          const data = eventBlock.split("\n").find((line) => line.startsWith("data: "))
          if (!data) continue
          const payload = JSON.parse(data.slice(6))
          if (eventBlock.startsWith("event: token")) setAnswer((current) => current + payload.token)
          if (eventBlock.startsWith("event: sources")) setSources(payload.sources || [])
          if (eventBlock.startsWith("event: error")) throw new Error(payload.message)
        }
      }
    } catch (error) {
      setAnswer(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex h-full flex-col gap-4 bg-[#0d0f14] p-5 text-slate-100">
      <div>
        <h2 className="text-lg font-semibold">Artifact Q&A</h2>
        <p className="text-xs text-slate-500">Ask questions across your uploaded documents.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm leading-6">
        {answer || "Your grounded answer will stream here."}
        {sources.length > 0 && (
          <div className="mt-5 border-t border-white/[0.08] pt-3 text-xs text-slate-400">
            {sources.map((source) => <div key={source.citation}>{source.citation} {source.file}{source.page ? `, page ${source.page}` : ""}{source.slide ? `, slide ${source.slide}` : ""}</div>)}
          </div>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask about your artifacts" className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm outline-none" />
        <button disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm disabled:opacity-50">{loading ? "..." : "Ask"}</button>
      </form>
    </section>
  )
}
