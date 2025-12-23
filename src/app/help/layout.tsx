"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RiArrowDropDownLine } from "react-icons/ri";

type HelpItem = {
  title: string;
  link: string;
};

type GameSection = {
  title: string;
  items: HelpItem[];
};

const gameSections: GameSection[] = [
  {
    title: "Pinochle",
    items: [
      { title: "What is Pinochle?", link: "/help/pinochle/whatispinochle" },
      { title: "The Basics", link: "/help/pinochle/howtoplay" },
      { title: "Meld Cheat Sheet", link: "/help/pinochle/meldcheatsheet" },
      { title: "Bidding Guide", link: "/help/pinochle/biddingguide" },
      { title: "Strategy", link: "/help/pinochle/strategy" },
      { title: "Variants", link: "/help/pinochle/variants" },
    ],
  },
  {
    title: "Poker",
    items: [
      { title: "Table of Contents", link: "#toc" },
      { title: "What is Poker?", link: "/help/poker/whatispoker" },
      { title: "How to Play Poker", link: "/help/poker/howtoplay" },
      { title: "Hand Rankings", link: "/help/poker/handranks" },
      { title: "Betting Strategy", link: "/help/poker/betting" },
      { title: "Poker Variants", link: "/help/poker/variants" },
    ],
  },
];

const HelpGameAccordion = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="basis-1/6 shrink-0 pr-4">
      <nav>
        <ul>
          {gameSections.map((section, index) => (
            <AccordionItem
              key={section.title}
              item={section}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
};

const AccordionItem = ({
  item,
  isOpen,
  onClick,
}: {
  item: GameSection;
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <li className="mb-6">
      <button
        className={`game-container ${isOpen ? "active" : ""}`}
        onClick={onClick}
        type="button"
      >
        <p className="game-item">{item.title}</p>
        <RiArrowDropDownLine className={`arrow ${isOpen ? "active" : ""}`} />
      </button>
      <div className={`game-accordion-content ${isOpen ? "open" : ""}`}>
        <ul className="ml-3 pl-3">
          {item.items.map((section) => (
            <li className="py-5 my-1 w-max" key={section.title}>
              <Link
                href={section.link}
                className="rounded-md px-3 py-2 text-white hover:ml-5 duration-300 hover:duration-300 hover:translate-x-2 bg-slate-800 hover:text-slate-900 hover:bg-slate-300 font-medium text-2xl"
              >
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
};

const HelpSidebar = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="flex max-w-full mt-15 ml-5 gap-10 overflow-x-hidden pr-6">
      <HelpGameAccordion />
      <div className="min-w-0 flex-1 pr-8">{children}</div>
    </div>
  );
};

export default HelpSidebar;
