import { useState, useEffect, useMemo } from "react";

// Star rating display (fills part of the 5 stars)
function StarRating({ value = 0, max = 5 }) {
  return (
    <div className="flex gap-1 items-center ml-1">
      {[...Array(max)].map((_, i) => {
        const v = value - i;
        return (
          <span key={i} className="h-5 w-5">
            {v >= 1 ? (
              <svg fill="gold" stroke="orange" viewBox="0 0 20 20">
                <polygon points="10,2 12,7.5 18,7.6 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,7.6 8,7.5" />
              </svg>
            ) : v > 0 ? (
              <svg fill="url(#star-grad)" viewBox="0 0 20 20">
                <defs>
                  <linearGradient id="star-grad">
                    <stop offset={`${v * 100}%`} stopColor="gold" />
                    <stop offset={`${v * 100}%`} stopColor="lightgray" />
                  </linearGradient>
                </defs>
                <polygon points="10,2 12,7.5 18,7.6 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,7.6 8,7.5" fill="url(#star-grad)" stroke="orange"/>
              </svg>
            ) : (
              <svg fill="lightgray" stroke="orange" viewBox="0 0 20 20">
                <polygon points="10,2 12,7.5 18,7.6 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,7.6 8,7.5" />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}

// Status chip, colored dot + label
function StatusChip({ status }) {
  let color = "bg-gray-400";
  let text = "Unknown";
  if (status && status.toLowerCase() === "available") {
    color = "bg-green-500";
    text = "Available";
  } else if (status && status.toLowerCase() === "unavailable") {
    color = "bg-red-500";
    text = "Unavailable";
  } else if (status && status.toLowerCase().includes("not available")) {
    color = "bg-gray-400";
    text = "Not Available";
  }
  return (
    <div className="flex gap-2 items-center">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`}></span>
      <span className="font-medium text-sm">{text}</span>
    </div>
  );
}

// KNN helper function
function knnFilter(hotels, targetRating, targetPrice, k) {
  const getVal = (h, key) => {
    const v = h[key];
    if (typeof v === "string" && v.trim() === "") return null;
    if (v === null || v === undefined) return null;
    let vv = Number(v);
    if (Number.isNaN(vv)) return null;
    return vv;
  };
  let scored = hotels
    .map((hotel) => {
      let rating = getVal(hotel, "Final_rating") ?? getVal(hotel, "Rating");
      let price = getVal(hotel, "Price");
      if (rating == null || price == null) return null;
      return {
        ...hotel,
        _knn_dist: Math.sqrt(
          Math.pow(rating - targetRating, 2) +
            Math.pow((price - targetPrice) / 500, 2)
        ),
      };
    })
    .filter(Boolean);
  scored.sort((a, b) => a._knn_dist - b._knn_dist);
  const output = scored.slice(0, k).map(({ _knn_dist, ...rest }) => rest);
  const missing = hotels.filter(
    (h) =>
      (getVal(h, "Final_rating") ?? getVal(h, "Rating")) == null ||
      getVal(h, "Price") == null
  );
  return [...output, ...missing];
}

export default function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [formData, setFormData] = useState({
    city: "",
    checkin: "",
    checkout: "",
    adults: 1,
  });
  const [searchName, setSearchName] = useState("");
  const [sortField, setSortField] = useState("Final_rating");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);

  const [dataSource, setDataSource] = useState(null);
  const [isCached, setCached] = useState(false);

  // KNN settings for local OYO data
  const [knnRating, setKnnRating] = useState(4.0);
  const [knnPrice, setKnnPrice] = useState(1500);
  const [knnK, setKnnK] = useState(15);

  // Dark mode toggle
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const oyoKnnFiltered = useMemo(() => {
    if (dataSource === "oyo") {
      return knnFilter(recommendations, knnRating, knnPrice, knnK);
    }
    return recommendations;
  }, [recommendations, knnRating, knnPrice, knnK, dataSource]);

  const filteredRecommendations = useMemo(() => {
    return oyoKnnFiltered.filter(
      (hotel) =>
        hotel.Hotel_name &&
        hotel.Hotel_name.toLowerCase().includes(searchName.toLowerCase())
    );
  }, [oyoKnnFiltered, searchName]);

  const sortedRecommendations = useMemo(() => {
    if (dataSource === "oyo") return filteredRecommendations;
    let sorted = [...filteredRecommendations];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "Price") {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRecommendations, sortField, sortOrder, dataSource]);

  async function fetchApiHotels() {
    if (!formData.city || !formData.checkin || !formData.checkout) {
      alert("City and dates are required");
      return;
    }
    setLoading(true);
    setRecommendations([]);
    setSearchName("");
    setCached(false);
    try {
      const res = await fetch("http://localhost:5000/live_recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: formData.city.trim().toLowerCase(),
          checkin_date: formData.checkin,
          checkout_date: formData.checkout,
          adults: formData.adults,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to load API hotels"}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRecommendations(data.hotels || []);
      setDataSource("api");
      setCached(data.from_cache || false);
    } catch {
      alert("Failed to load API hotels");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOyoHotels() {
    if (!formData.city) {
      alert("Enter city.");
      return;
    }
    setLoading(true);
    setRecommendations([]);
    setSearchName("");
    setCached(false);
    try {
      const res = await fetch("http://localhost:5000/oyo_hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: formData.city.trim().toLowerCase(),
          checkin: formData.checkin,
          checkout: formData.checkout,
          adults: formData.adults,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to load OYO hotels"}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRecommendations(data.hotels || []);
      setDataSource("oyo");
    } catch {
      alert("Failed to load OYO hotels");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!formData.city || !formData.checkin || !formData.checkout) {
      alert("City and dates are required to refresh");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: formData.city.trim().toLowerCase(),
          checkin_date: formData.checkin,
          checkout_date: formData.checkout,
          adults: formData.adults,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error || "Failed to refresh data"}`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRecommendations(data.hotels || []);
      setDataSource("api");
      setCached(false);
    } catch {
      alert("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!formData.city || !formData.checkin || !formData.checkout) {
      alert("City and dates required");
      return;
    }
    setMoreLoading(true);
    try {
      if (dataSource === "oyo") {
        const res = await fetch("http://localhost:5000/live_recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: formData.city.trim().toLowerCase(),
            checkin_date: formData.checkin,
            checkout_date: formData.checkout,
            adults: formData.adults,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(`Error: ${err.error || "Failed to load more API hotels"}`);
          setMoreLoading(false);
          return;
        }
        const data = await res.json();
        setRecommendations((prev) => {
          const existingIds = new Set(prev.map((h) => h.hotelId));
          const filteredNew = (data.hotels || []).filter(
            (h) => !existingIds.has(h.hotelId)
          );
          return [...prev, ...filteredNew];
        });
        setDataSource("both");
        setCached(data.from_cache || false);
      } else if (dataSource === "api") {
        const res = await fetch("http://localhost:5000/oyo_hotels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: formData.city.trim().toLowerCase(),
            checkin: formData.checkin,
            checkout: formData.checkout,
            adults: formData.adults,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(`Error: ${err.error || "Failed to load more OYO hotels"}`);
          setMoreLoading(false);
          return;
        }
        const data = await res.json();
        setRecommendations((prev) => {
          const existingIds = new Set(prev.map((h) => h.hotelId));
          const filteredNew = (data.hotels || []).filter(
            (h) => !existingIds.has(h.hotelId)
          );
          return [...prev, ...filteredNew];
        });
        setDataSource("both");
      }
    } catch {
      alert("Failed to load more hotels");
    } finally {
      setMoreLoading(false);
    }
  }

  return (
    <div
      className={`w-full min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors duration-500`}
    >
      <nav className="sticky top-0 z-50 backdrop-blur bg-white/60 dark:bg-gray-900/60 px-6 py-3 flex items-center space-x-5 shadow">
        <img
          src="/TripPick.png"
          alt="logo"
          className="h-14 w-14 rounded-full border-2 border-indigo-500 bg-white"
        />
        <h1 className="text-3xl font-extrabold tracking-wide text-yellow-600 dark:text-yellow-400 drop-shadow-lg flex-grow">
          Trip Pick
        </h1>
        <input
          type="text"
          placeholder="Search by hotel name..."
          className="w-72 rounded-lg px-4 py-2 border text-cyan-800 border-gray-300 dark:border-gray-700 focus:outline-none"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <button
          onClick={() => setDark((d) => !d)}
          className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-white font-semibold shadow"
          aria-label="Toggle theme"
        >
          {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* Form caption */}
        <h2 className="text-2xl font-bold mb-2 mt-2 text-gray-800 dark:text-yellow-300">Search and Filter Hotels</h2>
        <form
          className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-700 dark:text-gray-200">City</label>
            <input
              type="text"
              placeholder="e.g. Mumbai"
              required
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 w-full"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-700 dark:text-gray-200">Check-in Date</label>
            <input
              type="date"
              required
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 w-full"
              value={formData.checkin}
              onChange={(e) => setFormData({ ...formData, checkin: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-700 dark:text-gray-200">Check-out Date</label>
            <input
              type="date"
              required
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 w-full"
              value={formData.checkout}
              onChange={(e) => setFormData({ ...formData, checkout: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-700 dark:text-gray-200">Adults</label>
            <input
              type="number"
              min={1}
              required
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 w-full"
              value={formData.adults}
              onChange={(e) => setFormData({ ...formData, adults: Number(e.target.value) })}
            />
          </div>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
  <button
    type="button"
    onClick={fetchApiHotels}
    disabled={loading}
    className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg shadow disabled:opacity-50 transition"
  >
    {loading && (dataSource === "api" || dataSource === "both") ? "Loading API Hotels..." : "Search API Hotels"}
  </button>
  <button
    type="button"
    onClick={fetchOyoHotels}
    disabled={loading}
    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow disabled:opacity-50 transition"
  >
    {loading && (dataSource === "oyo" || dataSource === "both") ? "Loading Local OYO Hotels..." : "Search Local OYO Hotels"}
  </button>
</div>


        {/* Filters positioned below buttons and above hotel list */}
        {dataSource && (
          <div className="mt-7 mb-8 rounded-xl shadow bg-yellow-50 dark:bg-gray-800 px-6 py-6 flex flex-wrap gap-10 items-center justify-start">
            {/* KNN sliders for OYO data only */}
            {dataSource === "oyo" && (
              <>
                <div className="flex flex-col min-w-[180px]">
                  <label className="font-semibold mb-1">KNN: Target Rating</label>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.1}
                    value={knnRating}
                    onChange={(e) => setKnnRating(Number(e.target.value))}
                  />
                  <span className="text-xs mt-1">{knnRating.toFixed(1)}</span>
                </div>
                <div className="flex flex-col min-w-[180px]">
                  <label className="font-semibold mb-1">KNN: Target Price</label>
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={50}
                    value={knnPrice}
                    onChange={(e) => setKnnPrice(Number(e.target.value))}
                  />
                  <span className="text-xs mt-1">₹{knnPrice}</span>
                </div>
                <div className="flex flex-col min-w-[140px]">
                  <label className="font-semibold mb-1">KNN: Results</label>
                  <input
                    type="range"
                    min={5}
                    max={40}
                    step={1}
                    value={knnK}
                    onChange={(e) => setKnnK(Number(e.target.value))}
                  />
                  <span className="text-xs mt-1">k = {knnK}</span>
                </div>
              </>
            )}
            {/* Sorting dropdowns side by side for API/both data */}
            {dataSource !== "oyo" && (
              <div className="flex flex-row gap-x-6 gap-y-2 items-end flex-wrap">
                <div>
                  <label className="font-semibold mb-1 block">Sort by</label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    className="border rounded px-2 py-1 mr-2"
                  >
                    <option value="Final_rating">Rating</option>
                    <option value="Price">Price</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold mb-1 block">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {isCached && (
          <div className="mb-6 text-center px-4">
            <p className="mb-2 text-yellow-500 font-semibold">
              ⚠️ Data is loaded from cache. Click below to refresh for live data.
            </p>
            <button
              disabled={loading}
              onClick={handleRefresh}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 rounded-xl font-bold text-white shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        )}

        {dataSource && (
          <p
            className={`mb-4 font-semibold ${
              dataSource === "api"
                ? "text-green-600"
                : dataSource === "oyo"
                ? "text-indigo-600"
                : "text-blue-600"
            }`}
          >
            {dataSource === "api" && "Displaying live API data."}
            {dataSource === "oyo" && "Displaying local OYO dataset (static & no availability)."}
            {dataSource === "both" && "Displaying combined data from both sources."}
          </p>
        )}

        {filteredRecommendations.length === 0 && !loading && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-20 text-lg select-none">
            No hotels found with the current filter.
          </p>
        )}

       {/* Improved hotel card grid: star rating always below the name */}
<section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
  {sortedRecommendations.map((hotel, idx) => (
    <article
      key={`${hotel.hotelId}_${idx}`}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg px-8 py-6 flex flex-col gap-3 items-start hover:shadow-2xl transition transform hover:-translate-y-1"
    >
      <div className="w-full">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-yellow-300 break-words">{hotel.Hotel_name}</h3>
        <div className="flex items-center gap-1 mt-2">
          <StarRating value={Number(hotel.Final_rating) || 0} />
          <span className="ml-2 font-bold text-md">
            {(hotel.Final_rating ?? "N/A")} <span className="text-yellow-400 align-super text-sm"></span>
          </span>
        </div>
      </div>
      <div className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
        <span>₹{hotel.Price ?? "N/A"}</span>
      </div>
      <div className="flex items-center gap-4">
        <StatusChip status={hotel.Room_status} />
        <span className="text-xs text-gray-500 font-medium">{hotel.Property_type || "Type unknown"}</span>
      </div>
      <div className="mt-2 w-full">
        <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line break-words">
          {hotel.Address || "Address not available"}
        </p>
      </div>
    </article>
  ))}
</section>

        {(dataSource === "api" || dataSource === "oyo") && recommendations.length > 0 && (
          <div className="flex justify-center my-12">
            <button
              onClick={() => {
                if (dataSource === "api" || dataSource === "both") fetchOyoHotels();
                else fetchApiHotels();
              }}
              disabled={moreLoading}
              className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow disabled:opacity-50 transition"
            >
              {moreLoading
                ? "Loading..."
                : dataSource === "api" || dataSource === "both"
                ? "Load Local OYO Hotels"
                : "Load API Hotels"}
            </button>
          </div>
        )}

        {loading && recommendations.length === 0 && (
          <p className="text-center mt-20 font-semibold text-lg select-none">Loading hotels...</p>
        )}
      </main>
    </div>
  );
}
















