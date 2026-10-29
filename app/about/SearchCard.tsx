"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function SearchCard() {
  const router = useRouter();
  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["from", "to", "when", "seats"]) {
      const value = String(form.get(key) || "").trim();
      if (value) params.set(key, value);
    }
    router.push(`/ride/find${params.size ? `?${params}` : ""}`);
  };

  return <form className="about-search" onSubmit={search} aria-label="Search for an existing trip">
    <label><span>Leaving from</span><input name="from" placeholder="Lekki, Lagos" autoComplete="address-level2" /></label>
    <span className="about-search-arrow" aria-hidden="true"><ArrowRight size={17}/></span>
    <label><span>Going to</span><input name="to" placeholder="Victoria Island" autoComplete="address-level2" /></label>
    <label className="about-date"><span>Travel date</span><input name="when" type="date" aria-label="Travel date" /></label>
    <label className="about-seats"><span>Seats</span><select name="seats" defaultValue="1" aria-label="Number of seats"><option value="1">1 seat</option><option value="2">2 seats</option><option value="3">3 seats</option><option value="4">4 seats</option></select></label>
    <button type="submit" className="about-search-submit"><span>Find a trip</span><ArrowRight size={18}/></button>
  </form>;
}
