import { useState } from 'react';
import { api } from '../utils/api';
import { SiteShell } from '../components/SiteLayout';

export default function InfoPage({ type }) {
  const pages = {
    about: ['A PLACE TO BECOME', 'Big enough to open doors.', 'Personal enough to know you.', 'Northfield College is a welcoming campus community where students build practical knowledge, confidence, and friendships.'],
    admissions: ['ADMISSIONS 2026–27', 'One good step', 'at a time.', 'Choose a course, create your student account, submit your application, then track its progress from your portal.'],
    enquiry: ['HERE FOR YOUR QUESTIONS', 'Need a little', 'direction?', 'Send the admissions team a note and we’ll help you find the right course.']
  };
  const [kicker, first, second, description] = pages[type];
  const [feedback, setFeedback] = useState('');
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    try { const result = await api('/enquiries', { method: 'POST', body: JSON.stringify(values) }); setFeedback(`Thanks. Your enquiry reference is ${result.reference}.`); form.reset(); }
    catch (error) { setFeedback(error.message); }
  }
  return <SiteShell><main className="inner-hero"><div className="eyebrow">{kicker}</div><h1>{first}<br /><em>{second}</em></h1><p>{description}</p>{type === 'enquiry' ? <form className="form-card compact-form" onSubmit={submit}><label>Your name<input name="name" required minLength="2" /></label><label>Email address<input name="email" type="email" required /></label><label>Phone number<input name="phone" type="tel" required /></label><label>Course you’re interested in<input name="course" required /></label><label>Your question<textarea name="message" rows="3" /></label><button className="button dark">Send enquiry ↗</button><p className="feedback">{feedback}</p></form> : <a className="button dark" href={type === 'about' ? '/courses' : '/apply'}>{type === 'about' ? 'Explore courses' : 'Start an application'} ↗</a>}</main></SiteShell>;
}

