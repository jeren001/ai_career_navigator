# Job & Internship Finder provider integration plan

Research checked November 26, 2026. Start with USAJOBS and selected employer job boards once their publication terms are confirmed. Offer links to official employment portals in mainland China, Europe, and Canada from launch. Keep those links available even when vacancy feeds return no matches. Every displayed vacancy must come from an authorized feed and link back to its official announcement or application page. This plan adds no paid dependencies.

## Vacancy feeds

| Provider | Coverage and early-career support | Access and documented limits |
| --- | --- | --- |
| USAJOBS, U.S. Office of Personnel Management | U.S. federal jobs, including some overseas duty stations. Use the documented student and recent-graduate hiring paths, and honor eligibility on each announcement. Validate which hiring-path results are available to the ordinary public key. [Students](https://www.usajobs.gov/hiringpath/students/) · [Recent graduates](https://www.usajobs.gov/hiringpath/recentgraduates/) | Request an API key. Send it as `Authorization-Key` and send the registered email as `User-Agent` to `GET https://data.usajobs.gov/api/Search`. Public Search documents up to **500 records per page** and **10,000 per query**. A timed Search quota and access fee were not published in the cited guides. Keep the integration within the public search scope. [Search](https://developer.usajobs.gov/api-reference/get-api-search) · [Authentication](https://developer.usajobs.gov/guides/authentication) · [Rate limits](https://developer.usajobs.gov/guides/rate-limiting) · [Terms](https://developer.usajobs.gov/guides/terms-of-service) |
| Greenhouse Job Board API | Published listings from each selected employer. Country coverage depends on the locations that employer publishes. Identify internships, graduate programs, and junior roles from explicit listing text or employer metadata. [Job Board API](https://docs.greenhouse.io/job-board.html) | Public GET uses the board token and requires no API key. Use `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`. The GET documentation publishes no numeric quota. Confirm permitted reuse before enabling each board and poll conservatively. [Job Board API](https://docs.greenhouse.io/job-board.html) |
| Lever Postings API | Same employer-by-employer approach, with locations and workplace types where provided. Early-career coverage depends on each employer's postings. [Postings API](https://github.com/lever/postings-api) | Public published postings use `GET https://api.lever.co/v0/postings/{site}?mode=json` or the documented EU host for the employer. The public listing interface requires the site name and publishes no numeric GET quota. Confirm permitted reuse before enabling each site. [Postings API](https://github.com/lever/postings-api) |
| Adzuna | Multicountry commercial aggregator. Great Britain is shown in the API documentation. Adzuna reports 20 consumer markets, and each intended API country requires a separate coverage and rights check. Mainland China API coverage was unverified. Search local-language terms for internships, graduate programs, and entry-level work, and check the listing text before classifying. [Developer overview](https://developer.adzuna.com/overview) · [Consumer market announcement](https://www.adzuna.com/blog/adzuna-is-live-across-20-countries-globally/) | Register for an evaluation `app_id` and `app_key` for `GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}`. Current terms put quotas in the account and describe a **14-day evaluation** for commercial, government, and academic users. Keep production disabled unless Adzuna confirms no-cost terms that cover the product's distribution, attribution, and retention. [Search](https://developer.adzuna.com/docs/search) · [Terms](https://developer.adzuna.com/docs/terms_of_service) |
| La bonne alternance, French public employment service | France. Dedicated apprenticeship search. Map listings to apprenticeships and exclude the separate potential-employer results, which carry no advertised vacancy. General internships and entry-level search need other sources. [Dataset](https://api.apprentissage.beta.gouv.fr/en/explorer/recherche-offre) | Request an API key. Access is free for eligible non-profit use. Confirm the production key's request budget and redistribution terms before enabling. No numeric request budget was verified. [Technical documentation](https://api.apprentissage.beta.gouv.fr/en/documentation-technique/try) |

## Official portal links

Portal cards open official search pages. Keep them separate from vacancy counts, filters, and matched results.

| Platform | Coverage and early-career options | Access decision |
| --- | --- | --- |
| 国家大学生就业服务平台 (National College Student Employment Service Platform, 24365) | Mainland China. Dedicated internship listings, campus recruiting, and graduate opportunities. Some student actions require a 学信 account. [Platform](https://www.ncss.cn/) · [Internships](https://www.ncss.cn/student/jobs/internindex.html) | The Ministry of Education guide documents an inbound posting interface for authorized provincial and university platforms. A public outbound vacancy API, read quota, and redistribution licence were unverified. Use links while seeking written approval for outbound access. [Institution and student guide](https://ycu.ncss.cn/ncss/jydt/yw/202410/20241024/2293344400.html) |
| 中国公共招聘网 and 就业在线 | Mainland China. Public employment search and graduate recruiting events. Verify location and eligibility on the source. [State Council employment services](https://app.www.gov.cn/govdata/gov/202104/13/470331/article.html) · [Graduate recruitment guidance](https://app.www.gov.cn/govdata/gov/202403/25/513295/article.html) | Link to the official destinations listed by the government. A self-service third-party read interface, free quota, and republication rights were unverified. |
| EURES | EU/EEA and Switzerland. Traineeship and apprenticeship availability depends on participating national services and the vacancy. [Portal](https://eures.europa.eu/index_en) · [Employer posting guidance](https://eures.europa.eu/employers/advertise-job_en) | Public portal and a member/partner vacancy exchange. A public self-service vacancy feed and quota for this product were unverified. Use portal links pending partner access. [EURES support](https://eures.europa.eu/eures-services/help-and-support_en) |
| Government of Canada Job Bank | Canada. Use the youth and international candidate pages to surface student and early-career opportunities. Individual listings state whether international candidates can apply. [Youth](https://www.jobbank.gc.ca/youth) · [Foreign candidates](https://www.jobbank.gc.ca/foreign-candidates) | Public portal. A self-service vacancy API, free quota, and reuse terms for this product were unverified. |
| France Travail | France. Official general employment portal. Keep the portal available for searches outside the dedicated apprenticeship feed. [Portal](https://www.francetravail.fr/) | The government catalog says the former general vacancy API is no longer exposed on francetravail.io while distribution and reuse are reviewed. Reassess once a replacement and its access terms are published. [Government API catalog](https://www.data.gouv.fr/dataservices/api-offres-demploi) |

## Unified job contract

The following is an application-level contract for future adapters. Use `career_roles.slug` to reference an active catalog role. Validate the reference at mapping time. Existing `tags` and `market_pulse` metadata can help suggest matches. Keep verified listing facts separate from inferred matches.

```ts
type Evidence = "source_structured" | "source_text" | "inferred"
type Workplace = "onsite" | "hybrid" | "remote" | "unknown"
type CareerStage = "entry" | "mid" | "senior" | "unknown"
type Engagement =
  | "internship" | "apprenticeship" | "traineeship" | "graduate_program"
  | "regular" | "contract" | "unknown"

interface JobPosting {
  id: string                      // Stable namespaced source ID
  source: {
    provider: string
    scope: string                 // Country feed, employer board, or public agency
    externalId: string
    announcementUrl: string
    attribution: string | null
    fetchedAt: string             // UTC timestamp
    lastConfirmedAt: string       // Latest observation of this exact posting
  }
  title: string
  employer: string | null
  descriptionText: string | null  // Subject to provider display and retention rights
  listingLanguage: string | null  // BCP 47 tag for the original listing text
  applyUrl: string | null         // Use source announcement when unavailable
  dates: {
    postedAt: string | null
    updatedAt: string | null
    closesAt: string | null
  }
  status: "active" | "closed" | "unknown"
  locations: Array<{
    countryCode: string | null    // ISO 3166-1 alpha-2
    region: string | null
    city: string | null
    originalLabel: string | null
  }>
  workplace: Workplace
  remoteEligibility: {
    scope: "anywhere" | "listed_countries" | "restricted" | "unknown"
    countryCodes: string[]
    note: string | null           // E.g. documented regional or time-zone restriction
  }
  engagement: Engagement
  schedule: "full_time" | "part_time" | "variable" | "unknown"
  careerStage: CareerStage
  experience: {
    minimumYears: number | null
    maximumYears: number | null
    evidence: Evidence | null
  }
  workingLanguages: Array<{
    tag: string                  // BCP 47
    requirement: "required" | "preferred" | "unspecified"
    level: string | null
    evidence: Evidence
  }>
  skills: Array<{
    label: string
    normalizedKey: string
    requirement: "required" | "preferred" | "unspecified"
    evidence: Evidence
  }>
  careerMatches: Array<{ careerSlug: string, evidence: Evidence }>
  eligibility: {
    audience: Array<"student" | "recent_graduate" | "public" | "other">
    workAuthorizationText: string | null
    sponsorship: "offered" | "unavailable" | "unknown"
  }
}
```

- **Mapping.** Map the USAJOBS position identifier, title, duty locations, announcement URI and application URI to their corresponding fields. Map Greenhouse's board and job ID to the scoped identifier and its `absolute_url` to the announcement. Keep Greenhouse's update timestamp separate from posting time. Keep source date-only values as dates and reserve UTC timestamps for values with known time zones. Missing values remain `null`, empty arrays, or `unknown` according to the contract.
- **Matching.** Normalize bilingual occupation titles and skill aliases locally. Use explicit skill mentions, occupation aliases, and text-supported duties to rank catalog matches. Broad career fields can expand search, while specific slugs and skill matches contribute to ranking. Preserve required versus preferred skills, and use inferred matches only for ranking. Ambiguous titles can map to several careers.
- **Filters.** Support career slug or field, country/region/city, workplace mode, skills, engagement, career stage, years of experience, listing language, and working language. Strict filters require evidence. Provide a separate opt-in to include unknowns. A remote role matches a candidate country only when the source explicitly allows that country or unrestricted remote work. Treat 实习 as internship when evidenced, 校招 and 应届毕业生 as audience or program context, and 就业见习 as a potential traineeship. Keep UI locale (`en`, `zh-CN`), listing language, and working-language requirements independent. Citizenship, sponsorship, seniority, and experience stay unknown when the listing does not specify them.
- **Deduplication.** Upsert on provider, scope, and external ID. Group cross-provider copies using a common employer requisition ID or canonical announcement URL where available, then retain the most authoritative original and required attribution. Title, employer, and city alone justify a possible-duplicate flag. Apply links retain required tracking and source parameters.
- **Freshness.** Hide confirmed closures and postings past a reliable close timestamp. Treat disappearance as evidence only after a successful, complete sync where the provider supports full snapshots. Mark availability unknown after the freshness window on failed or partial syncs, and hide records once retention or freshness policy requires. Return provider availability, data freshness, and pagination separately from the result count.

## Implementation and release checks

1. Record allowed markets, authentication, quotas, eligible uses, attribution, field display and storage rights, expiry, and contact for every provider. Keep server-side credentials and a per-provider kill switch. For a mainland China feed, obtain written read and redistribution permission and review applicable data handling and hosting requirements before exchanging records.
2. Pilot the USAJOBS adapter and selected employer boards with permission. Fetch server-side with bounded timeouts, cache within provider terms, respect `Retry-After`, and cap requests below the approved budget. Send only search criteria to upstream providers. Keep assessment data, account details, and resumes local. Render descriptions as sanitized text and validate application links.
3. Check actual access before launch with authorized live results, alongside contract tests derived from official schemas. Verify pagination, 401/403, 429, outages, partial responses, closed listings, duplicate IDs, and truncated search results. Verify country filters, Chinese search terms, student and graduate tags, and unknown working languages and remote eligibility. Confirm permitted attribution and retention with each provider.
4. Present official portal links alongside empty or partial results. Show unsupported coverage and temporary provider failures separately. Validate the whole path from candidate filters to an official application link in English and Simplified Chinese. Provider credentials and authenticated coverage checks are still pending.
