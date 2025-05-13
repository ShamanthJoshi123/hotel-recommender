import { useState } from 'react'
import './App.css'

function App() {
  const [recommendations, setRecommendations] = useState([])
  const [formData, setFormData] = useState({
    price: 1000,
    rating: 4
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:5000/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error('Network response was not ok')
      const data = await response.json()
      setRecommendations(data)
    } catch (error) {
      alert('Failed to get recommendations. Please try again.')
    }
  }

  return (
    <div className="container">
      <h1>Hotel Recommender</h1>
      <form onSubmit={handleSubmit} className="recommendation-form">
        <div className="form-group">
          <label>
            Price (₹):
            <input
              type="number"
              value={formData.price}
              min="0"
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            Rating:
            <input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={formData.rating}
              onChange={e => setFormData({ ...formData, rating: e.target.value })}
              required
            />
          </label>
        </div>
        <button type="submit" className="submit-btn">Get Recommendations</button>
      </form>

      <div className="recommendations-grid">
        {recommendations.map((hotel, index) => (
          <div key={index} className="hotel-card">
            <h3>{hotel.Hotel_name}</h3>
            <div className="hotel-details">
              <p>📍 {hotel.Location}</p>
              <p>💰 Price: ₹{hotel.Price}</p>
              <p>🎉 Discount: {hotel.Discount}%</p>
              <p>⭐ Rating: {hotel.Rating}/5</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
