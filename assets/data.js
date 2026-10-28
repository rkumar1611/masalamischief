// Masala Mischief film data.
// To add a review, copy one object and edit it. Fields:
//   masala  – Masala Meter, 1–5 chillies: how much pure entertainment it packs
//   quality – craft score out of 10: writing, performances, filmmaking
//   moods   – ids from MOODS below; these drive the Suggest page
//   audio   – languages you can watch it in (original + dubs).
//             Dub availability changes by platform, so check before publishing.
// The reviews below are starter copy in the house voice. Rewrite them as your own.

const MOODS = [
  { id: "rainy-sunday", label: "Rainy Sunday", emoji: "🌧️", blurb: "Blanket, chai, something that takes its time." },
  { id: "post-breakup", label: "Post-breakup", emoji: "💔", blurb: "Laugh, cry, or remember you're the main character." },
  { id: "first-date", label: "First date", emoji: "🌹", blurb: "Charming, easy to talk about after, zero awkward scenes." },
  { id: "friends-night", label: "Friends' night", emoji: "🍕", blurb: "Loud, quotable, best with a full sofa." },
  { id: "edge-of-seat", label: "Edge of the seat", emoji: "😰", blurb: "Thrillers that won't let you check your phone." },
  { id: "feel-good", label: "Need a pick-me-up", emoji: "☀️", blurb: "Guaranteed to send you to bed smiling." },
  { id: "go-big", label: "Go big or go home", emoji: "💥", blurb: "Slow-motion, whistles, interval blocks that slap." },
  { id: "mind-bender", label: "Mind-bender", emoji: "🌀", blurb: "You'll be explaining the plot at 2 a.m." },
  { id: "family-time", label: "Family movie night", emoji: "🛋️", blurb: "Something the grandparents and the kids will all enjoy." },
];

