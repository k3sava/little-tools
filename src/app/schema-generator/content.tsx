"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Select } from "@/components/tools/controls";

// --- Types ---

type SchemaType =
  | "Article"
  | "FAQ"
  | "HowTo"
  | "Product"
  | "LocalBusiness"
  | "Organization"
  | "Breadcrumb"
  | "Event"
  | "Recipe"
  | "Person";

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

interface RecipeFields {
  name: string;
  authorName: string;
  description: string;
  image: string;
  prepTime: string;
  cookTime: string;
  recipeYield: string;
  ingredients: string;
  instructions: string;
}

interface PersonFields {
  name: string;
  jobTitle: string;
  url: string;
  image: string;
  description: string;
  email: string;
  sameAs: string;
}

const ACCENT = "#3b82f6";

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
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for Article rich results" });
  return msgs;
}

function validateFAQ(items: FAQItem[]): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (items.length === 0) msgs.push({ level: "error", text: "At least one FAQ item is required" });
  items.forEach((item, i) => {
    if (!item.question) msgs.push({ level: "error", text: `Question ${i + 1} is empty` });
    if (!item.answer) msgs.push({ level: "error", text: `Answer ${i + 1} is empty` });
  });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for FAQ rich results" });
  return msgs;
}

function validateHowTo(fields: HowToFields, steps: HowToStep[]): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (steps.length === 0) msgs.push({ level: "error", text: "At least one step is required" });
  steps.forEach((step, i) => {
    if (!step.text) msgs.push({ level: "error", text: `Step ${i + 1} text is empty` });
  });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for How-To rich results" });
  return msgs;
}

function validateProduct(fields: ProductFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (!fields.image) msgs.push({ level: "warning", text: "Image is recommended" });
  if (!fields.price) msgs.push({ level: "warning", text: "Price drives price snippets" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for Product rich results" });
  return msgs;
}

function validateLocalBusiness(fields: LocalBusinessFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (!fields.type) msgs.push({ level: "error", text: "Business type is required" });
  if (!fields.street) msgs.push({ level: "warning", text: "Street address is recommended" });
  if (!fields.phone) msgs.push({ level: "warning", text: "Phone is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for LocalBusiness rich results" });
  return msgs;
}

function validateOrganization(fields: OrganizationFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (!fields.logo) msgs.push({ level: "warning", text: "Logo is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Looks good" });
  return msgs;
}

function validateBreadcrumb(items: BreadcrumbItem[]): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (items.length < 2) msgs.push({ level: "error", text: "At least 2 breadcrumb items are required" });
  items.forEach((item, i) => {
    if (!item.name) msgs.push({ level: "error", text: `Item ${i + 1} name is empty` });
  });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for breadcrumb rich results" });
  return msgs;
}

function validateEvent(fields: EventFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Event name is required" });
  if (!fields.startDate) msgs.push({ level: "error", text: "Start date is required" });
  if (!fields.locationName) msgs.push({ level: "error", text: "Location is required" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for Event rich results" });
  return msgs;
}

function validateRecipe(fields: RecipeFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Recipe name is required" });
  if (!fields.ingredients) msgs.push({ level: "error", text: "Ingredients are required" });
  if (!fields.instructions) msgs.push({ level: "error", text: "Instructions are required" });
  if (!fields.image) msgs.push({ level: "warning", text: "Image is recommended" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Eligible for Recipe rich results" });
  return msgs;
}

function validatePerson(fields: PersonFields): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  if (!fields.name) msgs.push({ level: "error", text: "Name is required" });
  if (msgs.length === 0) msgs.push({ level: "success", text: "Looks good" });
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
        acceptedAnswer: { "@type": "Answer", text: item.answer },
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
    const s: Record<string, unknown> = { "@type": "HowToStep", position: i + 1, text: step.text };
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
    const location: Record<string, unknown> = { "@type": "Place", name: fields.locationName };
    if (fields.locationAddress) {
      location.address = { "@type": "PostalAddress", streetAddress: fields.locationAddress };
    }
    schema.location = location;
  }
  if (fields.organizerName) {
    schema.organizer = { "@type": "Organization", name: fields.organizerName };
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

function generateRecipe(fields: RecipeFields): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: fields.name,
  };
  if (fields.authorName) schema.author = { "@type": "Person", name: fields.authorName };
  if (fields.description) schema.description = fields.description;
  if (fields.image) schema.image = fields.image;
  if (fields.prepTime) schema.prepTime = fields.prepTime;
  if (fields.cookTime) schema.cookTime = fields.cookTime;
  if (fields.recipeYield) schema.recipeYield = fields.recipeYield;
  if (fields.ingredients) {
    schema.recipeIngredient = fields.ingredients.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  if (fields.instructions) {
    schema.recipeInstructions = fields.instructions
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text, i) => ({ "@type": "HowToStep", position: i + 1, text }));
  }
  return schema;
}

function generatePerson(fields: PersonFields): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fields.name,
  };
  if (fields.jobTitle) schema.jobTitle = fields.jobTitle;
  if (fields.url) schema.url = fields.url;
  if (fields.image) schema.image = fields.image;
  if (fields.description) schema.description = fields.description;
  if (fields.email) schema.email = fields.email;
  if (fields.sameAs) {
    schema.sameAs = fields.sameAs.split("\n").map((l) => l.trim()).filter(Boolean);
  }
  return schema;
}

