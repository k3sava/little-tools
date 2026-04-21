"use client";

import { useState, useCallback, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- Types ---

type SchemaType = "Article" | "FAQ" | "HowTo" | "Product" | "LocalBusiness" | "Organization" | "Breadcrumb" | "Event";

interface FAQItem {
  question: string;
  answer: string;
}

interface HowToStep {
  name: string;
  text: string;
  image: string;
}

interface ArticleFields {
  headline: string;
  authorName: string;
  authorUrl: string;
  publisherName: string;
  publisherLogoUrl: string;
  datePublished: string;
  dateModified: string;
  imageUrl: string;
  description: string;
}

interface ProductFields {
  name: string;
  description: string;
  image: string;
  brand: string;
  sku: string;
  price: string;
  currency: string;
  availability: string;
  reviewRating: string;
  reviewCount: string;
}

interface OpeningHoursEntry {
  day: string;
  opens: string;
  closes: string;
}

interface LocalBusinessFields {
  name: string;
  type: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  url: string;
  image: string;
  priceRange: string;
  openingHours: OpeningHoursEntry[];
}

interface OrganizationFields {
  name: string;
  url: string;
  logo: string;
  description: string;
}

interface HowToFields {
  name: string;
  description: string;
  totalTime: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface EventFields {
  name: string;
  startDate: string;
  endDate: string;
  locationName: string;
  locationAddress: string;
  description: string;
  url: string;
  image: string;
  organizerName: string;
  offerPrice: string;
  offerCurrency: string;
  offerAvailability: string;
  offerUrl: string;
}

// --- Validation ---

interface ValidationMessage {
  level: "error" | "warning" | "success";
  text: string;
}

function validateArticle(fields: ArticleFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.headline) msgs.push({ level: "error", text: "Headline is required" });
  if (!fields.authorName) msgs.push({ level: "error", text: "Author name is required" });
  if (!fields.datePublished) msgs.push({ level: "error", text: "Date published is required" });
  if (!fields.imageUrl) msgs.push({ level: "warning", text: "Image URL is recommended" });
  if (!fields.description) msgs.push({ level: "warning", text: "Description is recommended" });
  if (!fields.publisherName) msgs.push({ level: "warning", text: "Publisher name is recommended" });
  if (!fields.dateModified) msgs.push({ level: "warning", text: "Date modified is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

function validateFAQ(items: FAQItem[]): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (items.length === 0) msgs.push({ level: "error", text: "At least one FAQ item is required" });
  items.forEach((item, i) => {
    if (!item.question) msgs.push({ level: "error", text: `Question ${i + 1} is empty` });
    if (!item.answer) msgs.push({ level: "error", text: `Answer ${i + 1} is empty` });
  });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

function validateHowTo(fields: HowToFields, steps: HowToStep[]): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (steps.length === 0) msgs.push({ level: "error", text: "At least one step is required" });
  steps.forEach((step, i) => {
    if (!step.text) msgs.push({ level: "error", text: `Step ${i + 1} text is empty` });
  });
  if (!fields.description) msgs.push({ level: "warning", text: "Description is recommended" });
  if (!fields.totalTime) msgs.push({ level: "warning", text: "Total time is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

function validateProduct(fields: ProductFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (!fields.image) msgs.push({ level: "warning", text: "Image is recommended" });
  if (!fields.description) msgs.push({ level: "warning", text: "Description is recommended" });
  if (!fields.price) msgs.push({ level: "warning", text: "Price is recommended for rich results" });
  if (!fields.brand) msgs.push({ level: "warning", text: "Brand is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

function validateLocalBusiness(fields: LocalBusinessFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (!fields.type) msgs.push({ level: "error", text: "Business type is required" });
  if (!fields.street) msgs.push({ level: "warning", text: "Street address is recommended" });
  if (!fields.city) msgs.push({ level: "warning", text: "City is recommended" });
  if (!fields.phone) msgs.push({ level: "warning", text: "Phone is recommended" });
  if (!fields.url) msgs.push({ level: "warning", text: "URL is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

function validateOrganization(fields: OrganizationFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (!fields.url) msgs.push({ level: "warning", text: "URL is recommended" });
  if (!fields.logo) msgs.push({ level: "warning", text: "Logo URL is recommended" });
  if (!fields.description) msgs.push({ level: "warning", text: "Description is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

function validateBreadcrumb(items: BreadcrumbItem[]): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (items.length < 2) msgs.push({ level: "error", text: "At least 2 breadcrumb items are required" });
  items.forEach((item, i) => {
    if (!item.name) msgs.push({ level: "error", text: `Item ${i + 1} name is empty` });
    if (!item.url) msgs.push({ level: "warning", text: `Item ${i + 1} URL is empty` });
  });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

function validateEvent(fields: EventFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Event name is required" });
  if (!fields.startDate) msgs.push({ level: "error", text: "Start date is required" });
  if (!fields.locationName) msgs.push({ level: "error", text: "Location name is required" });
  if (!fields.endDate) msgs.push({ level: "warning", text: "End date is recommended" });
  if (!fields.description) msgs.push({ level: "warning", text: "Description is recommended" });
  if (!fields.url) msgs.push({ level: "warning", text: "URL is recommended" });
  if (!fields.image) msgs.push({ level: "warning", text: "Image is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "All required fields are filled" });
  return msgs;
}

// --- JSON-LD Generators ---

function generateArticle(fields: ArticleFields): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fields.headline,
  };
  if (fields.authorName) {
    const author: Record<string, string> = { "@type": "Person", name: fields.authorName };
    if (fields.authorUrl) author.url = fields.authorUrl;
    schema.author = author;
  }
  if (fields.publisherName) {
    const publisher: Record<string, unknown> = { "@type": "Organization", name: fields.publisherName };
    if (fields.publisherLogoUrl) publisher.logo = { "@type": "ImageObject", url: fields.publisherLogoUrl };
    schema.publisher = publisher;
  }
  if (fields.datePublished) schema.datePublished = fields.datePublished;
  if (fields.dateModified) schema.dateModified = fields.dateModified;
  if (fields.imageUrl) schema.image = fields.imageUrl;
  if (fields.description) schema.description = fields.description;
  return schema;
}

function generateFAQ(items: FAQItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
      .filter((item) => item.question || item.answer)
      .map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
  };
}

function generateHowTo(fields: HowToFields, steps: HowToStep[]): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: fields.name,
  };
  if (fields.description) schema.description = fields.description;
  if (fields.totalTime) schema.totalTime = fields.totalTime;
  schema.step = steps.map((step, i) => {
    const s: Record<string, unknown> = {
      "@type": "HowToStep",
      position: i + 1,
      text: step.text,
    };
    if (step.name) s.name = step.name;
    if (step.image) s.image = step.image;
    return s;
  });
  return schema;
}

function generateProduct(fields: ProductFields): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: fields.name,
  };
  if (fields.description) schema.description = fields.description;
  if (fields.image) schema.image = fields.image;
  if (fields.brand) schema.brand = { "@type": "Brand", name: fields.brand };
  if (fields.sku) schema.sku = fields.sku;
  if (fields.price || fields.availability) {
    const offer: Record<string, string> = { "@type": "Offer" };
    if (fields.price) offer.price = fields.price;
    if (fields.currency) offer.priceCurrency = fields.currency;
    if (fields.availability) offer.availability = `https://schema.org/${fields.availability}`;
    schema.offers = offer;
  }
  if (fields.reviewRating || fields.reviewCount) {
    const rating: Record<string, unknown> = { "@type": "AggregateRating" };
    if (fields.reviewRating) rating.ratingValue = fields.reviewRating;
    if (fields.reviewCount) rating.reviewCount = fields.reviewCount;
    rating.bestRating = "5";
    schema.aggregateRating = rating;
  }
  return schema;
}

function generateLocalBusiness(fields: LocalBusinessFields): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": fields.type || "LocalBusiness",
    name: fields.name,
  };
  if (fields.street || fields.city || fields.state || fields.zip || fields.country) {
    const address: Record<string, string> = { "@type": "PostalAddress" };
    if (fields.street) address.streetAddress = fields.street;
    if (fields.city) address.addressLocality = fields.city;
    if (fields.state) address.addressRegion = fields.state;
    if (fields.zip) address.postalCode = fields.zip;
    if (fields.country) address.addressCountry = fields.country;
    schema.address = address;
  }
  if (fields.phone) schema.telephone = fields.phone;
  if (fields.url) schema.url = fields.url;
  if (fields.image) schema.image = fields.image;
  if (fields.priceRange) schema.priceRange = fields.priceRange;
  const activeHours = fields.openingHours.filter((h) => h.opens && h.closes);
  if (activeHours.length > 0) {
    schema.openingHoursSpecification = activeHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.opens,
      closes: h.closes,
    }));
  }
  return schema;
}

function generateOrganization(fields: OrganizationFields, socialLinks: string[]): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: fields.name,
  };
  if (fields.url) schema.url = fields.url;
  if (fields.logo) schema.logo = fields.logo;
  if (fields.description) schema.description = fields.description;
  const filtered = socialLinks.filter(Boolean);
  if (filtered.length > 0) schema.sameAs = filtered;
  return schema;
}

function generateBreadcrumb(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
      .filter((item) => item.name)
      .map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        ...(item.url ? { item: item.url } : {}),
      })),
  };
}

