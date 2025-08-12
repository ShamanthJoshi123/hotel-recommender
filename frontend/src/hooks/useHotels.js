// ===============================
// useHotels.js - Custom React Hook
// ===============================
//
// This hook manages ALL frontend hotel search logic for both:
// - Live API (Amadeus) recommendations
// - Local OYO dataset recommendations
//
// Responsibilities:
//  1. Handle form data for search
//  2. Call backend API endpoints (/live_recommend, /oyo_hotels, /refresh)
//  3. Handle sorting & filtering of hotel results
//  4. Apply optional KNN-based filtering for OYO dataset
//  5. Track loading states and caching info
//  6. Manage dark mode toggle
//

import { useState, useEffect, useMemo } from "react";
import knnFilter from "../utils/knnFilter"; // Custom utility for client-side KNN filtering (OYO dataset only)

export default function useHotels() {

  // ===============================
  // STATE VARIABLES
  // ===============================

  const [recommendations, setRecommendations] = useState([]); // List of hotels currently being shown

  // Form data for search (bound to filters/inputs in UI)
  const [formData, setFormData] = useState({
    city: "",
    checkin: "",
    checkout: "",
    adults: 1,
  });

  const [searchName, setSearchName] = useState(""); // Search bar text for filtering by hotel name

  const [sortField, setSortField] = useState("Final_rating"); // Field to sort by
  const [sortOrder, setSortOrder] = useState("desc");         // Sorting order ("asc" or "desc")

  // Loading flags
  const [loading, setLoading] = useState(false);     // Main loading spinner
  const [moreLoading, setMoreLoading] = useState(false); // Loading for "load more" button

  // Source type: "api" (live Amadeus), "oyo" (static dataset), "both" (merged)
  const [dataSource, setDataSource] = useState(null);

  // Whether the results came from cached backend CSV
  const [isCached, setCached] = useState(false);

  // ===============================
  // KNN FILTERING STATE (for OYO data)
  // ===============================
  const [knnRating, setKnnRating] = useState(4.0);  // Desired rating to filter around
  const [knnPrice, setKnnPrice] = useState(1500);   // Desired price to filter around
  const [knnK, setKnnK] = useState(15);             // K value (number of neighbors)

  // ===============================
  // DARK MODE STATE
  // ===============================
  const [dark, setDark] = useState(false);

  // Apply/remove dark class to root element
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // ===============================
  // FILTERING & SORTING
  // ===============================

  // Step 1: Apply KNN filter ONLY if data source is "oyo"
  const oyoKnnFiltered = useMemo(() => {
    if (dataSource === "oyo") {
      return knnFilter(recommendations, knnRating, knnPrice, knnK);
    }
    return recommendations;
  }, [recommendations, knnRating, knnPrice, knnK, dataSource]);

  // Step 2: Filter by hotel name search
  const filteredRecommendations = useMemo(() => {
    return oyoKnnFiltered.filter(
      (hotel) =>
        hotel.Hotel_name &&
        hotel.Hotel_name.toLowerCase().includes(searchName.toLowerCase())
    );
  }, [oyoKnnFiltered, searchName]);

  // Step 3: Sort results
  const sortedRecommendations = useMemo(() => {
    // If OYO dataset is the source → skip sorting (already sorted by KNN)
    if (dataSource === "oyo") return filteredRecommendations;

    // Copy and sort
    let sorted = [...filteredRecommendations];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle price sorting as numeric
      if (sortField === "Price") {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }

      // Handle string sorting
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRecommendations, sortField, sortOrder, dataSource]);

  // ===============================
  // API CALLS
  // ===============================

  // Fetch from /live_recommend (Amadeus API)
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
      const res = await fetch(
        "https://hotel-recommender-ab5b.onrender.com/live_recommend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: formData.city.trim().toLowerCase(),
            checkin_date: formData.checkin,
            checkout_date: formData.checkout,
            adults: formData.adults,
          }),
        }
      );

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

  // Fetch from /oyo_hotels (Static dataset)
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
      const res = await fetch(
        "https://hotel-recommender-ab5b.onrender.com/oyo_hotels",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: formData.city.trim().toLowerCase(),
            checkin: formData.checkin,
            checkout: formData.checkout,
            adults: formData.adults,
          }),
        }
      );

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

  // Force refresh from /refresh (always live Amadeus)
  async function handleRefresh() {
    if (!formData.city || !formData.checkin || !formData.checkout) {
      alert("City and dates are required to refresh");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        "https://hotel-recommender-ab5b.onrender.com/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: formData.city.trim().toLowerCase(),
            checkin_date: formData.checkin,
            checkout_date: formData.checkout,
            adults: formData.adults,
          }),
        }
      );

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

  // Merge other data source when "Load More" is clicked
  async function loadMore() {
    if (!formData.city || !formData.checkin || !formData.checkout) {
      alert("City and dates required");
      return;
    }

    setMoreLoading(true);
    try {
      if (dataSource === "oyo") {
        // Currently showing OYO → load API hotels
        const res = await fetch(
          "https://hotel-recommender-ab5b.onrender.com/live_recommend",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: formData.city.trim().toLowerCase(),
              checkin_date: formData.checkin,
              checkout_date: formData.checkout,
              adults: formData.adults,
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          alert(`Error: ${err.error || "Failed to load more API hotels"}`);
          setMoreLoading(false);
          return;
        }

        const data = await res.json();
        // Merge without duplicates
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
        // Currently showing API hotels → load OYO dataset
        const res = await fetch(
          "https://hotel-recommender-ab5b.onrender.com/oyo_hotels",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              city: formData.city.trim().toLowerCase(),
              checkin: formData.checkin,
              checkout: formData.checkout,
              adults: formData.adults,
            }),
          }
        );

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

  // ===============================
  // Return hook API
  // ===============================
  return {
    // State
    formData, setFormData,
    searchName, setSearchName,
    sortField, setSortField,
    sortOrder, setSortOrder,
    loading, moreLoading,
    dataSource, isCached,
    knnRating, setKnnRating,
    knnPrice, setKnnPrice,
    knnK, setKnnK,
    dark, setDark,

    sortedRecommendations,
    filteredRecommendations,
    recommendations,

    // Actions
    fetchApiHotels,
    fetchOyoHotels,
    handleRefresh,
    loadMore
  };
}
