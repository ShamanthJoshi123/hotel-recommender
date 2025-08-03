import { useState, useEffect, useMemo } from "react";

// Star rating display (fills part of the 5 stars)
function StarRating({ value = 0, max = 5 }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[...Array(max)].map((_, i) => {
        const v = value - i;
        return (
          <span key={i} className="h-4 w-4">
            {v >= 1 ? (
              <svg fill="#fbbf24" stroke="#f59e0b" viewBox="0 0 20 20" className="drop-shadow-sm">
                <polygon points="10,2 12,7.5 18,7.6 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,7.6 8,7.5" />
              </svg>
            ) : v > 0 ? (
              <svg fill="url(#star-grad)" viewBox="0 0 20 20" className="drop-shadow-sm">
                <defs>
                  <linearGradient id="star-grad">
                    <stop offset={`${v * 100}%`} stopColor="#fbbf24" />
                    <stop offset={`${v * 100}%`} stopColor="#e5e7eb" />
                  </linearGradient>
                </defs>
                <polygon points="10,2 12,7.5 18,7.6 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,7.6 8,7.5" fill="url(#star-grad)" stroke="#f59e0b"/>
              </svg>
            ) : (
              <svg fill="#e5e7eb" stroke="#d1d5db" viewBox="0 0 20 20">
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
  let colorClasses = "bg-gray-100 text-gray-700 border-gray-200";
  let dotColor = "bg-gray-400";
  let text = "Unknown";
  
  if (status && status.toLowerCase() === "available") {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotColor = "bg-emerald-500";
    text = "Available";
  } else if (status && status.toLowerCase() === "unavailable") {
    colorClasses = "bg-red-50 text-red-700 border-red-200";
    dotColor = "bg-red-500";
    text = "Unavailable";
  } else if (status && status.toLowerCase().includes("not available")) {
    colorClasses = "bg-gray-50 text-gray-600 border-gray-200";
    dotColor = "bg-gray-400";
    text = "Not Available";
  }
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${colorClasses}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      {text}
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
  const [dark, setDark] = useState(false);
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
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-300`}>
      {/* Enhanced Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src="/TripPick.png"
                  alt="TripPick Logo"
                  className="h-10 w-10 rounded-xl shadow-md ring-2 ring-blue-500/20"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  TripPick
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hotel Recommendations</p>
              </div>
            </div>

            {/* Search and Theme Toggle */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search hotels..."
                  className="w-80 pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              
              <button
                onClick={() => setDark(!dark)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle theme"
              >
                {dark ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Search */}
        <div className="md:hidden mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search hotels..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </div>

        {/* Enhanced Search Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Find Your Perfect Stay</h2>
          </div>
          
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Destination
              </label>
              <input
                type="text"
                placeholder="Enter city name"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 012 0v4m0 0V7a1 1 0 112 0v4M8 7h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                </svg>
                Check-in
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.checkin}
                onChange={(e) => setFormData({ ...formData, checkin: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 012 0v4m0 0V7a1 1 0 112 0v4M8 7h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                </svg>
                Check-out
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.checkout}
                onChange={(e) => setFormData({ ...formData, checkout: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Guests
              </label>
              <input
                type="number"
                min={1}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.adults}
                onChange={(e) => setFormData({ ...formData, adults: Number(e.target.value) })}
              />
            </div>
          </form>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={fetchApiHotels}
              disabled={loading}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-2">
                {loading && (dataSource === "api" || dataSource === "both") ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Live Hotels...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                    Search Live Hotels
                  </>
                )}
              </div>
            </button>
            
            <button
              type="button"
              onClick={fetchOyoHotels}
              disabled={loading}
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-2">
                {loading && (dataSource === "oyo" || dataSource === "both") ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Local Hotels...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Search Local Hotels
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced Filters */}
        {dataSource && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Filters & Sorting</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* KNN Filters for OYO */}
              {dataSource === "oyo" && (
                <div className="space-y-6">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4">Smart Recommendations (KNN)</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Target Rating: {knnRating.toFixed(1)} ⭐
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.1}
                        value={knnRating}
                        onChange={(e) => setKnnRating(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Target Price: ₹{knnPrice.toLocaleString()}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={10000}
                        step={50}
                        value={knnPrice}
                        onChange={(e) => setKnnPrice(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Results Count: {knnK}
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={40}
                        step={1}
                        value={knnK}
                        onChange={(e) => setKnnK(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Sorting Options for API */}
              {dataSource !== "oyo" && (
                <div className="space-y-6">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4">Sort Results</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Sort By</label>
                      <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="Final_rating">Rating</option>
                        <option value="Price">Price</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Order</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="desc">High to Low</option>
                        <option value="asc">Low to High</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cache Warning */}
        {isCached && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">Cached Data Notice</h3>
                <p className="text-amber-700 dark:text-amber-300 mb-4">You're viewing cached data. Click refresh to get the latest hotel information and pricing.</p>
                <button
                  disabled={loading}
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Source Indicator */}
        {dataSource && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                dataSource === "api" 
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
                  : dataSource === "oyo" 
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
              }`}>
                {dataSource === "api" && "🌐 Live API Data"}
                {dataSource === "oyo" && "🏨 Local Dataset"}
                {dataSource === "both" && "🔄 Combined Sources"}
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {sortedRecommendations.length} hotels found
              </span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredRecommendations.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">No Hotels Found</h3>
            <p className="text-slate-500 dark:text-slate-500">Try adjusting your search criteria or filters</p>
          </div>
        )}

        {/* Enhanced Hotel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {sortedRecommendations.map((hotel, idx) => (
            <article
              key={`${hotel.hotelId}_${idx}`}
              className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform hover:-translate-y-2 transition-all duration-300"
            >
              {/* Hotel Header */}
              <div className="relative p-6 pb-4">
                <div className="absolute top-4 right-4">
                  <StatusChip status={hotel.Room_status} />
                </div>
                
                <div className="pr-24">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {hotel.Hotel_name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <StarRating value={Number(hotel.Final_rating) || 0} />
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {hotel.Final_rating ? Number(hotel.Final_rating).toFixed(1) : "N/A"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="capitalize">{hotel.Property_type || "Hotel"}</span>
                  </div>
                </div>
              </div>

              {/* Price Section */}
              <div className="px-6 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    ₹{hotel.Price ? Number(hotel.Price).toLocaleString() : "N/A"}
                  </span>
                  {hotel.Price && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">per night</span>
                  )}
                </div>
              </div>

              {/* Address Section */}
              <div className="px-6 pb-6">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {hotel.Address || "Address not available"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Load More Section */}
        {(dataSource === "api" || dataSource === "oyo") && recommendations.length > 0 && (
          <div className="text-center mt-12">
            <button
              onClick={loadMore}
              disabled={moreLoading}
              className="group relative overflow-hidden bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-400 to-slate-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-2">
                {moreLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading More...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {dataSource === "api" || dataSource === "both" ? "Load Local Hotels" : "Load Live Hotels"}
                  </>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && recommendations.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Finding perfect hotels for you...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}















