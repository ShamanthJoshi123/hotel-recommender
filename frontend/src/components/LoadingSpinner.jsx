import React from "react";

export default function LoadingSpinner({ loading, recommendationsCount }) {
  if (!loading || recommendationsCount > 0) return null;

  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
        <svg
          className="animate-spin h-6 w-6 text-blue-600"
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
        <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
          Finding perfect hotels for you...
        </span>
      </div>
    </div>
  );
}
