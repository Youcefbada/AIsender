/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma needs to stay external on the server runtime.
  serverExternalPackages: ["@prisma/client", "nodemailer"],
};

export default nextConfig;
