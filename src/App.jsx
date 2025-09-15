import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'


const supabase = createClient(
import.meta.env.VITE_SUPABASE_URL,
import.meta.env.VITE_SUPABASE_ANON_KEY
)


export default function App() {
const [rectangles, setRectangles] = useState([])


useEffect(() => {
loadGame()
}, [])


async function loadGame() {
let { data, error } = await supabase.from('rectangles').select('*')
if (error) console.error(error)
else setRectangles(data)
}


return (
<div>
<h1>Sleutel Bordspel</h1>
<div className="grid">
{rectangles.map((r) => (
<div key={r.id} className={`tile ${r.discovered ? 'open' : 'hidden'}`}>
{r.discovered ? '⬜' : '❓'}
</div>
))}
</div>
</div>
)
}
