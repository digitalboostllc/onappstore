export const siteConfig = {
  name: "MacApps Hub",
  description: "Download and discover the best Mac applications and games.",
  url: "https://macappshub.com",
  ogImage: "https://macappshub.com/og.jpg",
  links: {
    twitter: "https://twitter.com/macappshub",
    github: "https://github.com/macappshub",
  },
  creator: {
    name: "MacApps Hub Team",
    url: "https://macappshub.com",
  },
}

export type SiteConfig = typeof siteConfig

export const ITEMS_PER_PAGE = 12

// Remove predefined categories and use dynamic ones from the database
export const fileTypes = {
  APP: [".app", ".dmg", ".pkg"],
  IMAGE: [".jpg", ".jpeg", ".png", ".gif"],
  ARCHIVE: [".zip", ".rar", ".7z"],
} 