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
];

const LANGUAGES = ["Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "English"];

// How a film's original language is shown on cards and filters.
const LANG_LABELS = { English: "Hollywood" };

const MOVIES = [
  {
    id: "3-idiots", title: "3 Idiots", year: 2009, lang: "Hindi", audio: ["Hindi"],
    genres: ["Comedy", "Drama"], runtime: 170,
    moods: ["feel-good", "friends-night", "rainy-sunday"], masala: 4, quality: 8.5,
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
    moods: ["rainy-sunday", "feel-good"], masala: 2, quality: 8.5,
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
    moods: ["rainy-sunday", "feel-good"], masala: 3, quality: 8.5,
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
    moods: ["go-big", "edge-of-seat", "friends-night"], masala: 4, quality: 9,
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
    moods: ["go-big", "feel-good", "friends-night"], masala: 4, quality: 9,
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
];