function generateEvent(fields: EventFields): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: fields.name,
  };
  if (fields.startDate) schema.startDate = fields.startDate;
  if (fields.endDate) schema.endDate = fields.endDate;
  if (fields.description) schema.description = fields.description;
  if (fields.url) schema.url = fields.url;
  if (fields.image) schema.image = fields.image;
  if (fields.locationName) {
    const location: Record<string, unknown> = {
      "@type": "Place",
      name: fields.locationName,
    };
    if (fields.locationAddress) {
      location.address = {
        "@type": "PostalAddress",
        streetAddress: fields.locationAddress,
      };
    }
    schema.location = location;
  }
  if (fields.organizerName) {
    schema.organizer = {
      "@type": "Organization",
      name: fields.organizerName,
    };
  }
  if (fields.offerPrice || fields.offerUrl) {
    const offer: Record<string, string> = { "@type": "Offer" };
    if (fields.offerPrice) offer.price = fields.offerPrice;
    if (fields.offerCurrency) offer.priceCurrency = fields.offerCurrency;
    if (fields.offerAvailability) offer.availability = `https://schema.org/${fields.offerAvailability}`;
    if (fields.offerUrl) offer.url = fields.offerUrl;
    schema.offers = offer;
  }
  return schema;
}

// --- Syntax Highlighting ---

