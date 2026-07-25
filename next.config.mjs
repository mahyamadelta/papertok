/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // arxiv.org abstract pages and any subdomain (e.g. export.arxiv.org)
      { protocol: "https", hostname: "arxiv.org" },
      { protocol: "https", hostname: "*.arxiv.org" },
      // OpenAlex doesn't serve images, but this covers any OA PDF thumbnail URLs
      { protocol: "https", hostname: "*.openalex.org" },
    ],
  },
};

export default nextConfig;
