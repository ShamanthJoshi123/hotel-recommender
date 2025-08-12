import React from "react";

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
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${colorClasses}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      {text}
    </div>
  );
}

export default StatusChip;