// --- Constants ---

const SCHEMA_TYPES: { value: SchemaType; label: string }[] = [
  { value: "Article", label: "Article" },
  { value: "FAQ", label: "FAQ" },
  { value: "HowTo", label: "How-To" },
  { value: "Product", label: "Product" },
  { value: "Recipe", label: "Recipe" },
  { value: "LocalBusiness", label: "Local Business" },
  { value: "Event", label: "Event" },
  { value: "Person", label: "Person" },
  { value: "Organization", label: "Organization" },
  { value: "Breadcrumb", label: "Breadcrumb" },
];

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

const EMPTY_OPENING_HOURS: OpeningHoursEntry[] = DAYS_OF_WEEK.map((day) => ({ day, opens: "", closes: "" }));

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

const EMPTY_ORGANIZATION: OrganizationFields = { name: "", url: "", logo: "", description: "" };
const EMPTY_HOWTO: HowToFields = { name: "", description: "", totalTime: "" };

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

const EMPTY_RECIPE: RecipeFields = {
  name: "",
  authorName: "",
  description: "",
  image: "",
  prepTime: "",
  cookTime: "",
  recipeYield: "",
  ingredients: "",
  instructions: "",
};

const EMPTY_PERSON: PersonFields = {
  name: "",
  jobTitle: "",
  url: "",
  image: "",
  description: "",
  email: "",
  sameAs: "",
};

const EVENT_AVAILABILITIES = ["InStock", "SoldOut", "PreOrder"];

// --- Component ---