function highlightJson(json: string): JSX.Element[] {
  return json.split("\n").map((line, i) => {
    const parts: JSX.Element[] = [];
    let idx = 0;
    // Match keys, strings, numbers, booleans, null, brackets
    const regex = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|(true|false|null)|([[\]{}:,])/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      // Text before match
      if (match.index > idx) {
        parts.push(<span key={`${i}-${idx}`}>{line.slice(idx, match.index)}</span>);
      }
      if (match[1] !== undefined) {
        // Key
        parts.push(
          <span key={`${i}-${match.index}`}>
            <span style={{ color: "#93c5fd" }}>{match[1]}</span>
            <span style={{ color: "#6b7280" }}>:</span>
          </span>
        );
      } else if (match[2] !== undefined) {
        // String value
        parts.push(<span key={`${i}-${match.index}`} style={{ color: "#86efac" }}>{match[2]}</span>);
      } else if (match[3] !== undefined) {
        // Number
        parts.push(<span key={`${i}-${match.index}`} style={{ color: "#fbbf24" }}>{match[3]}</span>);
      } else if (match[4] !== undefined) {
        // Boolean / null
        parts.push(<span key={`${i}-${match.index}`} style={{ color: "#c4b5fd" }}>{match[4]}</span>);
      } else if (match[5] !== undefined) {
        // Brackets, colon, comma
        parts.push(<span key={`${i}-${match.index}`} style={{ color: "#6b7280" }}>{match[5]}</span>);
      }
      idx = match.index + match[0].length;
    }
    if (idx < line.length) {
      parts.push(<span key={`${i}-${idx}`}>{line.slice(idx)}</span>);
    }
    return (
      <div key={i} className="leading-relaxed">
        {parts.length > 0 ? parts : " "}
      </div>
    );
  });
}

// --- Constants ---

const SCHEMA_TYPES: SchemaType[] = ["Article", "FAQ", "HowTo", "Product", "LocalBusiness", "Organization", "Breadcrumb", "Event"];

