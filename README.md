# 🃏 Dealer's Choice Poker

## 🃏 Overview

DCP is a real-time multiplayer card game application built with Next.js and WebSockets. The application features user authentication, real-time gameplay, and a responsive UI. It will eventually feature extensive stat-tracking and a custom game variant editor to allow players to deal any kind of poker game they can think of.

## 🃏 Why?

There are lots of online poker games out there already, what's different about this one? 

I really enjoy playing poker, but I get freakin' tired of playing Texas Hold'Em all the time. It's all anyone seems to know or understand, at least in the casual poker player arena. I always played Dealer's Choice with my friends, where we could deal any kind of poker game we wanted when it was our turn. And I mean any kind. Anything we could come up with, crazy community boards, different layouts, different rules for how you could combine the cards on the board, and it made it WAY MORE FUN.

So, I wanted to capture that awesome unpredictability and excitement, but in an online poker format. That's why!

## 🃏 Key Architecture Points

- **Next.js App Router**: Pages and API routes organized in the `/app` directory
- **React Context**: Used for authentication
- **MongoDB**: NoSQL database implementation for user profiles, statistics, etc.
- **WebSockets**: Real-time communication between clients and server
- **Tailwind CSS**: Utility-first styling approach

## 🃏 Getting Started

To setup the project in a development environment, see the Contributing section at the bottom of this README. For developer guides and function descriptions, please see the individual documentation files in the `/docs` directory. Finally, once the project is in a state worthy of going live, the URL of the site will be posted.

## 🃏 Future Development

Areas for future development and improvement include:

- Adding more game types beyond the current card game
- Implementing a persistent storage solution for game history
- Enhancing the lobby system with game filtering and searching
- Adding social features like friends lists and private games
- Comprehensive statistics-tracking and leaderboards
- Improved UI layouts

## 🃏 Tasks and Milestones

A checklist for ongoing development:

- [x]  Basic website scaffolding  
- [x]  User authentication  
- [x]  User profile dashboard  
- [x]  Game lobby access  
- [x]  Create/join games  
- [x]  Back-end websocket architecture  
- [x]  Poker object classes and logic  
- [x]  Working game sequence  
- [x]  Animations and sound effects  
- [x]  Support for multiple poker variant rulesets  
  - [x]  Hold 'Em Styles  
    - [x]  Texas  
    - [x]  Omaha  
    - [ ]  Omaha Hi/Lo  
    - [ ]  Chicago  
  - [x]  Stud Styles  
    - [ ]  Seven Card Stud  
    - [ ]  Others?
  - [x]  Draw Styles  
    - [ ]  Five Card Draw  
    - [ ]  Others?
- [ ]  Wildcard Support  
- [ ]  Support for custom community board setups  
- [ ]  **Full Dashboard feature set**  
  - [ ] Change display name  
  - [ ]  Password reset  
  - [ ]  Change e-mail   
  - [ ]  Light/Dark theme  
  - [ ]  Daily tips  
  - [ ]  Statistics tracking  
  - [ ]  Strategy guide  
  - [ ]  New player guide  
- [ ]  Changelog / Announcements page  
- [ ]  Forums  
- [ ]  Multi-Factor Authentication  
- [ ]  **Full login provider sets**  
  - [x]  Discord  
  - [ ]  Facebook  
  - [ ]  Google  
  - [ ]  Phone  
  - [x]  E-mail  
- [x]  Globally-accessible Chat component
- [ ]  AI players   
- [ ]  Extras? (I'm always open to ideas for features!)   


## 🃏 Contributing

### Cloning the Repo
```bash
git clone https://github.com/tastyhamsandwich/dcp-direct/
cd dcp-direct
```

### Running the Development Server

For local development:
```bash
pnpm run dev:all
```

For public-facing development:
```bash
pnpm run dev:net
```

These scripts utilize `concurrently` to launch the Next.JS development server and an Express-based WebSockets back-end server as well.
The site defaults to localhost:3003 for the frontend and localhost:3001 for the websockets backend

### Additions & Changes
Then submit a pull request

If you'd like to contribute, please fork the repository and open a pull request to the primary branch

