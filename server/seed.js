/**
 * Database Seeder
 *
 * Populates MongoDB with comprehensive initial datasets for collegiate societies
 * and demo administrative/student user accounts. Ensures consistent test fixtures
 * and development readiness.
 *
 * Guarded against execution in production environments.
 */

const dotenv = require("dotenv");

// Load environment variables before inspecting execution environment
dotenv.config();

// Production safety guard: strictly abort to prevent destructive operations
if (process.env.NODE_ENV === "production") {
  console.error("[Seeder Error] Seeding operation is strictly prohibited in production environments.");
  process.exit(1);
}

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Society = require("./models/Society");
const User = require("./models/User");

// Initial dataset for seeding college societies across categories aligned with final Society schema
const sampleSocieties = [
  {
    name: "GDG (Google Developer Groups)",
    category: "Technical",
    tagline: "Empowering student developers through open technology, workshops, and hackathons",
    description:
      "Google Developer Groups on Campus is a student-led developer community. We organize tech workshops, internal hackathons, study jams, and open-source contribution drives spanning Web, Mobile, Cloud, and Machine Learning.",
    logoUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=200&q=80",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    recruitmentOpenedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isArchived: false,
    allowMultipleRoles: true,
    openRoles: [
      {
        title: "Web & App Development Member",
        description: "Build campus utilities, contribute to community web projects, and collaborate with senior developers.",
        requirements: "Basic knowledge of HTML, CSS, JavaScript, or Flutter. Eagerness to build real-world apps.",
        questions: [
          "Share links to your GitHub or live deployed projects.",
          "Which web or mobile development frameworks are you most comfortable using?",
        ],
      },
      {
        title: "AI & Machine Learning Member",
        description: "Work on introductory ML models, participate in kaggle challenges, and attend guided research sessions.",
        requirements: "Foundational Python knowledge and curiosity about neural networks and data science.",
        questions: [
          "Share your Kaggle, GitHub, or notebook link showing past data/ML exploration.",
          "What machine learning algorithms or libraries have you worked with so far?",
        ],
      },
      {
        title: "Competitive Programming Member",
        description: "Participate in algorithmic problem solving, practice contests, and represent college in inter-collegiate CP cups.",
        requirements: "Interest in Data Structures and Algorithms in C++, Java, or Python.",
        questions: [
          "Share your Codeforces, LeetCode, or CodeChef username/profile handle.",
        ],
      },
      {
        title: "PR & Sponsorship Member",
        description: "Assist with corporate outreach, draft partnership emails, and coordinate with event sponsors.",
        requirements: "Good written communication skills, enthusiasm for networking, and formal email etiquette.",
        questions: [
          "Have you previously coordinated corporate outreach or sponsorships for any event?",
        ],
      },
      {
        title: "Design & Media Member",
        description: "Create event posters, Instagram graphics, and UI layouts for club applications.",
        requirements: "Basic familiarity with Figma, Canva, Photoshop, or Illustrator. Creativity and visual sense.",
        questions: [
          "Share a link to your Figma, Behance, or Google Drive design portfolio.",
        ],
      },
    ],
    generalQuestions: [
      "Why do you want to join GDG over other technical societies?",
      "How many hours per week can you realistically commit to club activities?",
      "Tell us about a technical topic or skill you are currently exploring or excited about.",
    ],
    socialLinks: {
      instagram: "https://instagram.com/gdg_campus",
      linkedin: "https://linkedin.com/company/gdg-campus",
      discord: "https://discord.gg/gdgcampus",
      website: "https://gdgcampus.dev",
    },
  },
  {
    name: "180DC (180 Degrees Consulting)",
    category: "Literary",
    tagline: "High-quality, affordable consulting services to non-profits and social enterprises",
    description:
      "180 Degrees Consulting is the world's largest student consultancy for social impact organizations. Student consultants work on real client engagements, conducting market research, competitor benchmarking, and strategic problem-solving for partner non-profits.",
    logoUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=200&q=80",
    deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
    recruitmentOpenedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isArchived: false,
    allowMultipleRoles: true,
    openRoles: [
      {
        title: "Junior Consultant (Strategy & Operations)",
        description: "Assist in client problem analysis, gather market data, and draft actionable consulting recommendations.",
        requirements: "Structured thinking, basic familiarity with Excel/Google Sheets, and an analytical mindset.",
        questions: [
          "How would you approach breaking down an unfamiliar business problem with limited data?",
        ],
      },
      {
        title: "Research & Case Analysis Member",
        description: "Conduct secondary research on socio-economic sectors, analyze industry benchmarks, and prepare briefing memos.",
        requirements: "Curiosity for structured business research, report writing, and quantitative curiosity.",
        questions: [
          "Share any case competition slide deck or research brief you have authored.",
        ],
      },
      {
        title: "Corporate Relations & Client Outreach Member",
        description: "Identify and reach out to prospective non-profit clients and maintain communication logs.",
        requirements: "Strong interpersonal skills, professional writing, and persistence in outreach.",
        questions: [
          "Draft a brief 2-sentence cold outreach email opening for an NGO client partnership.",
        ],
      },
      {
        title: "Marketing & Design Member",
        description: "Design clean client presentation slide decks, annual reports, and social media announcements.",
        requirements: "Eye for clean typography, slide design (PowerPoint/Canva), and visual data presentation.",
        questions: [
          "Share a link to presentation slide decks or reports you have designed.",
        ],
      },
    ],
    generalQuestions: [
      "How would you approach analyzing why an educational NGO is experiencing low student attendance?",
      "Mention any debate, case competition, school project, or research writing experience you have had.",
      "Attach a link to your resume or LinkedIn profile (Google Drive / LinkedIn).",
    ],
    socialLinks: {
      instagram: "https://instagram.com/180dc_campus",
      linkedin: "https://linkedin.com/company/180dc-campus",
      website: "https://180dc.org",
    },
  },
  {
    name: "Enactus",
    category: "Literary",
    tagline: "A community of student leaders committed to using entrepreneurship to improve lives",
    description:
      "Enactus operates self-sustaining social enterprises to address civic, economic, and environmental issues. Fresh recruits collaborate closely with seniors on grassroots initiatives, product development, and beneficiary training programs.",
    logoUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=200&q=80",
    deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    recruitmentOpenedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    isArchived: false,
    allowMultipleRoles: true,
    openRoles: [
      {
        title: "Social Project Operations Member",
        description: "Support on-ground operations, coordinate supply logistics for active projects, and assist project teams.",
        requirements: "Willingness to learn, reliability, and readiness to participate in community field visits.",
        questions: [
          "Are you comfortable coordinating on-ground logistics for grassroots social projects?",
        ],
      },
      {
        title: "PR, Grants & Sponsorship Member",
        description: "Research grants and CSR schemes, draft formal partnership pitches, and assist in fundraising drives.",
        requirements: "Good writing skills, persuasive communication, and consistency.",
        questions: [
          "Have you assisted with grant writing or corporate outreach before?",
        ],
      },
      {
        title: "Community Outreach & Field Research Member",
        description: "Interact directly with project beneficiaries, collect qualitative survey data, and document ground progress.",
        requirements: "Empathy, active listening, and comfort speaking with diverse local communities.",
        questions: [
          "Describe an instance where you worked directly with an underserved community or volunteer group.",
        ],
      },
      {
        title: "Media Production & Storytelling Member",
        description: "Capture project footage during field visits, edit short reels, and craft social impact stories.",
        requirements: "Basic mobile or camera videography and familiarity with basic video editing software.",
        questions: [
          "Share links to any video reels or multimedia stories you have produced.",
        ],
      },
    ],
    generalQuestions: [
      "What is an everyday social or environmental issue around you that you would love to see solved?",
      "Are you open to visiting project field locations on select weekends?",
      "Which department feels like the best fit for your personality and skills?",
    ],
    socialLinks: {
      instagram: "https://instagram.com/enactus_campus",
      linkedin: "https://linkedin.com/company/enactus-campus",
      website: "https://enactus.org",
    },
  },
  {
    name: "Mirage Dance Crew",
    category: "Cultural",
    tagline: "The premier collegiate urban and western choreography collective",
    description:
      "Mirage Dance Crew is our college's competitive western and street dance society. We train rigorously in urban choreography, hip-hop foundations, and contemporary storytelling, competing across major inter-college university festivals.",
    logoUrl: "https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=200&q=80",
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    recruitmentOpenedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    isArchived: false,
    allowMultipleRoles: true,
    openRoles: [
      {
        title: "Dancer / Crew Member (Urban & Western)",
        description: "Learn choreography routines, participate in regular conditioning sessions, and perform on competitive stages.",
        requirements: "Rhythm, stage confidence, and foundational background in any dance form (Hip-Hop, Bollywood, Contemporary, etc.).",
        questions: [
          "Please provide a Google Drive or YouTube link to a dance audition clip or practice video.",
        ],
      },
      {
        title: "Production & Stage Logistics Member",
        description: "Assist backstage operations, coordinate props, help with costume inventory, and manage audio cue timing.",
        requirements: "Strong organizational sense, punctuality, and ability to stay calm under backstage festival pressure.",
        questions: [
          "Describe your experience managing live event props, audio tracks, or stage schedules.",
        ],
      },
      {
        title: "PR & Event Management Member",
        description: "Coordinate team travel schedules, manage festival registration forms, and communicate with college councils.",
        requirements: "Good communication, proactive nature, and coordination skills.",
        questions: [
          "How do you prioritize competing deadlines during high-stress event seasons?",
        ],
      },
      {
        title: "Media & Videography Member",
        description: "Film practice sessions, capture backstage moments, and edit high-energy performance reels.",
        requirements: "Interest in mobile video shooting and short-form editing (CapCut, Premiere, InShot).",
        questions: [
          "Share links to high-energy dance or event video edits you have produced.",
        ],
      },
    ],
    generalQuestions: [
      "Which dance style(s) do you enjoy the most, and how long have you been dancing?",
      "Are you comfortable attending evening practice sessions after classes during competition months?",
      "What motivates you to be part of a competitive college crew?",
    ],
    socialLinks: {
      instagram: "https://instagram.com/miragedancecrew",
      youtube: "https://youtube.com/@miragedancecrew",
    },
  },
  {
    name: "Crescendo",
    category: "Cultural",
    tagline: "Creating harmonies, live acoustic sets, and original collegiate music",
    description:
      "Crescendo is the official university music society. We bring together vocalists, instrumentalists, and sound enthusiasts for acoustic campus jams, battle-of-the-bands tournaments, and collaborative studio recordings.",
    logoUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80",
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    recruitmentOpenedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    isArchived: false,
    allowMultipleRoles: true,
    openRoles: [
      {
        title: "Vocalist (Western / Indian)",
        description: "Perform lead and backing harmonies across acoustic sets, competition tracks, and festive performances.",
        requirements: "Good sense of pitch, breath control, and passion for performing in group arrangements.",
        questions: [
          "Attach an audio or video drive link of you singing.",
        ],
      },
      {
        title: "Instrumentalist (Guitar / Keys / Bass / Drums / Percussion)",
        description: "Play rhythm or lead accompaniment for band sets, jam sessions, and live campus events.",
        requirements: "Basic-to-intermediate proficiency on your instrument and ability to play along in rhythm.",
        questions: [
          "Which instrument(s) do you play, and what is your proficiency level?",
          "Attach a video or audio link of an instrumental demo or solo.",
        ],
      },
      {
        title: "Sound & Production Member",
        description: "Assist with jam-room sound setups, mic placements, cable management, and basic audio recording.",
        requirements: "Interest in sound hardware, mixers, or music production software (FL Studio, Ableton, Logic).",
        questions: [
          "Which Digital Audio Workstations (DAW) or audio equipment are you familiar with?",
        ],
      },
      {
        title: "PR & Sponsorship Member",
        description: "Handle festival gig applications, coordinate social media promo, and help secure gear sponsors.",
        requirements: "Enthusiasm for live music, active social media coordination, and networking capability.",
        questions: [
          "What ideas do you have for promoting our live jam nights across campus?",
        ],
      },
    ],
    generalQuestions: [
      "What is your primary musical domain (Vocals, Instrument, Sound Production, or Event Management)?",
      "Attach an audio or video drive link of you singing or playing your instrument.",
      "What are a few bands or artists you enjoy listening to or playing?",
    ],
    socialLinks: {
      instagram: "https://instagram.com/crescendo_music",
      youtube: "https://youtube.com/@crescendo_music",
    },
  },
  {
    name: "ARES Robotics (Automated Rover & Embedded Systems)",
    category: "Technical",
    tagline: "Engineering autonomous Mars rovers, custom flight controllers, and intelligent robotic systems",
    description:
      "ARES Robotics is our university rover research team. We design, build, and program terrestrial rovers for university rover challenges, integrating custom robotic arms, life-detection scientific modules, and autonomous LiDAR navigation.",
    logoUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=200&q=80",
    deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
    recruitmentOpenedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    isArchived: false,
    allowMultipleRoles: true,
    openRoles: [
      {
        title: "Embedded Systems & Firmware Member",
        description: "Assist in programming microcontrollers (Arduino, ESP32, STM32), wire sensors, and test motor drivers.",
        requirements: "Familiarity with basic C/C++, electronics fundamentals, and curiosity about circuit debugging.",
        questions: [
          "Mention microcontrollers or communication protocols (I2C, SPI, UART, CAN) you have used.",
        ],
      },
      {
        title: "Autonomous Navigation & ROS Member",
        description: "Learn and assist with ROS2 simulation environments, camera feeds, and basic obstacle detection scripts.",
        requirements: "Basic Python programming and interest in robotics software frameworks and Linux.",
        questions: [
          "Do you have experience with ROS/ROS2, OpenCV, or Linux command-line tools?",
        ],
      },
      {
        title: "Mechanical CAD & Fabrication Member",
        description: "Support 3D modeling of rover chassis parts, 3D printing, and hands-on assembly in the mechanical workshop.",
        requirements: "Basic exposure to Fusion 360, SolidWorks, or enthusiasm for hands-on workshop tools.",
        questions: [
          "Share images or links to any 3D models or mechanical prototypes you have drafted.",
        ],
      },
      {
        title: "Operations, PR & Sponsorship Member",
        description: "Help coordinate lab logistics, document testing milestones, and pitch to hardware component sponsors.",
        requirements: "Strong organizational skills, technical documentation interest, and proactive communication.",
        questions: [
          "How would you approach contacting hardware suppliers for technical sponsorships?",
        ],
      },
    ],
    generalQuestions: [
      "Which subsystem are you most interested in joining (Firmware/Embedded, ROS/Software, Mechanical, or PR/Logistics)?",
      "Describe any small hobby project, DIY circuit, code repo, or school model you have built.",
      "Can you commit regular weekly hours to the robotics workshop alongside your academic classes?",
    ],
    socialLinks: {
      instagram: "https://instagram.com/ares_robotics",
      linkedin: "https://linkedin.com/company/ares-robotics",
      website: "https://aresrobotics.org",
    },
  },
];

