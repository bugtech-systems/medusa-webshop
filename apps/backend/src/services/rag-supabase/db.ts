import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Insert or update product embedding
export async function upsertDocument(content, metadata, embedding) {
  const query = `
    INSERT INTO documents (content, metadata, embedding)
    VALUES ($1, $2, $3)
  `;
  await pool.query(query, [content, metadata, embedding]);
}


// Insert or update product embedding
export async function upsertProduct(productId, name, description, embedding) {
  const query = `
    INSERT INTO product_embeddings (product_id, name, description, embedding)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (product_id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          embedding = EXCLUDED.embedding,
          created_at = NOW()
  `;
  await pool.query(query, [productId, name, description, embedding]);
}

// Vector search
export async function searchProducts(queryEmbedding, topK = 5) {
  const res = await pool.query(
    `SELECT product_id, name, description
     FROM product_embeddings
     ORDER BY embedding <-> $1
     LIMIT $2`,
    [queryEmbedding, topK]
  );
  return res.rows;
}

// Vector search
export async function searchSimilar(queryEmbedding, topK = 5) {
  const res = await pool.query(
    `SELECT id, content, metadata
     FROM documents
     ORDER BY embedding <-> $1
     LIMIT $2`,
    [queryEmbedding, topK]
  );
  return res.rows;
}