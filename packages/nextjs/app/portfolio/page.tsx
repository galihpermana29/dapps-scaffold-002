"use client";

import { NextPage } from "next";
import { PortfolioTracker } from "~~/components/PortfolioTracker";

const Portfolio: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-7xl">
        <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
          <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
            <h1 className="text-4xl font-bold mb-8">Portfolio Tracker</h1>
            <p className="text-lg">
              Track your token balances and portfolio value with batched vs individual call comparisons
            </p>
          </div>
        </div>
        <PortfolioTracker />
      </div>
    </div>
  );
};

export default Portfolio;