/**
 * Seed script execution to reset and populate initial database records
 */
const seedData = async () => {
  try {
    // Safety check: ensure not called in production
    if (process.env.NODE_ENV === "production") {
      console.error("[Seeder Error] Seeding operation is strictly prohibited in production environments.");
      process.exit(1);
    }

    // Establish connection to database
    await connectDB();

    // Clear existing records across collections to ensure clean idempotent seeding
    console.log("[Seeder] Clearing old societies and users...");
    await Society.deleteMany({});
    await User.deleteMany({});

    // Populate collection with updated initial dataset
    console.log("[Seeder] Inserting sample societies with role structures...");
    const createdSocieties = await Society.insertMany(sampleSocieties);
    console.log(`[Seeder] Created ${createdSocieties.length} societies.`);

    // Provision 3 demo user accounts with password 'password123'
    console.log("[Seeder] Creating demo users...");
    const demoUsers = [
      {
        username: "superadmin",
        email: "superadmin@college.edu",
        password: "password123",
        fullName: "System Super Admin",
        role: "super_admin",
        managedSocieties: [],
      },
      {
        username: "societyadmin",
        email: "societyadmin@college.edu",
        password: "password123",
        fullName: "Jordan Lee",
        role: "society_admin",
        managedSocieties: [createdSocieties[0]._id, createdSocieties[1]._id],
      },
      {
        username: "student",
        email: "student@college.edu",
        password: "password123",
        fullName: "Alex Rivera",
        branch: "Computer Science",
        year: "2nd Year",
        role: "student",
        managedSocieties: [],
      },
    ];

    for (const userData of demoUsers) {
      await User.create(userData);
    }
    console.log(`[Seeder] Created ${demoUsers.length} demo users (Super Admin, Society Admin, Student).`);

    console.log("[Seeder] Database seeded successfully!");
    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error("[Seeder] Error seeding data:", err.message);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
};

// Execute seeder if invoked directly via CLI
if (require.main === module) {
  seedData();
}

module.exports = { sampleSocieties, seedData };
