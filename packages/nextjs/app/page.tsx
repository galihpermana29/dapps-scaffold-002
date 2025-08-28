"use client";

import type { NextPage } from "next";
import { useTheme } from "next-themes";
import { useAccount } from "wagmi";
import { Card } from "~~/components/Card";
import { Address } from "~~/components/scaffold-eth";
import CompassIcon from "~~/icons/CompassIcon";
import DarkBugAntIcon from "~~/icons/DarkBugAntIcon";
import LightBugAntIcon from "~~/icons/LightBugAntIcon";
import { MultiSendIcon } from "~~/icons/MultiSendIcon";
import PortfolioIcon from "~~/icons/PortfolioIcon";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  return (
    <>
      <div className="flex items-center flex-col justify-between flex-grow pt-10">
        <div className="flex flex-col justify-center flex-grow">
          <div className="px-5">
            <h1 className="text-center">
              <span className="block text-2xl mb-2">Welcome to</span>
              <span className="block text-4xl font-bold">Scaffold-Stylus</span>
            </h1>
            <div className="flex justify-center items-center space-x-2 my-4">
              <p className={`my-2 font-medium ${!isDarkMode ? "text-[#E3066E]" : ""}`}>Connected Address:</p>
              <Address address={connectedAddress} />
            </div>
            <p className="text-center text-lg">
              Get started by editing{" "}
              <code
                className="italic bg-base-300 text-black text-base font-bold max-w-full break-words break-all inline-block"
                style={{
                  backgroundColor: isDarkMode ? "white" : "#F0F0F0",
                }}
              >
                packages/nextjs/app/page.tsx
              </code>
            </p>
            <p className="text-center text-lg">
              Edit your smart contract{" "}
              <code
                className="italic bg-base-300 text-black text-base font-bold max-w-full break-words break-all inline-block"
                style={{
                  backgroundColor: isDarkMode ? "white" : "#F0F0F0",
                }}
              >
                lib.rs
              </code>{" "}
              in{" "}
              <code
                className="italic bg-base-300 text-black text-base font-bold max-w-full break-words break-all inline-block"
                style={{
                  backgroundColor: isDarkMode ? "white" : "#F0F0F0",
                }}
              >
                packages/stylus/your-contract/src
              </code>
            </p>
          </div>
        </div>

        <div
          className="h-auto sm:h-[306px] mb-3 w-full py-11"
          style={{
            backgroundColor: isDarkMode ? "#050505" : "white",
          }}
        >
          <div className="flex justify-center items-center h-full gap-8 flex-col sm:flex-row flex-wrap">
            {/* Portfolio Tracker Card */}
            <Card
              icon={<PortfolioIcon />}
              description={<>Track your token balances and portfolio value</>}
              linkHref="/portfolio"
              linkText="Portfolio Tracker"
              isDarkMode={isDarkMode}
            />
            {/* Multi-Send Tool Card */}
            <Card
              icon={<MultiSendIcon className="w-8 h-8" />}
              description={<>Send tokens to multiple recipients efficiently</>}
              linkHref="/multisend"
              linkText="Multi-Send Tool"
              isDarkMode={isDarkMode}
            />
            {/* Debug Contracts Card */}
            <Card
              icon={isDarkMode ? <DarkBugAntIcon /> : <LightBugAntIcon />}
              description={<>Tinker with your smart contract using the</>}
              linkHref="/debug"
              linkText="Debug Contracts"
              isDarkMode={isDarkMode}
            />
            {/* Block Explorer Card */}
            <Card
              icon={<CompassIcon />}
              description={<>Explore your local transactions with the</>}
              linkHref="/blockexplorer"
              linkText="Block Explorer"
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