const LANGUAGES = ["Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "English"];

// How a film's original language is shown on cards and filters.
const LANG_LABELS = { English: "Hollywood" };

// The film shown big on the home page as "Pick of the week". Change the id each week.
const FEATURED_ID = "kantara";

const MOVIES = [
  {
    id: "3-idiots", title: "3 Idiots", year: 2009, lang: "Hindi", audio: ["Hindi"],
    genres: ["Comedy", "Drama"], runtime: 170,
    moods: ["feel-good", "friends-night", "rainy-sunday", "family-time"], masala: 4, quality: 8.5,
    tagline: "The engineering-college film every Indian parent should be forced to watch.",
    review: [
      "Three friends, one tyrannical director and an education system that rewards rote over curiosity. It's a comedy first, and the jokes still land fifteen years on, but the reason it became a cultural event is that it said out loud what every hostel already knew.",
      "It runs long and the final act piles on the melodrama, but by then you're too invested to complain."
    ],
    hits: ["Endlessly quotable", "Big heart without being preachy (mostly)", "The trio's chemistry"],
    misses: ["Third act goes full filmi", "Some gags have aged badly"],
    reviewed: "2026-10-20",
  },
  {
    id: "kumbalangi-nights", title: "Kumbalangi Nights", year: 2019, lang: "Malayalam", audio: ["Malayalam"],
    genres: ["Drama", "Comedy"], runtime: 135,
    moods: ["rainy-sunday", "post-breakup", "first-date"], masala: 2, quality: 9.5,
    tagline: "Four messy brothers, one backwater house, and the gentlest film about men you'll see.",
    review: [
      "Nothing explodes and nobody gives a speech, yet it's one of the most quietly radical Indian films in years: a story about brothers learning to say they're not okay. The backwaters glow at night and the cast feels like they've lived there forever.",
      "Then a certain smiling brother-in-law shows up, and the film reveals it had a sting in its tail all along."
    ],
    hits: ["Lived-in performances", "Gorgeous night photography", "A villain you'll never forget"],
    misses: ["Slow first half if you want plot", "Not much for masala-seekers"],
    reviewed: "2026-10-18",
  },
  {
    id: "rrr", title: "RRR", year: 2022, lang: "Telugu", audio: ["Telugu", "Hindi", "Tamil", "Malayalam", "Kannada"],
    genres: ["Action", "Period"], runtime: 182,
    moods: ["go-big", "friends-night"], masala: 5, quality: 8,
    tagline: "Physics is a suggestion. Friendship is a contact sport.",
    review: [
      "Two revolutionaries, one bromance, and set pieces that treat gravity as an opinion. Rajamouli builds every sequence like an interval block, and the dance-off alone is worth the ticket.",
      "History is bent into a pretzel and subtlety leaves early, but this is cinema meant to be watched with people who shout at the screen."
    ],
    hits: ["Action you'll rewind", "That dance number", "Pure crowd energy"],
    misses: ["Long", "Loose with history", "Thin female characters"],
    reviewed: "2026-10-22",
  },
  {
    id: "super-deluxe", title: "Super Deluxe", year: 2019, lang: "Tamil", audio: ["Tamil"],
    genres: ["Dark comedy", "Anthology"], runtime: 176,
    moods: ["mind-bender", "friends-night"], masala: 3, quality: 9,
    tagline: "Four stories, one very strange day in Chennai. Bring an open mind.",
    review: [
      "A dead body, a teenage misadventure, a father returning home in a sari and a tsunami survivor turned preacher, all crossing paths in one city. It swerves from filthy comedy to genuine grief without warning, and somehow keeps its balance.",
      "Not for everyone, which is part of why it works so well for the people it's for."
    ],
    hits: ["Fearless storytelling", "A career-best Vijay Sethupathi", "Laughs that hurt"],
    misses: ["Tonal whiplash", "Long for an anthology", "Definitely not a family watch"],
    reviewed: "2026-10-12",
  },
  {
    id: "andhadhun", title: "Andhadhun", year: 2018, lang: "Hindi", audio: ["Hindi"],
    genres: ["Thriller", "Dark comedy"], runtime: 139,
    moods: ["edge-of-seat", "mind-bender", "first-date"], masala: 4, quality: 9,
    tagline: "A piano player who may or may not be blind walks into the wrong apartment.",
    review: [
      "Go in knowing nothing. Every time you think you've seen the twist, Sriram Raghavan pulls the rug again, and he does it with a wicked grin.",
      "Tabu is magnificent, the score is a character of its own, and the ending will start an argument. Ideal date-night material if your date likes being surprised."
    ],
    hits: ["Twist after twist", "Tabu", "Tight runtime"],
    misses: ["Ending divides people", "Some coincidences strain belief"],
    reviewed: "2026-10-24",
  },
  {
    id: "queen", title: "Queen", year: 2014, lang: "Hindi", audio: ["Hindi"],
    genres: ["Comedy", "Drama"], runtime: 146,
    moods: ["post-breakup", "feel-good"], masala: 3, quality: 8.5,
    tagline: "Dumped before the wedding? Go on the honeymoon anyway.",
    review: [
      "Rani from Rajouri gets dumped a day before her wedding and takes her honeymoon alone, to Paris and Amsterdam. What follows is the funniest, warmest coming-of-self film Bollywood has made.",
      "It's the post-breakup film. Watch it, then text nobody."
    ],
    hits: ["Kangana's comic timing", "Feels genuinely freeing", "Great soundtrack"],
    misses: ["Some European stereotypes", "Middle stretch wanders"],
    reviewed: "2026-10-05",
  },
  {
    id: "drishyam", title: "Drishyam", year: 2013, lang: "Malayalam", audio: ["Malayalam"],
    genres: ["Thriller", "Family drama"], runtime: 160,
    moods: ["edge-of-seat", "rainy-sunday"], masala: 4, quality: 9,
    tagline: "A cable-TV operator, one terrible night, and the most watched alibi in Indian cinema.",
    review: [
      "Georgekutty is an ordinary man who has watched a lot of films. When his family is pushed into a crisis, that's suddenly the most dangerous skill in Kerala.",
      "The first hour is deliberately slow and domestic. Stick with it: everything you saw turns out to matter. The original is still the best of its many remakes."
    ],
    hits: ["Airtight plotting", "Mohanlal's restraint", "Payoff that rewards patience"],
    misses: ["Slow-burn opening", "Some intense family scenes"],
    reviewed: "2026-10-15",
  },
  {
    id: "vikram-vedha", title: "Vikram Vedha", year: 2017, lang: "Tamil", audio: ["Tamil"],
    genres: ["Action", "Thriller"], runtime: 147,
    moods: ["edge-of-seat", "friends-night", "mind-bender"], masala: 4, quality: 8.5,
    tagline: "A cop, a gangster, and a story you have to finish before he'll talk.",
    review: [
      "Each time Vikram corners Vedha, the gangster tells him a story, and each story makes the line between them blurrier. It's a Vikram-and-Betaal riddle dressed as a slick mass film.",
      "Vijay Sethupathi's swagger and the theme music will stay with you for days."
    ],
    hits: ["Clever structure", "Vijay Sethupathi's swagger", "That background score"],
    misses: ["Violence is frequent", "Female roles underwritten"],
    reviewed: "2026-10-09",
  },
  {
    id: "jaane-tu", title: "Jaane Tu... Ya Jaane Na", year: 2008, lang: "Hindi", audio: ["Hindi"],
    genres: ["Romance", "Comedy"], runtime: 155,
    moods: ["first-date", "feel-good", "rainy-sunday"], masala: 3, quality: 7.5,
    tagline: "Best friends who everyone knows are in love. Except them.",
    review: [
      "Jai and Aditi are the only people who can't see it, and their gang spends an entire film narrating the story at an airport. It's breezy, young and full of AR Rahman songs you forgot you knew.",
      "Light as candy floss, and exactly as satisfying on a lazy evening."
    ],
    hits: ["Easy charm", "Rahman's music", "Fun ensemble"],
    misses: ["Predictable", "Climax is pure Bollywood chase"],
    reviewed: "2026-09-28",
  },
  {
    id: "premam", title: "Premam", year: 2015, lang: "Malayalam", audio: ["Malayalam"],
    genres: ["Romance", "Comedy"], runtime: 156,
    moods: ["post-breakup", "rainy-sunday", "friends-night"], masala: 3, quality: 8,
    tagline: "Three loves, three ages, one very good moustache.",
    review: [
      "George falls in love as a schoolboy, a college rowdy and a grown man, and each chapter has its own colour, its own music and its own heartbreak.",
      "It's nostalgic, funny and shamelessly romantic. Perfect for when you're heartbroken and want company that isn't trying to fix you."
    ],
    hits: ["Nostalgia overload", "Great music", "Malar"],
    misses: ["Teacher–student track is debatable", "Episodic"],
    reviewed: "2026-09-30",
  },
  {
    id: "baahubali", title: "Baahubali: The Beginning", year: 2015, lang: "Telugu", audio: ["Telugu", "Hindi", "Tamil", "Malayalam"],
    genres: ["Action", "Fantasy"], runtime: 159,
    moods: ["go-big", "friends-night"], masala: 5, quality: 7.5,
    tagline: "The waterfall, the war, and the question that broke the internet.",
    review: [
      "Rajamouli's mythic kingdom is built on a scale Indian screens hadn't seen. The war sequence in the second half is the reason the film became a phenomenon.",
      "It's half a story with a cliffhanger, so cue up the sequel before you press play."
    ],
    hits: ["Scale and spectacle", "The war sequence", "Ramya Krishnan"],
    misses: ["Uneven VFX", "First-half romance drags", "Ends mid-story"],
    reviewed: "2026-10-01",
  },
  {
    id: "taare-zameen-par", title: "Taare Zameen Par", year: 2007, lang: "Hindi", audio: ["Hindi"],
    genres: ["Drama", "Family"], runtime: 165,
    moods: ["family-time", "rainy-sunday", "feel-good"], masala: 2, quality: 8.5,
    tagline: "Every child is special. Keep tissues handy.",
    review: [
      "Ishaan is eight, struggles at school and is labelled lazy, until an art teacher sees what everyone else missed. The animated sequences inside Ishaan's head are pure joy.",
      "Unashamedly sentimental, and it earns most of its tears. Watch it with your parents and see who cries first."
    ],
    hits: ["Darsheel Safary", "Changed how India talks about dyslexia", "Lovely songs"],
    misses: ["Heavy-handed in places", "Long second half"],
    reviewed: "2026-09-25",
  },
  {
    id: "kantara", title: "Kantara", year: 2022, lang: "Kannada", audio: ["Kannada", "Hindi", "Tamil", "Telugu", "Malayalam"],
    genres: ["Action", "Folklore"], runtime: 148,
    moods: ["go-big", "edge-of-seat"], masala: 5, quality: 8,
    tagline: "Forest, folklore and a final twenty minutes you'll feel in your bones.",
    review: [
      "A rowdy villager, a forest officer and a land dispute rooted in centuries-old ritual. The first half is rough village comedy; the second slowly tightens until the Bhoota Kola climax erupts.",
      "That ending alone justifies every chilli on the meter. Watch it loud."
    ],
    hits: ["Unforgettable climax", "Rooted in real tradition", "Rishab Shetty goes all in"],
    misses: ["Crude humour early on", "Romance feels tacked on"],
    reviewed: "2026-10-26",
  },
  {
    id: "znmd", title: "Zindagi Na Milegi Dobara", year: 2011, lang: "Hindi", audio: ["Hindi"],
    genres: ["Comedy", "Drama", "Road trip"], runtime: 155,
    moods: ["friends-night", "feel-good", "first-date"], masala: 3, quality: 8,
    tagline: "Three friends, one Spanish road trip, and the urge to book flights immediately.",
    review: [
      "Before a wedding, three school friends take a bachelor trip where each picks one terrifying adventure. It's gorgeous travel porn wrapped around a sharp film about fear and friendship.",
      "Farhan Akhtar's poetry voiceovers are either profound or hilarious, depending on how many drinks in you are."
    ],
    hits: ["Wanderlust in every frame", "Friendship feels real", "Great music"],
    misses: ["Very rich-people problems", "Slightly long"],
    reviewed: "2026-10-03",
  },
  {
    id: "96", title: "96", year: 2018, lang: "Tamil", audio: ["Tamil"],
    genres: ["Romance", "Drama"], runtime: 158,
    moods: ["rainy-sunday", "post-breakup"], masala: 1, quality: 9,
    tagline: "School sweethearts, one night, twenty-two years of things unsaid.",
    review: [
      "Ram and Jaanu meet again at a school reunion and spend a single night walking through Chennai, talking about everything except what matters.",
      "It's slow, aching and beautifully restrained. Zero masala, maximum feelings. Do not watch with your ex in the room."
    ],
    hits: ["Trisha and Vijay Sethupathi", "Haunting music", "Restraint"],
    misses: ["Very slow", "Not for plot-hungry viewers"],
    reviewed: "2026-10-10",
  },
  {
    id: "jersey", title: "Jersey", year: 2019, lang: "Telugu", audio: ["Telugu"],
    genres: ["Sports", "Drama"], runtime: 157,
    moods: ["rainy-sunday", "feel-good", "family-time"], masala: 3, quality: 8.5,
    tagline: "A failed cricketer at 36, one last shot, and a promise to his son.",
    review: [
      "Arjun gave up cricket years ago and now can't afford his son's birthday gift. So he goes back to the nets. You know where a sports drama is heading, but Nani makes every step feel personal.",
      "The ending will wreck you. That's a compliment."
    ],
    hits: ["Nani's performance", "Father–son track", "Earned emotion"],
    misses: ["Familiar sports beats", "Cricket scenes a bit long"],
    reviewed: "2026-10-07",
  },
  {
    id: "stree", title: "Stree", year: 2018, lang: "Hindi", audio: ["Hindi"],
    genres: ["Horror", "Comedy"], runtime: 128,
    moods: ["friends-night", "edge-of-seat"], masala: 4, quality: 7.5,
    tagline: "'O Stree, kal aana.' Write it on your wall.",
    review: [
      "A small town where a ghost abducts men at night during the festival season, and a tailor who is sure he can help. The scares are light and the jokes are many.",
      "Rajkummar Rao and the supporting gang carry it, and it's funnier the more friends you watch it with."
    ],
    hits: ["Genuinely funny", "Great ensemble", "Smart flip on the horror trope"],
    misses: ["Scares are mild", "Climax a little messy"],
    reviewed: "2026-10-14",
  },
  {
    id: "bangalore-days", title: "Bangalore Days", year: 2014, lang: "Malayalam", audio: ["Malayalam"],
    genres: ["Comedy", "Drama"], runtime: 171,
    moods: ["feel-good", "friends-night", "first-date"], masala: 3, quality: 8,
    tagline: "Three cousins, one big city, and the feeling that your twenties are a mess for everyone.",
    review: [
      "Cousins Kuttan, Divya and Arjun land in Bangalore with very different dreams. Each gets a love story, a crisis and a moment to grow up.",
      "Warm, colourful and packed with stars, it's the cinematic equivalent of a long family WhatsApp group that's actually fun."
    ],
    hits: ["Lovable cast", "Feels like home", "Breezy music"],
    misses: ["Long", "Some threads wrap up too neatly"],
    reviewed: "2026-10-17",
  },

  // ---------- Hollywood ----------
  {
    id: "avengers-endgame", title: "Avengers: Endgame", year: 2019, lang: "English", audio: ["English", "Hindi", "Tamil", "Telugu"],
    genres: ["Superhero", "Action"], runtime: 181,
    moods: ["go-big", "friends-night"], masala: 5, quality: 8,
    tagline: "Eleven years of Marvel, one three-hour first-day-first-show.",
    review: [
      "Half the universe is gone and the survivors get one shot at undoing it. The first half is surprisingly quiet and sad; the last hour is the closest Hollywood has come to a full Rajinikanth entry scene.",
      "It only really works if you've watched the films before it. If you have, you'll be whistling in your living room."
    ],
    hits: ["That final battle", "Pays off a decade of films", "Big emotional goodbyes"],
    misses: ["Homework required", "Time-travel logic is wobbly", "Long"],
    reviewed: "2026-10-27",
  },
  {
    id: "interstellar", title: "Interstellar", year: 2014, lang: "English", audio: ["English", "Hindi"],
    genres: ["Sci-fi", "Drama"], runtime: 169,
    moods: ["mind-bender", "rainy-sunday"], masala: 3, quality: 9,
    tagline: "A father, a wormhole, and the most emotional maths lesson ever filmed.",
    review: [
      "Earth is dying, and a former pilot leaves his children to search for a new home among the stars. Nolan fills it with black holes and relativity, but the heart of it is a dad trying to keep a promise.",
      "Watch it on the biggest screen you have, with the volume up. The organ score does half the work."
    ],
    hits: ["Jaw-dropping visuals", "Hans Zimmer's score", "Father–daughter story"],
    misses: ["Dialogue explains a lot", "Ending asks for a leap of faith"],
    reviewed: "2026-10-21",
  },
  {
    id: "inception", title: "Inception", year: 2010, lang: "English", audio: ["English", "Hindi"],
    genres: ["Sci-fi", "Thriller"], runtime: 148,
    moods: ["mind-bender", "edge-of-seat", "friends-night"], masala: 4, quality: 9,
    tagline: "A heist inside a dream inside a dream. Keep up.",
    review: [
      "A thief who steals secrets from people's dreams is offered one job in reverse: plant an idea instead. What follows is a heist film with folding cities and a hallway fight that still looks impossible.",
      "Clever without being cold, and the last shot will have your group arguing before the credits finish."
    ],
    hits: ["Original concept", "Set pieces", "That ending"],
    misses: ["Lots of rules to follow", "Characters a bit thin"],
    reviewed: "2026-10-11",
  },
  {
    id: "jurassic-park", title: "Jurassic Park", year: 1993, lang: "English", audio: ["English", "Hindi"],
    genres: ["Adventure", "Sci-fi"], runtime: 127,
    moods: ["go-big", "edge-of-seat", "family-time"], masala: 4, quality: 9,
    tagline: "The film that made a whole generation scared of a glass of water.",
    review: [
      "A billionaire brings dinosaurs back to life for a theme park, and nature has other plans. Thirty years on, the T-rex scene in the rain is still a masterclass in building fear.",
      "For many Indian families this was the first Hollywood film they saw dubbed in Hindi. It still plays brilliantly with the whole house watching."
    ],
    hits: ["The T-rex scene", "Effects that still hold up", "That theme music"],
    misses: ["Kids can be annoying", "Some scenes too scary for little ones"],
    reviewed: "2026-10-04",
  },
  {
    id: "titanic", title: "Titanic", year: 1997, lang: "English", audio: ["English", "Hindi"],
    genres: ["Romance", "Drama"], runtime: 195,
    moods: ["post-breakup", "rainy-sunday"], masala: 4, quality: 8.5,
    tagline: "The most filmi Hollywood film ever made, and we mean that kindly.",
    review: [
      "A rich girl, a poor artist, a disapproving mother and a ship we all know is going down. Structurally it's a Bollywood love story: big romance first half, disaster second half, one unforgettable song.",
      "Over three hours, and it never really drags. Have tissues ready, and the door argument ready too."
    ],
    hits: ["Sheer scale", "Leo and Kate", "The sinking"],
    misses: ["Very long", "Villain is cartoonish", "Dialogue is cheesy"],
    reviewed: "2026-09-27",
  },
  {
    id: "la-la-land", title: "La La Land", year: 2016, lang: "English", audio: ["English"],
    genres: ["Musical", "Romance"], runtime: 128,
    moods: ["first-date", "post-breakup", "rainy-sunday"], masala: 2, quality: 8.5,
    tagline: "Hollywood finally remembers how to do a song-and-dance romance.",
    review: [
      "A jazz pianist and an actress fall in love in Los Angeles while chasing dreams that may pull them apart. Colourful, funny and full of songs, it's the closest Hollywood gets to a classic Yash Chopra romance.",
      "The final ten minutes are why people either love it or can't talk about it."
    ],
    hits: ["Gorgeous colours", "Catchy songs", "That ending"],
    misses: ["Singing is modest", "Slow middle"],
    reviewed: "2026-10-16",
  },
  {
    id: "across-the-spider-verse", title: "Spider-Man: Across the Spider-Verse", year: 2023, lang: "English", audio: ["English", "Hindi", "Tamil", "Telugu"],
    genres: ["Animation", "Superhero"], runtime: 140,
    moods: ["go-big", "feel-good", "family-time"], masala: 4, quality: 9,
    tagline: "Every frame is a poster. One of them is set in Mumbattan.",
    review: [
      "Miles Morales jumps across universes and runs into an entire society of Spider-People who think they know how his story should go. Every world has its own art style, including a dazzling Indian one with Pavitr Prabhakar.",
      "It ends on a cliffhanger, but it's so inventive you won't mind."
    ],
    hits: ["Stunning animation", "Spider-Man India", "Big heart"],
    misses: ["Ends mid-story", "Visual overload for some"],
    reviewed: "2026-10-25",
  },
  {
    id: "knives-out", title: "Knives Out", year: 2019, lang: "English", audio: ["English"],
    genres: ["Mystery", "Comedy"], runtime: 130,
    moods: ["mind-bender", "friends-night", "first-date"], masala: 3, quality: 8.5,
    tagline: "A rich family, a dead patriarch, and a detective with a ridiculous accent.",
    review: [
      "A famous crime novelist is found dead after his birthday party, and every relative has a motive. It's a playful whodunit that keeps flipping what kind of mystery it is.",
      "Great for a group: pause halfway and make everyone name the killer."
    ],
    hits: ["Twisty plot", "Fun ensemble", "Sharp humour"],
    misses: ["Some characters barely used", "Detective's accent is a lot"],
    reviewed: "2026-10-19",
  },
  {
    id: "mad-max-fury-road", title: "Mad Max: Fury Road", year: 2015, lang: "English", audio: ["English", "Hindi"],
    genres: ["Action"], runtime: 120,
    moods: ["go-big", "edge-of-seat"], masala: 5, quality: 9,
    tagline: "Two hours, one chase, a guitar that shoots fire.",
    review: [
      "In a desert wasteland, a warrior helps a group of women escape a tyrant, and the whole film is basically one long chase across the sand. Almost no dialogue, just pure motion.",
      "If you think 'Hollywood action' means boring CGI, this is the cure."
    ],
    hits: ["Practical stunts", "Furiosa", "Relentless pace"],
    misses: ["Thin plot by design", "Very loud and intense"],
    reviewed: "2026-10-08",
  },

  // ---------- Family Picks ----------
  {
    id: "chillar-party", title: "Chillar Party", year: 2011, lang: "Hindi", audio: ["Hindi"],
    genres: ["Comedy", "Kids"], runtime: 118,
    moods: ["family-time", "feel-good"], masala: 3, quality: 8,
    tagline: "A colony gang of kids, one stray dog, and a politician who picked the wrong fight.",
    review: [
      "A gang of housing-society kids adopts a boy who cleans cars, and his dog. When a minister wants every stray off the streets, the kids take on the system their own way.",
      "Made for children without talking down to them. Grown-ups will laugh just as hard."
    ],
    hits: ["Real, funny kid actors", "Big heart", "Gentle message about kindness"],
    misses: ["Climax gets a bit preachy", "Some rude kid nicknames"],
    reviewed: "2026-10-28",
  },
  {
    id: "stanley-ka-dabba", title: "Stanley Ka Dabba", year: 2011, lang: "Hindi", audio: ["Hindi"],
    genres: ["Drama", "Kids"], runtime: 96,
    moods: ["family-time", "rainy-sunday"], masala: 1, quality: 8.5,
    tagline: "A tiffin box, a greedy teacher, and the boy who never brings lunch.",
    review: [
      "Stanley is the funniest kid in class, but he never has a lunch box, and a food-stealing teacher won't let him share. Shot almost entirely in a real Mumbai school, it feels like your own childhood.",
      "Small, sweet and quietly moving. The ending reveals why Stanley never brings lunch."
    ],
    hits: ["Partho Gupte", "Feels completely real", "Short and sweet"],
    misses: ["Very low-key", "Ending is sad for small kids"],
    reviewed: "2026-10-26",
  },
  {
    id: "koi-mil-gaya", title: "Koi... Mil Gaya", year: 2003, lang: "Hindi", audio: ["Hindi"],
    genres: ["Sci-fi", "Family"], runtime: 171,
    moods: ["family-time", "feel-good", "go-big"], masala: 4, quality: 7,
    tagline: "Bollywood's E.T. moment. Jaadoo needs sunlight, and you need snacks.",
    review: [
      "Rohit, a young man with a developmental disability, accidentally calls an alien to Earth. The alien Jaadoo gives him powers and a lot of confidence.",
      "Very 2003 in its effects and songs, but kids still fall in love with Jaadoo, and Hrithik commits completely."
    ],
    hits: ["Jaadoo!", "Hrithik's performance", "Big family energy"],
    misses: ["Long", "Dated effects", "Bullying scenes can be uncomfortable"],
    reviewed: "2026-10-23",
  },
  {
    id: "iqbal", title: "Iqbal", year: 2005, lang: "Hindi", audio: ["Hindi"],
    genres: ["Sports", "Drama"], runtime: 132,
    moods: ["family-time", "feel-good"], masala: 3, quality: 8.5,
    tagline: "A village boy who can't speak or hear, and a dream to bowl for India.",
    review: [
      "Iqbal is deaf and mute and obsessed with cricket. His father wants him in the fields; his sister and a washed-up coach believe otherwise.",
      "An underdog story without fuss. It's simple and warm, and it's still the best Indian sports film for kids."
    ],
    hits: ["Shreyas Talpade", "Naseeruddin Shah", "Inspiring without preaching"],
    misses: ["Predictable path", "Villain is cartoonish"],
    reviewed: "2026-10-13",
  },
  {
    id: "paddington-2", title: "Paddington 2", year: 2017, lang: "English", audio: ["English"],
    genres: ["Comedy", "Family"], runtime: 104,
    moods: ["family-time", "feel-good", "rainy-sunday"], masala: 3, quality: 9.5,
    tagline: "A polite bear, a stolen pop-up book, and the kindest film ever made.",
    review: [
      "Paddington wants to buy his aunt a birthday present, gets wrongly sent to prison, and turns the whole jail into a marmalade-loving family. Hugh Grant is hilarious as a vain villain.",
      "Every frame is crafted with care. It's a film for kids that adults quietly rewatch alone."
    ],
    hits: ["Pure kindness", "Hugh Grant", "Inventive visuals"],
    misses: ["Very British humour", "Teens may find it too sweet"],
    reviewed: "2026-10-02",
  },
  {
    id: "coco", title: "Coco", year: 2017, lang: "English", audio: ["English", "Hindi"],
    genres: ["Animation", "Family"], runtime: 105,
    moods: ["family-time", "rainy-sunday", "feel-good"], masala: 3, quality: 9,
    tagline: "A boy, a guitar and a trip to the land of the dead. Call your grandmother after.",
    review: [
      "Miguel dreams of music in a family that has banned it, and on the Day of the Dead he ends up among his skeleton ancestors. Bright, funny and full of songs.",
      "Indian families will recognise everything about it: the elders, the photos on the wall, the remembering. The ending gets everyone."
    ],
    hits: ["Gorgeous animation", "Music", "That ending"],
    misses: ["Skeletons may spook tiny ones", "Death is a big theme"],
    reviewed: "2026-10-06",
  },
  {
    id: "toy-story", title: "Toy Story", year: 1995, lang: "English", audio: ["English"],
    genres: ["Animation", "Family"], runtime: 81,
    moods: ["family-time", "feel-good"], masala: 3, quality: 9,
    tagline: "The film that started it all. Your toys are judging you.",
    review: [
      "Woody the cowboy is a boy's favourite toy, until a flashy space ranger called Buzz Lightyear arrives. Jealousy turns into a road trip and, eventually, friendship.",
      "Short, quick and funny. Thirty years on, it still works on a four-year-old and a forty-year-old."
    ],
    hits: ["Woody and Buzz", "Tight runtime", "Funny for all ages"],
    misses: ["Early animation looks dated", "Sid's room can scare little ones"],
    reviewed: "2026-09-29",
  },
  {
    id: "12th-fail", title: "12th Fail", year: 2023, lang: "Hindi", audio: ["Hindi"],
    genres: ["Drama", "Biography"], runtime: 147,
    moods: ["feel-good", "rainy-sunday", "family-time"], masala: 2, quality: 9,
    tagline: "The UPSC film that will make you call your old tuition teacher.",
    review: [
      "Vikrant Massey plays Manoj, a boy from Chambal who fails his board exams and then sets his sights on the toughest exam in the country. Based on a true story, it follows him through Delhi's coaching lanes, flour mills and rented rooms where a dozen aspirants share one dream.",
      "It's earnest and sometimes heavy-handed, but it earns every tear. A rare film about ambition that's really about honesty."
    ],
    hits: ["Vikrant Massey's career-best turn", "Mukherjee Nagar feels real", "An ending that lands"],
    misses: ["Preachy in patches", "Music overdoes the emotion"],
    reviewed: "2026-10-28",
  },
  {
    id: "laapataa-ladies", title: "Laapataa Ladies", year: 2024, lang: "Hindi", audio: ["Hindi"],
    genres: ["Comedy", "Drama"], runtime: 124,
    moods: ["feel-good", "first-date", "family-time", "rainy-sunday"], masala: 3, quality: 9,
    tagline: "Two brides, one train, two veils, and a very wrong turn.",
    review: [
      "On a crowded train, two newly married brides in identical red ghoonghats get swapped. One young husband brings home the wrong wife, and the other bride is left alone on a station platform. Kiran Rao turns that mix-up into a warm village comedy.",
      "It says sharp things about how women are treated without ever lecturing, and the comic timing (hello, Ravi Kishan's cop) is spot on. Short, sweet and easy to recommend to anyone."
    ],
    hits: ["Ravi Kishan steals it", "Big ideas, light touch", "Lovely small-town detail"],
    misses: ["A couple of convenient coincidences", "Some will want more bite"],
    reviewed: "2026-10-28",
  },
  {
    id: "manjummel-boys", title: "Manjummel Boys", year: 2024, lang: "Malayalam", audio: ["Malayalam"],
    genres: ["Thriller", "Drama"], runtime: 135,
    moods: ["edge-of-seat", "friends-night"], masala: 3, quality: 8.5,
    tagline: "A boys' trip to Kodaikanal goes very, very far down.",
    review: [
      "A gang of friends from Kochi goes on a cheap road trip to Kodaikanal and wanders into the Guna Caves, where one of them falls into a deep pit. Based on a real 2006 rescue, the second half is pure, breathless survival.",
      "The first half is loose and jokey, which is the point: you get to know the friends before everything goes wrong. Watch it with your own gang, then call them."
    ],
    hits: ["Unbearably tense rescue", "Friendship feels real", "Great use of a classic Kamal song"],
    misses: ["First half meanders", "Claustrophobes, beware"],
    reviewed: "2026-10-27",
  },
  {
    id: "jawan", title: "Jawan", year: 2023, lang: "Hindi", audio: ["Hindi", "Tamil", "Telugu"],
    genres: ["Action", "Thriller"], runtime: 169,
    moods: ["go-big", "friends-night"], masala: 5, quality: 7,
    tagline: "Shah Rukh Khan, two of him, and a metro hijack to fix the country.",
    review: [
      "Atlee brings Tamil mass-cinema energy to Bollywood's biggest star. SRK plays a vigilante with a squad of women and a list of grievances, from farmer loans to rotten hospitals, and the film stops for a whistle-worthy entry every twenty minutes.",
      "Logic was left at the ticket counter. Leave yours there too, and it's a riot."
    ],
    hits: ["SRK in full mass mode", "Interval block", "The bald look"],
    misses: ["Long and loud", "Plot is pure convenience"],
    reviewed: "2026-10-27",
  },
  {
    id: "kgf-2", title: "K.G.F: Chapter 2", year: 2022, lang: "Kannada", audio: ["Kannada", "Hindi", "Tamil", "Telugu", "Malayalam"],
    genres: ["Action", "Period"], runtime: 168,
    moods: ["go-big"], masala: 5, quality: 7,
    tagline: "Rocky Bhai versus everyone. Bring ear protection.",
    review: [
      "Rocky now rules the gold fields, and he has two problems: the ruthless Adheera (Sanjay Dutt) wants them back, and a determined prime minister (Raveena Tandon) wants him gone. Prashanth Neel shoots every line of dialogue like a trailer.",
      "It's relentless, smoky and wildly over the top. If you loved Chapter 1, this is more of the same, only bigger."
    ],
    hits: ["Yash's swagger", "Huge set pieces", "Dialogue built for whistles"],
    misses: ["Exhausting pace", "Women mostly sidelined"],
    reviewed: "2026-10-26",
  },
  {
    id: "pushpa", title: "Pushpa: The Rise", year: 2021, lang: "Telugu", audio: ["Telugu", "Hindi", "Tamil", "Malayalam", "Kannada"],
    genres: ["Action", "Crime"], runtime: 179,
    moods: ["go-big", "friends-night"], masala: 5, quality: 7,
    tagline: "Flower nahi, fire hai. You already know the shrug.",
    review: [
      "Allu Arjun is Pushpa Raj, a labourer who climbs the red sanders smuggling ladder in the Seshachalam forests. The stubble, the slouch and the shoulder-shrug became a national meme, and the songs were everywhere.",
      "It's long and the romance track is weak, but Fahadh Faasil's late entry as a menacing cop sets up the sequel beautifully."
    ],
    hits: ["Allu Arjun's physical performance", "Chart-busting songs", "Fahadh Faasil's last act"],
    misses: ["Romance track drags", "Three hours, and it's only part one"],
    reviewed: "2026-10-26",
  },
  {
    id: "kalki", title: "Kalki 2898 AD", year: 2024, lang: "Telugu", audio: ["Telugu", "Hindi", "Tamil", "Malayalam", "Kannada"],
    genres: ["Sci-fi", "Action"], runtime: 181,
    moods: ["go-big", "mind-bender"], masala: 4, quality: 7,
    tagline: "The Mahabharata meets Mad Max, with Amitabh Bachchan as the trump card.",
    review: [
      "In a ruined future Kashi, a bounty hunter (Prabhas) is hired to catch a pregnant woman (Deepika Padukone) who may carry a god. Standing in his way is Ashwatthama, played with towering presence by Amitabh Bachchan.",
      "The world-building is the most ambitious Indian sci-fi has attempted, and the final hour is a blast. The first hour, sadly, is clunky."
    ],
    hits: ["Amitabh Bachchan's Ashwatthama", "Jaw-dropping production design", "Mythology twist at the end"],
    misses: ["Slow, jokey first hour", "Prabhas feels miscast early on"],
    reviewed: "2026-10-25",
  },
  {
    id: "hanu-man", title: "Hanu-Man", year: 2024, lang: "Telugu", audio: ["Telugu", "Hindi", "Tamil", "Kannada", "Malayalam"],
    genres: ["Fantasy", "Action"], runtime: 158,
    moods: ["go-big", "family-time", "feel-good"], masala: 4, quality: 7,
    tagline: "A small-town thief gets superpowers. India gets its own origin story.",
    review: [
      "Hanumanthu, a likeable village thief, finds a gem that gives him Hanuman-like strength, just as a comic-book-obsessed villain comes hunting for it. Teja Sajja makes the hero easy to root for.",
      "Made on a fraction of the usual superhero budget, it gets real goosebumps out of its climax. A great pick for a mixed-age family night."
    ],
    hits: ["Goosebump climax", "Big heart, small budget", "Fun for kids and grandparents"],
    misses: ["Villain is cartoonish", "Comedy subplots run long"],
    reviewed: "2026-10-25",
  },
  {
    id: "oppenheimer", title: "Oppenheimer", year: 2023, lang: "English", audio: ["English", "Hindi"],
    genres: ["Drama", "Biography"], runtime: 180,
    moods: ["mind-bender", "rainy-sunday"], masala: 2, quality: 9,
    tagline: "Three hours of men talking in rooms, and somehow it's a thriller.",
    review: [
      "Christopher Nolan tells the story of J. Robert Oppenheimer, the physicist who led the building of the atomic bomb, cutting between the race to build it and the hearings that later broke him. Cillian Murphy is haunting.",
      "The Trinity test sequence is one of the great scenes of the decade. It's dense, so watch with full attention and no phones."
    ],
    hits: ["Cillian Murphy", "The Trinity test", "Ludwig Göransson's score"],
    misses: ["Very dense dialogue", "Women's roles are thin"],
    reviewed: "2026-10-24",
  },
  {
    id: "dune-part-two", title: "Dune: Part Two", year: 2024, lang: "English", audio: ["English", "Hindi"],
    genres: ["Sci-fi", "Adventure"], runtime: 166,
    moods: ["go-big", "mind-bender"], masala: 4, quality: 9,
    tagline: "Sandworm-riding, holy wars and the biggest screen you can find.",
    review: [
      "Paul Atreides (Timothée Chalamet) joins the desert Fremen to take revenge on the house that destroyed his family, while Chani (Zendaya) worries he's becoming the messiah they fear. Denis Villeneuve stages it on a staggering scale.",
      "Better than Part One: more action, more feeling, and a terrifying Austin Butler. Watch Part One first, or at least read a summary."
    ],
    hits: ["Sandworm ride", "Austin Butler's villain", "Sound and visuals"],
    misses: ["Needs Part One", "Ending is a cliffhanger"],
    reviewed: "2026-10-24",
  },
  {
    id: "inside-out-2", title: "Inside Out 2", year: 2024, lang: "English", audio: ["English", "Hindi"],
    genres: ["Animation", "Family"], runtime: 96,
    moods: ["family-time", "feel-good"], masala: 3, quality: 8,
    tagline: "Riley turns 13. Anxiety moves in and starts redecorating.",
    review: [
      "Joy, Sadness and the gang are back, but puberty brings new emotions: Anxiety, Envy, Ennui and Embarrassment. At a weekend hockey camp, Anxiety takes the controls and Riley starts losing track of who she is.",
      "Not quite as fresh as the first film, but its climax about panic is one of the kindest things a kids' film has said. Parents of teens may cry harder than the kids."
    ],
    hits: ["Anxiety is perfectly written", "Gentle lesson about self-worth", "Funny for adults too"],
    misses: ["Repeats the first film's structure", "Less magical world-building"],
    reviewed: "2026-10-23",
  },
  {
    id: "jungle-book", title: "The Jungle Book", year: 2016, lang: "English", audio: ["English", "Hindi"],
    genres: ["Adventure", "Family"], runtime: 106,
    moods: ["family-time", "go-big"], masala: 4, quality: 8,
    tagline: "Mowgli, Baloo and a Shere Khan who'll make the kids hide behind cushions.",
    review: [
      "Jon Favreau's photo-real version of Kipling's story follows Mowgli as he's forced out of the jungle by the tiger Shere Khan, with Bagheera and Baloo along for the journey. Watch it in Hindi if you can: the dub cast is a treat.",
      "It's beautiful and moves fast, but Shere Khan and Kaa are genuinely scary for little ones."
    ],
    hits: ["Stunning animals", "Great Hindi dub", "Bare Necessities"],
    misses: ["Scary for under-7s", "Songs feel squeezed in"],
    reviewed: "2026-10-23",
  },
  {
    id: "jai-bhim", title: "Jai Bhim", year: 2021, lang: "Tamil", audio: ["Tamil", "Telugu"],
    genres: ["Drama", "Thriller"], runtime: 164,
    moods: ["edge-of-seat", "rainy-sunday"], masala: 2, quality: 9,
    tagline: "A courtroom drama that will make you angry, then make you hope.",
    review: [
      "When an Irular tribal man vanishes from police custody, his pregnant wife Sengeni turns to a lawyer, Chandru (Suriya), who takes on the system for free. It's based on a real 1990s case, and the custody scenes are hard to watch.",
      "Suriya underplays it beautifully, but it's Lijomol Jose as Sengeni who you'll remember. One of the most important Indian films of the decade."
    ],
    hits: ["Lijomol Jose", "Gripping courtroom scenes", "Says something that matters"],
    misses: ["Custody violence is brutal", "A bit long"],
    reviewed: "2026-10-28",
  },
  {
    id: "vikram", title: "Vikram", year: 2022, lang: "Tamil", audio: ["Tamil", "Telugu", "Hindi", "Malayalam", "Kannada"],
    genres: ["Action", "Thriller"], runtime: 174,
    moods: ["go-big", "friends-night", "edge-of-seat"], masala: 5, quality: 8,
    tagline: "Kamal Haasan, Fahadh Faasil, Vijay Sethupathi, and one cameo that broke the internet.",
    review: [
      "A black-ops team led by Amar (Fahadh Faasil) hunts a masked gang killing cops, and the trail leads to a drug lord (Vijay Sethupathi) and a grieving old man who isn't what he seems. Lokesh Kanagaraj ties it to his earlier film Kaithi.",
      "When Kamal finally takes over, the film becomes a full-blown mass celebration. Anirudh's score does half the work, gladly."
    ],
    hits: ["Kamal in full swagger", "Anirudh's background score", "That final cameo"],
    misses: ["Watch Kaithi first to get it all", "Very violent"],
    reviewed: "2026-10-28",
  },
  {
    id: "soorarai-pottru", title: "Soorarai Pottru", year: 2020, lang: "Tamil", audio: ["Tamil", "Telugu"],
    genres: ["Drama", "Biography"], runtime: 153,
    moods: ["feel-good", "rainy-sunday", "family-time"], masala: 3, quality: 8.5,
    tagline: "A village boy wants to make flying cheap. Everyone laughs, until they don't.",
    review: [
      "Inspired by Air Deccan founder G. R. Gopinath, Suriya plays Maara, a former air force officer who dreams of a one-rupee airline for ordinary people. Sudha Kongara directs with real fire.",
      "The airport and boardroom fights are thrilling, and Aparna Balamurali as Bommi, his equally stubborn wife, is a delight. It goes straight for the heart and gets there."
    ],
    hits: ["Suriya's best in years", "Aparna Balamurali's Bommi", "Rousing underdog story"],
    misses: ["Villains are one-note", "Emotional beats are pushed hard"],
    reviewed: "2026-10-27",
  },
  {
    id: "jailer", title: "Jailer", year: 2023, lang: "Tamil", audio: ["Tamil", "Telugu"],
    genres: ["Action", "Comedy"], runtime: 168,
    moods: ["go-big", "friends-night"], masala: 5, quality: 7,
    tagline: "A retired jailer, a mild-mannered grandpa, a Thalaivar-sized secret.",
    review: [
      "Muthuvel Pandian is a quiet retiree who does the dishes and gets teased by his grandson. Then his cop son crosses an idol-smuggling gang, and Rajinikanth gets to remind everyone why he is who he is.",
      "Nelson's dark humour keeps it fun, Vinayakan is a fine villain, and the star cameos in the last act are pure fan service. Kaavaalaa was everywhere for a reason."
    ],
    hits: ["Rajinikanth's slow-burn swagger", "Star cameos", "Anirudh's songs"],
    misses: ["Second half sags", "Women barely matter"],
    reviewed: "2026-10-27",
  },
  {
    id: "jathi-ratnalu", title: "Jathi Ratnalu", year: 2021, lang: "Telugu", audio: ["Telugu"],
    genres: ["Comedy"], runtime: 148,
    moods: ["friends-night", "feel-good"], masala: 4, quality: 7.5,
    tagline: "Three small-town idiots, one big-city frame-up, zero brain cells between them.",
    review: [
      "Srikanth, Shekar and Ravi are lovable goofballs from Jogipet who move to Hyderabad and somehow end up accused of trying to kill a minister. Naveen Polishetty's motor-mouth timing carries the whole thing.",
      "The plot is silly and the courtroom climax is gloriously absurd. Watch it with friends who'll quote it back to you for weeks."
    ],
    hits: ["Naveen Polishetty", "Courtroom climax", "Endless one-liners"],
    misses: ["Thin plot", "Some jokes need Telugu context"],
    reviewed: "2026-10-26",
  },
  {
    id: "mahanati", title: "Mahanati", year: 2018, lang: "Telugu", audio: ["Telugu", "Tamil"],
    genres: ["Drama", "Biography"], runtime: 177,
    moods: ["rainy-sunday", "post-breakup"], masala: 2, quality: 8.5,
    tagline: "The rise and heartbreaking fall of Savitri, South India's greatest star.",
    review: [
      "Keerthy Suresh won a National Award for playing Savitri, the actress who ruled Telugu and Tamil cinema and then lost almost everything. A young journalist (Samantha) pieces her life together decades later.",
      "Gorgeous to look at and deeply sad. Dulquer Salmaan is charming and frustrating as Gemini Ganesan. Keep tissues near."
    ],
    hits: ["Keerthy Suresh", "Old-Madras period detail", "Respectful but honest"],
    misses: ["Journalist track is weaker", "Long and slow"],
    reviewed: "2026-10-26",
  },
  {
    id: "aavesham", title: "Aavesham", year: 2024, lang: "Malayalam", audio: ["Malayalam"],
    genres: ["Comedy", "Action"], runtime: 158,
    moods: ["friends-night", "go-big"], masala: 5, quality: 8,
    tagline: "Three freshers hire a Bengaluru gangster. The gangster adopts them.",
    review: [
      "Three Malayali engineering students in Bengaluru get ragged by seniors and go looking for local muscle. They find Ranga, a white-suited, gold-chained, wildly unpredictable gangster who decides they're his boys now.",
      "Fahadh Faasil goes completely, gloriously over the top and is clearly having the time of his life. Sushin Shyam's music is a party."
    ],
    hits: ["Fahadh as Ranga", "Sushin Shyam's songs", "Funny and oddly sweet"],
    misses: ["Plot is loose", "Runs long"],
    reviewed: "2026-10-25",
  },
  {
    id: "premalu", title: "Premalu", year: 2024, lang: "Malayalam", audio: ["Malayalam", "Telugu"],
    genres: ["Romance", "Comedy"], runtime: 156,
    moods: ["first-date", "feel-good", "post-breakup"], masala: 3, quality: 8,
    tagline: "A Malayali boy in Hyderabad, a girl way out of his league, and a lot of bad decisions.",
    review: [
      "Sachin (Naslen) moves to Hyderabad after a heartbreak and falls hard for Reenu (Mamitha Baiju), a confident IT professional who sees him as a friend. That's the whole plot, and it's plenty.",
      "Girish A.D. fills it with modern, very online humour, and the supporting cast is hilarious. The breeziest romcom in years."
    ],
    hits: ["Naslen and Mamitha", "Genuinely funny", "No toxic romance clichés"],
    misses: ["Slight story", "Could lose 20 minutes"],
    reviewed: "2026-10-25",
  },
  {
    id: "minnal-murali", title: "Minnal Murali", year: 2021, lang: "Malayalam", audio: ["Malayalam", "Hindi", "Tamil", "Telugu", "Kannada"],
    genres: ["Superhero", "Comedy"], runtime: 158,
    moods: ["feel-good", "family-time", "go-big"], masala: 4, quality: 8,
    tagline: "Lightning strikes a village tailor. Kerala gets its own desi superhero.",
    review: [
      "In a small Kerala village in the 1990s, tailor Jaison (Tovino Thomas) is struck by lightning and wakes up with powers. So does someone else, and that's where it gets interesting.",
      "Guru Somasundaram's lonely, heartbroken villain is the film's secret weapon. It's funny, local and full of heart: the superhero film Indian cinema needed."
    ],
    hits: ["Guru Somasundaram", "Village superhero charm", "Works for the whole family"],
    misses: ["Slow start", "Effects are modest"],
    reviewed: "2026-10-24",
  },
  {
    id: "charlie-777", title: "777 Charlie", year: 2022, lang: "Kannada", audio: ["Kannada", "Hindi", "Tamil", "Telugu", "Malayalam"],
    genres: ["Drama", "Adventure"], runtime: 164,
    moods: ["rainy-sunday", "family-time", "feel-good"], masala: 2, quality: 8,
    tagline: "A grumpy loner, a runaway Labrador, and a road trip to the snow.",
    review: [
      "Dharma (Rakshit Shetty) lives alone with his cigarettes and his idli routine until a mischievous stray Labrador forces her way into his life. When Charlie falls ill, he takes her on the trip of a lifetime.",
      "It's shamelessly sentimental and you will cry, especially if you've ever loved a dog. The dog's performance is unreal."
    ],
    hits: ["Charlie herself", "Rakshit Shetty", "Beautiful road-trip scenery"],
    misses: ["Very long", "Milks every tear"],
    reviewed: "2026-10-24",
  },
  {
    id: "dangal", title: "Dangal", year: 2016, lang: "Hindi", audio: ["Hindi", "Tamil", "Telugu"],
    genres: ["Sports", "Drama"], runtime: 161,
    moods: ["feel-good", "family-time", "go-big"], masala: 4, quality: 8.5,
    tagline: "Mhari choriyan choron se kam hai ke?",
    review: [
      "Aamir Khan plays wrestler Mahavir Singh Phogat, who wanted a gold medal for India and, with no sons, trained his daughters Geeta and Babita instead, against the whole village's mockery.",
      "The bouts are shot like real sport, and the young cast is terrific. Some of the father's methods are tough to watch today, which makes it a great family discussion film."
    ],
    hits: ["Wrestling scenes", "Young Geeta and Babita", "Rousing final"],
    misses: ["Coach villain is a cartoon", "Father's strictness is never questioned"],
    reviewed: "2026-10-23",
  },
  {
    id: "bajrangi-bhaijaan", title: "Bajrangi Bhaijaan", year: 2015, lang: "Hindi", audio: ["Hindi"],
    genres: ["Drama", "Comedy"], runtime: 163,
    moods: ["feel-good", "family-time", "rainy-sunday"], masala: 4, quality: 7.5,
    tagline: "Salman Khan walks a lost little girl home. Home is in Pakistan.",
    review: [
      "Pawan, a simple, honest Hanuman devotee, finds a little girl who can't speak, lost in Delhi. When he learns she's from Pakistan, he decides to take her back himself, visa or no visa.",
      "Salman has rarely been this gentle, little Harshaali Malhotra is adorable, and Nawazuddin Siddiqui's reporter is a joy. Mainstream Bollywood at its kindest."
    ],
    hits: ["Harshaali Malhotra", "Nawazuddin Siddiqui", "That ending"],
    misses: ["Simplistic politics", "Songs slow it down"],
    reviewed: "2026-10-23",
  },
  {
    id: "tumbbad", title: "Tumbbad", year: 2018, lang: "Hindi", audio: ["Hindi"],
    genres: ["Horror", "Folklore"], runtime: 104,
    moods: ["edge-of-seat", "mind-bender"], masala: 3, quality: 9,
    tagline: "Greed, gold coins and a god who should never have been worshipped.",
    review: [
      "In a rain-soaked Maharashtra village, Vinayak learns the secret of a cursed treasure guarded by Hastar, a forgotten god. He goes back for more, and then brings his son.",
      "Few Indian horror films look this good or feel this original. It's more dread than jump scares, and the folklore will stay with you. Watch it with the lights off."
    ],
    hits: ["Stunning look and sound", "Original folklore", "Short and tight"],
    misses: ["Very grim", "Not for the squeamish"],
    reviewed: "2026-10-22",
  },
  {
    id: "dark-knight", title: "The Dark Knight", year: 2008, lang: "English", audio: ["English", "Hindi"],
    genres: ["Superhero", "Thriller"], runtime: 152,
    moods: ["edge-of-seat", "go-big", "mind-bender"], masala: 4, quality: 9.5,
    tagline: "Why so serious? Because this is still the best superhero film ever made.",
    review: [
      "Batman, Commissioner Gordon and the new district attorney Harvey Dent are winning the war on Gotham's mob, until the Joker arrives with no plan, no rules and a lot of gasoline.",
      "Heath Ledger's Joker is one of the great screen villains. It plays more like a crime thriller than a comic-book film, and nearly two decades later nothing in the genre has topped it."
    ],
    hits: ["Heath Ledger's Joker", "The truck chase", "Big moral dilemmas"],
    misses: ["Batman's growl voice", "Rushed final act"],
    reviewed: "2026-10-22",
  },
  {
    id: "top-gun-maverick", title: "Top Gun: Maverick", year: 2022, lang: "English", audio: ["English", "Hindi"],
    genres: ["Action", "Drama"], runtime: 131,
    moods: ["go-big", "friends-night", "feel-good"], masala: 5, quality: 8.5,
    tagline: "Tom Cruise, real fighter jets, and the most fun you'll have with your speakers up.",
    review: [
      "Thirty years after the first film, Maverick is called back to train a squad of young pilots for an impossible mission, including the son of his late best friend Goose.",
      "The flying was shot in real jets and you can feel every G. It's old-fashioned in the best way: big, sincere and crowd-pleasing. No need to have seen the original."
    ],
    hits: ["Real aerial stunts", "Crowd-pleasing finale", "Tom Cruise's star power"],
    misses: ["Predictable", "Thin villains"],
    reviewed: "2026-10-21",
  },
  {
    id: "frozen", title: "Frozen", year: 2013, lang: "English", audio: ["English", "Hindi"],
    genres: ["Animation", "Musical"], runtime: 102,
    moods: ["family-time", "feel-good"], masala: 3, quality: 7.5,
    tagline: "Two sisters, one ice palace, and a song you'll hear 400 times.",
    review: [
      "Princess Elsa has icy powers she can't control. When they plunge her kingdom into endless winter, her fearless sister Anna sets out to find her, with an ice-seller, his reindeer and a snowman called Olaf.",
      "The twist on the 'true love' fairy tale is still lovely, and the songs are proper earworms. Grown-ups, consider yourselves warned."
    ],
    hits: ["Let It Go", "Olaf", "Sisterly love over romance"],
    misses: ["Middle sags", "You'll be singing it for weeks"],
    reviewed: "2026-10-21",
  },
  {
    id: "finding-nemo", title: "Finding Nemo", year: 2003, lang: "English", audio: ["English", "Hindi"],
    genres: ["Animation", "Adventure"], runtime: 100,
    moods: ["family-time", "feel-good"], masala: 3, quality: 9,
    tagline: "An anxious clownfish dad crosses the ocean. Just keep swimming.",
    review: [
      "Marlin, an over-protective clownfish, loses his son Nemo to a diver and sets off across the ocean to find him, with Dory, a cheerful blue tang who can't remember anything for more than a few seconds.",
      "Funny, gorgeous and quietly wise about letting kids grow up. Parents may get more out of it than the kids."
    ],
    hits: ["Dory", "Beautiful underwater world", "Great for all ages"],
    misses: ["Sad, sudden opening", "Sharks may scare little ones"],
    reviewed: "2026-10-20",
  },
];

// Where to watch in India, from JustWatch India on WATCH_CHECKED.
// stream = included with a subscription; rent = rent or buy. Re-check every month or so.
const WATCH_CHECKED = "2026-10-28";
const WATCH = {
  "3-idiots": { stream: [], rent: [] },
  "kumbalangi-nights": { stream: ["Prime Video"], rent: ["Apple TV"] },
  "rrr": { stream: ["Netflix", "ZEE5"], rent: [] },
  "super-deluxe": { stream: ["aha"], rent: ["Apple TV"] },
  "andhadhun": { stream: ["Prime Video", "JioHotstar"], rent: ["Apple TV"] },
  "queen": { stream: ["Prime Video"], rent: ["Apple TV"] },
  "drishyam": { stream: ["JioHotstar"], rent: [] },
  "vikram-vedha": { stream: ["JioHotstar", "ZEE5", "ManoramaMAX"], rent: [] },
  "jaane-tu": { stream: [], rent: [] },
  "premam": { stream: ["JioHotstar"], rent: [] },
  "baahubali": { stream: ["Netflix", "JioHotstar", "SonyLIV"], rent: ["Apple TV"] },
  "taare-zameen-par": { stream: [], rent: [] },
  "kantara": { stream: ["Netflix", "Prime Video"], rent: ["Amazon"] },
  "znmd": { stream: ["Netflix"], rent: [] },
  "96": { stream: ["SonyLIV", "Sun NXT", "aha", "ManoramaMAX"], rent: [] },
  "jersey": { stream: ["JioHotstar", "ZEE5", "Sun NXT"], rent: [] },
  "stree": { stream: ["Prime Video", "JioHotstar"], rent: ["Amazon"] },
  "bangalore-days": { stream: ["Prime Video", "JioHotstar"], rent: [] },
  "avengers-endgame": { stream: ["JioHotstar"], rent: [] },
  "interstellar": { stream: ["Prime Video", "JioHotstar"], rent: ["Amazon", "Apple TV"] },
  "inception": { stream: ["Prime Video", "JioHotstar"], rent: ["Amazon", "Apple TV"] },
  "jurassic-park": { stream: ["Prime Video", "JioHotstar", "ZEE5"], rent: ["Amazon", "Apple TV"] },
  "titanic": { stream: ["JioHotstar"], rent: [] },
  "la-la-land": { stream: ["Prime Video"], rent: ["Amazon", "Apple TV"] },
  "across-the-spider-verse": { stream: ["ZEE5"], rent: ["Amazon", "Apple TV"] },
  "knives-out": { stream: ["Prime Video", "Lionsgate Play"], rent: ["Apple TV"] },
  "mad-max-fury-road": { stream: ["Prime Video", "JioHotstar"], rent: ["Amazon", "Apple TV"] },
  "chillar-party": { stream: ["Prime Video", "JioHotstar"], rent: [] },
  "stanley-ka-dabba": { stream: [], rent: ["Apple TV"] },
  "koi-mil-gaya": { stream: ["ZEE5"], rent: [] },
  "iqbal": { stream: ["Prime Video", "ZEE5", "MX Player"], rent: [] },
  "paddington-2": { stream: [], rent: ["Amazon", "Apple TV"] },
  "coco": { stream: ["JioHotstar"], rent: [] },
  "toy-story": { stream: ["JioHotstar"], rent: [] },
  "12th-fail": { stream: ["JioHotstar"], rent: [] },
  "laapataa-ladies": { stream: ["Netflix"], rent: [] },
  "manjummel-boys": { stream: ["JioHotstar"], rent: [] },
  "jawan": { stream: ["Netflix"], rent: ["Apple TV"] },
  "kgf-2": { stream: ["Prime Video"], rent: ["Amazon"] },
  "pushpa": { stream: ["Prime Video", "MX Player"], rent: ["Amazon"] },
  "kalki": { stream: ["Netflix", "Prime Video"], rent: ["Amazon"] },
  "hanu-man": { stream: ["JioHotstar", "ZEE5"], rent: [] },
  "oppenheimer": { stream: ["JioHotstar"], rent: ["ZEE5", "Amazon", "Apple TV"] },
  "dune-part-two": { stream: ["Netflix"], rent: ["Amazon", "Apple TV"] },
  "inside-out-2": { stream: ["JioHotstar"], rent: [] },
  "jungle-book": { stream: ["JioHotstar"], rent: [] },
  "jai-bhim": { stream: ["Prime Video", "ManoramaMAX", "MX Player"], rent: [] },
  "vikram": { stream: ["JioHotstar"], rent: [] },
  "soorarai-pottru": { stream: ["Prime Video", "MX Player"], rent: [] },
  "jailer": { stream: ["Prime Video", "Sun NXT"], rent: [] },
  "jathi-ratnalu": { stream: ["Prime Video", "MX Player"], rent: [] },
  "mahanati": { stream: ["Prime Video"], rent: ["Amazon"] },
  "aavesham": { stream: ["Prime Video", "JioHotstar"], rent: [] },
  "premalu": { stream: ["aha"], rent: [] },
  "minnal-murali": { stream: ["Netflix"], rent: [] },
  "charlie-777": { stream: ["Prime Video", "JioHotstar"], rent: ["Apple TV"] },
  "dangal": { stream: ["Netflix", "JioHotstar"], rent: ["Apple TV"] },
  "bajrangi-bhaijaan": { stream: ["Netflix"], rent: [] },
  "tumbbad": { stream: ["Prime Video"], rent: [] },
  "dark-knight": { stream: ["Prime Video", "JioHotstar"], rent: ["Apple TV"] },
  "top-gun-maverick": { stream: ["JioHotstar", "ZEE5"], rent: ["Amazon", "Apple TV"] },
  "frozen": { stream: ["JioHotstar"], rent: [] },
  "finding-nemo": { stream: ["JioHotstar"], rent: [] },
};

// Direct links to each film's page on the streaming app (from JustWatch India, WATCH_CHECKED).
// A platform missing here falls back to that app's home page (PLATFORM_HOME).
const WATCH_LINKS = {
  "96": {
    "SonyLIV": "https://www.sonyliv.com/movies/96-1000226530",
    "Sun NXT": "https://www.sunnxt.com/movie/detail/82850/96/",
    "ManoramaMAX": "https://www.manoramamax.com/movies/detail/122669/96",
    "aha": "https://www.aha.video/movie/96",
  },
  "kumbalangi-nights": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.38b5da38-ea46-47e8-ea73-c0f4e94b9361",
    "Apple TV": "https://tv.apple.com/in/movie/kumbalangi-nights/umc.cmc.20vhsjekfkfdrzz5prtz2skny",
  },
  "rrr": {
    "Netflix": "https://www.netflix.com/title/81476453",
    "ZEE5": "https://www.zee5.com/movies/details/watch-rrr-tamil-full-hd-movie-online-on-zee5/0-0-1z5148987",
  },
  "super-deluxe": {
    "aha": "https://www.aha.video/movie/super-deluxe",
    "Apple TV": "https://tv.apple.com/in/movie/super-deluxe/umc.cmc.6qxav1nz493jwj7bfrpit16um",
  },
  "andhadhun": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.2213bd17-7a0c-476e-88b6-3cd250672c64",
    "JioHotstar": "https://www.hotstar.com/in/movies/andhadhun/1271615661",
    "Apple TV": "https://tv.apple.com/in/movie/andhadhun/umc.cmc.4j7zw48zujb15dd0ljho1kan8",
  },
  "queen": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.c4490d27-27c1-4b0f-8031-ea8e1a3f9b5b",
    "Apple TV": "https://tv.apple.com/in/movie/queen/umc.cmc.6llfe33ltrg6mczd2u7k5eakd",
  },
  "drishyam": {
    "JioHotstar": "https://www.hotstar.com/in/movies/drishyam/1000051783",
  },
  "vikram-vedha": {
    "JioHotstar": "https://www.hotstar.com/in/movies/vikram-vedha/1000216088",
    "ZEE5": "https://www.zee5.com/movies/details/watch-vikram-vedha-2017-full-hd-movie-online-on-zee5/0-0-movie_1460826290",
    "ManoramaMAX": "https://www.manoramamax.com/movies/detail/122647/vikram-vedha",
  },
  "premam": {
    "JioHotstar": "https://www.hotstar.com/in/movies/premam/1000091195",
  },
  "baahubali": {
    "Netflix": "https://www.netflix.com/title/82031153",
    "JioHotstar": "https://www.hotstar.com/in/movies/baahubali-the-beginning/1000074338",
    "SonyLIV": "https://www.sonyliv.com/movies/bahubali-the-beginning-1000228346",
    "Apple TV": "https://tv.apple.com/in/movie/bahubali-the-beginning/umc.cmc.51jt4tgusgwvkqo8oocmhn9a8",
  },
  "kantara": {
    "Netflix": "https://www.netflix.com/title/81656709",
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.63d1b1bd-3a4f-4f26-bb67-a82454b11929",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.63d1b1bd-3a4f-4f26-bb67-a82454b11929",
  },
  "znmd": {
    "Netflix": "https://www.netflix.com/title/70202336",
  },
  "jersey": {
    "JioHotstar": "https://www.hotstar.com/in/movies/jersey/1260133585",
    "ZEE5": "https://www.zee5.com/movies/details/watch-jersey-full-hd-movie-online-on-zee5/0-0-59341",
    "Sun NXT": "https://www.sunnxt.com/movie/detail/123851/jersey-(malayalam)/",
  },
  "stree": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.ce2e5edc-eea2-44ed-a195-86e4aa7a3a22",
    "JioHotstar": "https://www.hotstar.com/in/movies/stree/1000223587",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.ce2e5edc-eea2-44ed-a195-86e4aa7a3a22",
  },
  "bangalore-days": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.9047306b-9fb6-457b-afd6-528c8b8c616d",
    "JioHotstar": "https://www.hotstar.com/in/movies/bangalore-days/1000081352",
  },
  "avengers-endgame": {
    "JioHotstar": "https://www.hotstar.com/in/1260013556",
  },
  "interstellar": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.e265dfdf-4ad6-41b9-9123-deb70d7b5bf3",
    "JioHotstar": "https://www.hotstar.com/in/1971000531",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.e265dfdf-4ad6-41b9-9123-deb70d7b5bf3",
    "Apple TV": "https://tv.apple.com/in/movie/interstellar/umc.cmc.1vrwat5k1ucm5k42q97ioqyq3",
  },
  "inception": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.04a9f72c-f9c8-c4d1-f97b-6d7ad986a51f",
    "JioHotstar": "https://www.hotstar.com/in/1971000530",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.04a9f72c-f9c8-c4d1-f97b-6d7ad986a51f",
    "Apple TV": "https://tv.apple.com/in/movie/inception/umc.cmc.6loas01ow0w4lkatxxloz7a6e",
  },
  "jurassic-park": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.7ea9f6d9-bdc8-9b2e-97a9-c341306e36ef",
    "JioHotstar": "https://www.hotstar.com/in/1971000492",
    "ZEE5": "https://www.zee5.com/movies/details/jurassic-park/0-0-1z5448695",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.7ea9f6d9-bdc8-9b2e-97a9-c341306e36ef",
    "Apple TV": "https://tv.apple.com/in/movie/jurassic-park/umc.cmc.3bp8rj8ab9otj4ug279xhib2f",
  },
  "titanic": {
    "JioHotstar": "https://www.hotstar.com/in/1770001166",
  },
  "la-la-land": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.a2b315ef-feed-47dd-9fd2-41e50afbb891",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.a2b315ef-feed-47dd-9fd2-41e50afbb891",
    "Apple TV": "https://tv.apple.com/in/movie/la-la-land/umc.cmc.2ls5rdvvy1t038my1urkcjt94",
  },
  "across-the-spider-verse": {
    "ZEE5": "https://www.zee5.com/movies/details/spider-man-across-the-spider-verse/0-0-1z5407501",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.7a5ee336-1492-4170-bc14-94a83749b0d3",
    "Apple TV": "https://tv.apple.com/in/movie/spider-man-across-the-spider-verse/umc.cmc.2zphwshxw2ejh2znevhod0u01",
  },
  "knives-out": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.bd5bb5ac-9dfe-4bf3-9987-02e2ef5dc117",
    "Lionsgate Play": "https://lionsgateplay.com/en/movies/knives-out/125930536013",
    "Apple TV": "https://tv.apple.com/in/movie/knives-out/umc.cmc.21f7rjslttoalzd6o9c6cg5ml",
  },
  "mad-max-fury-road": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.0c9da1a1-af0f-41d7-be82-0bb2fd6e7f32",
    "JioHotstar": "https://www.hotstar.com/in/1971000538",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.0c9da1a1-af0f-41d7-be82-0bb2fd6e7f32",
    "Apple TV": "https://tv.apple.com/in/movie/mad-max-fury-road/umc.cmc.6xerenwn1999cjd2y6421r2ex",
  },
  "chillar-party": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.08f4f64b-07bd-4594-8575-0ab91d7d893e",
    "JioHotstar": "https://www.hotstar.com/in/movies/chillar-party/1271701682",
  },
  "stanley-ka-dabba": {
    "Apple TV": "https://tv.apple.com/in/movie/stanley-ka-dabba/umc.cmc.5b8j1z7lh8osr80rbo69diwzf",
  },
  "koi-mil-gaya": {
    "ZEE5": "https://www.zee5.com/movies/details/watch-koi-mil-gaya-2003-full-hd-hindi-movie-online-on-zee5/0-0-275862",
  },
  "iqbal": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.04f3306a-08e2-41fa-b3a4-26250ed82b57",
    "ZEE5": "https://www.zee5.com/movies/details/watch-iqbal-full-hd-movie-online-on-zee5/0-0-2383",
    "MX Player": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.04f3306a-08e2-41fa-b3a4-26250ed82b57",
  },
  "paddington-2": {
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.75b4e007-61a3-4d28-be85-393bc17a2d8e",
    "Apple TV": "https://tv.apple.com/in/movie/paddington-2/umc.cmc.6uanyirozllokd56zsopx7no1",
  },
  "coco": {
    "JioHotstar": "https://www.hotstar.com/in/1660010633",
  },
  "toy-story": {
    "JioHotstar": "https://www.hotstar.com/in/1660010197",
  },
  "12th-fail": {
    "JioHotstar": "https://www.hotstar.com/in/movies/12th-fail/1260161273",
  },
  "laapataa-ladies": {
    "Netflix": "https://www.netflix.com/title/81760391",
  },
  "manjummel-boys": {
    "JioHotstar": "https://www.hotstar.com/in/movies/manjummel-boys/1271305800",
  },
  "jawan": {
    "Netflix": "https://www.netflix.com/title/81728124",
    "Apple TV": "https://tv.apple.com/in/movie/jawan/umc.cmc.4mnynnb1387rj9mxmr69fy7of",
  },
  "kgf-2": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.49568f51-d8da-43ae-a8ce-185f4d00ae35",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.49568f51-d8da-43ae-a8ce-185f4d00ae35",
  },
  "pushpa": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.ac3855ce-6c21-4b6e-a8d8-dd0479dafda1",
    "MX Player": "https://www.mxplayer.in/movie/watch-pushpa-the-rise-hindi-movie-online-c2dc7967b20d067c12227043915c9f84",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.7f460370-67e0-4ace-8d50-d79569598103",
  },
  "kalki": {
    "Netflix": "https://www.netflix.com/title/81726031",
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.5e6a95ea-424a-49e0-b1db-3a6097ec03f9",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.5e6a95ea-424a-49e0-b1db-3a6097ec03f9",
  },
  "hanu-man": {
    "JioHotstar": "https://www.hotstar.com/in/movies/hanuman/1971007527",
    "ZEE5": "https://www.zee5.com/movies/details/watch-hanuman-2024-full-hanu-man-movie-online-on-zee5/0-0-1z5531939",
  },
  "oppenheimer": {
    "JioHotstar": "https://www.hotstar.com/in/1971011128",
    "ZEE5": "https://www.zee5.com/movies/details/watch-oppenheimer-full-hd-movie-on-rent-online-on-zee5/0-0-1z5465540",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.0653d989-0412-4e01-b466-f657bf48121e",
    "Apple TV": "https://tv.apple.com/in/movie/oppenheimer/umc.cmc.5gylew9icuhfiifdv3oxwxen8",
  },
  "dune-part-two": {
    "Netflix": "https://www.netflix.com/title/81602836",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.9392c069-96f9-421b-ac7a-275308e1327a",
    "Apple TV": "https://tv.apple.com/in/movie/dune-part-two/umc.cmc.363aycnv6vy9qgekvew6fveb9",
  },
  "inside-out-2": {
    "JioHotstar": "https://www.hotstar.com/in/movies/inside-out-2/1271325263",
  },
  "jungle-book": {
    "JioHotstar": "https://www.hotstar.com/in/1260018310",
  },
  "jai-bhim": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.fbf03970-02ad-4c3f-acc7-50fa6956121b",
    "ManoramaMAX": "https://www.manoramamax.com/movies/detail/140683/jai-bhim",
    "MX Player": "https://www.mxplayer.in/movie/watch-jai-bhim-tamil-movie-online-f4c84df710233f0a911888475f7a9fc2",
  },
  "vikram": {
    "JioHotstar": "https://www.hotstar.com/in/movies/vikram/1260106598",
  },
  "soorarai-pottru": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.4eba92e4-9715-baed-4904-203569bc0dfa",
    "MX Player": "https://www.mxplayer.in/movie/watch-aakaasam-nee-haddhu-ra-telugu-movie-online-36a220a925ceef018023dce73b37f8fd",
  },
  "jailer": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.e6c3bee4-fea9-4d10-ac7b-61dd7f026d47",
    "Sun NXT": "https://www.sunnxt.com/movie/detail/194350/jailer/",
  },
  "jathi-ratnalu": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.36bc5571-9f2a-f458-09ed-45682c240ad7",
    "MX Player": "https://www.mxplayer.in/movie/watch-jathi-ratnalu-movie-online-0c208bd14bf6a86b6e23cbb65c9e25f2",
  },
  "mahanati": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.aaa1e7bf-dc06-4a08-ba72-f14b5d9fccd0",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.26b5d879-a5c0-b811-bf61-1a94cc4cc132",
  },
  "aavesham": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.1744bdf3-351d-4617-a849-43bc7f9e8f41",
    "JioHotstar": "https://www.hotstar.com/in/movies/aavesham/1271320425",
  },
  "premalu": {
    "aha": "https://www.aha.video/movie/premalu",
  },
  "minnal-murali": {
    "Netflix": "https://www.netflix.com/title/81497215",
  },
  "charlie-777": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.c04f713b-7781-4292-8065-91ca32c3532d",
    "JioHotstar": "https://www.hotstar.com/in/movies/777-charlie/1971000420",
    "Apple TV": "https://tv.apple.com/in/movie/777-charlie/umc.cmc.2917grfp55icjaxkqozwwi2s1",
  },
  "dangal": {
    "Netflix": "https://www.netflix.com/title/80166185",
    "JioHotstar": "https://www.hotstar.com/in/movies/dangal/1271659734",
    "Apple TV": "https://tv.apple.com/in/movie/dangal/umc.cmc.7krouhrf9iikjdbsqlvwa7wbh",
  },
  "bajrangi-bhaijaan": {
    "Netflix": "https://www.netflix.com/title/80065328",
  },
  "tumbbad": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.4cb3965f-e34d-3f49-a60c-acc2bc1f9065",
  },
  "dark-knight": {
    "Prime Video": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.4aa9f68b-5e9d-1955-a451-d4d0087ef56c",
    "JioHotstar": "https://www.hotstar.com/in/1971000395",
    "Apple TV": "https://tv.apple.com/in/movie/the-dark-knight/umc.cmc.1uf4c3neuc9yxhnjv7t4rd5wa",
  },
  "top-gun-maverick": {
    "JioHotstar": "https://www.hotstar.com/in/1271399288",
    "ZEE5": "https://www.zee5.com/movies/details/top-gun-maverick/0-0-1z5754713",
    "Amazon": "https://www.primevideo.com/detail?gti=amzn1.dv.gti.874d1f8d-4abf-4c1a-af2b-ae6680aee4b0",
    "Apple TV": "https://tv.apple.com/in/movie/top-gun-maverick/umc.cmc.670544bajp6s4pysx4rvctczz",
  },
  "frozen": {
    "JioHotstar": "https://www.hotstar.com/in/1260018197",
  },
  "finding-nemo": {
    "JioHotstar": "https://www.hotstar.com/in/movies/finding-nemo/1660010114",
  },
};

