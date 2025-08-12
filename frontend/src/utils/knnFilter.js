// ===============================
// knnFilter.js - Client-side KNN Filtering Utility
// ===============================
//
// PURPOSE:
//   Filters hotels using a K-Nearest Neighbors-like approach based on:
//     - Similarity of Rating
//     - Similarity of Price
//   Returns the K closest matches to the target rating/price,
//   while preserving hotels with missing values at the end.
//
// USAGE CONTEXT:
//   This is used *only* for the OYO static dataset in frontend when
//   user selects "OYO" data source, to get locally-filtered results
//   without any backend ML calls.
//
// PARAMETERS:
//   hotels        → Array of hotel objects
//   targetRating  → Desired rating to match
//   targetPrice   → Desired price to match
//   k             → Number of nearest hotels to return
//
// RETURN:
//   Array of hotel objects: K closest matches, plus any with missing rating/price appended at the end.
//

// Helper function: safely convert a hotel field to a number, or null if not available
const getVal = (h, key) => {
  const v = h[key];

  // Treat empty strings as missing
  if (typeof v === "string" && v.trim() === "") return null;
  if (v === null || v === undefined) return null;

  const vv = Number(v);
  if (Number.isNaN(vv)) return null;

  return vv;
};

function knnFilter(hotels, targetRating, targetPrice, k) {
  // 1. Create a scored version of hotels where each has a _knn_dist distance metric
  let scored = hotels
    .map((hotel) => {
      // Prefer Final_rating; fall back to Rating if needed
      const rating = getVal(hotel, "Final_rating") ?? getVal(hotel, "Rating");
      const price = getVal(hotel, "Price");

      // If either rating or price is missing, skip for now
      if (rating == null || price == null) return null;

      return {
        ...hotel,
        // Euclidean distance measure with normalizing for price scale
        _knn_dist: Math.sqrt(
          Math.pow(rating - targetRating, 2) +
          Math.pow((price - targetPrice) / 500, 2) // Price normalized by 500
        ),
      };
    })
    .filter(Boolean); // Remove null results (hotels missing data)

  // 2. Sort ascending by distance (closest = most similar)
  scored.sort((a, b) => a._knn_dist - b._knn_dist);

  // 3. Take the top K closest hotels & remove the temporary _knn_dist property
  const output = scored.slice(0, k).map(({ _knn_dist, ...rest }) => rest);

  // 4. Append all hotels with missing rating or price at the end (unfiltered)
  const missing = hotels.filter(
    (h) =>
      (getVal(h, "Final_rating") ?? getVal(h, "Rating")) == null ||
      getVal(h, "Price") == null
  );

  // 5. Return combined array
  return [...output, ...missing];
}

export default knnFilter;
