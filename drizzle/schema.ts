import { bigint, boolean, index, int, longtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Content is deliberately stored by named collection so every item remains editable without altering the public site's original UI. */
export const contentCollections = mysqlTable("content_collections", {
  id: int("id").autoincrement().primaryKey(),
  collectionKey: varchar("collectionKey", { length: 80 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  content: longtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  collectionKeyUnique: uniqueIndex("content_collections_key_unique").on(table.collectionKey),
}));

/** Immutable owner-facing snapshots of visual settings, retained before each design change. */
export const siteDesignHistory = mysqlTable("site_design_history", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  settingsSnapshot: longtext("settingsSnapshot").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  siteDesignHistoryCreatedIndex: index("site_design_history_created_index").on(table.createdAt),
}));

export const siteVisits = mysqlTable("site_visits", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  path: varchar("path", { length: 255 }).notNull(),
  source: varchar("source", { length: 80 }).default("direct").notNull(),
  deviceType: varchar("deviceType", { length: 24 }).default("desktop").notNull(),
  visitedAt: timestamp("visitedAt").defaultNow().notNull(),
}, table => ({
  visitsDateIndex: index("site_visits_date_index").on(table.visitedAt),
  visitsSourceIndex: index("site_visits_source_index").on(table.source),
  visitsDeviceIndex: index("site_visits_device_index").on(table.deviceType),
}));

export const siteOrders = mysqlTable("site_orders", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 180 }).notNull(),
  service: varchar("service", { length: 255 }).notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

/** Single-owner credential record. Passwords are stored as a salted scrypt hash only. */
export const ownerAccounts = mysqlTable("owner_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  sessionVersion: int("sessionVersion").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  ownerEmailUnique: uniqueIndex("owner_accounts_email_unique").on(table.email),
}));

/** Individually revocable owner sessions. The JWT contains only the opaque session id. */
export const ownerSessions = mysqlTable("owner_sessions", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId").notNull(),
  sessionId: varchar("sessionId", { length: 96 }).notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
}, table => ({
  ownerSessionIdUnique: uniqueIndex("owner_sessions_session_id_unique").on(table.sessionId),
  ownerSessionAccountIndex: index("owner_sessions_owner_account_index").on(table.ownerAccountId, table.revokedAt),
}));

