import React from "react";

export default function DataSourceIndicator({ dataSource, hotelCount }) {
  if (!dataSource) return null;

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            dataSource === "api"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : dataSource === "oyo"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
          }`}
        >
          {dataSource === "api" && "🌐 Live API Data"}
          {dataSource === "oyo" && "🏨 Local Dataset"}
          {dataSource === "both" && "🔄 Combined Sources"}
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {hotelCount} hotels found
        </span>
      </div>
    </div>
  );
}
