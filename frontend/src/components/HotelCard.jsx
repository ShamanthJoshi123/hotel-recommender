import React from "react";
import StarRating from "./StarRating";
import StatusChip from "./StatusChip";

export default function HotelCard({ hotel, idx }) {
  return (
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
              {hotel.Final_rating
                ? Number(hotel.Final_rating).toFixed(1)
                : "N/A"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
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
            <span className="text-sm text-slate-500 dark:text-slate-400">
              per night
            </span>
          )}
        </div>
      </div>

      {/* Address Section */}
      <div className="px-6 pb-6">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {hotel.Address || "Address not available"}
          </p>
        </div>
      </div>
    </article>
  );
}
