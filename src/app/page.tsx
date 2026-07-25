/**
 * app/page.tsx — Halaman Home (Discovery)
 *
 * Ini halaman yang pertama muncul saat user buka app (route "/").
 * Menampilkan: DiscoveryScreen (hero + daftar paper) + BottomNav (navigasi bawah).
 */

"use client";

import { DiscoveryScreen } from "@/components/home/DiscoveryScreen";
import { BottomNav } from "@/components/layout/BottomNav";

export default function HomePage() {
  return (
    // max-w-lg = lebar maksimal kayak HP (mobile-first)
    // h-dvh = tinggi full layar (dynamic viewport height)
    // overflow-hidden = tidak bisa scroll keluar container
    <main className="relative max-w-lg mx-auto h-dvh overflow-hidden bg-bg">
      <DiscoveryScreen />
      <BottomNav />
    </main>
  );
}
