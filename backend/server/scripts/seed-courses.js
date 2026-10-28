require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const Course = require('../models/Course');

const demoCourses = [
  { name: 'Computer Science', code: 'BSC-CS', category: 'Technology', description: 'Build the ideas, tools, and technology shaping our world.', duration: '4 years', eligibility: '12th · PCM', annualFee: 85000 },
  { name: 'Business Administration', code: 'BBA', category: 'Business', description: 'Learn to lead with clarity, creativity, and confidence.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 68000 },
  { name: 'Computer Applications', code: 'BCA', category: 'Technology', description: 'Turn your curiosity about computers into practical skills.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 62000 },
  { name: 'Psychology', code: 'BA-PSY', category: 'Social sciences', description: 'Understand people, behaviour, and what helps us thrive.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 58000 },
  { name: 'Commerce', code: 'BCOM', category: 'Business', description: 'Explore finance, markets, and the language of business.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 54000 },
  { name: 'English & Communication', code: 'BA-ENG', category: 'Humanities', description: 'Find your voice through stories, ideas, and expression.', duration: '3 years', eligibility: '12th · Any stream', annualFee: 52000 }
];

async function seedCourses() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before seeding courses.');
  await mongoose.connect(process.env.MONGODB_URI);
  for (const course of demoCourses) {
    await Course.updateOne({ code: course.code }, { $setOnInsert: course, $set: { isActive: true } }, { upsert: true });
  }
  console.log(`${demoCourses.length} sample courses are available.`);
}

seedCourses()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
