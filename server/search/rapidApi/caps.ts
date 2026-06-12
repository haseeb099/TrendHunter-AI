import { ENV } from "../../_core/env";

export type RapidApiProviderId =
  | "rapidapi_amazon"
  | "rapidapi_product_search"
  | "rapidapi_google_search"
  | "rapidapi_etsy"
  | "rapidapi_pangolinfo"
  | "rapidapi_lazada"
  | "rapidapi_taobao"
  | "rapidapi_alibaba"
  | "rapidapi_ebay_data"
  | "rapidapi_axesso_walmart"
  | "rapidapi_ali_express"
  | "rapidapi_aliexpress_datahub"
  | "rapidapi_web_search"
  | "rapidapi_news_data"
  | "rapidapi_news_api";

export type RapidApiProviderConfig = {
  id: RapidApiProviderId;
  host: string;
  monthlyCap: number;
  /** When set, also enforces per-UTC-day cap (resets midnight UTC). */
  dailyCap?: number;
  enabled: boolean;
  ingestOnly: boolean;
  label: string;
};

export function isRapidApiConfigured(): boolean {
  return Boolean(ENV.rapidApiKey) && ENV.rapidApiEnabled;
}

export function getRapidApiProviderConfigs(): RapidApiProviderConfig[] {
  if (!isRapidApiConfigured()) return [];

  const configs: RapidApiProviderConfig[] = [
    {
      id: "rapidapi_amazon",
      host: ENV.rapidApiAmazonHost,
      monthlyCap: ENV.rapidApiAmazonMonthlyCap,
      enabled: ENV.rapidApiAmazonEnabled,
      ingestOnly: true,
      label: "Real-Time Amazon Data",
    },
    {
      id: "rapidapi_product_search",
      host: ENV.rapidApiProductSearchHost,
      monthlyCap: ENV.rapidApiProductSearchMonthlyCap,
      enabled: ENV.rapidApiProductSearchEnabled,
      ingestOnly: true,
      label: "Real-Time Product Search",
    },
    {
      id: "rapidapi_google_search",
      host: ENV.rapidApiGoogleSearchHost,
      monthlyCap: ENV.rapidApiGoogleSearchMonthlyCap,
      enabled: ENV.rapidApiGoogleSearchEnabled,
      ingestOnly: true,
      label: "Google Search (RapidAPI)",
    },
    {
      id: "rapidapi_etsy",
      host: ENV.rapidApiEtsyHost,
      monthlyCap: ENV.rapidApiEtsyMonthlyCap,
      enabled: ENV.rapidApiEtsyEnabled,
      ingestOnly: true,
      label: "Etsy API",
    },
    {
      id: "rapidapi_pangolinfo",
      host: ENV.rapidApiPangolinfoHost,
      monthlyCap: ENV.rapidApiPangolinfoMonthlyCap,
      enabled: ENV.rapidApiPangolinfoEnabled,
      ingestOnly: true,
      label: "Pangolinfo Amazon Scraper",
    },
    {
      id: "rapidapi_lazada",
      host: ENV.rapidApiLazadaHost,
      monthlyCap: ENV.rapidApiLazadaMonthlyCap,
      enabled: ENV.rapidApiLazadaEnabled,
      ingestOnly: true,
      label: "Lazada DataHub",
    },
    {
      id: "rapidapi_taobao",
      host: ENV.rapidApiTaobaoHost,
      monthlyCap: ENV.rapidApiTaobaoMonthlyCap,
      enabled: ENV.rapidApiTaobaoEnabled,
      ingestOnly: true,
      label: "Taobao DataHub",
    },
    {
      id: "rapidapi_alibaba",
      host: ENV.rapidApiAlibabaHost,
      monthlyCap: ENV.rapidApiAlibabaMonthlyCap,
      enabled: ENV.rapidApiAlibabaEnabled,
      ingestOnly: true,
      label: "Alibaba API",
    },
    {
      id: "rapidapi_ebay_data",
      host: ENV.rapidApiEbayDataHost,
      monthlyCap: ENV.rapidApiEbayDataMonthlyCap,
      enabled: ENV.rapidApiEbayDataEnabled,
      ingestOnly: true,
      label: "eBay Data API",
    },
    {
      id: "rapidapi_axesso_walmart",
      host: ENV.rapidApiAxessoWalmartHost,
      monthlyCap: ENV.rapidApiAxessoWalmartMonthlyCap,
      enabled: ENV.rapidApiAxessoWalmartEnabled,
      ingestOnly: true,
      label: "Axesso Walmart",
    },
    {
      id: "rapidapi_ali_express",
      host: ENV.rapidApiAliExpressHost,
      monthlyCap: ENV.rapidApiAliExpressMonthlyCap,
      dailyCap: ENV.rapidApiAliExpressDailyCap,
      enabled: ENV.rapidApiAliExpressEnabled,
      ingestOnly: true,
      label: "Ali Express Scraper",
    },
    {
      id: "rapidapi_aliexpress_datahub",
      host: ENV.rapidApiAliexpressDatahubHost,
      monthlyCap: ENV.rapidApiAliexpressDatahubMonthlyCap,
      enabled: ENV.rapidApiAliexpressDatahubEnabled,
      ingestOnly: true,
      label: "AliExpress DataHub",
    },
    {
      id: "rapidapi_web_search",
      host: ENV.rapidApiWebSearchHost,
      monthlyCap: ENV.rapidApiWebSearchMonthlyCap,
      enabled: ENV.rapidApiWebSearchEnabled,
      ingestOnly: true,
      label: "Real-Time Web Search",
    },
    {
      id: "rapidapi_news_data",
      host: ENV.rapidApiNewsDataHost,
      monthlyCap: ENV.rapidApiNewsDataMonthlyCap,
      enabled: ENV.rapidApiNewsDataEnabled,
      ingestOnly: true,
      label: "Real-Time News Data",
    },
    {
      id: "rapidapi_news_api",
      host: ENV.rapidApiNewsApiHost,
      monthlyCap: ENV.rapidApiNewsApiMonthlyCap,
      enabled: ENV.rapidApiNewsApiEnabled,
      ingestOnly: true,
      label: "News API",
    },
  ];
  return configs.filter((p) => p.enabled);
}

export function getRapidApiProviderConfig(
  id: RapidApiProviderId
): RapidApiProviderConfig | undefined {
  return getRapidApiProviderConfigs().find((p) => p.id === id);
}
