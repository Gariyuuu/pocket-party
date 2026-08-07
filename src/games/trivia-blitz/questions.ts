export interface TriviaQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

/** A small curated general-knowledge bank — enough that an 8-question match rarely repeats content across replays, without needing a licensed trivia dataset. */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { question: "What is the largest planet in our solar system?", options: ["Earth", "Jupiter", "Saturn", "Neptune"], correctIndex: 1 },
  { question: "Which ocean is the largest by surface area?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctIndex: 3 },
  { question: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correctIndex: 2 },
  { question: "What is the chemical symbol for gold?", options: ["Ag", "Au", "Gd", "Go"], correctIndex: 1 },
  { question: "Which country is home to the kangaroo?", options: ["South Africa", "Brazil", "Australia", "India"], correctIndex: 2 },
  { question: "What is the capital of Japan?", options: ["Seoul", "Beijing", "Tokyo", "Bangkok"], correctIndex: 2 },
  { question: "How many strings does a standard violin have?", options: ["4", "5", "6", "8"], correctIndex: 0 },
  { question: "What is the tallest mountain in the world?", options: ["K2", "Kilimanjaro", "Denali", "Mount Everest"], correctIndex: 3 },
  { question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Mercury", "Jupiter"], correctIndex: 1 },
  { question: "What gas do plants primarily absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correctIndex: 2 },
  { question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correctIndex: 1 },
  { question: "What is the smallest prime number?", options: ["0", "1", "2", "3"], correctIndex: 2 },
  { question: "Which country gifted the Statue of Liberty to the United States?", options: ["Spain", "United Kingdom", "France", "Italy"], correctIndex: 2 },
  { question: "What is the hardest natural substance on Earth?", options: ["Gold", "Quartz", "Diamond", "Titanium"], correctIndex: 2 },
  { question: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correctIndex: 1 },
  { question: "What is the currency of Japan?", options: ["Won", "Yuan", "Yen", "Ringgit"], correctIndex: 2 },
  { question: "Which organ pumps blood throughout the human body?", options: ["Lungs", "Liver", "Heart", "Kidney"], correctIndex: 2 },
  { question: "What is the freezing point of water in Celsius?", options: ["0°C", "32°C", "100°C", "-10°C"], correctIndex: 0 },
  { question: "Which sport is known as 'the beautiful game'?", options: ["Basketball", "Soccer", "Tennis", "Cricket"], correctIndex: 1 },
  { question: "What is the largest mammal in the world?", options: ["African elephant", "Blue whale", "Giraffe", "Polar bear"], correctIndex: 1 },
  { question: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], correctIndex: 2 },
  { question: "Which language has the most native speakers worldwide?", options: ["English", "Spanish", "Hindi", "Mandarin Chinese"], correctIndex: 3 },
  { question: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Cucumber", "Pepper"], correctIndex: 1 },
  { question: "Which planet has the most moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correctIndex: 1 },
  { question: "What do bees produce that humans eat?", options: ["Silk", "Honey", "Wax", "Nectar"], correctIndex: 1 },
  { question: "Which country hosted the 2016 Summer Olympics?", options: ["China", "United Kingdom", "Brazil", "Japan"], correctIndex: 2 },
  { question: "What is the square root of 64?", options: ["6", "7", "8", "9"], correctIndex: 2 },
  { question: "Which instrument has 88 keys?", options: ["Guitar", "Piano", "Harp", "Accordion"], correctIndex: 1 },
  { question: "What is the longest river in the world?", options: ["Amazon", "Yangtze", "Mississippi", "Nile"], correctIndex: 3 },
  { question: "Which gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], correctIndex: 2 },
  { question: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correctIndex: 1 },
  { question: "Which country is famous for inventing pizza?", options: ["France", "Greece", "Italy", "Spain"], correctIndex: 2 },
  { question: "What is the closest star to Earth?", options: ["Proxima Centauri", "The Sun", "Sirius", "Alpha Centauri"], correctIndex: 1 },
  { question: "Which animal is known as the 'King of the Jungle'?", options: ["Tiger", "Elephant", "Lion", "Gorilla"], correctIndex: 2 },
  { question: "What is the capital city of Canada?", options: ["Toronto", "Vancouver", "Montreal", "Ottawa"], correctIndex: 3 },
];
