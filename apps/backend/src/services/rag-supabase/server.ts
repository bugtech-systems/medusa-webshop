import express from "express"
import { ask } from "./rag"

const app = express()
app.use(express.json())

app.post("/rag/ask", async (req, res) => {
  try {
    const { question } = req.body
    if (!question) {
      return res.status(400).json({ error: "Question required" })
    }

    const answer = await ask(question)
    res.json({ answer })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "RAG error" })
  }
})

app.listen(3333, () => {
  console.log("RAG service running on port 3333")
})
