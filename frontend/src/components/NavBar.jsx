import React from "react";

export default function NavBar({ dark, setDark, searchName, setSearchName }) {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src="/TripPick.png"
                alt="TripPick Logo"
                className="h-10 w-10 rounded-xl shadow-md ring-2 ring-blue-500/20"
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                TripPick
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Hotel Recommendations
              </p>
            </div>
          </div>

          {/* Search and Theme Toggle */}
          <div className="flex items-center space-x-4">
            {/* Search bar (desktop only) */}
            <div className="hidden md:block relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search hotels..."
                className="w-80 pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? (
                <svg
                  className="w-5 h-5 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 
                      11-2 0V3a1 1 0 011-1zm4 8a4 4 0 
                      11-8 0 4 4 0 018 0zm-.464 
                      4.95l.707.707a1 1 0 
                      001.414-1.414l-.707-.707a1 1 0 
                      00-1.414 1.414zm2.12-10.607a1 1 
                      0 010 1.414l-.706.707a1 1 0 
                      11-1.414-1.414l.707-.707a1 1 0 
                      011.414 0zM17 11a1 1 0 100-2h-1a1 
                      1 0 100 2h1zm-7 4a1 1 0 011 
                      1v1a1 1 0 11-2 0v-1a1 1 0 
                      011-1zM5.05 6.464A1 1 0 106.465 
                      5.05l-.708-.707a1 1 0 
                      00-1.414 1.414l.707.707zm1.414 
                      8.486l-.707.707a1 1 0 
                      01-1.414-1.414l.707-.707a1 1 0 
                      011.414 1.414zM4 11a1 1 0 100-2H3a1 
                      1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-slate-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M17.293 13.293A8 8 0 
                    016.707 2.707a8.001 8.001 0 
                    1010.586 10.586z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
