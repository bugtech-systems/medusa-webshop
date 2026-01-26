// components/SearchBar.tsx
import { useState } from "react";
export default function SearchBar() {
  const [q, setQ] = useState("");
  return (
    <form className="flex" onSubmit={(e)=>e.preventDefault()}>
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder="What are you looking for?"
        className="w-full py-2 px-3 text-sm rounded-l border-0"
      />
      <button className="bg-white text-gray-700 px-3 rounded-r" aria-label="Search">🔍</button>
    </form>
  );
}
