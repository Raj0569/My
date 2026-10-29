require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const Course = require('../models/Course');

const demoCourses = [
  {
    name: 'Computer Science', code: 'BSC-CS', category: 'Technology', description: 'Build the ideas, tools, and technology shaping our world.', duration: '4 years', eligibility: '12th · PCM', annualFee: 85000,
    eligibilityDetails: 'Class 12 or equivalent from a recognized board with Physics, Chemistry, and Mathematics. Minimum marks and equivalence rules are subject to the current admission notification.',
    eligibleQualifications: ['Class 12 / Senior Secondary'], eligibleStreams: ['Science (PCM)'], requiredSubjects: ['Physics', 'Chemistry', 'Mathematics'],
    courseStructure: ['Year 1: Programming fundamentals, mathematics, physics, and communication', 'Year 2: Data structures, algorithms, databases, and computer organization', 'Year 3: Operating systems, networks, software engineering, and electives', 'Year 4: Advanced electives, project work, and capstone'],
    placementDetails: 'Indicative career paths include software development, quality assurance, systems support, and further study. Placement outcomes depend on skills, employer selection, and market conditions; confirm current placement figures with the college.'
  },
  {
    name: 'Business Administration', code: 'BBA', category: 'Business', description: 'Learn to lead with clarity, creativity, and confidence.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 68000,
    eligibilityDetails: 'Class 12 or equivalent from a recognized board in any stream. Minimum marks and equivalence rules are subject to the current admission notification.',
    eligibleQualifications: ['Class 12 / Senior Secondary'], eligibleStreams: ['Any stream'], requiredSubjects: [],
    courseStructure: ['Year 1: Management foundations, accounting, economics, and business communication', 'Year 2: Marketing, human resources, finance, operations, and business law', 'Year 3: Strategy, entrepreneurship, electives, and a project or internship'],
    placementDetails: 'Indicative career paths include sales, marketing, operations, human resources, and business support. Placement outcomes depend on skills, employer selection, and market conditions; confirm current placement figures with the college.'
  },
  {
    name: 'Computer Applications', code: 'BCA', category: 'Technology', description: 'Turn your curiosity about computers into practical skills.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 62000,
    eligibilityDetails: 'Class 12 or equivalent from a recognized board in any stream, as shown in the course listing. Minimum marks and any subject rules are subject to the current admission notification.',
    eligibleQualifications: ['Class 12 / Senior Secondary'], eligibleStreams: ['Any stream'], requiredSubjects: [],
    courseStructure: ['Year 1: Programming, computer fundamentals, mathematics, and communication', 'Year 2: Data structures, databases, web development, and operating systems', 'Year 3: Software engineering, networks, electives, and application project'],
    placementDetails: 'Indicative career paths include junior software development, web development, application support, and quality assurance. Placement outcomes depend on skills, employer selection, and market conditions; confirm current placement figures with the college.'
  },
  {
    name: 'Psychology', code: 'BA-PSY', category: 'Social sciences', description: 'Understand people, behaviour, and what helps us thrive.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 58000,
    eligibilityDetails: 'Class 12 or equivalent from a recognized board in any stream. Minimum marks and equivalence rules are subject to the current admission notification.',
    eligibleQualifications: ['Class 12 / Senior Secondary'], eligibleStreams: ['Any stream'], requiredSubjects: [],
    courseStructure: ['Year 1: Introduction to psychology, research foundations, and social sciences', 'Year 2: Developmental, social, and cognitive psychology with research methods', 'Year 3: Applied psychology, electives, fieldwork, and a research project'],
    placementDetails: 'Indicative pathways include research assistance, community programmes, and human-resources support. Clinical and counselling careers generally require further qualifications; placement outcomes and requirements should be confirmed with the college.'
  },
  {
    name: 'Commerce', code: 'BCOM', category: 'Business', description: 'Explore finance, markets, and the language of business.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 54000,
    eligibilityDetails: 'Class 12 or equivalent from a recognized board in any stream. Mathematics or accountancy requirements, minimum marks, and equivalence rules depend on the current admission notification.',
    eligibleQualifications: ['Class 12 / Senior Secondary'], eligibleStreams: ['Any stream'], requiredSubjects: [],
    courseStructure: ['Year 1: Financial accounting, business economics, and business communication', 'Year 2: Corporate accounting, business law, taxation, and statistics', 'Year 3: Auditing, finance, electives, and an applied business project'],
    placementDetails: 'Indicative career paths include accounts assistance, audit and tax training, banking operations, and finance support. Placement outcomes depend on skills, employer selection, and market conditions; confirm current placement figures with the college.'
  },
  {
    name: 'English & Communication', code: 'BA-ENG', category: 'Humanities', description: 'Find your voice through stories, ideas, and expression.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 52000,
    eligibilityDetails: 'Class 12 or equivalent from a recognized board in any stream. Minimum marks and equivalence rules are subject to the current admission notification.',
    eligibleQualifications: ['Class 12 / Senior Secondary'], eligibleStreams: ['Any stream'], requiredSubjects: [],
    courseStructure: ['Year 1: Reading literature, language, writing, and communication foundations', 'Year 2: Literary periods, media studies, rhetoric, and creative writing', 'Year 3: Advanced literature, editing, research methods, and a final project'],
    placementDetails: 'Indicative career paths include content writing, communications, publishing, and media support. Teaching roles may require additional qualifications. Placement outcomes depend on skills and employer selection; confirm current placement figures with the college.'
  }
];

async function seedCourses() {
  for (const course of demoCourses) {
    const existing = await Course.findOne({ code: course.code });
    if (!existing) {
      await Course.create({ ...course, isActive: true });
      continue;
    }

    const missingDetails = {};
    if (!existing.eligibilityDetails) missingDetails.eligibilityDetails = course.eligibilityDetails;
    for (const key of ['eligibleQualifications', 'eligibleStreams', 'requiredSubjects']) {
      if (!existing[key]?.length) missingDetails[key] = course[key];
    }
    if (!existing.courseStructure?.length) missingDetails.courseStructure = course.courseStructure;
    if (!existing.placementDetails) missingDetails.placementDetails = course.placementDetails;
    if (Object.keys(missingDetails).length) {
      await Course.updateOne({ _id: existing._id }, { $set: missingDetails });
    }
  }
  console.log(`${demoCourses.length} sample courses are available.`);
}

module.exports = seedCourses;

if (require.main === module) {
  async function runSeed() {
    if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before seeding courses.');
    await mongoose.connect(process.env.MONGODB_URI);
    await seedCourses();
  }

  runSeed()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