const CURRENCIES = ["USD", "EUR", "GBP", "INR"];
const AVAILABILITIES = ["InStock", "OutOfStock", "PreOrder"];
const BUSINESS_TYPES = [
  "LocalBusiness",
  "Restaurant",
  "Store",
  "MedicalBusiness",
  "LegalService",
  "FinancialService",
  "AutomotiveBusiness",
  "SportsActivityLocation",
  "EntertainmentBusiness",
  "HealthAndBeautyBusiness",
  "HomeAndConstructionBusiness",
  "ProfessionalService",
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY_OPENING_HOURS: OpeningHoursEntry[] = DAYS_OF_WEEK.map((day) => ({
  day,
  opens: "",
  closes: "",
}));

const EMPTY_ARTICLE: ArticleFields = {
  headline: "",
  authorName: "",
  authorUrl: "",
  publisherName: "",
  publisherLogoUrl: "",
  datePublished: "",
  dateModified: "",
  imageUrl: "",
  description: "",
};

const EMPTY_PRODUCT: ProductFields = {
  name: "",
  description: "",
  image: "",
  brand: "",
  sku: "",
  price: "",
  currency: "USD",
  availability: "InStock",
  reviewRating: "",
  reviewCount: "",
};

const EMPTY_LOCAL_BUSINESS: LocalBusinessFields = {
  name: "",
  type: "LocalBusiness",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  phone: "",
  url: "",
  image: "",
  priceRange: "",
  openingHours: [...EMPTY_OPENING_HOURS],
};

const EMPTY_ORGANIZATION: OrganizationFields = {
  name: "",
  url: "",
  logo: "",
  description: "",
};

const EMPTY_HOWTO: HowToFields = {
  name: "",
  description: "",
  totalTime: "",
};

const EMPTY_EVENT: EventFields = {
  name: "",
  startDate: "",
  endDate: "",
  locationName: "",
  locationAddress: "",
  description: "",
  url: "",
  image: "",
  organizerName: "",
  offerPrice: "",
  offerCurrency: "USD",
  offerAvailability: "InStock",
  offerUrl: "",
};

const EVENT_AVAILABILITIES = ["InStock", "SoldOut", "PreOrder"];

// --- Component ---

export default function SchemaGeneratorContent() {
  const [schemaType, setSchemaType] = useState<SchemaType>("Article");
  const [copied, setCopied] = useState(false);

  // Article
  const [article, setArticle] = useState<ArticleFields>(EMPTY_ARTICLE);

  // FAQ
  const [faqItems, setFaqItems] = useState<FAQItem[]>([{ question: "", answer: "" }]);

  // HowTo
  const [howTo, setHowTo] = useState<HowToFields>(EMPTY_HOWTO);
  const [howToSteps, setHowToSteps] = useState<HowToStep[]>([{ name: "", text: "", image: "" }]);

  // Product
  const [product, setProduct] = useState<ProductFields>(EMPTY_PRODUCT);

  // Local Business
  const [localBusiness, setLocalBusiness] = useState<LocalBusinessFields>(EMPTY_LOCAL_BUSINESS);

  // Organization
  const [organization, setOrganization] = useState<OrganizationFields>(EMPTY_ORGANIZATION);
  const [socialLinks, setSocialLinks] = useState<string[]>([""]);

  // Breadcrumb
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([
    { name: "", url: "" },
    { name: "", url: "" },
  ]);

  // Event
  const [event, setEvent] = useState<EventFields>(EMPTY_EVENT);

  // --- Generate JSON-LD ---
  const jsonLd = useMemo(() => {
    let schema: Record<string, unknown>;
    switch (schemaType) {
      case "Article":
        schema = generateArticle(article);
        break;
      case "FAQ":
        schema = generateFAQ(faqItems);
        break;
      case "HowTo":
        schema = generateHowTo(howTo, howToSteps);
        break;
      case "Product":
        schema = generateProduct(product);
        break;
      case "LocalBusiness":
        schema = generateLocalBusiness(localBusiness);
        break;
      case "Organization":
        schema = generateOrganization(organization, socialLinks);
        break;
      case "Breadcrumb":
        schema = generateBreadcrumb(breadcrumbItems);
        break;
      case "Event":
        schema = generateEvent(event);
        break;
    }
    return JSON.stringify(schema, null, 2);
  }, [schemaType, article, faqItems, howTo, howToSteps, product, localBusiness, organization, socialLinks, breadcrumbItems, event]);

  const outputText = useMemo(() => {
    return `<script type="application/ld+json">\n${jsonLd}\n</script>`;
  }, [jsonLd]);

  // --- Validation ---
  const validation = useMemo((): ValidationMessage[] => {
    switch (schemaType) {
      case "Article":
        return validateArticle(article);
      case "FAQ":
        return validateFAQ(faqItems);
      case "HowTo":
        return validateHowTo(howTo, howToSteps);
      case "Product":
        return validateProduct(product);
      case "LocalBusiness":
        return validateLocalBusiness(localBusiness);
      case "Organization":
        return validateOrganization(organization);
      case "Breadcrumb":
        return validateBreadcrumb(breadcrumbItems);
      case "Event":
        return validateEvent(event);
    }
  }, [schemaType, article, faqItems, howTo, howToSteps, product, localBusiness, organization, breadcrumbItems, event]);

  // --- Actions ---
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputText]);

  const handleClear = useCallback(() => {
    switch (schemaType) {
      case "Article":
        setArticle(EMPTY_ARTICLE);
        break;
      case "FAQ":
        setFaqItems([{ question: "", answer: "" }]);
        break;
      case "HowTo":
        setHowTo(EMPTY_HOWTO);
        setHowToSteps([{ name: "", text: "", image: "" }]);
        break;
      case "Product":
        setProduct(EMPTY_PRODUCT);
        break;
      case "LocalBusiness":
        setLocalBusiness({ ...EMPTY_LOCAL_BUSINESS, openingHours: [...EMPTY_OPENING_HOURS] });
        break;
      case "Organization":
        setOrganization(EMPTY_ORGANIZATION);
        setSocialLinks([""]);
        break;
      case "Breadcrumb":
        setBreadcrumbItems([{ name: "", url: "" }, { name: "", url: "" }]);
        break;
      case "Event":
        setEvent(EMPTY_EVENT);
        break;
    }
  }, [schemaType]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "Enter", meta: true, action: () => handleCopy(), label: "Copy JSON-LD" },
        { key: "k", meta: true, action: () => handleClear(), label: "Clear" },
      ],
      [handleCopy, handleClear]
    )
  );

  // --- Field helpers ---
  const updateArticle = useCallback((key: keyof ArticleFields, value: string) => {
    setArticle((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateProduct = useCallback((key: keyof ProductFields, value: string) => {
    setProduct((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateLocalBusiness = useCallback((key: keyof LocalBusinessFields, value: string) => {
    setLocalBusiness((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateOrganization = useCallback((key: keyof OrganizationFields, value: string) => {
    setOrganization((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateHowTo = useCallback((key: keyof HowToFields, value: string) => {
    setHowTo((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateEvent = useCallback((key: keyof EventFields, value: string) => {
    setEvent((prev) => ({ ...prev, [key]: value }));
  }, []);

  // --- Fill example ---
  const handleFillExample = useCallback(() => {
    switch (schemaType) {
      case "Article":
        setArticle({
          headline: "10 Tips for Better Web Performance in 2024",
          authorName: "Jane Smith",
          authorUrl: "https://example.com/authors/jane-smith",
          publisherName: "Web Dev Weekly",
          publisherLogoUrl: "https://example.com/logo.png",
          datePublished: "2024-03-15",
          dateModified: "2024-03-20",
          imageUrl: "https://example.com/images/web-performance.jpg",
          description: "A comprehensive guide to improving your website's loading speed, Core Web Vitals, and overall user experience.",
        });
        break;
      case "FAQ":
        setFaqItems([
          { question: "What is structured data?", answer: "Structured data is a standardized format for providing information about a page and classifying the page content. It helps search engines understand your content and can enable rich results in search." },
          { question: "How do I test my schema markup?", answer: "You can use Google's Rich Results Test or the Schema.org Validator to test your structured data implementation." },
          { question: "Does schema markup improve SEO?", answer: "While schema markup doesn't directly boost rankings, it can improve your click-through rate by enabling rich snippets in search results." },
        ]);
        break;
      case "HowTo":
        setHowTo({
          name: "How to Make Sourdough Bread",
          description: "A step-by-step guide to making artisan sourdough bread at home with just flour, water, and salt.",
          totalTime: "PT24H",
        });
        setHowToSteps([
          { name: "Prepare the starter", text: "Feed your sourdough starter 12 hours before you plan to mix the dough. Use equal parts flour and water.", image: "" },
          { name: "Mix the dough", text: "Combine 500g bread flour, 350g water, 100g active starter, and 10g salt. Mix until no dry flour remains.", image: "" },
          { name: "Bulk fermentation", text: "Let the dough rest for 4-6 hours at room temperature, performing stretch and folds every 30 minutes for the first 2 hours.", image: "" },
          { name: "Shape and proof", text: "Shape the dough into a round loaf and place in a floured banneton. Refrigerate for 8-12 hours.", image: "" },
          { name: "Bake", text: "Preheat oven to 450F with a Dutch oven inside. Bake covered for 20 minutes, then uncovered for 20-25 minutes until deep golden brown.", image: "" },
        ]);
        break;
      case "Product":
        setProduct({
          name: "Wireless Noise-Canceling Headphones",
          description: "Premium over-ear headphones with active noise cancellation, 30-hour battery life, and Hi-Res Audio support.",
          image: "https://example.com/images/headphones.jpg",
          brand: "AudioPro",
          sku: "AP-WH1000",
          price: "299.99",
          currency: "USD",
          availability: "InStock",
          reviewRating: "4.7",
          reviewCount: "2847",
        });
        break;
      case "LocalBusiness":
        setLocalBusiness({
          name: "The Corner Cafe",
          type: "Restaurant",
          street: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zip: "94102",
          country: "US",
          phone: "+1-415-555-0123",
          url: "https://thecornercafe.example.com",
          image: "https://thecornercafe.example.com/storefront.jpg",
          priceRange: "$$",
          openingHours: DAYS_OF_WEEK.map((day) => ({
            day,
            opens: day === "Sunday" ? "09:00" : "07:00",
            closes: day === "Sunday" ? "15:00" : day === "Saturday" ? "22:00" : "21:00",
          })),
        });
        break;
      case "Organization":
        setOrganization({
          name: "Acme Corporation",
          url: "https://acme.example.com",
          logo: "https://acme.example.com/logo.png",
          description: "Acme Corporation is a leading provider of innovative business solutions, serving over 10,000 customers worldwide.",
        });
        setSocialLinks([
          "https://twitter.com/acmecorp",
          "https://www.linkedin.com/company/acmecorp",
          "https://github.com/acmecorp",
        ]);
        break;
      case "Breadcrumb":
        setBreadcrumbItems([
          { name: "Home", url: "https://example.com" },
          { name: "Blog", url: "https://example.com/blog" },
          { name: "Web Development", url: "https://example.com/blog/web-dev" },
          { name: "CSS Grid Tutorial", url: "https://example.com/blog/web-dev/css-grid" },
        ]);
        break;
      case "Event":
        setEvent({
          name: "Web Dev Conference 2024",
          startDate: "2024-09-15T09:00",
          endDate: "2024-09-17T18:00",
          locationName: "Moscone Center",
          locationAddress: "747 Howard St, San Francisco, CA 94103",
          description: "The premier web development conference featuring 50+ speakers, hands-on workshops, and networking events.",
          url: "https://webdevconf.example.com",
          image: "https://webdevconf.example.com/banner.jpg",
          organizerName: "DevEvents Inc.",
          offerPrice: "499",
          offerCurrency: "USD",
          offerAvailability: "InStock",
          offerUrl: "https://webdevconf.example.com/tickets",
        });
        break;
    }
  }, [schemaType]);

  // --- Render form ---
  function renderForm() {
    switch (schemaType) {
      case "Article":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Headline *" value={article.headline} onChange={(v) => updateArticle("headline", v)} />
            <Field label="Author Name *" value={article.authorName} onChange={(v) => updateArticle("authorName", v)} />
            <Field label="Author URL" value={article.authorUrl} onChange={(v) => updateArticle("authorUrl", v)} placeholder="https://" />
            <Field label="Publisher Name" value={article.publisherName} onChange={(v) => updateArticle("publisherName", v)} />
            <Field label="Publisher Logo URL" value={article.publisherLogoUrl} onChange={(v) => updateArticle("publisherLogoUrl", v)} placeholder="https://" />
            <Field label="Date Published *" value={article.datePublished} onChange={(v) => updateArticle("datePublished", v)} type="date" />
            <Field label="Date Modified" value={article.dateModified} onChange={(v) => updateArticle("dateModified", v)} type="date" />
            <Field label="Image URL" value={article.imageUrl} onChange={(v) => updateArticle("imageUrl", v)} placeholder="https://" />
            <div className="sm:col-span-2">
              <Field label="Description" value={article.description} onChange={(v) => updateArticle("description", v)} multiline />
            </div>
          </div>
        );

      case "FAQ":
        return (
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="rounded-lg p-4 space-y-3"
                style={{
                  border: "1px solid var(--kami-card-border, rgba(0,0,0,0.08))",
                  background: "var(--kami-input-bg, rgba(0,0,0,0.02))",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted, #666)" }}>
                    Question {i + 1}
                  </span>
                  {faqItems.length > 1 && (
                    <button
                      onClick={() => setFaqItems((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
                      style={{ color: "var(--kami-text-muted, #666)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Field
                  label="Question"
                  value={item.question}
                  onChange={(v) =>
                    setFaqItems((prev) => prev.map((it, j) => (j === i ? { ...it, question: v } : it)))
                  }
                />
                <Field
                  label="Answer"
                  value={item.answer}
                  onChange={(v) =>
                    setFaqItems((prev) => prev.map((it, j) => (j === i ? { ...it, answer: v } : it)))
                  }
                  multiline
                />
              </div>
            ))}
            <button
              onClick={() => setFaqItems((prev) => [...prev, { question: "", answer: "" }])}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{
                border: "1px dashed var(--kami-border-strong, rgba(0,0,0,0.15))",
                color: "var(--kami-text-muted, #666)",
              }}
            >
              <PlusIcon /> Add Question
            </button>
          </div>
        );

      case "HowTo":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *" value={howTo.name} onChange={(v) => updateHowTo("name", v)} />
              <Field label="Total Time" value={howTo.totalTime} onChange={(v) => updateHowTo("totalTime", v)} placeholder="PT1H30M" />
            </div>
            <Field label="Description" value={howTo.description} onChange={(v) => updateHowTo("description", v)} multiline />
            <div className="space-y-3">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted, #666)" }}>
                Steps
              </span>
              {howToSteps.map((step, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4 space-y-3"
                  style={{
                    border: "1px solid var(--kami-card-border, rgba(0,0,0,0.08))",
                    background: "var(--kami-input-bg, rgba(0,0,0,0.02))",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted, #666)" }}>
                      Step {i + 1}
                    </span>
                    {howToSteps.length > 1 && (
                      <button
                        onClick={() => setHowToSteps((prev) => prev.filter((_, j) => j !== i))}
                        className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
                        style={{ color: "var(--kami-text-muted, #666)" }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Name"
                      value={step.name}
                      onChange={(v) =>
                        setHowToSteps((prev) => prev.map((s, j) => (j === i ? { ...s, name: v } : s)))
                      }
                    />
                    <Field
                      label="Image URL"
                      value={step.image}
                      onChange={(v) =>
                        setHowToSteps((prev) => prev.map((s, j) => (j === i ? { ...s, image: v } : s)))
                      }
                      placeholder="https://"
                    />
                  </div>
                  <Field
                    label="Text *"
                    value={step.text}
                    onChange={(v) =>
                      setHowToSteps((prev) => prev.map((s, j) => (j === i ? { ...s, text: v } : s)))
                    }
                    multiline
                  />
                </div>
              ))}
              <button
                onClick={() => setHowToSteps((prev) => [...prev, { name: "", text: "", image: "" }])}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  border: "1px dashed var(--kami-border-strong, rgba(0,0,0,0.15))",
                  color: "var(--kami-text-muted, #666)",
                }}
              >
                <PlusIcon /> Add Step
              </button>
            </div>
          </div>
        );

      case "Product":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *" value={product.name} onChange={(v) => updateProduct("name", v)} />
            <Field label="Brand" value={product.brand} onChange={(v) => updateProduct("brand", v)} />
            <Field label="SKU" value={product.sku} onChange={(v) => updateProduct("sku", v)} />
            <Field label="Image URL" value={product.image} onChange={(v) => updateProduct("image", v)} placeholder="https://" />
            <Field label="Price" value={product.price} onChange={(v) => updateProduct("price", v)} placeholder="29.99" />
            <SelectField label="Currency" value={product.currency} onChange={(v) => updateProduct("currency", v)} options={CURRENCIES} />
            <SelectField label="Availability" value={product.availability} onChange={(v) => updateProduct("availability", v)} options={AVAILABILITIES} />
            <Field label="Review Rating (1-5)" value={product.reviewRating} onChange={(v) => updateProduct("reviewRating", v)} placeholder="4.5" />
            <Field label="Review Count" value={product.reviewCount} onChange={(v) => updateProduct("reviewCount", v)} placeholder="120" />
            <div className="sm:col-span-2">
              <Field label="Description" value={product.description} onChange={(v) => updateProduct("description", v)} multiline />
            </div>
          </div>
        );

      case "LocalBusiness":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business Name *" value={localBusiness.name} onChange={(v) => updateLocalBusiness("name", v)} />
            <SelectField label="Business Type *" value={localBusiness.type} onChange={(v) => updateLocalBusiness("type", v)} options={BUSINESS_TYPES} />
            <Field label="Street Address" value={localBusiness.street} onChange={(v) => updateLocalBusiness("street", v)} />
            <Field label="City" value={localBusiness.city} onChange={(v) => updateLocalBusiness("city", v)} />
            <Field label="State / Region" value={localBusiness.state} onChange={(v) => updateLocalBusiness("state", v)} />
            <Field label="ZIP / Postal Code" value={localBusiness.zip} onChange={(v) => updateLocalBusiness("zip", v)} />
            <Field label="Country" value={localBusiness.country} onChange={(v) => updateLocalBusiness("country", v)} />
            <Field label="Phone" value={localBusiness.phone} onChange={(v) => updateLocalBusiness("phone", v)} placeholder="+1-555-123-4567" />
            <Field label="URL" value={localBusiness.url} onChange={(v) => updateLocalBusiness("url", v)} placeholder="https://" />
            <Field label="Image URL" value={localBusiness.image} onChange={(v) => updateLocalBusiness("image", v)} placeholder="https://" />
            <Field label="Price Range" value={localBusiness.priceRange} onChange={(v) => updateLocalBusiness("priceRange", v)} placeholder="$$" />
            <div className="sm:col-span-2">
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--kami-text-muted, #666)" }}>
                Opening Hours
              </span>
              <div className="space-y-2">
                {localBusiness.openingHours.map((entry, i) => (
                  <div key={entry.day} className="flex items-center gap-3">
                    <span className="w-24 text-sm shrink-0" style={{ color: "var(--kami-text, #111)" }}>
                      {entry.day.slice(0, 3)}
                    </span>
                    <input
                      type="time"
                      value={entry.opens}
                      onChange={(e) =>
                        setLocalBusiness((prev) => ({
                          ...prev,
                          openingHours: prev.openingHours.map((h, j) =>
                            j === i ? { ...h, opens: e.target.value } : h
                          ),
                        }))
                      }
                      className="px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                      style={{
                        background: "var(--kami-input-bg, rgba(0,0,0,0.02))",
                        border: "1px solid var(--kami-input-border, rgba(0,0,0,0.12))",
                        borderRadius: "var(--kami-input-radius, 8px)",
                        color: "var(--kami-text, #111)",
                      }}
                    />
                    <span className="text-xs" style={{ color: "var(--kami-text-muted, #666)" }}>to</span>
                    <input
                      type="time"
                      value={entry.closes}
                      onChange={(e) =>
                        setLocalBusiness((prev) => ({
                          ...prev,
                          openingHours: prev.openingHours.map((h, j) =>
                            j === i ? { ...h, closes: e.target.value } : h
                          ),
                        }))
                      }
                      className="px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                      style={{
                        background: "var(--kami-input-bg, rgba(0,0,0,0.02))",
                        border: "1px solid var(--kami-input-border, rgba(0,0,0,0.12))",
                        borderRadius: "var(--kami-input-radius, 8px)",
                        color: "var(--kami-text, #111)",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "Organization":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name *" value={organization.name} onChange={(v) => updateOrganization("name", v)} />
              <Field label="URL" value={organization.url} onChange={(v) => updateOrganization("url", v)} placeholder="https://" />
              <Field label="Logo URL" value={organization.logo} onChange={(v) => updateOrganization("logo", v)} placeholder="https://" />
            </div>
            <Field label="Description" value={organization.description} onChange={(v) => updateOrganization("description", v)} multiline />
            <div className="space-y-3">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted, #666)" }}>
                Social Links
              </span>
              {socialLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1">
                    <Field
                      label={`Link ${i + 1}`}
                      value={link}
                      onChange={(v) => setSocialLinks((prev) => prev.map((l, j) => (j === i ? v : l)))}
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                  {socialLinks.length > 1 && (
                    <button
                      onClick={() => setSocialLinks((prev) => prev.filter((_, j) => j !== i))}
                      className="self-end mb-1 text-xs px-2 py-2 rounded hover:opacity-80 transition-opacity"
                      style={{ color: "var(--kami-text-muted, #666)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setSocialLinks((prev) => [...prev, ""])}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  border: "1px dashed var(--kami-border-strong, rgba(0,0,0,0.15))",
                  color: "var(--kami-text-muted, #666)",
                }}
              >
                <PlusIcon /> Add Link
              </button>
            </div>
          </div>
        );

      case "Breadcrumb":
        return (
          <div className="space-y-4">
            {breadcrumbItems.map((item, i) => (
              <div
                key={i}
                className="rounded-lg p-4 space-y-3"
                style={{
                  border: "1px solid var(--kami-card-border, rgba(0,0,0,0.08))",
                  background: "var(--kami-input-bg, rgba(0,0,0,0.02))",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted, #666)" }}>
                    Item {i + 1}
                  </span>
                  {breadcrumbItems.length > 2 && (
                    <button
                      onClick={() => setBreadcrumbItems((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
                      style={{ color: "var(--kami-text-muted, #666)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Name *"
                    value={item.name}
                    onChange={(v) =>
                      setBreadcrumbItems((prev) => prev.map((it, j) => (j === i ? { ...it, name: v } : it)))
                    }
                    placeholder="Home"
                  />
                  <Field
                    label="URL"
                    value={item.url}
                    onChange={(v) =>
                      setBreadcrumbItems((prev) => prev.map((it, j) => (j === i ? { ...it, url: v } : it)))
                    }
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => setBreadcrumbItems((prev) => [...prev, { name: "", url: "" }])}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{
                border: "1px dashed var(--kami-border-strong, rgba(0,0,0,0.15))",
                color: "var(--kami-text-muted, #666)",
              }}
            >
              <PlusIcon /> Add Item
            </button>
          </div>
        );

      case "Event":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Event Name *" value={event.name} onChange={(v) => updateEvent("name", v)} />
              <Field label="URL" value={event.url} onChange={(v) => updateEvent("url", v)} placeholder="https://" />
              <Field label="Start Date *" value={event.startDate} onChange={(v) => updateEvent("startDate", v)} type="datetime-local" />
              <Field label="End Date" value={event.endDate} onChange={(v) => updateEvent("endDate", v)} type="datetime-local" />
              <Field label="Location Name *" value={event.locationName} onChange={(v) => updateEvent("locationName", v)} />
              <Field label="Location Address" value={event.locationAddress} onChange={(v) => updateEvent("locationAddress", v)} />
              <Field label="Image URL" value={event.image} onChange={(v) => updateEvent("image", v)} placeholder="https://" />
              <Field label="Organizer Name" value={event.organizerName} onChange={(v) => updateEvent("organizerName", v)} />
            </div>
            <Field label="Description" value={event.description} onChange={(v) => updateEvent("description", v)} multiline />
            <div className="space-y-3">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted, #666)" }}>
                Ticket / Offer
              </span>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price" value={event.offerPrice} onChange={(v) => updateEvent("offerPrice", v)} placeholder="99.00" />
                <SelectField label="Currency" value={event.offerCurrency} onChange={(v) => updateEvent("offerCurrency", v)} options={CURRENCIES} />
                <SelectField label="Availability" value={event.offerAvailability} onChange={(v) => updateEvent("offerAvailability", v)} options={EVENT_AVAILABILITIES} />
                <Field label="Ticket URL" value={event.offerUrl} onChange={(v) => updateEvent("offerUrl", v)} placeholder="https://" />
              </div>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text, #111)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Schema Markup Generator
          </h1>
          <p className="mt-2" style={{ color: "var(--kami-text-muted, #666)" }}>
            Build JSON-LD structured data for rich search results. No ads, no tracking.
          </p>
        </div>

        {/* Type selector pills */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {SCHEMA_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSchemaType(type)}
              className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
              style={
                schemaType === type
                  ? {
                      background: "var(--kami-surface-solid, #111)",
                      color: "#fff",
                    }
                  : {
                      border: "1px solid var(--kami-input-border, rgba(0,0,0,0.12))",
                      color: "var(--kami-text-muted, #666)",
                      background: "transparent",
                    }
              }
            >
              {type === "LocalBusiness" ? "Local Business" : type === "HowTo" ? "How To" : type}
            </button>
          ))}
        </div>

        {/* Form */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{
            border: "1px solid var(--kami-card-border, rgba(0,0,0,0.08))",
            borderRadius: "var(--kami-card-radius, 12px)",
            boxShadow: "var(--kami-card-shadow, 0 1px 3px rgba(0,0,0,0.04))",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
              {schemaType === "LocalBusiness" ? "Local Business" : schemaType} Fields
            </span>
            <button
              onClick={handleFillExample}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
              style={{
                border: "1px dashed var(--kami-border-strong, rgba(0,0,0,0.15))",
                color: "var(--kami-text-muted, #666)",
              }}
            >
              Fill example
            </button>
          </div>
          {renderForm()}
        </div>

        {/* Validation */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            border: "1px solid var(--kami-card-border, rgba(0,0,0,0.08))",
            borderRadius: "var(--kami-card-radius, 12px)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
              Validation
            </span>
          </div>
          <div className="space-y-1">
            {validation.map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {msg.level === "error" && (
                  <span style={{ color: "#ef4444" }}>
                    <XCircleIcon />
                  </span>
                )}
                {msg.level === "warning" && (
                  <span style={{ color: "#f59e0b" }}>
                    <WarningIcon />
                  </span>
                )}
                {msg.level === "success" && (
                  <span style={{ color: "#22c55e" }}>
                    <CheckCircleIcon />
                  </span>
                )}
                <span
                  style={{
                    color:
                      msg.level === "error"
                        ? "#ef4444"
                        : msg.level === "warning"
                        ? "#f59e0b"
                        : "#22c55e",
                  }}
                >
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* JSON-LD Output */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted, #666)" }}>
              JSON-LD Output
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
              style={{
                background: "var(--kami-surface-solid, #111)",
                color: "#fff",
              }}
            >
              {copied ? (
                <>
                  <CheckIcon /> Copied
                </>
              ) : (
                <>
                  <CopyIcon /> Copy
                </>
              )}
            </button>
          </div>
          <pre
            className="overflow-auto whitespace-pre rounded-xl p-4 text-sm font-mono max-h-[500px]"
            style={{
              background: "#1e1e2e",
              color: "#cdd6f4",
              border: "1px solid var(--kami-card-border, rgba(0,0,0,0.08))",
              borderRadius: "var(--kami-card-radius, 12px)",
            }}
          >
            <span style={{ color: "#6b7280" }}>&lt;script type=&quot;application/ld+json&quot;&gt;</span>
            {"\n"}
            {highlightJson(jsonLd)}
            {"\n"}
            <span style={{ color: "#6b7280" }}>&lt;/script&gt;</span>
          </pre>
        </div>
      </div>
    </div>
  );
}

// --- Reusable Field Components ---

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  const inputStyle = {
    background: "var(--kami-input-bg, rgba(0,0,0,0.02))",
    border: "1px solid var(--kami-input-border, rgba(0,0,0,0.12))",
    borderRadius: "var(--kami-input-radius, 8px)",
    color: "var(--kami-text, #111)",
  };

  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1" style={{ color: "var(--kami-text-muted, #666)" }}>
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:opacity-40"
          style={inputStyle}
          spellCheck={false}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:opacity-40"
          style={inputStyle}
          spellCheck={false}
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1" style={{ color: "var(--kami-text-muted, #666)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        style={{
          background: "var(--kami-input-bg, rgba(0,0,0,0.02))",
          border: "1px solid var(--kami-input-border, rgba(0,0,0,0.12))",
          borderRadius: "var(--kami-input-radius, 8px)",
          color: "var(--kami-text, #111)",
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

// --- Inline SVG Icons ---

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
