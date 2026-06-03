"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NewNavbar, NewFooter } from "@/components";
import { useGallery } from "@/lib/api-hooks";

const tabs = ["All", "Campus", "Facilities", "Events", "Academic", "Sports", "Sishuvatika", "NCC/Scout/Guide"];

interface GalleryImage {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
}

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const { data: rawData, isLoading: loading } = useGallery(
    activeTab === "All" ? undefined : activeTab
  );

  const resultData: GalleryImage[] = Array.isArray(rawData)
    ? rawData
    : rawData?.data || [];

  // No fixed limits — show ALL images, filtering out "Hero" category for "All" tab
  const filteredImages: GalleryImage[] =
    activeTab === "All"
      ? resultData.filter(
          (img) => img.category?.toLowerCase() !== "hero"
        )
      : resultData;

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <NewNavbar />
      <main className="min-h-screen bg-[#f8f9fc]">
        {/* Hero Header Section — directly below the navbar */}
        <section className="relative pt-[110px] bg-[#0A1628] overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
          </div>

          {/* Geometric pattern overlay */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          </div>

          <div className="relative max-w-[1400px] mx-auto px-[5%] py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold mb-6 uppercase tracking-[0.2em]"
              >
                📸 Visual Tour
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[clamp(36px,5vw,64px)] font-black text-white leading-tight mb-4"
              >
                Our{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
                  Gallery
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-lg md:text-xl max-w-[650px] mx-auto mb-8 leading-relaxed"
              >
                Explore the vibrant life at our school — from campus moments to
                grand events, captured through our lens.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={scrollToGallery}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm uppercase tracking-wider hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border-none cursor-pointer"
              >
                Browse Photos ↓
              </motion.button>
            </motion.div>
          </div>

          {/* Bottom curve */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
              preserveAspectRatio="none"
            >
              <path
                d="M0 60V30C240 0 480 0 720 15C960 30 1200 45 1440 30V60H0Z"
                fill="#f8f9fc"
              />
            </svg>
          </div>
        </section>

        {/* Gallery Content Section */}
        <section ref={galleryRef} className="py-12 md:py-16">
          <div className="max-w-[1400px] mx-auto px-[5%]">
            {/* Category Tabs — scrollable horizontally */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3 mb-10 overflow-x-auto pb-3 scrollbar-hide"
            >
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-7 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border-none cursor-pointer ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                      : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-200"
                  }`}
                  style={{
                    border:
                      activeTab === tab ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              ))}
            </motion.div>

            {/* Image Count */}
            {!loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 text-gray-500 text-sm font-medium"
              >
                Showing{" "}
                <span className="text-[#0A1628] font-bold">
                  {filteredImages.length}
                </span>{" "}
                {filteredImages.length === 1 ? "photo" : "photos"}
                {activeTab !== "All" && (
                  <>
                    {" "}
                    in{" "}
                    <span className="text-orange-600 font-bold">
                      {activeTab}
                    </span>
                  </>
                )}
              </motion.div>
            )}

            {/* Gallery Grid — No fixed limits, shows ALL images */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
              >
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 12 }).map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="aspect-square rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"
                    />
                  ))
                ) : filteredImages.length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <div className="text-6xl mb-4">📷</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">
                      No photos yet
                    </h3>
                    <p className="text-gray-500">
                      No images found in the{" "}
                      <span className="font-semibold">{activeTab}</span>{" "}
                      category.
                    </p>
                  </div>
                ) : (
                  filteredImages.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(index * 0.03, 0.5) }}
                      whileHover={{ y: -6, scale: 1.02 }}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className="aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all group relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 md:p-5">
                        <div>
                          <div className="text-white text-sm md:text-base font-bold mb-1">
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="text-white/80 text-xs md:text-sm line-clamp-2">
                              {item.description}
                            </div>
                          )}
                          <div className="mt-2 inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                            {item.category}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
      <NewFooter />

      {/* Lightbox Modal for full-size image viewing */}
      <AnimatePresence>
        {selectedPhotoIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhotoIndex(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[85vh] w-full cursor-default"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all cursor-pointer z-[2010]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Previous Arrow */}
              {selectedPhotoIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoIndex(selectedPhotoIndex - 1);
                  }}
                  className="absolute left-4 md:-left-16 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-none cursor-pointer z-[2010]"
                  aria-label="Previous photo"
                >
                  <svg className="w-6 h-6 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Next Arrow */}
              {selectedPhotoIndex < filteredImages.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhotoIndex(selectedPhotoIndex + 1);
                  }}
                  className="absolute right-4 md:-right-16 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-none cursor-pointer z-[2010]"
                  aria-label="Next photo"
                >
                  <svg className="w-6 h-6 pl-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filteredImages[selectedPhotoIndex].imageUrl}
                alt={filteredImages[selectedPhotoIndex].title}
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />

              {/* Image Info */}
              <div className="mt-4 text-center">
                <h3 className="text-white text-xl font-bold mb-1">
                  {filteredImages[selectedPhotoIndex].title}
                </h3>
                {filteredImages[selectedPhotoIndex].description && (
                  <p className="text-white/70 text-sm">
                    {filteredImages[selectedPhotoIndex].description}
                  </p>
                )}
                <span className="inline-block mt-2 px-4 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                  {filteredImages[selectedPhotoIndex].category}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