/** Persisted, owner-only appearance and copy for the standalone administration login screen. */
export const ownerLoginSettings = mysqlTable("owner_login_settings", {
  id: int("id").autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId").notNull(),
  template: varchar("template", { length: 40 }).default("professional").notNull(),
  backgroundStyle: varchar("backgroundStyle", { length: 40 }).default("gradient").notNull(),
  backgroundColor: varchar("backgroundColor", { length: 32 }).default("#f4f7ff").notNull(),
  backgroundGradient: varchar("backgroundGradient", { length: 600 }),
  backgroundImageUrl: longtext("backgroundImageUrl"),
  backgroundImageMediaId: bigint("backgroundImageMediaId", { mode: "number" }),
  logoUrl: longtext("logoUrl"),
  logoMediaId: bigint("logoMediaId", { mode: "number" }),
  logoSize: int("logoSize").default(64).notNull(),
  logoPosition: varchar("logoPosition", { length: 32 }).default("top").notNull(),
  logoShape: varchar("logoShape", { length: 32 }).default("rounded").notNull(),
  logoBorderColor: varchar("logoBorderColor", { length: 32 }).default("#ffffff").notNull(),
  logoBorderWidth: int("logoBorderWidth").default(0).notNull(),
  logoGlow: int("logoGlow").default(0).notNull(),
  logoAnimation: varchar("logoAnimation", { length: 32 }).default("none").notNull(),
  ownerPhotoUrl: longtext("ownerPhotoUrl"),
  ownerPhotoMediaId: bigint("ownerPhotoMediaId", { mode: "number" }),
  ownerPhotoSize: int("ownerPhotoSize").default(0).notNull(),
  ownerPhotoShape: varchar("ownerPhotoShape", { length: 32 }).default("circle").notNull(),
  cardStyle: varchar("cardStyle", { length: 40 }).default("standard").notNull(),
  cardColor: varchar("cardColor", { length: 32 }).default("#ffffff").notNull(),
  cardOpacity: int("cardOpacity").default(94).notNull(),
  cardBorderColor: varchar("cardBorderColor", { length: 32 }).default("#ffffff").notNull(),
  cardBorderWidth: int("cardBorderWidth").default(1).notNull(),
  cardRadius: int("cardRadius").default(28).notNull(),
  cardBlur: int("cardBlur").default(0).notNull(),
  cardWidth: int("cardWidth").default(430).notNull(),
  fieldStyle: varchar("fieldStyle", { length: 32 }).default("modern").notNull(),
  fieldColor: varchar("fieldColor", { length: 32 }).default("#ffffff").notNull(),
  fieldTextColor: varchar("fieldTextColor", { length: 32 }).default("#15213d").notNull(),
  fieldPlaceholderColor: varchar("fieldPlaceholderColor", { length: 32 }).default("#77829a").notNull(),
  fieldBorderColor: varchar("fieldBorderColor", { length: 32 }).default("#dce2f1").notNull(),
  fieldBorderWidth: int("fieldBorderWidth").default(1).notNull(),
  fieldRadius: int("fieldRadius").default(14).notNull(),
  fieldFontSize: int("fieldFontSize").default(15).notNull(),
  fontFamily: varchar("fontFamily", { length: 80 }).default("Cairo").notNull(),
  contentOrder: varchar("contentOrder", { length: 300 }).default("logo,title,description,email,password,passkey,submit,footer").notNull(),
  buttonStyle: varchar("buttonStyle", { length: 32 }).default("gradient").notNull(),
  buttonColor: varchar("buttonColor", { length: 32 }).default("#4966d6").notNull(),
  buttonTextColor: varchar("buttonTextColor", { length: 32 }).default("#ffffff").notNull(),
  buttonRadius: int("buttonRadius").default(14).notNull(),
  buttonGlow: int("buttonGlow").default(0).notNull(),
  buttonAnimation: varchar("buttonAnimation", { length: 32 }).default("none").notNull(),
  entranceAnimation: varchar("entranceAnimation", { length: 32 }).default("fade").notNull(),
  animationDuration: int("animationDuration").default(240).notNull(),
  title: varchar("title", { length: 320 }).default("مرحبًا بك في لوحة الإدارة").notNull(),
  description: longtext("description").notNull(),
  loginButtonText: varchar("loginButtonText", { length: 120 }).default("تسجيل الدخول").notNull(),
  passkeyButtonText: varchar("passkeyButtonText", { length: 160 }).default("تسجيل الدخول بالبصمة أو Passkey").notNull(),
  footerText: varchar("footerText", { length: 500 }).default("دخول خاص ومؤمّن لإدارة الموقع وطلبات العملاء.").notNull(),
  invalidCredentialsText: varchar("invalidCredentialsText", { length: 300 }).default("بيانات الدخول غير صحيحة").notNull(),
  clockEnabled: boolean("clockEnabled").default(true).notNull(),
  clockStyle: varchar("clockStyle", { length: 40 }).default("digital-clean").notNull(),
  clockPosition: varchar("clockPosition", { length: 32 }).default("above_card").notNull(),
  clockFormat: varchar("clockFormat", { length: 8 }).default("24").notNull(),
  clockColor: varchar("clockColor", { length: 32 }).default("#15213d").notNull(),
  clockAccentColor: varchar("clockAccentColor", { length: 32 }).default("#4966d6").notNull(),
  clockSize: int("clockSize").default(52).notNull(),
  clockShowSeconds: boolean("clockShowSeconds").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  ownerLoginSettingsOwnerUnique: uniqueIndex("owner_login_settings_owner_unique").on(table.ownerAccountId),
}));

/** Snapshot retained immediately before an owner changes the login screen, enabling a safe one-step restore. */
export const ownerLoginSettingsHistory = mysqlTable("owner_login_settings_history", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId").notNull(),
  settingsSnapshot: longtext("settingsSnapshot").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  ownerLoginSettingsHistoryOwnerIndex: index("owner_login_settings_history_owner_index").on(table.ownerAccountId, table.createdAt),
}));

/** Registered discoverable credentials. The public key and counter are retained to verify future WebAuthn assertions. */
export const ownerPasskeys = mysqlTable("owner_passkeys", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId").notNull(),
  credentialId: varchar("credentialId", { length: 1024 }).notNull(),
  publicKey: longtext("publicKey").notNull(),
  counter: bigint("counter", { mode: "number" }).default(0).notNull(),
  transports: varchar("transports", { length: 500 }),
  label: varchar("label", { length: 120 }).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  ownerPasskeyCredentialUnique: uniqueIndex("owner_passkeys_credential_unique").on(table.credentialId),
  ownerPasskeyOwnerIndex: index("owner_passkeys_owner_index").on(table.ownerAccountId),
}));

