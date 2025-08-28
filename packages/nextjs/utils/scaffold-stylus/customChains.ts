import { createPublicClient, defineChain, http } from "viem";
import { base, polygon, avalanche, tron, goerli, sepolia } from "viem/chains";
// Base chain
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

const polygonClient = createPublicClient({
  chain: polygon,
  transport: http(),
});

const avalancheClient = createPublicClient({
  chain: avalanche,
  transport: http(),
});

const tronClient = createPublicClient({
  chain: tron,
  transport: http(),
});

const goerliClient = createPublicClient({
  chain: goerli,
  transport: http(),
});

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});
export { baseClient, polygonClient, avalancheClient, tronClient, goerliClient, sepoliaClient };
