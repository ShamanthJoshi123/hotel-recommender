import React from "react";

// Star rating display (fills part of the 5 stars)
function StarRating({ value = 0, max = 5 }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[...Array(max)].map((_, i) => {
        const v = value - i;
        return (
          <span key={i} className="h-4 w-4">
            {v >= 1 ? (
              <svg
                fill="#fbbf24"
                stroke="#f59e0b"
                viewBox="0 0 20 20"
                className="drop-shadow-sm"
              >
                <polygon points="10,2 12,7.5 18,7.6 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,7.6 8,7.5" />
              </svg>
            ) : v > 0 ? (
              <svg
                fill="url(#star-grad)"
                viewBox="0 0 20 20"
                className="drop-shadow-sm"
              >
                <defs>
                  <linearGradient id="star-grad">
                    <stop offset={`${v * 100}%`} stopColor="#fbbf24" />
                    <stop offset={`${v * 100}%`} stopColor="#e5e7eb" />
                  </linearGradient>
                </defs>
                <polygon
                  points="10,2 12,7.5 18,7.6 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,7.6 8,7.5"
                  fill="url(#star-grad)"
                  stroke="#f59e0b"
                />
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

export default StarRating;
