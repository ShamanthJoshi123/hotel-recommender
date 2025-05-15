import { useState } from 'react'

function App() {
  const [recommendations, setRecommendations] = useState([])
  const [formData, setFormData] = useState({
    city: '',
    price: 1000,
    discount: 0,
    rating: 0, // actually reviews
  })
  const [searchName, setSearchName] = useState('')

  const filteredRecommendations = recommendations.filter(hotel =>
    hotel.Hotel_name.toLowerCase().includes(searchName.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:5000/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error('Network response was not ok')
      const data = await response.json()
      setRecommendations(data)
    } catch (error) {
      alert('Failed to get recommendations. Please try again.')
    }
  }

  return (
    <div className="min-h-screen min-w-screen w-full bg-white">
      {/* Navbar */}
      <nav className="bg-indigo-800 shadow">
        <div className="mx-auto flex items-center px-3 py-3">
          <img src="/TripPick.png" alt="Logo" className="h-15 w-15 rounded bg-white mr-3" />
          <span className="text-white text-2xl font-bold tracking-wide mr-auto">Trip Pick</span>
          <input
            type="text"
            className="rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-700"
            placeholder="Search hotel by name..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-start p-6 mx-auto w-full">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-6 bg-indigo-100 p-8 rounded-lg shadow mb-10 w-full max-w-4xl"
        >
          {/* City */}
          <div className="flex flex-col">
            <label className="font-semibold text-slate-700 mb-1">City:</label>
            <input
              type="text"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              required
              placeholder="e.g., Mumbai"
              className="rounded border text-black border-amber-950 px-4 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Price */}
          <div className="flex flex-col">
            <label className="font-semibold text-slate-700 mb-1">Price (₹):</label>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
              required
              className="rounded border text-black border-amber-950 px-4 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Discount */}
          <div className="flex flex-col">
            <label className="font-semibold text-slate-700 mb-1">Minimum Discount (%):</label>
            <input
              type="number"
              min="0"
              value={formData.discount}
              onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
              required
              className="rounded border text-black border-amber-950 px-4 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Reviews (Rating) */}
          <div className="flex flex-col">
            <label className="font-semibold text-slate-700 mb-1">Reviews:</label>
            <input
              type="number"
              min="0"
              value={formData.rating}
              onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })}
              required
              className="rounded border text-black border-amber-950 px-4 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="mt-4 md:mt-0 px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded shadow transition"
          >
            Get Recommendations
          </button>
        </form>

        {/* Recommendations */}
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-5xl">
          {filteredRecommendations.length === 0 && recommendations.length > 0 && (
            <p className="text-lg text-red-500 font-medium w-full text-center">
              No hotels found matching your search.
            </p>
          )}
          {filteredRecommendations.map((hotel, index) => (
            <div
              key={index}
              className="bg-indigo-100 rounded-lg shadow p-6 w-72 flex flex-col items-center"
            >
              <h3 className="text-xl font-bold text-indigo-800 mb-2">{hotel.Hotel_name}</h3>
              <div className="text-slate-700 text-base text-center">
                <p className="mb-1">📍 {hotel.Location}</p>
                <p className="mb-1">💰 Price: ₹{hotel.Price}</p>
                <p className="mb-1">🎉 Discount: {hotel.Discount}%</p>
                <p>📝 Reviews: {hotel.Rating}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
