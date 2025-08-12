import useHotels from "./hooks/useHotels";

import NavBar from "./components/NavBar";
import MobileSearchBar from "./components/MobileSearchBar";
import SearchForm from "./components/SearchForm";
import FiltersPanel from "./components/FiltersPanel";
import CacheWarning from "./components/CacheWarning";
import DataSourceIndicator from "./components/DataSourceIndicator";
import EmptyState from "./components/EmptyState";
import HotelCard from "./components/HotelCard";
import LoadMoreButton from "./components/LoadMoreButton";
import LoadingSpinner from "./components/LoadingSpinner";

export default function App() {
  const {
    // State
    formData,
    setFormData,
    searchName,
    setSearchName,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    loading,
    moreLoading,
    dataSource,
    isCached,
    knnRating,
    setKnnRating,
    knnPrice,
    setKnnPrice,
    knnK,
    setKnnK,
    dark,
    setDark,
    recommendations,
    sortedRecommendations,
    filteredRecommendations,

    // Actions
    fetchApiHotels,
    fetchOyoHotels,
    handleRefresh,
    loadMore,
  } = useHotels();

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-300`}
    >
      {/* Navbar */}
      <NavBar
        dark={dark}
        setDark={setDark}
        searchName={searchName}
        setSearchName={setSearchName}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Search */}
        <MobileSearchBar
          searchName={searchName}
          setSearchName={setSearchName}
        />

        {/* Search Form */}
        <SearchForm
          formData={formData}
          setFormData={setFormData}
          fetchApiHotels={fetchApiHotels}
          fetchOyoHotels={fetchOyoHotels}
          loading={loading}
          dataSource={dataSource}
          searchName={searchName}
          setSearchName={setSearchName}
          dark={dark}
          setDark={setDark}
        />

        {/* Filters */}
        <FiltersPanel
          knnRating={knnRating}
          setKnnRating={setKnnRating}
          knnPrice={knnPrice}
          setKnnPrice={setKnnPrice}
          knnK={knnK}
          setKnnK={setKnnK}
          dataSource={dataSource}
          sortField={sortField}
          setSortField={setSortField}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

        {/* Cache Warning */}
        <CacheWarning
          isCached={isCached}
          loading={loading}
          handleRefresh={handleRefresh}
        />

        {/* Data Source Indicator */}
        <DataSourceIndicator
          dataSource={dataSource}
          hotelCount={sortedRecommendations.length}
        />

        {/* Empty State */}
        <EmptyState show={filteredRecommendations.length === 0 && !loading} />

        {/* Hotels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {sortedRecommendations.map((hotel, idx) => (
            <HotelCard
              key={`${hotel.hotelId}_${idx}`}
              hotel={hotel}
              idx={idx}
            />
          ))}
        </div>

        {/* Load More Button */}
        <LoadMoreButton
          dataSource={dataSource}
          recommendationsCount={recommendations.length}
          loadMore={loadMore}
          moreLoading={moreLoading}
        />

        {/* Loading Spinner */}
        <LoadingSpinner
          loading={loading}
          recommendationsCount={recommendations.length}
        />
      </main>
    </div>
  );
}
