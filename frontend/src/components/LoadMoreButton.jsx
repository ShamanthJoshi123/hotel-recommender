import React from "react";

export default function LoadMoreButton({
  dataSource,
  recommendationsCount,
  loadMore,
  moreLoading,
}) {
  // Show only if there's something to load
  if (
    !(dataSource === "api" || dataSource === "oyo") ||
    recommendationsCount === 0
  )
    return null;

  return (
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
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 
                  0 0 5.373 0 12h4zm2 
                  5.291A7.962 7.962 0 014 12H0c0 
                  3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading More...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              {dataSource === "api" || dataSource === "both"
                ? "Load Local Hotels"
                : "Load Live Hotels"}
            </>
          )}
        </div>
      </button>
    </div>
  );
}
