export const config = {
  ollamaBaseUrl: "http://localhost:11434",
  embedModel: "nomic-embed-text",
  chatModel: "llama3.1:latest",

  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
}
