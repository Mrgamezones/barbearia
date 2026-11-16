"use client";
import { useParams } from "next/navigation";

/** Slug da barbearia do painel atual (/painel/<slug>/...), repassado às Server Actions. */
export function usePanelSlug(): string {
  return useParams<{ slug: string }>().slug;
}
