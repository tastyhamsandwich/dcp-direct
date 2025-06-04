import React from 'react'
import Link from 'next/link';
import { ReadStream } from 'fs';

const HelpSidebar = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const helpSections = [
    { title: "Table of Contents", link: "#toc" },
    { title: "What is Poker?", link: "/help/whatispoker" },
    { title: "How to Play Poker", link: "/help/howtoplay" },
    { title: "Hand Rankings", link: "#handranks" },
    { title: "Betting Strategy", link: "#betting" },
    { title: "Poker Variants", link: "#variants" },
  ].map((item) => {
    return (
      <li className="ml-3 pl-3 py-5 my-1 w-max">
        <Link
          href={item.link}
          className="rounded-md px-3 py-2 text-white hover:ml-5 duration-300 hover:duration-300 hover:translate-x-2 bg-slate-800 hover:text-slate-900 hover:bg-slate-300 font-medium text-2xl"
        >
          {item.title}
        </Link>
      </li>
    );
  });

  return (
    <div className="flex mt-15 ml-5">
      <div className="w-2/10">
        <nav>
          <ul className="">{helpSections}</ul>
        </nav>
      </div>
      <div className="w-8/10">{children}</div>
    </div>
  );
};

export default HelpSidebar;