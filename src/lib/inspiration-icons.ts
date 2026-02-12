import { FileText, Image, Link } from "lucide-react";

export type InspirationKind = "url" | "pdf" | "image" | "text" | string;

export function getInspirationIcon(type: InspirationKind) {
  switch (type) {
    case "url":
      return Link;
    case "image":
      return Image;
    case "pdf":
    default:
      return FileText;
  }
}
