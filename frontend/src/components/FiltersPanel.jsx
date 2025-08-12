import React from "react";

export default function FiltersPanel({
  knnRating,
  setKnnRating,
  knnPrice,
  setKnnPrice,
  knnK,
  setKnnK,
  dataSource,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
}) {
  if (!dataSource) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Filters & Sorting
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KNN Filters for OYO */}
        {dataSource === "oyo" && (
          <div className="space-y-6">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4">
              Smart Recommendations (KNN)
            </h4>

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
            <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4">
              Sort Results
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Sort By
                </label>
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
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Order
                </label>
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
  );
}
