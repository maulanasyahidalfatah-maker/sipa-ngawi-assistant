"use client";

import React, { useState } from "react";
// Sesuaikan jalur ini dengan lokasi file data-sekolah.ts Anda:
// Jika di folder lib: "@/lib/data-sekolah"
// Jika di folder data: "@/data/data-sekolah"
// Jika di root: "@/data-sekolah"
import {
  type SekolahItem,
  cariSekolahByNpsn,
  cariSekolahByNama,
} from "@/lib/data-sekolah";

interface SchoolSearchInputProps {
  onSelectSchool?: (school: SekolahItem | null) => void;
  defaultNpsn?: string;
  defaultNama?: string;
}

export default function SchoolSearchInput({
  onSelectSchool,
  defaultNpsn = "",
  defaultNama = "",
}: SchoolSearchInputProps) {
  const [npsnValue, setNpsnValue] = useState<string>(defaultNpsn);
  const [schoolNameValue, setSchoolNameValue] = useState<string>(defaultNama);
  const [suggestions, setSuggestions] = useState<SekolahItem[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // 1. Ketik NPSN -> Otomatis cari & isi Nama Sekolah
  const handleNpsnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // Hanya angka
    setNpsnValue(val);

    if (val.length === 8) {
      const match = cariSekolahByNpsn(val);
      if (match) {
        setSchoolNameValue(match.nama);
        onSelectSchool?.(match);
      } else {
        setSchoolNameValue("");
        onSelectSchool?.(null);
      }
    } else {
      if (schoolNameValue) {
        setSchoolNameValue("");
        onSelectSchool?.(null);
      }
    }
  };

  // 2. Ketik Nama Sekolah -> Tampilkan saran dropdown & otomatis isi NPSN jika match
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSchoolNameValue(query);

    if (query.trim().length >= 2) {
      const results: SekolahItem[] = cariSekolahByNama(query);
      setSuggestions(results);
      setShowDropdown(true);

      // Cek apakah yang diketik cocok persis dengan salah satu nama sekolah (Diberi tipe eksplisit s: SekolahItem)
      const exactMatch = results.find(
        (s: SekolahItem) => s.nama.toLowerCase() === query.trim().toLowerCase()
      );
      if (exactMatch && exactMatch.npsn) {
        setNpsnValue(exactMatch.npsn);
        onSelectSchool?.(exactMatch);
      }
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setNpsnValue("");
      onSelectSchool?.(null);
    }
  };

  // 3. Saat memilih dari daftar dropdown saran
  const handleSelect = (item: SekolahItem) => {
    setSchoolNameValue(item.nama);
    setNpsnValue(item.npsn || "");
    setShowDropdown(false);
    onSelectSchool?.(item);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Kolom Input NPSN */}
      <div>
        <label className="block text-xs font-semibold text-text-dark mb-1">
          NPSN Sekolah
        </label>
        <div className="relative">
          <input
            type="text"
            value={npsnValue}
            onChange={handleNpsnChange}
            maxLength={8}
            placeholder="Ketik 8 digit NPSN (cth: 20508535)"
            className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {npsnValue.length === 8 && schoolNameValue && (
            <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-600">
              ✓ Terdaftar
            </span>
          )}
        </div>
      </div>

      {/* Kolom Input Nama Sekolah */}
      <div className="relative">
        <label className="block text-xs font-semibold text-text-dark mb-1">
          Nama Satuan Pendidikan
        </label>
        <input
          type="text"
          value={schoolNameValue}
          onChange={handleNameChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            // Delay agar event onMouseDown pada item dropdown tereksekusi sebelum dropdown tertutup
            setTimeout(() => setShowDropdown(false), 200);
          }}
          placeholder="Ketik nama sekolah (cth: SMP Negeri 1 Karangjati)"
          className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        />

        {/* Dropdown Saran Sekolah */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-lg divide-y divide-border">
            {suggestions.map((item: SekolahItem) => (
              <li
                key={item.npsn}
                onMouseDown={() => handleSelect(item)}
                className="px-3.5 py-2.5 hover:bg-hover-gray cursor-pointer text-sm flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{item.nama}</p>
                  <span className="text-[11px] text-text-muted">{item.jenjang}</span>
                </div>
                <span className="text-xs font-mono bg-accent-blue-light text-primary px-2 py-0.5 rounded font-semibold">
                  {item.npsn}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}