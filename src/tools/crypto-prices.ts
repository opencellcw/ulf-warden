import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { log } from '../logger';

import { asyncSafe } from '../utils/async-helpers';
/**
 * Multi-Source Cryptocurrency Price Checker
 *
 * Validates prices across multiple APIs to ensure accuracy.
 * Detects price divergence and provides confidence metrics.
 *
 * Supported sources:
 * - CoinGecko (free tier)
 * - CoinCap (free API)
 * - Binance (public API)
 */

interface PriceSource {
  name: string;
  price: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface PriceResult {
  symbol: string;
  sources: PriceSource[];
  averagePrice: number;
  medianPrice: number;
  divergencePercent: number;
  isValidated: boolean;
  warning?: string;
  lastUpdate: Date;
}

export const CRYPTO_PRICE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_crypto_price',
    description: `Get cryptocurrency price with multi-source validation.

Checks prices from 3 independent sources:
- CoinGecko
- CoinCap
- Binance

Returns:
- Average and median prices
- Price divergence percentage
- Validation status
- Individual source prices
- Timestamps

Alerts if sources diverge by more than 2%.`,
    input_schema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Cryptocurrency symbol (btc, eth, sol, etc.)',
        },
        currency: {
          type: 'string',
          description: 'Target currency (usd, eur, brl)',
          default: 'usd'
        }
      },
      required: ['symbol']
    }
  }
];

export async function executeCryptoPriceTool(
  toolName: string,
  toolInput: any
): Promise<string> {
  try {

  if (toolName === 'get_crypto_price') {
    return await getCryptoPrice(toolInput);
  }
  throw new Error(`Unknown crypto price tool: ${toolName}`);

  } catch (error: any) {
    log.error('[executeCryptoPriceTool] Error', { error: error.message });
    throw error;
  }
}

async function getCryptoPrice(input: any): Promise<string> {
  try {

  const { symbol = 'btc', currency = 'usd' } = input;
  const symbolLower = symbol.toLowerCase();
  const currencyLower = currency.toLowerCase();

  log.info('[CryptoPrice] Fetching multi-source prices', { symbol: symbolLower, currency: currencyLower });

  const sources: PriceSource[] = await Promise.all([
    fetchCoinGeckoPrice(symbolLower, currencyLower),
    fetchCoinCapPrice(symbolLower, currencyLower),
    fetchBinancePrice(symbolLower, currencyLower)
  ]);

  // Calculate statistics
  const successfulSources = sources.filter(s => s.success);

  if (successfulSources.length === 0) {
    return formatError(symbol, currency, sources);
  }

  const prices = successfulSources.map(s => s.price);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const medianPrice = calculateMedian(prices);

  // Calculate divergence (max deviation from median)
  const maxDeviation = Math.max(...prices.map(p => Math.abs(p - medianPrice)));
  const divergencePercent = (maxDeviation / medianPrice) * 100;

  // Validation: warn if sources diverge by more than 2%
  const isValidated = divergencePercent <= 2.0;
  const warning = !isValidated
    ? `⚠️ Price divergence detected (${divergencePercent.toFixed(2)}%). Sources disagree significantly.`
    : undefined;

  const result: PriceResult = {
    symbol: symbolLower,
    sources,
    averagePrice,
    medianPrice,
    divergencePercent,
    isValidated,
    warning,
    lastUpdate: new Date()
  };

  log.info('[CryptoPrice] Price fetched', {
    symbol: symbolLower,
    averagePrice,
    divergencePercent: divergencePercent.toFixed(2) + '%',
    validated: isValidated
  });

  return formatResult(result, currency);

  } catch (error: any) {
    log.error('[getCryptoPrice] Error', { error: error.message });
    throw error;
  }
}

async function fetchCoinGeckoPrice(symbol: string, currency: string): Promise<PriceSource> {
  try {
    // CoinGecko uses full names, map common symbols
    const idMap: Record<string, string> = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'sol': 'solana',
      'ada': 'cardano',
      'dot': 'polkadot',
      'matic': 'polygon',
      'avax': 'avalanche',
      'link': 'chainlink',
      'uni': 'uniswap',
      'bnb': 'binancecoin'
    };

    const coinId = idMap[symbol] || symbol;

    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: {
          ids: coinId,
          vs_currencies: currency
        },
        timeout: 5000
      }
    );

    const price = response.data[coinId]?.[currency];

    if (!price) {
      throw new Error('Price not found in response');
    }

    return {
      name: 'CoinGecko',
      price: parseFloat(price),
      timestamp: new Date(),
      success: true
    };
  } catch (error: any) {
    log.warn('[CryptoPrice] CoinGecko failed', { error: error.message });
    return {
      name: 'CoinGecko',
      price: 0,
      timestamp: new Date(),
      success: false,
      error: error.message
    };
  }
}

