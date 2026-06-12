"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useGallery } from "@/lib/api-hooks";

const tabs = ["All", "Campus", "Facilities", "Events", "Academic", "Sports"];

interface GalleryImage {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
}

export function GallerySection() {
  const [activeTab, setActiveTab] = useState("All");
  
  const { data: rawData, isLoading: loading } = useGallery(
    activeTab === "All" ? undefined : activeTab
  );
  
  const resultData: GalleryImage[] = Array.isArray(rawData) ? rawData : rawData?.data || [];
  
  const limit = activeTab === "All" ? 12 : 8;
  const filteredImages: GalleryImage[] = activeTab === "All" 
    ? resultData.filter((img) => img.category?.toLowerCase() !== "hero").slice(0, limit)
    : resultData.slice(0, limit);


  return (
    <section id="gallery" className="py-20 bg-white">
      <div className="max-w-[1400px] mx-auto px-[5%]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-3 uppercase tracking-wider"
            >
              Visual Tour
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[clamp(32px,4vw,48px)] font-bold text-[#0A1628]"
            >
              Gallery
            </motion.h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap border-none cursor-pointer ${
                activeTab === tab
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"
              />
            ))
          ) : filteredImages.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No images found in this category
            </div>
          ) : (
            filteredImages.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all group relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <div>
                    <div className="text-white text-sm font-semibold mb-1">{item.title}</div>
                    {item.description && (
                      <div className="text-white/80 text-xs line-clamp-2">{item.description}</div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>


      </div>
    </section>
  );
}
