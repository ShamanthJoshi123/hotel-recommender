import { useState, useEffect, useMemo } from 'react';

function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [formData, setFormData] = useState({
    city: '',
    checkin: '',
    checkout: '',
    adults: 1,
  });
  const [searchName, setSearchName] = useState('');
  const [sortField, setSortField] = useState('Final_rating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true); // Dark by default
  const [isCachedData, setIsCachedData] = useState(false); // Track if data from CSV cache

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  const filteredRecommendations = useMemo(
    () =>
      recommendations.filter(hotel =>
        hotel.Hotel_name.toLowerCase().includes(searchName.toLowerCase())
      ),
    [recommendations, searchName]
  );

  const sortedRecommendations = useMemo(() => {
    const sorted = [...filteredRecommendations];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'Price') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRecommendations, sortField, sortOrder]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setRecommendations([]);
    setSearchName('');
    setIsCachedData(false);
    try {
      const response = await fetch('http://localhost:5000/live_recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city.trim().toLowerCase(),
          checkin_date: formData.checkin,
          checkout_date: formData.checkout,
          adults: formData.adults,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        alert(`Error: ${err.error || 'Failed to fetch hotels'}`);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setRecommendations(data.hotels || []);
      setIsCachedData(data.from_cache === true);
    } catch {
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!formData.city) return alert("Enter a city name first");
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city.trim().toLowerCase(),
          checkin_date: formData.checkin,
          checkout_date: formData.checkout,
          adults: formData.adults,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        alert(`Error: ${err.error || 'Failed to refresh data'}`);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setRecommendations(data.hotels || []);
      setIsCachedData(false);
    } catch {
      alert('Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Icon = ({ className, children }) => (
    <span className={`inline-block mr-2 ${className}`}>{children}</span>
  );

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors duration-500">
      <nav className="sticky top-0 z-50 w-full backdrop-blur bg-gray-50/80 dark:bg-gray-900/80 shadow-lg transition-colors duration-500">
        <div className="w-full flex items-center px-8 py-4">
          <img
            src="/TripPick.png"
            alt="logo"
            className="h-14 w-14 rounded-full border-2 border-indigo-500 bg-white"
          />
          <h1 className="pl-5 text-3xl font-extrabold tracking-wide mr-auto text-yellow-600 dark:text-yellow-400 drop-shadow-lg">
            Trip Pick
          </h1>
          <input
            type="text"
            className="ml-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl px-4 py-2 outline-none w-72 focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="Search hotel by name..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          <button
            onClick={() => setDark(d => !d)}
            className="ml-6 px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-white font-semibold shadow"
            aria-label="Toggle dark mode"
          >
            {dark ? '☀️ Light mode' : '🌙 Dark mode'}
          </button>
        </div>
      </nav>

      <main className="w-full py-10 px-4">
        {/* Search form */}
        <form
          onSubmit={handleSubmit}
          className="w-full bg-gray-100 dark:bg-gray-900 rounded-3xl shadow-lg flex flex-wrap justify-around gap-6 mb-6 p-10 text-gray-900 dark:text-gray-50 transition-colors duration-500"
        >
          {[
            {
              label: 'City',
              val: formData.city,
              onChange: v => setFormData({ ...formData, city: v }),
              type: 'text',
              ph: 'Mumbai',
            },
            {
              label: 'Check-in',
              val: formData.checkin,
              onChange: v => setFormData({ ...formData, checkin: v }),
              type: 'date',
            },
            {
              label: 'Check-out',
              val: formData.checkout,
              onChange: v => setFormData({ ...formData, checkout: v }),
              type: 'date',
            },
            {
              label: 'Adults',
              val: formData.adults,
              onChange: v => setFormData({ ...formData, adults: Number(v) }),
              type: 'number',
              min: 1,
            },
          ].map((input, i) => (
            <div key={i} className="flex flex-col flex-1 min-w-[10rem]">
              <label className="mb-2 text-yellow-600 dark:text-yellow-400 font-bold">
                {input.label}
              </label>
              <input
                type={input.type}
                required
                value={input.val}
                min={input.min}
                placeholder={input.ph}
                className="rounded-xl border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 font-medium px-5 py-3 transition"
                onChange={e => input.onChange(e.target.value)}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-10 bg-gradient-to-tr from-yellow-400 via-yellow-600 to-yellow-400 text-gray-900 font-bold py-4 rounded-full shadow-lg text-xl hover:scale-105 hover:ring-4 hover:ring-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search Hotels'}
          </button>
        </form>

        {/* Show cached data notification and refresh button */}
        {isCachedData && (
          <div className="mb-6 text-center px-4">
            <p className="mb-2 text-yellow-500 font-semibold">
              ⚠️ These hotels are loaded from cached CSV data. For fresh live data, please click the button below.
            </p>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-xl font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Refresh Data
            </button>
          </div>
        )}

        {/* Sort controls */}
        {recommendations.length > 0 && (
          <div className="w-full flex flex-wrap justify-center gap-7 mb-10 px-4">
            <div className="flex items-center gap-3 py-4 px-6 bg-gray-200 dark:bg-gray-700 rounded-2xl">
              <label className="font-semibold text-yellow-700 dark:text-yellow-400">
                Sort by:
              </label>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value)}
                className="rounded bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-300 px-4 py-2 transition"
              >
                <option value="Room_status">Room Status</option>
                <option value="Price">Price</option>
                <option value="Final_rating">Rating</option>
              </select>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="rounded bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-300 px-4 py-2 transition"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        )}

        {/* Hotel list or no-match message */}
        <section className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-7 px-2">
          {filteredRecommendations.length === 0 && recommendations.length > 0 && (
            <p className="col-span-full text-center text-yellow-600 dark:text-yellow-400 font-semibold text-xl mt-20">
              No hotels matching your search.
            </p>
          )}

          {sortedRecommendations.map((hotel, idx) => (
            <article
              key={idx}
              className="bg-white dark:bg-gray-800 border border-yellow-400 rounded-3xl shadow-xl p-7 flex flex-col hover:scale-[1.03] transition-transform cursor-pointer text-gray-900 dark:text-yellow-300"
            >
              <h2 className="text-2xl font-extrabold mb-3">{hotel.Hotel_name}</h2>
              <div className="flex flex-col gap-2 text-base font-medium">
                <div className="flex items-center text-yellow-700 dark:text-yellow-400">
                  <Icon className="text-yellow-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.87-3.13-7-7-7Zm0 8.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 1.5Z"
                      />
                    </svg>
                  </Icon>
                  {hotel.Address || 'No address provided'}
                </div>
                <div
                  className={`flex items-center ${
                    hotel.Room_status === 'Available' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <Icon>
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 10V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v3H0v11h2v-3h20v3h2V10zM6 7h12v3H6z" />
                    </svg>
                  </Icon>
                  {hotel.Room_status || 'Unavailable'}
                </div>
                <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                  <Icon>
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 1c-6 0-9 5-9 9s4.5 9 9 9 9-5 9-9-3-9-9-9zm0 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                    </svg>
                  </Icon>
                  ₹{hotel.Price ?? 'N/A'}
                </div>
                <div className="flex items-center text-yellow-700 dark:text-yellow-400">
                  <Icon>
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24 7.46 14 5.82 21z" />
                    </svg>
                  </Icon>
                  {hotel.Final_rating ?? 'N/A'}
                </div>
              </div>
            </article>
          ))}
        </section>

        {loading && (
          <p className="mt-16 text-center font-semibold text-yellow-600 dark:text-yellow-400 text-2xl">
            Loading hotels...
          </p>
        )}
      </main>
    </div>
  );
}

export default App;











