export const RIVER_CHIPS_ADDRESS = (process.env.NEXT_PUBLIC_RIVER_CHIPS_ADDRESS ||
  "0xF80DC75ad153CBBAA3569344A8e5AA8d1D0309b4") as `0x${string}`;

export const RIVER_CLUB_ADDRESS = (process.env.NEXT_PUBLIC_RIVER_CLUB_ADDRESS ||
  "0x783f42e659B1696502dea0A8C892Bb365ede4Ca3") as `0x${string}`;

export const riverChipsAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "burnSelf",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const riverClubAbi = [
  {
    type: "function",
    name: "length",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEntry",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "wallet", type: "address" },
          { name: "name", type: "string" },
          { name: "wins", type: "uint32" },
          { name: "tickets", type: "uint32" },
          { name: "score", type: "uint64" },
          { name: "updatedAt", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "upsert",
    stateMutability: "nonpayable",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "name", type: "string" },
      { name: "wins", type: "uint32" },
      { name: "tickets", type: "uint32" },
      { name: "score", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "indexPlusOne",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