export default function SchemaGeneratorContent() {
  const [schemaType, setSchemaType] = useState<SchemaType>("Article");
  const [copied, setCopied] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMetro = currentTheme === "metro";
  const isGlass    = currentTheme === "glass";

  const [article, setArticle] = useState<ArticleFields>(EMPTY_ARTICLE);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([{ question: "", answer: "" }]);
  const [howTo, setHowTo] = useState<HowToFields>(EMPTY_HOWTO);
  const [howToSteps, setHowToSteps] = useState<HowToStep[]>([{ name: "", text: "", image: "" }]);
  const [product, setProduct] = useState<ProductFields>(EMPTY_PRODUCT);
  const [localBusiness, setLocalBusiness] = useState<LocalBusinessFields>(EMPTY_LOCAL_BUSINESS);
  const [organization, setOrganization] = useState<OrganizationFields>(EMPTY_ORGANIZATION);
  const [socialLinks, setSocialLinks] = useState<string[]>([""]);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([
    { name: "", url: "" },
    { name: "", url: "" },
  ]);
  const [event, setEvent] = useState<EventFields>(EMPTY_EVENT);
  const [recipe, setRecipe] = useState<RecipeFields>(EMPTY_RECIPE);
  const [person, setPerson] = useState<PersonFields>(EMPTY_PERSON);

  const jsonLd = useMemo(() => {
    let schema: Record<string, unknown>;
    switch (schemaType) {
      case "Article": schema = generateArticle(article); break;
      case "FAQ": schema = generateFAQ(faqItems); break;
      case "HowTo": schema = generateHowTo(howTo, howToSteps); break;
      case "Product": schema = generateProduct(product); break;
      case "LocalBusiness": schema = generateLocalBusiness(localBusiness); break;
      case "Organization": schema = generateOrganization(organization, socialLinks); break;
      case "Breadcrumb": schema = generateBreadcrumb(breadcrumbItems); break;
      case "Event": schema = generateEvent(event); break;
      case "Recipe": schema = generateRecipe(recipe); break;
      case "Person": schema = generatePerson(person); break;
    }
    return JSON.stringify(schema, null, 2);
  }, [schemaType, article, faqItems, howTo, howToSteps, product, localBusiness, organization, socialLinks, breadcrumbItems, event, recipe, person]);

  const outputText = useMemo(() => `<script type="application/ld+json">\n${jsonLd}\n</script>`, [jsonLd]);

  const validation = useMemo((): ValidationMessage[] => {
    switch (schemaType) {
      case "Article": return validateArticle(article);
      case "FAQ": return validateFAQ(faqItems);
      case "HowTo": return validateHowTo(howTo, howToSteps);
      case "Product": return validateProduct(product);
      case "LocalBusiness": return validateLocalBusiness(localBusiness);
      case "Organization": return validateOrganization(organization);
      case "Breadcrumb": return validateBreadcrumb(breadcrumbItems);
      case "Event": return validateEvent(event);
      case "Recipe": return validateRecipe(recipe);
      case "Person": return validatePerson(person);
    }
  }, [schemaType, article, faqItems, howTo, howToSteps, product, localBusiness, organization, breadcrumbItems, event, recipe, person]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputText]);

  const handleClear = useCallback(() => {
    switch (schemaType) {
      case "Article": setArticle(EMPTY_ARTICLE); break;
      case "FAQ": setFaqItems([{ question: "", answer: "" }]); break;
      case "HowTo": setHowTo(EMPTY_HOWTO); setHowToSteps([{ name: "", text: "", image: "" }]); break;
      case "Product": setProduct(EMPTY_PRODUCT); break;
      case "LocalBusiness": setLocalBusiness({ ...EMPTY_LOCAL_BUSINESS, openingHours: [...EMPTY_OPENING_HOURS] }); break;
      case "Organization": setOrganization(EMPTY_ORGANIZATION); setSocialLinks([""]); break;
      case "Breadcrumb": setBreadcrumbItems([{ name: "", url: "" }, { name: "", url: "" }]); break;
      case "Event": setEvent(EMPTY_EVENT); break;
      case "Recipe": setRecipe(EMPTY_RECIPE); break;
      case "Person": setPerson(EMPTY_PERSON); break;
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

  const updateArticle = useCallback((key: keyof ArticleFields, value: string) =>
    setArticle((prev) => ({ ...prev, [key]: value })), []);
  const updateProduct = useCallback((key: keyof ProductFields, value: string) =>
    setProduct((prev) => ({ ...prev, [key]: value })), []);
  const updateLocalBusiness = useCallback((key: keyof LocalBusinessFields, value: string) =>
    setLocalBusiness((prev) => ({ ...prev, [key]: value })), []);
  const updateOrganization = useCallback((key: keyof OrganizationFields, value: string) =>
    setOrganization((prev) => ({ ...prev, [key]: value })), []);
  const updateHowTo = useCallback((key: keyof HowToFields, value: string) =>
    setHowTo((prev) => ({ ...prev, [key]: value })), []);
  const updateEvent = useCallback((key: keyof EventFields, value: string) =>
    setEvent((prev) => ({ ...prev, [key]: value })), []);
  const updateRecipe = useCallback((key: keyof RecipeFields, value: string) =>
    setRecipe((prev) => ({ ...prev, [key]: value })), []);
  const updatePerson = useCallback((key: keyof PersonFields, value: string) =>
    setPerson((prev) => ({ ...prev, [key]: value })), []);

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
          description: "A comprehensive guide to improving your website's loading speed.",
        });
        break;
      case "FAQ":
        setFaqItems([
          { question: "What is structured data?", answer: "Structured data is a standardized format for providing information about a page." },
          { question: "How do I test my schema markup?", answer: "Use Google's Rich Results Test or the Schema.org Validator." },
        ]);
        break;
      case "HowTo":
        setHowTo({ name: "How to Make Sourdough Bread", description: "Step-by-step guide.", totalTime: "PT24H" });
        setHowToSteps([
          { name: "Prepare the starter", text: "Feed your sourdough starter 12 hours before you mix the dough.", image: "" },
          { name: "Mix the dough", text: "Combine flour, water, starter, and salt.", image: "" },
        ]);
        break;
      case "Product":
        setProduct({
          name: "Wireless Headphones", description: "Premium over-ear headphones.",
          image: "https://example.com/images/headphones.jpg", brand: "AudioPro",
          sku: "AP-WH1000", price: "299.99", currency: "USD", availability: "InStock",
          reviewRating: "4.7", reviewCount: "2847",
        });
        break;
      case "LocalBusiness":
        setLocalBusiness({
          name: "The Corner Cafe", type: "Restaurant", street: "123 Main Street",
          city: "San Francisco", state: "CA", zip: "94102", country: "US",
          phone: "+1-415-555-0123", url: "https://thecornercafe.example.com",
          image: "", priceRange: "$$",
          openingHours: DAYS_OF_WEEK.map((day) => ({
            day, opens: "07:00", closes: day === "Saturday" ? "22:00" : "21:00",
          })),
        });
        break;
      case "Organization":
        setOrganization({
          name: "Acme Corporation", url: "https://acme.example.com",
          logo: "https://acme.example.com/logo.png",
          description: "Acme is a leading provider of innovative business solutions.",
        });
        setSocialLinks(["https://twitter.com/acmecorp", "https://www.linkedin.com/company/acmecorp"]);
        break;
      case "Breadcrumb":
        setBreadcrumbItems([
          { name: "Home", url: "https://example.com" },
          { name: "Blog", url: "https://example.com/blog" },
          { name: "Web Development", url: "https://example.com/blog/web-dev" },
        ]);
        break;
      case "Event":
        setEvent({
          name: "Web Dev Conference 2024",
          startDate: "2024-09-15T09:00", endDate: "2024-09-17T18:00",
          locationName: "Moscone Center", locationAddress: "747 Howard St, San Francisco, CA 94103",
          description: "The premier web development conference.",
          url: "https://webdevconf.example.com", image: "",
          organizerName: "DevEvents Inc.",
          offerPrice: "499", offerCurrency: "USD", offerAvailability: "InStock",
          offerUrl: "https://webdevconf.example.com/tickets",
        });
        break;
      case "Recipe":
        setRecipe({
          name: "Classic Chocolate Chip Cookies", authorName: "Jane Doe",
          description: "Soft and chewy.", image: "https://example.com/cookies.jpg",
          prepTime: "PT15M", cookTime: "PT12M", recipeYield: "24 cookies",
          ingredients: "2 cups flour\n1 cup butter\n1 cup chocolate chips",
          instructions: "Preheat oven to 375F\nCream butter and sugar\nFold in chips\nBake 10-12 min",
        });
        break;
      case "Person":
        setPerson({
          name: "Jane Smith", jobTitle: "Software Engineer",
          url: "https://example.com/jane", image: "https://example.com/jane.jpg",
          description: "Senior engineer with 10+ years of experience.",
          email: "jane@example.com",
          sameAs: "https://twitter.com/janesmith\nhttps://linkedin.com/in/janesmith",
        });
        break;
    }
  }, [schemaType]);

  const inputStyle: React.CSSProperties = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  };

  function Field({ label, value, onChange, placeholder, type = "text", multiline = false }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    multiline?: boolean;
  }) {
    return (
      <label className="block">
        <span className="block text-xs font-medium mb-1" style={{ color: "var(--kami-text-muted)" }}>{label}</span>
        {multiline ? (
          <textarea
            value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
            className="w-full px-3 py-2 text-sm focus:outline-none placeholder:opacity-40"
            style={inputStyle} spellCheck={false}
          />
        ) : (
          <input
            type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="w-full px-3 py-2 text-sm focus:outline-none placeholder:opacity-40"
            style={inputStyle} spellCheck={false}
          />
        )}
      </label>
    );
  }

  function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
    return (
      <label className="block">
        <span className="block text-xs font-medium mb-1" style={{ color: "var(--kami-text-muted)" }}>{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </label>
    );
  }

  function renderForm() {
    switch (schemaType) {
      case "Article":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Headline *" value={article.headline} onChange={(v) => updateArticle("headline", v)} />
            <Field label="Author Name *" value={article.authorName} onChange={(v) => updateArticle("authorName", v)} />
            <Field label="Author URL" value={article.authorUrl} onChange={(v) => updateArticle("authorUrl", v)} placeholder="https://" />
            <Field label="Publisher Name" value={article.publisherName} onChange={(v) => updateArticle("publisherName", v)} />
            <Field label="Publisher Logo URL" value={article.publisherLogoUrl} onChange={(v) => updateArticle("publisherLogoUrl", v)} placeholder="https://" />
            <Field label="Date Published *" value={article.datePublished} onChange={(v) => updateArticle("datePublished", v)} type="date" />
            <Field label="Date Modified" value={article.dateModified} onChange={(v) => updateArticle("dateModified", v)} type="date" />
            <Field label="Image URL" value={article.imageUrl} onChange={(v) => updateArticle("imageUrl", v)} placeholder="https://" />
            <div className="sm:col-span-2"><Field label="Description" value={article.description} onChange={(v) => updateArticle("description", v)} multiline /></div>
          </div>
        );
      case "FAQ":
        return (
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className="rounded-lg p-3 space-y-2" style={{ border: "1px solid var(--kami-border)", background: "var(--kami-surface-solid)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Question {i + 1}</span>
                  {faqItems.length > 1 && (
                    <button onClick={() => setFaqItems((prev) => prev.filter((_, j) => j !== i))} className="kc-segment-btn" style={{ minHeight: 32 }}>Remove</button>
                  )}
                </div>
                <Field label="Question" value={item.question} onChange={(v) => setFaqItems((prev) => prev.map((it, j) => j === i ? { ...it, question: v } : it))} />
                <Field label="Answer" value={item.answer} onChange={(v) => setFaqItems((prev) => prev.map((it, j) => j === i ? { ...it, answer: v } : it))} multiline />
              </div>
            ))}
            <button onClick={() => setFaqItems((prev) => [...prev, { question: "", answer: "" }])} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Add Question</button>
          </div>
        );
      case "HowTo":
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name *" value={howTo.name} onChange={(v) => updateHowTo("name", v)} />
              <Field label="Total Time (ISO)" value={howTo.totalTime} onChange={(v) => updateHowTo("totalTime", v)} placeholder="PT1H30M" />
            </div>
            <Field label="Description" value={howTo.description} onChange={(v) => updateHowTo("description", v)} multiline />
            {howToSteps.map((step, i) => (
              <div key={i} className="rounded-lg p-3 space-y-2" style={{ border: "1px solid var(--kami-border)", background: "var(--kami-surface-solid)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Step {i + 1}</span>
                  {howToSteps.length > 1 && (
                    <button onClick={() => setHowToSteps((prev) => prev.filter((_, j) => j !== i))} className="kc-segment-btn" style={{ minHeight: 32 }}>Remove</button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" value={step.name} onChange={(v) => setHowToSteps((prev) => prev.map((s, j) => j === i ? { ...s, name: v } : s))} />
                  <Field label="Image URL" value={step.image} onChange={(v) => setHowToSteps((prev) => prev.map((s, j) => j === i ? { ...s, image: v } : s))} placeholder="https://" />
                </div>
                <Field label="Text *" value={step.text} onChange={(v) => setHowToSteps((prev) => prev.map((s, j) => j === i ? { ...s, text: v } : s))} multiline />
              </div>
            ))}
            <button onClick={() => setHowToSteps((prev) => [...prev, { name: "", text: "", image: "" }])} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Add Step</button>
          </div>
        );
      case "Product":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *" value={product.name} onChange={(v) => updateProduct("name", v)} />
            <Field label="Brand" value={product.brand} onChange={(v) => updateProduct("brand", v)} />
            <Field label="SKU" value={product.sku} onChange={(v) => updateProduct("sku", v)} />
            <Field label="Image URL" value={product.image} onChange={(v) => updateProduct("image", v)} placeholder="https://" />
            <Field label="Price" value={product.price} onChange={(v) => updateProduct("price", v)} placeholder="29.99" />
            <SelectField label="Currency" value={product.currency} onChange={(v) => updateProduct("currency", v)} options={CURRENCIES} />
            <SelectField label="Availability" value={product.availability} onChange={(v) => updateProduct("availability", v)} options={AVAILABILITIES} />
            <Field label="Review Rating (1-5)" value={product.reviewRating} onChange={(v) => updateProduct("reviewRating", v)} placeholder="4.5" />
            <Field label="Review Count" value={product.reviewCount} onChange={(v) => updateProduct("reviewCount", v)} placeholder="120" />
            <div className="sm:col-span-2"><Field label="Description" value={product.description} onChange={(v) => updateProduct("description", v)} multiline /></div>
          </div>
        );
      case "LocalBusiness":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business Name *" value={localBusiness.name} onChange={(v) => updateLocalBusiness("name", v)} />
            <SelectField label="Business Type *" value={localBusiness.type} onChange={(v) => updateLocalBusiness("type", v)} options={BUSINESS_TYPES} />
            <Field label="Street Address" value={localBusiness.street} onChange={(v) => updateLocalBusiness("street", v)} />
            <Field label="City" value={localBusiness.city} onChange={(v) => updateLocalBusiness("city", v)} />
            <Field label="State / Region" value={localBusiness.state} onChange={(v) => updateLocalBusiness("state", v)} />
            <Field label="ZIP / Postal" value={localBusiness.zip} onChange={(v) => updateLocalBusiness("zip", v)} />
            <Field label="Country" value={localBusiness.country} onChange={(v) => updateLocalBusiness("country", v)} />
            <Field label="Phone" value={localBusiness.phone} onChange={(v) => updateLocalBusiness("phone", v)} placeholder="+1-555-..." />
            <Field label="URL" value={localBusiness.url} onChange={(v) => updateLocalBusiness("url", v)} placeholder="https://" />
            <Field label="Image URL" value={localBusiness.image} onChange={(v) => updateLocalBusiness("image", v)} placeholder="https://" />
            <Field label="Price Range" value={localBusiness.priceRange} onChange={(v) => updateLocalBusiness("priceRange", v)} placeholder="$$" />
            <div className="sm:col-span-2">
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--kami-text-muted)" }}>Opening Hours</span>
              <div className="space-y-2">
                {localBusiness.openingHours.map((entry, i) => (
                  <div key={entry.day} className="flex items-center gap-3">
                    <span className="w-20 text-sm shrink-0" style={{ color: "var(--kami-text)" }}>{entry.day.slice(0, 3)}</span>
                    <input type="time" value={entry.opens} onChange={(e) => setLocalBusiness((prev) => ({
                      ...prev, openingHours: prev.openingHours.map((h, j) => j === i ? { ...h, opens: e.target.value } : h)
                    }))} className="px-2 py-1.5 text-sm focus:outline-none" style={inputStyle} />
                    <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>to</span>
                    <input type="time" value={entry.closes} onChange={(e) => setLocalBusiness((prev) => ({
                      ...prev, openingHours: prev.openingHours.map((h, j) => j === i ? { ...h, closes: e.target.value } : h)
                    }))} className="px-2 py-1.5 text-sm focus:outline-none" style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "Organization":
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name *" value={organization.name} onChange={(v) => updateOrganization("name", v)} />
              <Field label="URL" value={organization.url} onChange={(v) => updateOrganization("url", v)} placeholder="https://" />
              <Field label="Logo URL" value={organization.logo} onChange={(v) => updateOrganization("logo", v)} placeholder="https://" />
            </div>
            <Field label="Description" value={organization.description} onChange={(v) => updateOrganization("description", v)} multiline />
            <div className="space-y-2">
              <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Social links (sameAs)</span>
              {socialLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1">
                    <Field label={`Link ${i + 1}`} value={link} onChange={(v) => setSocialLinks((prev) => prev.map((l, j) => j === i ? v : l))} placeholder="https://" />
                  </div>
                  {socialLinks.length > 1 && (
                    <button onClick={() => setSocialLinks((prev) => prev.filter((_, j) => j !== i))} className="kc-segment-btn self-end" style={{ minHeight: 36 }}>Remove</button>
                  )}
                </div>
              ))}
              <button onClick={() => setSocialLinks((prev) => [...prev, ""])} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Add Link</button>
            </div>
          </div>
        );
      case "Breadcrumb":
        return (
          <div className="space-y-3">
            {breadcrumbItems.map((item, i) => (
              <div key={i} className="rounded-lg p-3 space-y-2" style={{ border: "1px solid var(--kami-border)", background: "var(--kami-surface-solid)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Item {i + 1}</span>
                  {breadcrumbItems.length > 2 && (
                    <button onClick={() => setBreadcrumbItems((prev) => prev.filter((_, j) => j !== i))} className="kc-segment-btn" style={{ minHeight: 32 }}>Remove</button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name *" value={item.name} onChange={(v) => setBreadcrumbItems((prev) => prev.map((it, j) => j === i ? { ...it, name: v } : it))} placeholder="Home" />
                  <Field label="URL" value={item.url} onChange={(v) => setBreadcrumbItems((prev) => prev.map((it, j) => j === i ? { ...it, url: v } : it))} placeholder="https://" />
                </div>
              </div>
            ))}
            <button onClick={() => setBreadcrumbItems((prev) => [...prev, { name: "", url: "" }])} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Add Item</button>
          </div>
        );
      case "Event":
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Event Name *" value={event.name} onChange={(v) => updateEvent("name", v)} />
              <Field label="URL" value={event.url} onChange={(v) => updateEvent("url", v)} placeholder="https://" />
              <Field label="Start Date *" value={event.startDate} onChange={(v) => updateEvent("startDate", v)} type="datetime-local" />
              <Field label="End Date" value={event.endDate} onChange={(v) => updateEvent("endDate", v)} type="datetime-local" />
              <Field label="Location Name *" value={event.locationName} onChange={(v) => updateEvent("locationName", v)} />
              <Field label="Location Address" value={event.locationAddress} onChange={(v) => updateEvent("locationAddress", v)} />
              <Field label="Image URL" value={event.image} onChange={(v) => updateEvent("image", v)} placeholder="https://" />
              <Field label="Organizer" value={event.organizerName} onChange={(v) => updateEvent("organizerName", v)} />
            </div>
            <Field label="Description" value={event.description} onChange={(v) => updateEvent("description", v)} multiline />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ticket Price" value={event.offerPrice} onChange={(v) => updateEvent("offerPrice", v)} placeholder="99.00" />
              <SelectField label="Currency" value={event.offerCurrency} onChange={(v) => updateEvent("offerCurrency", v)} options={CURRENCIES} />
              <SelectField label="Availability" value={event.offerAvailability} onChange={(v) => updateEvent("offerAvailability", v)} options={EVENT_AVAILABILITIES} />
              <Field label="Ticket URL" value={event.offerUrl} onChange={(v) => updateEvent("offerUrl", v)} placeholder="https://" />
            </div>
          </div>
        );
      case "Recipe":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *" value={recipe.name} onChange={(v) => updateRecipe("name", v)} />
            <Field label="Author" value={recipe.authorName} onChange={(v) => updateRecipe("authorName", v)} />
            <Field label="Prep Time (ISO)" value={recipe.prepTime} onChange={(v) => updateRecipe("prepTime", v)} placeholder="PT15M" />
            <Field label="Cook Time (ISO)" value={recipe.cookTime} onChange={(v) => updateRecipe("cookTime", v)} placeholder="PT30M" />
            <Field label="Yield" value={recipe.recipeYield} onChange={(v) => updateRecipe("recipeYield", v)} placeholder="4 servings" />
            <Field label="Image URL" value={recipe.image} onChange={(v) => updateRecipe("image", v)} placeholder="https://" />
            <div className="sm:col-span-2"><Field label="Description" value={recipe.description} onChange={(v) => updateRecipe("description", v)} multiline /></div>
            <div className="sm:col-span-2"><Field label="Ingredients * (one per line)" value={recipe.ingredients} onChange={(v) => updateRecipe("ingredients", v)} multiline /></div>
            <div className="sm:col-span-2"><Field label="Instructions * (one per line)" value={recipe.instructions} onChange={(v) => updateRecipe("instructions", v)} multiline /></div>
          </div>
        );
      case "Person":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name *" value={person.name} onChange={(v) => updatePerson("name", v)} />
            <Field label="Job Title" value={person.jobTitle} onChange={(v) => updatePerson("jobTitle", v)} />
            <Field label="URL" value={person.url} onChange={(v) => updatePerson("url", v)} placeholder="https://" />
            <Field label="Image" value={person.image} onChange={(v) => updatePerson("image", v)} placeholder="https://" />
            <Field label="Email" value={person.email} onChange={(v) => updatePerson("email", v)} />
            <div className="sm:col-span-2"><Field label="Description" value={person.description} onChange={(v) => updatePerson("description", v)} multiline /></div>
            <div className="sm:col-span-2"><Field label="Profile URLs (one per line)" value={person.sameAs} onChange={(v) => updatePerson("sameAs", v)} multiline placeholder="https://twitter.com/..." /></div>
          </div>
        );
    }
  }

  const errors = validation.filter((v) => v.level === "error").length;

  const controls = (
    <>
      <ControlGroup label="Schema type">
        <div className="grid grid-cols-2 gap-2">
          {SCHEMA_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSchemaType(t.value)}
              data-active={schemaType === t.value}
              className="kc-segment-btn"
              style={{ minHeight: 40 }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </ControlGroup>
      <ControlGroup label="Validation">
        <div className="space-y-1.5">
          {validation.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: 999,
                  background: msg.level === "error" ? "#ef4444" : msg.level === "warning" ? "#f59e0b" : "#22c55e",
                  marginTop: 5, flexShrink: 0,
                }}
              />
              <span style={{ color: msg.level === "error" ? "#ef4444" : msg.level === "warning" ? "#f59e0b" : "#22c55e" }}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
      </ControlGroup>
      <ControlGroup label="Rich Results">
        <a
          href="https://search.google.com/test/rich-results"
          target="_blank" rel="noreferrer"
          className="kc-segment-btn block text-center"
          style={{ minHeight: 40, textDecoration: "none" }}
        >
          Open Google Rich Results Test ↗
        </a>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleFillExample}>Example</ToolActionButton>
      <ToolActionButton variant="outline" onClick={handleClear}>Reset</ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy} disabled={errors > 0}>
        {copied ? "Copied" : "Copy JSON-LD"}
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
      <p>Pick a schema type, fill the fields, and copy a valid JSON-LD <code>&lt;script&gt;</code> block for your page&apos;s <code>&lt;head&gt;</code>.</p>
      <p>Test the output with Google&apos;s Rich Results Test. A page can include multiple schema types.</p>
      <p>FAQ rich results currently only display on a small number of trusted sites — they&apos;re still valid markup either way.</p>
    </div>
  );

  return (
    <ToolShell
      title="Schema Generator"
      tagline="Article · Product · FAQ · How-To · Recipe · LocalBusiness · Event · Person · Org · Breadcrumb"
      accent={ACCENT}
      materialFab={{ label: "Copy JSON-LD", onClick: handleCopy }}
      actions={actions}
      controls={controls}
      info={info}
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Form</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>JSON-LD</button>
        </nav>
      )}
      <div className="flex flex-col gap-5 p-4 md:p-6">
        {(!isMetro || metroCPivot === "input") && (
          <div className={isGlass ? "glass-canvas-section" : ""}><div
            className="rounded-xl p-4"
            style={{
              border: "1px solid var(--kami-border)",
              background: "var(--kami-surface)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            {renderForm()}
          </div></div>
        )}

        {(!isMetro || metroCPivot === "output") && (
          <div className={isGlass ? "glass-canvas-section" : ""}><div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide" style={{ color: ACCENT }}>JSON-LD output</span>
              <span className="text-xs" style={{ color: errors > 0 ? "#ef4444" : "#22c55e" }}>
                {errors > 0 ? `${errors} error${errors === 1 ? "" : "s"}` : "Valid"}
              </span>
            </div>
            <pre
              className="overflow-auto whitespace-pre rounded-xl p-4 text-xs font-mono max-h-[500px]"
              style={{
                background: "var(--kami-overlay-bg)",
                color: "var(--kami-overlay-text)",
                border: "1px solid var(--kami-border-strong)",
              }}
            >
              <span style={{ opacity: 0.6 }}>&lt;script type=&quot;application/ld+json&quot;&gt;</span>
              {"\n"}
              {jsonLd}
              {"\n"}
              <span style={{ opacity: 0.6 }}>&lt;/script&gt;</span>
            </pre>
          </div></div>
        )}
      </div>
    </ToolShell>
  );
}