/** Short-lived, single-use WebAuthn challenges bound to an origin and relying-party id. */
export const ownerWebAuthnChallenges = mysqlTable("owner_webauthn_challenges", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId"),
  challenge: varchar("challenge", { length: 1024 }).notNull(),
  ceremony: mysqlEnum("ceremony", ["registration", "authentication"]).notNull(),
  origin: varchar("origin", { length: 500 }).notNull(),
  rpId: varchar("rpId", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  ownerWebAuthnChallengeIndex: index("owner_webauthn_challenges_lookup_index").on(table.challenge, table.ceremony, table.usedAt),
}));

export const customers = mysqlTable("customers", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  university: varchar("university", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  customerEmailIndex: index("customers_email_index").on(table.email),
  customerPhoneIndex: index("customers_phone_index").on(table.phone),
}));

export const mediaFiles = mysqlTable("media_files", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: longtext("url").notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
  category: mysqlEnum("category", ["image", "document", "other"]).notNull(),
  usage: varchar("usage", { length: 80 }).default("library").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  mediaCategoryIndex: index("media_files_category_index").on(table.category),
}));

export const assignmentRequests = mysqlTable("assignment_requests", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  customerId: bigint("customerId", { mode: "number" }),
  studentName: varchar("studentName", { length: 180 }).notNull(),
  studentId: varchar("studentId", { length: 100 }).notNull(),
  university: varchar("university", { length: 200 }).notNull(),
  college: varchar("college", { length: 200 }).notNull(),
  department: varchar("department", { length: 200 }),
  course: varchar("course", { length: 200 }).notNull(),
  professor: varchar("professor", { length: 180 }).notNull(),
  serviceType: varchar("serviceType", { length: 255 }).notNull(),
  deadline: varchar("deadline", { length: 10 }).notNull(),
  description: longtext("description").notNull(),
  attachmentMediaId: bigint("attachmentMediaId", { mode: "number" }),
  status: mysqlEnum("status", ["new", "reviewing", "in_progress", "completed", "cancelled"]).default("new").notNull(),
  adminNotes: longtext("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  assignmentStatusIndex: index("assignment_requests_status_index").on(table.status),
  assignmentCreatedAtIndex: index("assignment_requests_created_at_index").on(table.createdAt),
}));

export const contactMessages = mysqlTable("contact_messages", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  customerId: bigint("customerId", { mode: "number" }),
  name: varchar("name", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: longtext("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "replied", "archived"]).default("new").notNull(),
  adminNotes: longtext("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  contactStatusIndex: index("contact_messages_status_index").on(table.status),
  contactCreatedAtIndex: index("contact_messages_created_at_index").on(table.createdAt),
}));

export const submittedReviews = mysqlTable("submitted_reviews", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  university: varchar("university", { length: 200 }).notNull(),
  review: longtext("review").notNull(),
  rating: int("rating").default(5).notNull(),
  status: mysqlEnum("status", ["pending", "published", "hidden"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  reviewStatusIndex: index("submitted_reviews_status_index").on(table.status),
}));

export const adminAuditEvents = mysqlTable("admin_audit_events", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  details: longtext("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  auditCreatedAtIndex: index("admin_audit_events_created_at_index").on(table.createdAt),
}));

/** روابط دخول عامة ينشئها المالك، مستقلة عن رابط الموقع الافتراضي. */
export const visitorLinks = mysqlTable("visitor_links", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  token: varchar("token", { length: 80 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  targetPath: varchar("targetPath", { length: 255 }).default("/").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  visitCount: int("visitCount").default(0).notNull(),
  lastVisitedAt: timestamp("lastVisitedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  visitorLinkTokenUnique: uniqueIndex("visitor_links_token_unique").on(table.token),
  visitorLinkActiveIndex: index("visitor_links_active_index").on(table.isActive, table.createdAt),
}));

export type ContentCollection = typeof contentCollections.$inferSelect;
export type InsertContentCollection = typeof contentCollections.$inferInsert;

/** فئات أقسام التحميلات التي يديرها المالك — نظام «إدارة التحميلات» الجديد. */
export const downloadCategories = mysqlTable("download_categories", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  description: longtext("description"),
  emoji: varchar("emoji", { length: 16 }).default("📥").notNull(),
  color: varchar("color", { length: 32 }).default("#4966d6").notNull(),
  backgroundColor: varchar("backgroundColor", { length: 32 }).default("#eef1fd").notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  downloadCategoryOrderIndex: index("download_categories_order_index").on(table.sortOrder),
}));

