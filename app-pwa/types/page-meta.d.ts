declare module 'nuxt/app' {
  interface PageMeta {
    /** Remove default sticky-header offset from `app-layout-main` (page handles its own top spacing). */
    layoutMainFlushTop?: boolean
  }
}

export {}
