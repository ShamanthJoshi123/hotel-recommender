import React from "react";

export default function EmptyState({ show }) {
  if (!show) return null;

  return (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-12 h-12 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 
               0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 
               0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
        No Hotels Found
      </h3>
      <p className="text-slate-500 dark:text-slate-500">
        Try adjusting your search criteria or filters
      </p>
    </div>
  );
}