const PLATFORM_HOME = {
  "Netflix": "https://www.netflix.com/in/",
  "Prime Video": "https://www.primevideo.com/",
  "JioHotstar": "https://www.hotstar.com/in",
  "ZEE5": "https://www.zee5.com/",
  "SonyLIV": "https://www.sonyliv.com/",
  "Sun NXT": "https://www.sunnxt.com/",
  "aha": "https://www.aha.video/",
  "ManoramaMAX": "https://www.manoramamax.com/",
  "Lionsgate Play": "https://lionsgateplay.com/",
  "MX Player": "https://www.mxplayer.in/",
  "Apple TV": "https://tv.apple.com/in",
  "Amazon": "https://www.primevideo.com/",
};

// The OTT apps people can tick on the Suggest page.
const PLATFORMS = ["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "Sun NXT", "aha", "ManoramaMAX"];

// Parent notes for Family Picks. Levels: 0 none, 1 mild, 2 some, 3 strong.
// age = the youngest age we'd suggest, watching with a grown-up.
const PARENT_NOTES = {
  "chillar-party": { age: 6, violence: 0, romance: 0, language: 1, scary: 0,
    note: "Kids call each other cheeky nicknames and a few grown-ups are mean to a stray dog. Nothing scary." },
  "stanley-ka-dabba": { age: 6, violence: 1, romance: 0, language: 0, scary: 0,
    note: "A teacher bullies a child over food, and the ending touches on child labour. Good for a gentle chat afterwards." },
  "toy-story": { age: 5, violence: 1, romance: 0, language: 0, scary: 1,
    note: "A neighbour boy breaks and rebuilds toys into creepy hybrids, which can frighten very young kids. Cartoon peril only." },
  "paddington-2": { age: 5, violence: 1, romance: 0, language: 0, scary: 1,
    note: "Slapstick chases and a short spell in prison, all played for laughs. A train sequence near the end is mildly tense." },
  "coco": { age: 7, violence: 1, romance: 0, language: 0, scary: 1,
    note: "Skeletons everywhere (friendly ones), a murder is revealed in the backstory, and death and memory are big themes." },
  "koi-mil-gaya": { age: 8, violence: 1, romance: 1, language: 0, scary: 1,
    note: "Rohit is bullied and beaten up, there are romantic songs, and the alien's arrival is a little spooky." },
  "iqbal": { age: 8, violence: 0, romance: 0, language: 0, scary: 0,
    note: "The coach drinks heavily and a father is harsh with his son. Otherwise clean and uplifting." },
  "taare-zameen-par": { age: 8, violence: 1, romance: 0, language: 0, scary: 1,
    note: "Ishaan is scolded, slapped and sent away to boarding school, which may upset sensitive kids. A great way to talk about learning differences." },
  "across-the-spider-verse": { age: 8, violence: 2, romance: 0, language: 1, scary: 1,
    note: "Fast, loud cartoon fighting and sad losses in characters' pasts. Visual overload may tire younger kids. Ends on a cliffhanger." },
  "jurassic-park": { age: 10, violence: 2, romance: 0, language: 1, scary: 3,
    note: "Dinosaur attacks, a few quick deaths and children in danger. The kitchen raptor scene is very scary for under-10s." },
  "jersey": { age: 10, violence: 0, romance: 1, language: 1, scary: 0,
    note: "Money worries, parents arguing and a very emotional ending. A mild romance track." },
  "interstellar": { age: 10, violence: 1, romance: 0, language: 1, scary: 2,
    note: "Tense space scenes, a father leaving his children, and a long runtime. More confusing than scary." },
  "la-la-land": { age: 10, violence: 0, romance: 2, language: 1, scary: 0,
    note: "Kissing and a couple living together, plus some mild swearing. A bittersweet ending." },
  "3-idiots": { age: 12, violence: 1, romance: 1, language: 2, scary: 0,
    note: "A student's suicide is part of the story, with ragging and crude speech humour. Good for 12+ with a chat about exam pressure." },
  "baahubali": { age: 12, violence: 3, romance: 1, language: 0, scary: 1,
    note: "Huge battle scenes with blood and beheadings, plus a romantic song. Skip for under-12s." },
  "avengers-endgame": { age: 12, violence: 2, romance: 0, language: 1, scary: 1,
    note: "Plenty of superhero fighting and major character deaths that hit hard. Works best if kids know the earlier films." },
  "inside-out-2": { age: 6, violence: 0, romance: 0, language: 0, scary: 1,
    note: "No villains, just big feelings. The climax shows a panic attack, which is a great opener for talking about worry." },
  "jungle-book": { age: 7, violence: 2, romance: 0, language: 0, scary: 2,
    note: "Shere Khan's attacks, a hypnotising python and a fiery climax. Thrilling for 7+, too intense for toddlers." },
  "hanu-man": { age: 8, violence: 2, romance: 1, language: 0, scary: 1,
    note: "Superhero fights with goons and a mild romance. Devotional themes that grandparents will enjoy." },
  "laapataa-ladies": { age: 10, violence: 1, romance: 1, language: 0, scary: 0,
    note: "Dowry and a controlling husband come up, and a corrupt cop shakes people down. Warm, funny and a great conversation-starter." },
  "12th-fail": { age: 10, violence: 1, romance: 1, language: 1, scary: 0,
    note: "Some roughing-up by police and a gentle romance. Lots of exam stress: inspiring for teens, but talk about failure afterwards." },
  "finding-nemo": { age: 5, violence: 1, romance: 0, language: 0, scary: 1,
    note: "Nemo's mum dies off-screen in the first minutes, and a few sharks and an anglerfish give jumps. Otherwise sunny." },
  "frozen": { age: 5, violence: 1, romance: 1, language: 0, scary: 1,
    note: "A snow monster and some wolves, plus a sweet romance. Parents in the story die in a shipwreck early on." },
  "charlie-777": { age: 7, violence: 1, romance: 0, language: 1, scary: 0,
    note: "A dog falls seriously ill and there are some tough scenes at a dog-breeding farm. Expect tears and a chat about pets." },
  "bajrangi-bhaijaan": { age: 8, violence: 1, romance: 1, language: 0, scary: 1,
    note: "A lost child is nearly sold to traffickers and there are some police beatings. The heart of it is kindness across borders." },
  "minnal-murali": { age: 8, violence: 2, romance: 1, language: 0, scary: 1,
    note: "Superhero fights, some burns and a villain whose sad backstory includes a death. Funny and warm overall." },
  "dangal": { age: 8, violence: 1, romance: 0, language: 1, scary: 0,
    note: "Lots of wrestling and a very strict father who pushes his daughters hard. A good one for talking about dreams and pressure." },
  "top-gun-maverick": { age: 10, violence: 1, romance: 1, language: 2, scary: 1,
    note: "Tense dogfights without blood, a little kissing and some swearing. A pilot's death in the backstory is a big theme." },
  "soorarai-pottru": { age: 10, violence: 1, romance: 1, language: 1, scary: 0,
    note: "A father's death and a few scuffles. Inspiring for older kids who love planes or business stories." },
};

// "New on OTT this week" strip on the home page, from JustWatch India's new-arrivals page.
// Refresh weekly: update checked and replace the items (url = the film's page on that app).
const NEW_ON_OTT = {
  checked: "2026-10-28",
  items: [
    { title: "The Aviator", year: 2004, lang: "English", app: "Netflix", added: "2026-10-28", url: "https://www.netflix.com/title/70011213", note: "Directed by Martin Scorsese · IMDb 7.5" },
    { title: "Maayon", year: 2022, lang: "Tamil", app: "JioHotstar", added: "2026-10-28", url: "https://www.hotstar.com/in/movies/maayon/1271413412", note: "Tamil mystery thriller." },
    { title: "Bakasura Restaurant", year: 2025, app: "JioHotstar", added: "2026-10-28", url: "https://www.hotstar.com/in/movies/bakasura-restaurant/1271718864", note: "Horror-comedy, new to streaming." },
    { title: "M3GAN 2.0", year: 2025, lang: "English", app: "Netflix", added: "2026-10-27", url: "https://www.netflix.com/title/82000745", note: "The killer-doll sequel." },
    { title: "Annihilation", year: 2018, lang: "English", app: "Prime Video", added: "2026-10-27", url: "https://www.primevideo.com/detail?gti=amzn1.dv.gti.479fe801-e02a-42af-a9e8-5861959e3f37", note: "Natalie Portman in a beautiful, unsettling sci-fi mystery." },
    { title: "Night Drive", year: 2022, lang: "Malayalam", app: "JioHotstar", added: "2026-10-26", url: "https://www.hotstar.com/in/movies/night-drive/1271718372", note: "A late-night drive goes very wrong." },
    { title: "Sonic the Hedgehog 3", year: 2024, lang: "English", app: "JioHotstar", added: "2026-10-25", url: "https://www.hotstar.com/in/movies/sonic-the-hedgehog-3/1271717290", note: "Sonic, Tails and Knuckles take on Shadow.", kids: true },
    { title: "Gran Turismo", year: 2023, lang: "English", app: "Netflix", added: "2026-10-25", url: "https://www.netflix.com/title/81672085", note: "A gamer becomes a real racing driver. Based on a true story." },
    { title: "The Lord of the Rings: The Return of the King", year: 2003, lang: "English", app: "Prime Video", added: "2026-10-25", url: "https://www.primevideo.com/detail?gti=amzn1.dv.gti.096a714d-6da9-4205-a118-3fb77fbaa003", note: "The epic finale. Clear your evening." },
    { title: "Chhota Bheem: The Throne of Bali", year: 2013, lang: "Hindi", app: "Prime Video", added: "2026-10-25", url: "https://www.primevideo.com/detail?gti=amzn1.dv.gti.62bf2199-50aa-42b1-9d7d-c41693d19471", note: "Plus a stack of other Chhota Bheem films for little ones.", kids: true },
    { title: "Saina", year: 2021, lang: "Hindi", app: "Prime Video", added: "2026-10-23", url: "https://www.primevideo.com/detail?gti=amzn1.dv.gti.b6bc65f0-a24c-14da-0d88-ce115f8607cb", note: "Parineeti Chopra as badminton star Saina Nehwal." },
    { title: "Bring Her Back", year: 2025, lang: "English", app: "Netflix", added: "2026-10-23", url: "https://www.netflix.com/title/83077865", note: "From the makers of Talk to Me. Seriously scary." },
    { title: "Star Trek Into Darkness", year: 2013, lang: "English", app: "Netflix", added: "2026-10-23", url: "https://www.netflix.com/title/70262640", note: "Benedict Cumberbatch versus the Enterprise crew." },
  ],
};

// Film images from TMDB (themoviedb.org): backdrop = wide still for cards, poster = portrait for the review page.
// Paths only; the site loads them from image.tmdb.org. Films without an entry keep the coloured tile.
const IMAGES = {
  "3-idiots": { tmdb: 20453, poster: "/66A9MqXOyVFCssoloscw79z8Tew.jpg", backdrop: "/u7kuUaySqXBVAtqEl9vkTkAzHV9.jpg", match: "3 Idiots (2009)" },
  "kumbalangi-nights": { tmdb: 575351, poster: "/lJ3RvIirE2C7gdBKvPRaoQ3iCo2.jpg", backdrop: "/8i8ml0LRdFT6LSaTMUG3gLzJfEq.jpg", match: "Kumbalangi Nights (2019)" },
  "rrr": { tmdb: 579974, poster: "/wE0I6efAW4cDDmZQWtwZMOW44EJ.jpg", backdrop: "/i0Y0wP8H6SRgjr6QmuwbtQbS24D.jpg", match: "RRR (2022)" },
  "super-deluxe": { tmdb: 432011, poster: "/4B2NFKN713AdXJExc8Kayr6qofu.jpg", backdrop: "/n1KIiBJf3M8zvKj2WEMKapUlrRe.jpg", match: "Super Deluxe (2019)" },
  "andhadhun": { tmdb: 534780, poster: "/dy3K6hNvwE05siGgiLJcEiwgpdO.jpg", backdrop: "/73aKTjdQ46jpv3InqNVnV76Nl0K.jpg", match: "Andhadhun (2018)" },
  "queen": { tmdb: 247645, poster: "/vKLp0X2RQOuA31R3AdaYtDdKIPK.jpg", backdrop: "/laKTtxs7jq64sDHzvbjeT7V2oBa.jpg", match: "Queen (2014)" },
  "drishyam": { tmdb: 244049, poster: "/gPBldHTnqpgsrnDnSrAlFwE6Q1t.jpg", backdrop: "/uqcM9eRqUyZCJCGDkLozP9TGAHn.jpg", match: "Drishyam (2013)" },
  "vikram-vedha": { tmdb: 432139, poster: "/se12m3uffluDlkTTZncOzsWKIkg.jpg", backdrop: "/5bm6sq3eunj3It6pqacFrpRQYoy.jpg", match: "Vikram Vedha (2017)" },
  "jaane-tu": { tmdb: 14467, poster: "/dtw5NPOPokLkJFyw41LO6j2SWwE.jpg", backdrop: "/4rJU6BxxcaeZN45j03n3z1aidca.jpg", match: "Jaane Tu... Ya Jaane Na (2008)" },
  "premam": { tmdb: 341895, poster: "/wfMgsfDrtouYOM6MbrkHtU96Xij.jpg", backdrop: "/d8FBRbCNsAU25YScpKCT3dp46gD.jpg", match: "Premam (2015)" },
  "baahubali": { tmdb: 256040, poster: "/9BAjt8nSSms62uOVYn1t3C3dVto.jpg", backdrop: "/e9ZEuHGHZ06AToHlfN1L7nejJ7W.jpg", match: "Bāhubali: The Beginning (2015)" },
  "taare-zameen-par": { tmdb: 7508, poster: "/puHRt6Raovm5ujGCdwLWvRv4NHU.jpg", backdrop: "/bPwdy3zaNnMdZ22u0WCcYu0xxgt.jpg", match: "Like Stars on Earth (2007)" },
  "kantara": { tmdb: 858485, poster: "/jIsKmkxMzdCZ0Ux1GVSnu8m6Na6.jpg", backdrop: "/kXElm7wt2kAXEVwJqW4cFhP43nW.jpg", match: "Kantara (2022)" },
  "znmd": { tmdb: 61202, poster: "/hKO9O715wYxjkQSEv47giCYcyO8.jpg", backdrop: "/z4k7b66jAHP8sQbEahxss6Ct8BW.jpg", match: "Zindagi Na Milegi Dobara (2011)" },
  "96": { tmdb: 441717, poster: "/nrVloCa2hCFOztRF1DZU2jnWIiQ.jpg", backdrop: "/qzu94AvnZ1az30sTUuibx2bXpfs.jpg", match: "96 (2018)" },
  "jersey": { tmdb: 592898, poster: "/bU9q9yVtxeBiC0Do27CekHXNE6D.jpg", backdrop: "/53CsGhbXKhmzcOQntz7Qs0whQ6g.jpg", match: "Jersey (2019)" },
  "stree": { tmdb: 533991, poster: "/euhgW6hpDYw7nxFDjqHn0eKvQPX.jpg", backdrop: "/4qgK44Ee1iRXTRp6w9LvMz76LJw.jpg", match: "Stree (2018)" },
  "bangalore-days": { tmdb: 268660, poster: "/iFMyZw1DTGvZ8hPa0eTseSFiRT1.jpg", backdrop: "/VmVJtd0hhQ7NpH3lykSv40Udic.jpg", match: "Bangalore Days (2014)" },
  "avengers-endgame": { tmdb: 299534, poster: "/bR8ISy1O9XQxqiy0fQFw2BX72RQ.jpg", backdrop: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", match: "Avengers: Endgame (2019)" },
  "interstellar": { tmdb: 157336, poster: "/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg", backdrop: "/8sNiAPPYU14PUepFNeSNGUTiHW.jpg", match: "Interstellar (2014)" },
  "inception": { tmdb: 27205, poster: "/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg", backdrop: "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg", match: "Inception (2010)" },
  "jurassic-park": { tmdb: 329, poster: "/d9mtMGQDLANKieb9PbD3yK7xxzo.jpg", backdrop: "/4SyDTF02R5BepqSdQmOaNCHObzF.jpg", match: "Jurassic Park (1993)" },
  "titanic": { tmdb: 597, poster: "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg", backdrop: "/sCzcYW9h55WcesOqA12cgEr9Exw.jpg", match: "Titanic (1997)" },
  "la-la-land": { tmdb: 313369, poster: "/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg", backdrop: "/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg", match: "La La Land (2016)" },
  "across-the-spider-verse": { tmdb: 569094, poster: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", backdrop: "/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg", match: "Spider-Man: Across the Spider-Verse (2023)" },
  "knives-out": { tmdb: 546554, poster: "/pThyQovXQrw2m0s9x82twj48Jq4.jpg", backdrop: "/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg", match: "Knives Out (2019)" },
  "mad-max-fury-road": { tmdb: 76341, poster: "/ulcAi4dKpAjHwYGS08vNyx9H6I9.jpg", backdrop: "/gqrnQA6Xppdl8vIb2eJc58VC1tW.jpg", match: "Mad Max: Fury Road (2015)" },
  "chillar-party": { tmdb: 69891, poster: "/8YiD2WbKltx1XzpWZ83sNIUttGX.jpg", backdrop: "/4sDExmar0TeyhycEbeLkZ2IXg55.jpg", match: "Chillar Party (2011)" },
  "stanley-ka-dabba": { tmdb: 68256, poster: "/6ivNFQZCg7ZeDtPK900DD4iwPSc.jpg", backdrop: "/bxNQBP8yzBrghKdzmf4Wgwq8PcF.jpg", match: "Stanley Ka Dabba (2011)" },
  "koi-mil-gaya": { tmdb: 25516, poster: "/2iJVauDYcYxRRGciTmAOSjiATf9.jpg", backdrop: "/ytQ9bT5TuDbSIXgmOC1wy49dkpM.jpg", match: "Koi... Mil Gaya (2003)" },
  "iqbal": { tmdb: 21567, poster: "/oPdtscy3BYDsM83wddWkmQxcTEg.jpg", backdrop: "/zKZnrVibEVUApzkcdyAZKM2jnwW.jpg", match: "Iqbal (2005)" },
  "paddington-2": { tmdb: 346648, poster: "/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg", backdrop: "/iJgNOTSBNrC90U2xyYq9ln0b35o.jpg", match: "Paddington 2 (2017)" },
  "coco": { tmdb: 354912, poster: "/6Ryitt95xrO8KXuqRGm1fUuNwqF.jpg", backdrop: "/g7CHF8gTLGooTbP4GznIGwaqAGL.jpg", match: "Coco (2017)" },
  "toy-story": { tmdb: 862, poster: "/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg", backdrop: "/3Rfvhy1Nl6sSGJwyjb0QiZzZYlB.jpg", match: "Toy Story (1995)" },
  "12th-fail": { tmdb: 1163258, poster: "/eebUPRI4Z5e1Z7Hev4JZAwMIFkX.jpg", backdrop: "/6RV2o8PBCEyw9ylOWViV1CtULIF.jpg", match: "12th Fail (2023)" },
  "laapataa-ladies": { tmdb: 1163194, poster: "/yXt07MYeiyQRzS69PMHy0BPjCGP.jpg", backdrop: "/uUVXEEyMsyWxrcbmAppUCYg6egV.jpg", match: "Lost Ladies (2024)" },
  "manjummel-boys": { tmdb: 1069945, poster: "/bswrtewwthpsh6nABiqKevU4UBI.jpg", backdrop: "/zGsHpuMN412VyzJZZnQeq4lMdjF.jpg", match: "Manjummel Boys (2024)" },
  "jawan": { tmdb: 872906, poster: "/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg", backdrop: "/5LtSjMNw6j3LkG29Oa4O0iY5U8.jpg", match: "Jawan (2023)" },
  "kgf-2": { tmdb: 587412, poster: "/khNVygolU0TxLIDWff5tQlAhZ23.jpg", backdrop: "/nsV5Mfi9FAV4w8eDsdr7uqVswOk.jpg", match: "K.G.F: Chapter 2 (2022)" },
  "pushpa": { tmdb: 690957, poster: "/h6Pd89ngvl9quPVsx3KoJlQsvk9.jpg", backdrop: "/jQIcn51nsvMrpB9NFwEOb9QHhFt.jpg", match: "Pushpa: The Rise (2021)" },
  "kalki": { tmdb: 801688, poster: "/rstcAnBeCkxNQjNp3YXrF6IP1tW.jpg", backdrop: "/o8XSR1SONnjcsv84NRu6Mwsl5io.jpg", match: "Kalki 2898-AD (2024)" },
  "hanu-man": { tmdb: 869760, poster: "/m1zq48rWSXxplzoJR8YtbXWnnHM.jpg", backdrop: "/evUpfs4dw7AuZ5k8dkePVMFSg0T.jpg", match: "Hanu-Man (2024)" },
  "oppenheimer": { tmdb: 872585, poster: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", backdrop: "/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg", match: "Oppenheimer (2023)" },
  "dune-part-two": { tmdb: 693134, poster: "/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg", backdrop: "/eZ239CUp1d6OryZEBPnO2n87gMG.jpg", match: "Dune: Part Two (2024)" },
  "inside-out-2": { tmdb: 1022789, poster: "/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg", backdrop: "/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg", match: "Inside Out 2 (2024)" },
  "jungle-book": { tmdb: 278927, poster: "/2Epx7F9X7DrFptn4seqn4mzBVks.jpg", backdrop: "/8oYykF1Qhrb8fC2qZqD71EzRywg.jpg", match: "The Jungle Book (2016)" },
  "jai-bhim": { tmdb: 855400, poster: "/ehybiOtBUtrMkmtB39zQEtq1Jie.jpg", backdrop: "/40lmQ5vzKJhj5k7i0hvZuglneyj.jpg", match: "Jai Bhim (2021)" },
  "vikram": { tmdb: 743563, poster: "/774UV1aCURb4s4JfEFg3IEMu5Zj.jpg", backdrop: "/dkIX4dSMuVqjfrPGunBJUR7K3LQ.jpg", match: "Vikram (2022)" },
  "soorarai-pottru": { tmdb: 595228, poster: "/5uimlxPCgAei8JfQUDFEUQLoyyh.jpg", backdrop: "/tZDdwUFL9OLhx2AhSMjKsg4abNb.jpg", match: "Soorarai Pottru (2020)" },
  "jailer": { tmdb: 937020, poster: "/pTmMxAHqX4vsIDE6HPPxOR0Q6TN.jpg", backdrop: "/ownDZBS9ecoPbWjW5V5L8jknGF.jpg", match: "Jailer (2023)" },
  "jathi-ratnalu": { tmdb: 796368, poster: "/7MzvmgHRmhbJH1UZJhRCkAtxvEy.jpg", backdrop: "/sLTe3l1SX2h7xjfO0vwKhoQm3hx.jpg", match: "Jathi Ratnalu (2021)" },
  "mahanati": { tmdb: 459713, poster: "/5hwtlwoLdSpkoeusT0sf8qW5VFB.jpg", backdrop: "/ankByTJkkTVGYRBZuHcW9SXoFU1.jpg", match: "Mahanati (2018)" },
  "aavesham": { tmdb: 1084812, poster: "/k5RWPaNjgRcNvGoawYaQHQwyctI.jpg", backdrop: "/sJa3WaCx3IyU7zkudlMs7lb13gt.jpg", match: "Aavesham (2024)" },
  "premalu": { tmdb: 1149791, poster: "/uPpmBjY3znUqGY8kYwI5xvOrSc0.jpg", backdrop: "/gDyLcjvmdAhmYqjCMwZ9PndnAVm.jpg", match: "Premalu (2024)" },
  "minnal-murali": { tmdb: 657644, poster: "/efetKFDyptrRpoHBb103Tg3Auw5.jpg", backdrop: "/hAv1GwwatyWV1RFXOfaASxgUVm4.jpg", match: "Minnal Murali (2021)" },
  "charlie-777": { tmdb: 634120, poster: "/qArPmXH0aWsT3SEtYl8XrU2Oz48.jpg", backdrop: "/3Sdi32wfIIOtDz1hYik6bGe1iWC.jpg", match: "777 Charlie (2022)" },
  "dangal": { tmdb: 360814, poster: "/cJRPOLEexI7qp2DKtFfCh7YaaUG.jpg", backdrop: "/l0fNAHLOFReQJsxCOmGWvJDnimn.jpg", match: "Dangal (2016)" },
  "bajrangi-bhaijaan": { tmdb: 348892, poster: "/vhlliI7HZZlWfo5d6CiyfBAGLrW.jpg", backdrop: "/n9QCm8uagvmXH476u5qFQsW8HkU.jpg", match: "Bajrangi Bhaijaan (2015)" },
  "tumbbad": { tmdb: 538858, poster: "/z1xOCxw780WFJC5uCTMfCkQ4Agi.jpg", backdrop: "/l0YKBu3LaehIFzBNjseLjx7MbaN.jpg", match: "Tumbbad (2018)" },
  "dark-knight": { tmdb: 155, poster: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", backdrop: "/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg", match: "The Dark Knight (2008)" },
  "top-gun-maverick": { tmdb: 361743, poster: "/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg", backdrop: "/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg", match: "Top Gun: Maverick (2022)" },
  "frozen": { tmdb: 109445, poster: "/itAKcobTYGpYT8Phwjd8c9hleTo.jpg", backdrop: "/rj58WQ9ImI0mYDptXdM7euX1Wjt.jpg", match: "Frozen (2013)" },
  "finding-nemo": { tmdb: 12, poster: "/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg", backdrop: "/eCynaAOgYYiw5yN5lBwz3IxqvaW.jpg", match: "Finding Nemo (2003)" },
};

// Lets the Cloudflare functions (functions/) read the same data. Harmless in the browser.
globalThis.MM_DATA = { MOVIES, WATCH, WATCH_LINKS, PARENT_NOTES, LANG_LABELS, MOODS, IMAGES };
