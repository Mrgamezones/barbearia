import type { StaticImageData } from "next/image";
import g01 from "@/public/galeria/01.webp";
import g02 from "@/public/galeria/02.webp";
import g03 from "@/public/galeria/03.webp";
import g04 from "@/public/galeria/04.webp";
import g05 from "@/public/galeria/05.webp";
import g06 from "@/public/galeria/06.webp";
import g07 from "@/public/galeria/07.webp";
import g08 from "@/public/galeria/08.webp";

/** Fotos da galeria (créditos em public/CREDITS.md). Importadas de forma estática para ter o blur placeholder. */
export const GALLERY_PHOTOS: { src: StaticImageData; alt: string }[] = [
  { src: g01, alt: "Close de pente e máquina aparando a lateral do cabelo" },
  { src: g03, alt: "Cliente de barba cheia tendo o cabelo aparado com máquina" },
  { src: g02, alt: "Acabamento do contorno da barba com navalha" },
  { src: g04, alt: "Barbeiro alinhando a barba de um cliente na cadeira" },
  { src: g05, alt: "Cliente relaxado na cadeira com a barba feita" },
  { src: g07, alt: "Barbeiro cortando com tesoura em frente ao espelho" },
  { src: g06, alt: "Barbeiro finalizando o corte com pente e tesoura" },
  { src: g08, alt: "Detalhe das mãos do barbeiro cortando com tesoura e pente" },
];
