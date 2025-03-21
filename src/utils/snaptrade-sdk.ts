import { Snaptrade } from "snaptrade-typescript-sdk";

// Initialize the SnapTrade SDK with environment variables
let snaptrade: Snaptrade | null = null;

// Initialize the SDK only on the server side
if (typeof window === "undefined") {
  const clientId = process.env.NEXT_PUBLIC_SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.NEXT_PUBLIC_SNAPTRADE_CONSUMER_KEY;

  if (!clientId || !consumerKey) {
    console.error("SnapTrade API credentials not configured");
  } else {
    try {
      console.log("Initializing SnapTrade SDK");
      snaptrade = new Snaptrade({
        clientId,
        consumerKey,
        // Add additional configuration to ensure proper handling
        apiUrl: "https://api.snaptrade.com/api/v1",
      });
      console.log("SnapTrade SDK initialized successfully");
    } catch (error) {
      console.error("Error initializing SnapTrade SDK:", error);
    }
  }
}

// List of officially supported SnapTrade brokers
// Note: Only include brokers that are confirmed to work with the SnapTrade API
export const SUPPORTED_BROKERS = [
  "ALPACA",
  "FIDELITY",
  "QUESTRADE",
  "ROBINHOOD",
  "TRADIER",
  "TRADESTATION",
  "VANGUARD",
  "SCHWAB",
  // Interactive Brokers is handled specially and doesn't need to be in this list
];

// Mapping from display IDs to SnapTrade broker IDs
export const BROKER_ID_MAPPING: Record<string, string> = {
  alpaca: "ALPACA",
  fidelity: "FIDELITY",
  ibkr: null, // Interactive Brokers mapping - set to null to omit broker parameter
  interactive_brokers: null, // Alternative mapping - set to null to omit broker parameter
  questrade: "QUESTRADE",
  robinhood: "ROBINHOOD",
  tradier: "TRADIER",
  tradestation: "TRADESTATION",
  vanguard: "VANGUARD",
  schwab: "SCHWAB", // Added Schwab support
};

// Mapping for common broker ID variations to standardized SnapTrade broker IDs
export const BROKER_ID_STANDARDIZATION: Record<string, string> = {
  INTERACTIVE_BROKERS: "IBKR",
};

export { snaptrade };