/** ملفات التحميل داخل كل فئة — يرفعها المالك من جهازه وتخزن في التخزين السحابي. */
export const downloadFiles = mysqlTable("download_files", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  categoryId: bigint("categoryId", { mode: "number" }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  description: longtext("description"),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: longtext("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: bigint("sizeBytes", { mode: "number" }).default(0).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  downloadCount: bigint("downloadCount", { mode: "number" }).default(0).notNull(),
  lastDownloadedAt: timestamp("lastDownloadedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  downloadFileCategoryIndex: index("download_files_category_index").on(table.categoryId, table.sortOrder),
  downloadFileVisibilityIndex: index("download_files_visibility_index").on(table.isVisible),
}));

/** أرقام واتساب لقنوات الاتصال التي تعرضها صفحة الزائر. */
export const contactWhatsappNumbers = mysqlTable("contact_whatsapp_numbers", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  label: varchar("label", { length: 160 }).notNull(),
  description: longtext("description"),
  number: varchar("number", { length: 40 }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  contactWhatsappOrderIndex: index("contact_whatsapp_order_index").on(table.sortOrder),
}));

/** أرقام الجوال لقنوات الاتصال. */
export const contactMobileNumbers = mysqlTable("contact_mobile_numbers", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  label: varchar("label", { length: 160 }).notNull(),
  description: longtext("description"),
  number: varchar("number", { length: 40 }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  contactMobileOrderIndex: index("contact_mobile_order_index").on(table.sortOrder),
}));

/** عناوين البريد الإلكتروني. */
export const contactEmails = mysqlTable("contact_emails", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  label: varchar("label", { length: 160 }).notNull(),
  description: longtext("description"),
  email: varchar("email", { length: 320 }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  contactEmailOrderIndex: index("contact_emails_order_index").on(table.sortOrder),
}));

/** العناوين الجغرافية للموقع. */
export const contactAddresses = mysqlTable("contact_addresses", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  label: varchar("label", { length: 160 }).notNull(),
  description: longtext("description"),
  address: varchar("address", { length: 500 }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  contactAddressOrderIndex: index("contact_addresses_order_index").on(table.sortOrder),
}));

/** وسائل التواصل الاجتماعي بأشكالها وألوانها المخصصة. */
export const contactSocials = mysqlTable("contact_socials", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  platform: varchar("platform", { length: 80 }).notNull(),
  label: varchar("label", { length: 160 }),
  description: longtext("description"),
  platformName: varchar("platformName", { length: 120 }).notNull(),
  link: longtext("link").notNull(),
  username: varchar("username", { length: 160 }),
  displayMode: varchar("displayMode", { length: 40 }).default("icon").notNull(),
  shape: varchar("shape", { length: 40 }).default("circle").notNull(),
  accentColor: varchar("accentColor", { length: 32 }).default("#25d366").notNull(),
  textColor: varchar("textColor", { length: 32 }).default("#ffffff").notNull(),
  backgroundColor: varchar("backgroundColor", { length: 32 }).default("#25d366").notNull(),
  borderColor: varchar("borderColor", { length: 32 }).default("#25d366").notNull(),
  icon: varchar("icon", { length: 16 }).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  contactSocialOrderIndex: index("contact_socials_order_index").on(table.sortOrder),
}));

/** تصنيفات المدونة الأكاديمية التي يديرها المالك من لوحة الإدارة. */
export const blogCategories = mysqlTable("blog_categories", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  blogCategoryOrderIndex: index("blog_categories_order_index").on(table.sortOrder),
}));

/** مقالات المدونة الأكاديمية مع صورها المرفوعة وتفاصيلها الكاملة. */
export const blogArticles = mysqlTable("blog_articles", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull(),
  summary: longtext("summary"),
  body: longtext("body"),
  author: varchar("author", { length: 160 }).default("فريق واجبات بلس").notNull(),
  publishedText: varchar("publishedText", { length: 60 }),
  categoryId: bigint("categoryId", { mode: "number" }),
  categoryText: varchar("categoryText", { length: 120 }),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: longtext("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  blogArticleOrderIndex: index("blog_articles_order_index").on(table.sortOrder),
  blogArticleCategoryIndex: index("blog_articles_category_index").on(table.categoryId),
  blogArticleVisibilityIndex: index("blog_articles_visibility_index").on(table.isVisible),
  blogArticleSlugIndex: index("blog_articles_slug_index").on(table.slug),
}));