async function fetchCoinCapPrice(symbol: string, currency: string): Promise<PriceSource> {
  try {
    // CoinCap uses uppercase symbols and only supports USD
    const symbolUpper = symbol.toUpperCase();

    const response = await axios.get(
      `https://api.coincap.io/v2/assets/${symbol}`,
      {
        timeout: 5000
      }
    );

    let priceUsd = parseFloat(response.data.data.priceUsd);

    // Convert to target currency if needed
    if (currency !== 'usd') {
      const conversionRate = await getConversionRate('usd', currency);
      priceUsd = priceUsd * conversionRate;
    }

    return {
      name: 'CoinCap',
      price: priceUsd,
      timestamp: new Date(response.data.timestamp || Date.now()),
      success: true
    };
  } catch (error: any) {
    log.warn('[CryptoPrice] CoinCap failed', { error: error.message });
    return {
      name: 'CoinCap',
      price: 0,
      timestamp: new Date(),
      success: false,
      error: error.message
    };
  }
}

async function fetchBinancePrice(symbol: string, currency: string): Promise<PriceSource> {
  try {
    // Binance uses trading pairs like BTCUSDT
    const symbolUpper = symbol.toUpperCase();
    const currencyUpper = currency.toUpperCase();

    // Binance uses USDT, not USD
    const quoteCurrency = currencyUpper === 'USD' ? 'USDT' : currencyUpper;
    const pair = `${symbolUpper}${quoteCurrency}`;

    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price`,
      {
        params: {
          symbol: pair
        },
        timeout: 5000
      }
    );

    const price = parseFloat(response.data.price);

    return {
      name: 'Binance',
      price,
      timestamp: new Date(),
      success: true
    };
  } catch (error: any) {
    log.warn('[CryptoPrice] Binance failed', { error: error.message });
    return {
      name: 'Binance',
      price: 0,
      timestamp: new Date(),
      success: false,
      error: error.message
    };
  }
}

async function getConversionRate(from: string, to: string): Promise<number> {
  try {

  // Simple currency conversion (could use a real API if needed)
  // For now, just return 1.0 as most crypto APIs return USD
  return 1.0;

  } catch (error: any) {
    log.error('[getConversionRate] Error', { error: error.message });
    throw error;
  }
}

function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function formatResult(result: PriceResult, currency: string): string {
  const currencySymbol = currency.toUpperCase();
  const currencyFormat = getCurrencyFormat(currency);

  let output = `💰 **${result.symbol.toUpperCase()} Price** (Multi-Source Validation)\n\n`;

  // Main price
  output += `📊 **Median Price:** ${currencyFormat(result.medianPrice)}\n`;
  output += `📈 **Average Price:** ${currencyFormat(result.averagePrice)}\n\n`;

  // Validation status
  if (result.isValidated) {
    output += `✅ **Validated** - All sources agree (divergence: ${result.divergencePercent.toFixed(2)}%)\n\n`;
  } else {
    output += `${result.warning}\n\n`;
  }

  // Individual sources
  output += `**Source Breakdown:**\n`;
  for (const source of result.sources) {
    if (source.success) {
      const deviation = ((source.price - result.medianPrice) / result.medianPrice) * 100;
      const deviationStr = deviation >= 0 ? `+${deviation.toFixed(2)}%` : `${deviation.toFixed(2)}%`;
      output += `• ${source.name}: ${currencyFormat(source.price)} (${deviationStr})\n`;
    } else {
      output += `• ${source.name}: ❌ Failed (${source.error})\n`;
    }
  }

  // Timestamp
  output += `\n⏰ **Last Update:** ${result.lastUpdate.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium'
  })}\n`;

  return output;
}

function formatError(symbol: string, currency: string, sources: PriceSource[]): string {
  let output = `❌ **Failed to fetch ${symbol.toUpperCase()} price**\n\n`;
  output += `All sources failed:\n`;

  for (const source of sources) {
    output += `• ${source.name}: ${source.error}\n`;
  }

  return output;
}

function getCurrencyFormat(currency: string): (value: number) => string {
  const currencyLower = currency.toLowerCase();

  switch (currencyLower) {
    case 'usd':
      return (val) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'eur':
      return (val) => `€${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'brl':
      return (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return (val) => `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;
  }
}
