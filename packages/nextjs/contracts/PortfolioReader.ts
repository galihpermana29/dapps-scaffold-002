/**
 * PortfolioReader Contract Interface
 * Generated ABI for batch token balance reading
 */

export const PORTFOLIO_READER_ABI = [
  {
    inputs: [],
    name: "constructor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "get_eth_balance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "get_token_balance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "get_token_decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "get_token_symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "get_token_name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "tokens", type: "address[]" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "batch_get_balances",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "tokens", type: "address[]" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "batch_get_token_info",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "balance", type: "uint256" },
          { internalType: "uint8", name: "decimals", type: "uint8" },
          { internalType: "string", name: "symbol", type: "string" },
          { internalType: "string", name: "name", type: "string" },
        ],
        internalType: "tuple[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "tokens", type: "address[]" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "get_portfolio",
    outputs: [
      { internalType: "uint256", name: "ethBalance", type: "uint256" },
      {
        components: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "balance", type: "uint256" },
          { internalType: "uint8", name: "decimals", type: "uint8" },
          { internalType: "string", name: "symbol", type: "string" },
          { internalType: "string", name: "name", type: "string" },
        ],
        internalType: "tuple[]",
        name: "tokenInfo",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address[]", name: "addresses", type: "address[]" }],
    name: "batch_is_contract",
    outputs: [{ internalType: "bool[]", name: "", type: "bool[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Contract address - to be deployed
export const PORTFOLIO_READER_ADDRESS = "0x0000000000000000000000000000000000000000"; // Update after deployment

// TypeScript types for contract interactions
export interface TokenInfo {
  balance: bigint;
  decimals: number;
  symbol: string;
  name: string;
}

export interface PortfolioData {
  ethBalance: bigint;
  tokenInfo: Array<{
    token: `0x${string}`;
    balance: bigint;
    decimals: number;
    symbol: string;
    name: string;
  }>;
}
