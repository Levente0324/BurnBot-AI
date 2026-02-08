import { RoastStyle, CreditPack } from "./types";

export const STYLES: RoastStyle[] = [
  "Rap",
  "Poetry",
  "Passive-Aggressive",
  "Normal",
];

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "STARTER",
    name: "Starter Pack",
    price: 499,
    priceLabel: "$4.99",
    credits: 500,
    description: "50 texts or 10 images",
  },
  {
    id: "FIRE",
    name: "Fire Pack",
    price: 999,
    priceLabel: "$9.99",
    credits: 1200,
    description: "120 texts or 24 images",
    highlight: true,
    badge: "BEST VALUE",
  },
  {
    id: "INFERNO",
    name: "Inferno Pack",
    price: 1999,
    priceLabel: "$19.99",
    credits: 3000,
    description: "300 texts or 60 images",
  },
  {
    id: "ELITE",
    name: "Lifetime Elite",
    price: 4999,
    priceLabel: "$49.99",
    credits: 2000,
    description: "Unlimited text forever + 2,000 image credits",
    isElite: true,
    badge: "FOREVER",
  },
];

export const LOADING_MESSAGES = [
  "Consulting the darkest timelines...",
  "Sharpening the digital knives...",
  "Analyzing insecurity vectors...",
  "Heating up the roast oven...",
  "Generating emotional damage...",
];
